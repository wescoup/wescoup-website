import logging
import time
import random
from flask_socketio import emit, join_room, leave_room, close_room
from flask import session

# --- Global In-Memory Storage ---
# We will now store game objects, not just room codes
# games = { 'room_code': WarGame() }
games = {}
# socketio instance (will be set by app.py)
sio = None

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

# --- Card and Deck Class (from single-player) ---
class Card:
    def __init__(self, suit, value):
        self.suit = suit
        self.value = value
        self.rank = VALUE_MAP[value]
    
    def to_dict(self):
        """Returns a dictionary representation of the card."""
        return {"suit": self.suit, "value": self.value, "rank": self.rank}

class Deck:
    def __init__(self):
        self.cards = [Card(s, v) for s in SUITS for v in VALUES]
    
    def shuffle(self):
        random.shuffle(self.cards)
    
    def deal(self, num_hands):
        hands = [[] for _ in range(num_hands)]
        for i, card in enumerate(self.cards):
            hands[i % num_hands].append(card)
        return hands

# --- New WarGame Class ---
class WarGame:
    def __init__(self, room_code):
        self.room_code = room_code
        self.players = {} # { 'sid': player_index (0 or 1) }
        self.player_hands = {0: [], 1: []}
        self.base_delay = DEFAULT_SPEED_DELAY
        self.game_in_progress = False
        self.game_over = False

    def add_player(self, sid):
        """Adds a player to the game, returns player_index (0 or 1) or None if full."""
        if len(self.players) >= 2:
            return None # Game is full
        
        player_index = 0
        if len(self.players) == 1:
            player_index = 1
            
        self.players[sid] = player_index
        log.info(f"Player {sid} joined {self.room_code} as Player {player_index}")
        return player_index

    def remove_player(self, sid):
        """Removes a player. If game in progress, ends it."""
        if sid in self.players:
            player_index = self.players.pop(sid)
            log.info(f"Player {player_index} ({sid}) left {self.room_code}")
            if self.game_in_progress:
                self.end_game(f"Player {player_index + 1} disconnected.")
        
    def start_game(self):
        """Shuffles, deals, and sets game in progress."""
        if len(self.players) != 2:
            log.warning(f"Attempted to start {self.room_code} without 2 players.")
            return

        log.info(f"Starting game {self.room_code}")
        self.game_in_progress = True
        deck = Deck()
        deck.shuffle()
        hands = deck.deal(2)
        self.player_hands[0] = hands[0]
        self.player_hands[1] = hands[1]
        
        # Spawn the game loop as a background task
        sio.start_background_task(self.game_loop)

    def end_game(self, message):
        """Stops the game and notifies clients."""
        self.game_in_progress = False
        self.game_over = True
        self.broadcast_state(message, game_over=True)
        log.info(f"Game {self.room_code} ended: {message}")
        # Clean up game object after a short delay
        sio.start_background_task(self.cleanup_game)

    def cleanup_game(self):
        """Waits and then removes the game from global dict."""
        sio.sleep(10) # Wait 10s for clients to see final message
        if self.room_code in games:
            del games[self.room_code]
            log.info(f"Cleaned up game {self.room_code}")
            try:
                close_room(self.room_code)
            except Exception as e:
                log.error(f"Error closing room {self.room_code}: {e}")

    def change_speed(self, change):
        """Adjusts the game speed, respecting limits."""
        new_delay = self.base_delay + change
        if new_delay > MAX_SPEED_DELAY:
            self.base_delay = MAX_SPEED_DELAY
        elif new_delay < MIN_SPEED_DELAY:
            self.base_delay = MIN_SPEED_DELAY
        else:
            self.base_delay = round(new_delay, 1)
        log.info(f"Game {self.room_code} speed changed to {self.base_delay}s")
        # Notify players of new speed
        self.broadcast_state(f"Speed set to {self.base_delay}s")

    def broadcast_state(self, message, play_pile=None, war_pile=None, game_over=False):
        """Emits the current game state to all players in the room."""
        if play_pile is None:
            play_pile = []
        if war_pile is None:
            war_pile = []

        state = {
            "player_0_count": len(self.player_hands[0]),
            "player_1_count": len(self.player_hands[1]),
            "play_pile": [card.to_dict() for card in play_pile],
            "war_pile": [card.to_dict() for card in war_pile],
            "message": message,
            "current_delay": self.base_delay,
            "game_over": game_over
        }
        sio.emit('game_state_update', state, to=self.room_code)

    def game_loop(self):
        """Main server-side game loop."""
        turn_count = 0
        while self.game_in_progress:
            turn_count += 1
            if turn_count > 2000: # Safety break for endless games
                self.end_game("Game timed out (2000 rounds). It's a draw!")
                return

            # --- 1. Check for Winner ---
            p0_cards = len(self.player_hands[0])
            p1_cards = len(self.player_hands[1])
            
            if p0_cards == 0:
                self.end_game("Player 2 wins the game!")
                return
            if p1_cards == 0:
                self.end_game("Player 1 wins the game!")
                return

            # --- 2. Determine Speed ---
            if p0_cards <= DRAMATIC_DELAY_THRESHOLD or p1_cards <= DRAMATIC_DELAY_THRESHOLD:
                current_delay = DRAMATIC_SPEED_DELAY
                msg = "Tension builds... low card warning!"
            else:
                current_delay = self.base_delay
                msg = f"Turn {turn_count}"
            
            self.broadcast_state(msg)
            sio.sleep(current_delay)

            # --- 3. Play Hand ---
            p0_card = self.player_hands[0].pop(0)
            p1_card = self.player_hands[1].pop(0)
            
            play_pile = [p0_card, p1_card]
            
            self.broadcast_state("Players draw...", play_pile=play_pile)
            sio.sleep(current_delay)

            # --- 4. Compare Cards ---
            if p0_card.rank > p1_card.rank:
                # P0 wins
                self.player_hands[0].extend(play_pile)
                self.broadcast_state("Player 1 wins the hand!", play_pile=play_pile)
            elif p1_card.rank > p0_card.rank:
                # P1 wins
                self.player_hands[1].extend(play_pile)
                self.broadcast_state("Player 2 wins the hand!", play_pile=play_pile)
            else:
                # --- 5. Handle War ---
                self.broadcast_state("It's WAR!", play_pile=play_pile)
                sio.sleep(current_delay)
                self.handle_war(play_pile)
            
            sio.sleep(current_delay) # Pause to show result before next turn

        log.info(f"Game loop for {self.room_code} finished.")

    def handle_war(self, play_pile):
        """Recursive function to handle a War."""
        war_pile = []
        
        # --- 1. Check if players have enough cards for war ---
        if len(self.player_hands[0]) < 2:
            # P0 doesn't have enough cards, P1 gets all cards
            self.player_hands[1].extend(play_pile)
            self.player_hands[1].extend(self.player_hands[0])
            self.player_hands[0] = []
            self.broadcast_state("Player 1 doesn't have enough cards for war! Player 2 wins!", play_pile=play_pile)
            return
            
        if len(self.player_hands[1]) < 2:
            # P1 doesn't have enough cards
            self.player_hands[0].extend(play_pile)
            self.player_hands[0].extend(self.player_hands[1])
            self.player_hands[1] = []
            self.broadcast_state("Player 2 doesn't have enough cards for war! Player 1 wins!", play_pile=play_pile)
            return

        # --- 2. Both players have enough cards, draw 1 face down ---
        face_down_p0 = self.player_hands[0].pop(0)
        face_down_p1 = self.player_hands[1].pop(0)
        war_pile.extend([face_down_p0, face_down_p1])
        
        self.broadcast_state("Players place 1 card face down...", play_pile=play_pile, war_pile=war_pile)
        sio.sleep(self.base_delay)
        
        # --- 3. Draw 1 face up ---
        p0_war_card = self.player_hands[0].pop(0)
        p1_war_card = self.player_hands[1].pop(0)
        war_pile.extend([p0_war_card, p1_war_card])
        
        all_cards_in_play = play_pile + war_pile
        
        self.broadcast_state("...and 1 card face up!", play_pile=play_pile, war_pile=war_pile)
        sio.sleep(self.base_delay)

        # --- 4. Compare war cards ---
        if p0_war_card.rank > p1_war_card.rank:
            # P0 wins war
            self.player_hands[0].extend(all_cards_in_play)
            self.broadcast_state("Player 1 wins the WAR!", play_pile=play_pile, war_pile=war_pile)
        elif p1_war_card.rank > p0_war_card.rank:
            # P1 wins war
            self.player_hands[1].extend(all_cards_in_play)
            self.broadcast_state("Player 2 wins the WAR!", play_pile=play_pile, war_pile=war_pile)
        else:
            # --- 5. Another War! ---
            self.broadcast_state("ANOTHER WAR!", play_pile=play_pile, war_pile=war_pile)
            sio.sleep(self.base_delay)
            self.handle_war(all_cards_in_play) # Recurse


# --- Public Manager Functions ---

def register_socketio_instance(socketio_instance):
    """Allows app.py to pass its 'socketio' object to this manager."""
    global sio
    sio = socketio_instance
    log.info("Socket.IO instance registered with manager.")

def create_new_game(game_type):
    """Creates a new game, stores it, and returns the room code."""
    # Simple room code generation
    while True:
        room_code = ''.join(random.choices('abcdefghjkmnpqrstuvwxyz23456789', k=4))
        if room_code not in games:
            break
    
    log.info(f"Creating new {game_type} game with code: {room_code}")
    games[room_code] = WarGame(room_code)
    return room_code

def register_handlers(socketio):
    """Registers all socket event handlers."""
    
    @socketio.on('connect')
    def on_connect():
        log.info(f"Client connected: {session.get('sid', 'unknown')}")
        # Note: We can't use request.sid here reliably on connect
        
    @socketio.on('disconnect')
    def on_disconnect():
        sid = session.get('sid')
        log.info(f"Client disconnected: {sid}")
        # Find which game this player was in
        for room_code, game in games.items():
            if sid in game.players:
                game.remove_player(sid)
                if not game.players: # If room is empty, clean it up
                    log.info(f"Room {room_code} is empty, cleaning up.")
                    if room_code in games:
                        del games[room_code]
                break

    @socketio.on('create_game')
    def on_create_game():
        """Event handler for 'Create Game' button."""
        room_code = create_new_game('war_classic')
        emit('game_created', {'room_code': room_code})

    @socketio.on('join_game')
    def on_join_game(data):
        """Event handler for when a client loads the game page."""
        room_code = data.get('room_code')
        sid = session.get('sid')
        
        if not room_code or room_code not in games:
            log.warning(f"Player {sid} tried to join non-existent room: {room_code}")
            emit('join_error', {'message': 'Game not found. It may have expired.'})
            return

        game = games[room_code]
        join_room(room_code)
        player_index = game.add_player(sid)
        
        if player_index is None:
            log.warning(f"Player {sid} tried to join full room: {room_code}")
            emit('join_error', {'message': 'This game is already full.'})
            leave_room(room_code)
            return

        emit('you_joined', {'player_index': player_index})
        
        if len(game.players) == 2:
            # Second player joined, start the game!
            sio.emit('status_update', {'message': 'Player 2 has joined. Starting game...'}, to=room_code)
            game.start_game()
        else:
            # First player, show waiting message
            emit('status_update', {'message': 'Waiting for Player 2 to join...'})

    @socketio.on('change_speed')
    def on_change_speed(data):
        """Event handler for speed control buttons."""
        room_code = data.get('room_code')
        change = data.get('change', 0.0)
        sid = session.get('sid')

        if room_code in games:
            game = games[room_code]
            if sid in game.players: # Ensure player is in this game
                game.change_speed(change)
            else:
                log.warning(f"Player {sid} tried to change speed for game {room_code} they aren't in.")
        else:
            log.warning(f"Player {sid} tried to change speed for non-existent game: {room_code}")
