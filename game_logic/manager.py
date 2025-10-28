import logging
import time
import random
from flask_socketio import emit, join_room, leave_room, close_room
from flask import request # Import request directly

# --- Global In-Memory Storage ---
games = {} # { 'room_code': WarGame() }
sio = None # Socket.IO instance, will be set by app.py

# --- Constants ---
SUITS = ["♠", "♥", "♦", "♣"]
VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
VALUE_MAP = {val: i + 2 for i, val in enumerate(VALUES)}
DRAMATIC_DELAY_THRESHOLD = 3
MAX_SPEED_DELAY = 1.5
MIN_SPEED_DELAY = 0.5
DEFAULT_SPEED_DELAY = 1.0
DRAMATIC_SPEED_DELAY = 1.5

# Configure logging
log = logging.getLogger(__name__)

# --- Card and Deck Classes ---
class Card:
    def __init__(self, suit, value):
        self.suit = suit
        self.value = value
        self.rank = VALUE_MAP[value]
        self.display_value = VALUE_MAP.get(value, str(value)) # Store 'J', 'Q', 'K', 'A' or number string

    def to_dict(self):
        """Returns a dictionary representation of the card."""
        # Use display_value for client-side representation
        return {"suit": self.suit, "value": self.display_value, "rank": self.rank}

class Deck:
    def __init__(self):
        # Use the integer values for internal logic
        self.cards = [Card(s, v) for s in SUITS for v in VALUES]

    def shuffle(self):
        random.shuffle(self.cards)

    def deal(self, num_hands):
        hands = [[] for _ in range(num_hands)]
        for i, card in enumerate(self.cards):
            hands[i % num_hands].append(card)
        return hands

# --- WarGame Class ---
class WarGame:
    def __init__(self, room_code):
        self.room_code = room_code
        self.players = {} # { 'sid': player_index (0 or 1) }
        self.player_hands = {0: [], 1: []}
        self.base_delay = DEFAULT_SPEED_DELAY
        self.game_in_progress = False
        self.game_over = False
        self.game_loop_task = None # To hold the background task

    def add_player(self, sid):
        if len(self.players) >= 2:
            return None # Full
        player_index = 0 if not self.players else 1
        self.players[sid] = player_index
        log.info(f"Player {sid} joined {self.room_code} as Player {player_index + 1}")
        return player_index

    def remove_player(self, sid):
        if sid in self.players:
            player_index = self.players.pop(sid)
            log.info(f"Player {player_index + 1} ({sid}) left {self.room_code}")
            if self.game_in_progress:
                self.end_game(f"Player {player_index + 1} disconnected.")
            return True
        return False

    def start_game(self):
        if len(self.players) != 2 or self.game_in_progress:
            return
        log.info(f"Starting game {self.room_code}")
        self.game_in_progress = True
        self.game_over = False
        deck = Deck()
        deck.shuffle()
        hands = deck.deal(2)
        self.player_hands[0] = hands[0]
        self.player_hands[1] = hands[1]
        self.game_loop_task = sio.start_background_task(self.game_loop)

    def end_game(self, message):
        if not self.game_in_progress and not self.game_over: # Avoid multiple end calls
             return
        log.info(f"Attempting to end game {self.room_code}: {message}")
        self.game_in_progress = False
        self.game_over = True
        # Ensure broadcast happens even if loop terminated abruptly
        self.broadcast_state(message, game_over=True)
        # Clean up game object after a short delay
        sio.start_background_task(self.cleanup_game)

    def cleanup_game(self):
        sio.sleep(10)
        if self.room_code in games:
            log.info(f"Cleaning up game object {self.room_code}")
            # Close the Socket.IO room
            try:
                log.info(f"Closing room {self.room_code}")
                close_room(self.room_code)
            except Exception as e:
                log.error(f"Error closing room {self.room_code}: {e}")
            # Delete from global dictionary
            del games[self.room_code]

    def change_speed(self, change):
        new_delay = self.base_delay + change
        self.base_delay = round(max(MIN_SPEED_DELAY, min(new_delay, MAX_SPEED_DELAY)), 1)
        log.info(f"Game {self.room_code} speed changed to {self.base_delay}s")
        self.broadcast_state(f"Speed set to {self.base_delay}s") # Notify players

    def broadcast_state(self, message, play_pile=None, war_pile=None, game_over=False):
        if not sio:
            log.error("Socket.IO instance (sio) not registered in manager.")
            return
        play_pile = play_pile if play_pile is not None else []
        war_pile = war_pile if war_pile is not None else []
        state = {
            "player_0_count": len(self.player_hands[0]),
            "player_1_count": len(self.player_hands[1]),
            "play_pile": [card.to_dict() for card in play_pile],
            "war_pile": [card.to_dict() for card in war_pile],
            "message": message,
            "current_delay": self.base_delay,
            "game_over": game_over or self.game_over # Use self.game_over if set
        }
        try:
             sio.emit('game_state_update', state, to=self.room_code)
        except Exception as e:
             log.error(f"Error emitting game state for {self.room_code}: {e}")


    def game_loop(self):
        log.info(f"Game loop started for {self.room_code}")
        turn_count = 0
        while self.game_in_progress and not self.game_over:
            try:
                turn_count += 1
                if turn_count > 2000:
                    self.end_game("Game timed out (2000 rounds). It's a draw!")
                    return

                p0_cards_total = len(self.player_hands[0])
                p1_cards_total = len(self.player_hands[1])

                if p0_cards_total == 0:
                    self.end_game("Player 2 wins the game!")
                    return
                if p1_cards_total == 0:
                    self.end_game("Player 1 wins the game!")
                    return

                current_delay = DRAMATIC_SPEED_DELAY if (p0_cards_total <= DRAMATIC_DELAY_THRESHOLD or p1_cards_total <= DRAMATIC_DELAY_THRESHOLD) else self.base_delay
                msg = "Tension builds... low card warning!" if current_delay == DRAMATIC_SPEED_DELAY else f"Turn {turn_count}"

                self.broadcast_state(msg)
                sio.sleep(current_delay) # Use sio.sleep for cooperative multitasking

                if not self.game_in_progress: break # Check if game ended during sleep

                p0_card = self.player_hands[0].pop(0)
                p1_card = self.player_hands[1].pop(0)
                play_pile = [p0_card, p1_card]

                self.broadcast_state("Players draw...", play_pile=play_pile)
                sio.sleep(current_delay)

                if not self.game_in_progress: break

                if p0_card.rank > p1_card.rank:
                    self.player_hands[0].extend(play_pile)
                    self.broadcast_state("Player 1 wins the hand!", play_pile=play_pile)
                elif p1_card.rank > p0_card.rank:
                    self.player_hands[1].extend(play_pile)
                    self.broadcast_state("Player 2 wins the hand!", play_pile=play_pile)
                else:
                    self.broadcast_state("It's WAR!", play_pile=play_pile)
                    sio.sleep(current_delay)
                    if not self.game_in_progress: break
                    self.handle_war(play_pile) # Modifies player hands directly
                    # Message is broadcast within handle_war

                sio.sleep(current_delay) # Pause after hand/war resolution

            except Exception as e:
                log.error(f"Error in game loop for {self.room_code}: {e}", exc_info=True)
                self.end_game("An unexpected error occurred.")
                return # Exit loop on error

        log.info(f"Game loop finished for {self.room_code}. In progress: {self.game_in_progress}, Over: {self.game_over}")


    def handle_war(self, current_spoils):
        """Recursive war handling. current_spoils contains cards from previous ties."""
        war_pile_this_round = []

        # Check for sufficient cards (only need 2: one down, one up)
        if len(self.player_hands[0]) < 2:
            self.player_hands[1].extend(current_spoils)
            self.player_hands[1].extend(self.player_hands[0]) # Give P1 all P0's remaining cards
            self.player_hands[0] = []
            self.broadcast_state("Player 1 doesn't have enough cards for war! Player 2 wins the spoils!", play_pile=[], war_pile=current_spoils)
            # Game end check will happen in the main loop
            return

        if len(self.player_hands[1]) < 2:
            self.player_hands[0].extend(current_spoils)
            self.player_hands[0].extend(self.player_hands[1]) # Give P0 all P1's remaining cards
            self.player_hands[1] = []
            self.broadcast_state("Player 2 doesn't have enough cards for war! Player 1 wins the spoils!", play_pile=[], war_pile=current_spoils)
            # Game end check will happen in the main loop
            return

        # Play 1 face down
        face_down_p0 = self.player_hands[0].pop(0)
        face_down_p1 = self.player_hands[1].pop(0)
        war_pile_this_round.extend([face_down_p0, face_down_p1])

        self.broadcast_state("Players place 1 card face down...", play_pile=[], war_pile=current_spoils + war_pile_this_round)
        sio.sleep(self.base_delay)
        if not self.game_in_progress: return

        # Play 1 face up (battle card)
        p0_battle_card = self.player_hands[0].pop(0)
        p1_battle_card = self.player_hands[1].pop(0)
        war_pile_this_round.extend([p0_battle_card, p1_battle_card])

        all_cards_in_play = current_spoils + war_pile_this_round

        self.broadcast_state("...and 1 card face up!", play_pile=[], war_pile=all_cards_in_play)
        sio.sleep(self.base_delay)
        if not self.game_in_progress: return

        # Compare battle cards
        if p0_battle_card.rank > p1_battle_card.rank:
            self.player_hands[0].extend(all_cards_in_play)
            self.broadcast_state("Player 1 wins the WAR!", play_pile=[], war_pile=all_cards_in_play)
        elif p1_battle_card.rank > p0_battle_card.rank:
            self.player_hands[1].extend(all_cards_in_play)
            self.broadcast_state("Player 2 wins the WAR!", play_pile=[], war_pile=all_cards_in_play)
        else:
            # Another war
            self.broadcast_state("ANOTHER WAR!", play_pile=[], war_pile=all_cards_in_play)
            sio.sleep(self.base_delay)
            if not self.game_in_progress: return
            self.handle_war(all_cards_in_play) # Recurse with accumulated spoils


# --- Public Manager Functions ---

def register_socketio_instance(socketio_instance):
    """Allows app.py to pass its 'socketio' object to this manager."""
    global sio
    sio = socketio_instance
    log.info("Socket.IO instance registered with manager.")

def create_new_game(game_type='war_classic'):
    """Creates a new game instance, stores it, and returns the room code."""
    if not sio:
        log.error("Socket.IO instance not registered before creating game.")
        return None
    while True:
        room_code = ''.join(random.choices('abcdefghjkmnpqrstuvwxyz23456789', k=4))
        if room_code not in games:
            break
    log.info(f"Creating new {game_type} game with code: {room_code}")
    games[room_code] = WarGame(room_code)
    return room_code

def get_game(room_code):
    """Retrieves an active game instance."""
    return games.get(room_code)

# --- Socket Event Handlers ---
# Moved to the end as requested

def register_handlers(socketio):
    """Registers all socket event handlers with the Flask-SocketIO app."""
    if not sio:
        log.error("Socket.IO instance must be registered before registering handlers.")
        return

    log.info("Registering Socket.IO event handlers...")

    @socketio.on('connect')
    def on_connect():
        # No session logic needed here. request.sid is available.
        log.info(f"Client connected: {request.sid}")

    @socketio.on('disconnect')
    def on_disconnect():
        sid = request.sid # Use request.sid directly
        log.info(f"Client disconnected: {sid}")
        game_found = False
        # Use list(games.items()) for safe iteration if removing items
        for room_code, game in list(games.items()):
            if sid in game.players:
                game_found = True
                player_left = game.remove_player(sid)
                if player_left and not game.players and not game.game_in_progress:
                    # If the player was successfully removed, the room is now empty,
                    # AND the game isn't already cleaning itself up, clean up now.
                    log.info(f"Room {room_code} is empty after disconnect, cleaning up immediately.")
                    if room_code in games: # Double check it wasn't cleaned up by end_game already
                         del games[room_code]
                         try:
                             close_room(room_code) # Attempt to close the underlying socket.io room
                         except Exception as e:
                             log.error(f"Error closing room {room_code} on disconnect cleanup: {e}")
                elif player_left and game.players:
                     # If player left but others remain, notify them (optional)
                     sio.emit('status_update', {'message': f'A player has disconnected.'}, to=room_code)
                break # Player found, no need to check other games
        if not game_found:
             log.warning(f"Disconnected SID {sid} was not found in any active game.")


    @socketio.on('create_game')
    def on_create_game():
        sid = request.sid # Use request.sid directly
        log.info(f"Received create_game request from {sid}")
        room_code = create_new_game('war_classic')
        if room_code:
            # Emit only to the user who requested the game
            emit('game_created', {'room_code': room_code}, to=sid)
            log.info(f"Sent game_created event to {sid} for room {room_code}")
        else:
            emit('error', {'message': 'Failed to create game.'}, to=sid)
            log.error(f"Failed to create game for {sid}")

    @socketio.on('join_game')
    def on_join_game(data):
        sid = request.sid # Use request.sid directly
        if not data or 'room_code' not in data:
             log.warning(f"Join request from {sid} missing room_code.")
             emit('join_error', {'message': 'Room code missing.'}, to=sid)
             return

        room_code = data.get('room_code').lower() # Normalize room code
        log.info(f"Received join_game request from {sid} for room {room_code}")

        game = get_game(room_code)
        if not game:
            log.warning(f"Player {sid} tried to join non-existent room: {room_code}")
            emit('join_error', {'message': 'Game not found. It may have expired.'}, to=sid)
            return

        if game.game_over:
             log.warning(f"Player {sid} tried to join finished game: {room_code}")
             emit('join_error', {'message': 'This game has already finished.'}, to=sid)
             return

        if sid in game.players:
             log.info(f"Player {sid} is rejoining room {room_code}.")
             join_room(room_code) # Ensure they are in the socket.io room
             emit('you_joined', {'player_index': game.players[sid]}, to=sid)
             game.broadcast_state("Player reconnected") # Send current state
             return

        # Try adding the player
        player_index = game.add_player(sid)

        if player_index is None:
            log.warning(f"Player {sid} tried to join full room: {room_code}")
            emit('join_error', {'message': 'This game is already full.'}, to=sid)
            return

        # Join the Socket.IO room for broadcasts
        join_room(room_code)
        log.info(f"Added {sid} to socket.io room {room_code}")

        # Tell the player they joined successfully and their index
        emit('you_joined', {'player_index': player_index}, to=sid)

        # Update status for players in the room
        if len(game.players) == 2:
            sio.emit('status_update', {'message': f'Player {player_index + 1} has joined. Starting game...'}, to=room_code)
            log.info(f"Two players in {room_code}, attempting to start game.")
            game.start_game()
        elif len(game.players) == 1:
            # Only tell the first player they are waiting
            emit('status_update', {'message': 'Waiting for Player 2 to join...'}, to=sid)

    @socketio.on('change_speed')
    def on_change_speed(data):
        sid = request.sid # Use request.sid directly
        if not data or 'room_code' not in data or 'change' not in data:
             log.warning(f"Invalid change_speed request from {sid}: {data}")
             return

        room_code = data.get('room_code').lower()
        change = data.get('change', 0.0)
        log.info(f"Received change_speed request from {sid} for room {room_code}, change: {change}")

        game = get_game(room_code)
        if game:
            if sid in game.players: # Check if the player is actually in this game
                game.change_speed(change)
            else:
                log.warning(f"Player {sid} tried to change speed for game {room_code} they aren't in.")
        else:
            log.warning(f"Player {sid} tried to change speed for non-existent game: {room_code}")

    log.info("Socket.IO event handlers registered.")
