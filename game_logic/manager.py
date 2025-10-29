import logging
import time
import random
from flask_socketio import emit, join_room, leave_room, close_room
from flask import request # Import request directly

# --- Global In-Memory Storage ---
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

# --- Card and Deck Classes ---
class Card:
    def __init__(self, suit, value):
        self.suit = suit
        self.value_str = value # "2", "J", "K", "A"
        self.rank = VALUE_MAP[value] # 2, 11, 13, 14
    
    def to_dict(self):
        """Returns a dictionary representation of the card."""
        # Send the string value "J", "Q", "K", "A" to the client
        return {"suit": self.suit, "value": self.value_str, "rank": self.rank}

class Deck:
    def __init__(self):
        # Create deck using the string values
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
        
        # *** ADDED: Stats tracking ***
        self.stats = {
            0: {'hands_won': 0, 'wars_won': 0},
            1: {'hands_won': 0, 'wars_won': 0}
        }
        self.total_hands_played = 0

    def add_player(self, sid):
        """Adds a player SID to the game, returns player_index (0 or 1) or None if full."""
        if len(self.players) >= 2 and sid not in self.players:
            return None # Game is full
        
        if sid in self.players:
            return self.players[sid] # Player is rejoining

        player_index = 0
        if len(self.players) == 1:
            player_index = 1
            
        self.players[sid] = player_index
        log.info(f"Player {sid} joined {self.room_code} as Player {player_index + 1}")
        return player_index

    def remove_player(self, sid):
        """Removes a player. If game in progress, ends it."""
        if sid in self.players:
            player_index = self.players.pop(sid)
            log.info(f"Player {player_index + 1} ({sid}) left {self.room_code}")
            # Only end the game if it was actually in progress
            if self.game_in_progress and not self.game_over:
                self.end_game(f"Player {player_index + 1} disconnected.")
            return True
        return False
        
    def start_game(self):
        """Shuffles, deals, and sets game in progress."""
        if len(self.players) != 2 or self.game_in_progress:
            log.warning(f"Attempted to start {self.room_code} (In Progress: {self.game_in_progress}) with {len(self.players)} players.")
            return

        log.info(f"Starting game {self.room_code}")
        self.game_in_progress = True
        self.game_over = False
        # *** ADDED: Reset stats on new game start ***
        self.stats = { 0: {'hands_won': 0, 'wars_won': 0}, 1: {'hands_won': 0, 'wars_won': 0} }
        self.total_hands_played = 0
        
        deck = Deck()
        deck.shuffle()
        hands = deck.deal(2)
        self.player_hands[0] = hands[0]
        self.player_hands[1] = hands[1]
        
        # Spawn the game loop as a background task
        self.game_loop_task = sio.start_background_task(self.game_loop)

    def end_game(self, message):
        """Stops the game and notifies clients."""
        if not self.game_in_progress: # Prevent multiple end-game calls
             if not self.game_over: # But if game is over, we may still need to broadcast
                  self.broadcast_state(message, game_over=True)
             return

        log.info(f"Ending game {self.room_code}: {message}")
        self.game_in_progress = False
        self.game_over = True
        self.broadcast_state(message, game_over=True)
        # Clean up game object after a short delay
        sio.start_background_task(self.cleanup_game)

    def cleanup_game(self):
        """Waits and then removes the game from global dict."""
        sio.sleep(10) # Wait 10s for clients to see final message
        if self.room_code in games:
            log.info(f"Cleaning up game object {self.room_code}")
            try:
                log.info(f"Closing socket.io room {self.room_code}")
                # This closes the room on the server, forcing disconnects for anyone lingering
                close_room(self.room_code) 
            except Exception as e:
                log.error(f"Error closing room {self.room_code}: {e}")
            # Delete from global dictionary
            del games[self.room_code]

    def change_speed(self, change):
        """Adjusts the game speed, respecting limits."""
        new_delay = self.base_delay + change
        # Use max/min to clamp the value within bounds, then round it
        self.base_delay = round(max(MIN_SPEED_DELAY, min(new_delay, MAX_SPEED_DELAY)), 1)
        log.info(f"Game {self.room_code} speed changed to {self.base_delay}s")
        # Notify players of new speed
        self.broadcast_state(f"Speed set to {self.base_delay}s")

    def broadcast_state(self, message, play_pile=None, war_pile=None, game_over=False):
        """Emits the current game state to all players in the room."""
        if not sio:
            log.error("Socket.IO instance (sio) not registered in manager.")
            return
            
        play_pile = play_pile if play_pile is not None else []
        war_pile = war_pile if war_pile is not None else []

        # *** ADDED: Calculate all stats ***
        p0_hand = self.player_hands[0]
        p1_hand = self.player_hands[1]
        
        # Calculate win percentages
        if self.total_hands_played > 0:
            p0_win_pct = (self.stats[0]['hands_won'] / self.total_hands_played) * 100
            p1_win_pct = (self.stats[1]['hands_won'] / self.total_hands_played) * 100
        else:
            p0_win_pct = 0
            p1_win_pct = 0

        player_0_stats = {
            "aces_count": sum(1 for card in p0_hand if card.rank == 14),
            "kings_count": sum(1 for card in p0_hand if card.rank == 13),
            "hands_won": self.stats[0]['hands_won'],
            "wars_won": self.stats[0]['wars_won'],
            "win_pct": p0_win_pct
        }
        
        player_1_stats = {
            "aces_count": sum(1 for card in p1_hand if card.rank == 14),
            "kings_count": sum(1 for card in p1_hand if card.rank == 13),
            "hands_won": self.stats[1]['hands_won'],
            "wars_won": self.stats[1]['wars_won'],
            "win_pct": p1_win_pct
        }

        state = {
            "player_0_count": len(p0_hand),
            "player_1_count": len(p1_hand),
            "play_pile": [card.to_dict() for card in play_pile],
            "war_pile": [card.to_dict() for card in war_pile],
            "message": message,
            "current_delay": self.base_delay,
            "game_over": game_over or self.game_over,
            # *** ADDED: Pass stats to client ***
            "player_0_stats": player_0_stats,
            "player_1_stats": player_1_stats,
            "total_hands_played": self.total_hands_played
        }
        try:
            sio.emit('game_state_update', state, to=self.room_code)
        except Exception as e:
             log.error(f"Error emitting game state for {self.room_code}: {e}")

    def game_loop(self):
        """Main server-side game loop."""
        log.info(f"Game loop started for {self.room_code}")
        # Note: self.total_hands_played is now the turn counter
        while self.game_in_progress and not self.game_over:
            try:
                # Check for disconnect, which sets game_in_progress to False
                if not self.game_in_progress:
                    break

                # *** MODIFIED: Use class variable for turn count ***
                self.total_hands_played += 1
                current_turn = self.total_hands_played
                
                if current_turn > 2000: # Safety break for endless games
                    self.end_game("Game timed out (2000 rounds). It's a draw!")
                    return

                # --- 1. Check for Winner ---
                p0_cards_total = len(self.player_hands[0])
                p1_cards_total = len(self.player_hands[1])
                
                if p0_cards_total == 0:
                    self.end_game("Player 2 wins the game!")
                    return
                if p1_cards_total == 0:
                    self.end_game("Player 1 wins the game!")
                    return

                # --- 2. Determine Speed ---
                is_dramatic = p0_cards_total <= DRAMATIC_DELAY_THRESHOLD or p1_cards_total <= DRAMATIC_DELAY_THRESHOLD
                current_delay = DRAMATIC_SPEED_DELAY if is_dramatic else self.base_delay
                msg = "Tension builds... low card warning!" if is_dramatic else f"Turn {current_turn}"
                
                self.broadcast_state(msg)
                sio.sleep(current_delay) # Use sio.sleep for cooperative multitasking
                if not self.game_in_progress: break # Check again after sleep

                # --- 3. Play Hand ---
                p0_card = self.player_hands[0].pop(0)
                p1_card = self.player_hands[1].pop(0)
                play_pile = [p0_card, p1_card]
                
                self.broadcast_state("Players draw...", play_pile=play_pile)
                sio.sleep(current_delay)
                if not self.game_in_progress: break

                # --- 4. Compare Cards ---
                if p0_card.rank > p1_card.rank:
                    self.player_hands[0].extend(play_pile)
                    self.stats[0]['hands_won'] += 1 # *** ADDED ***
                    self.broadcast_state("Player 1 wins the hand!", play_pile=play_pile)
                elif p1_card.rank > p0_card.rank:
                    self.player_hands[1].extend(play_pile)
                    self.stats[1]['hands_won'] += 1 # *** ADDED ***
                    self.broadcast_state("Player 2 wins the hand!", play_pile=play_pile)
                else:
                    # --- 5. Handle War ---
                    self.broadcast_state("It's WAR!", play_pile=play_pile)
                    sio.sleep(current_delay)
                    if not self.game_in_progress: break
                    # *** MODIFIED: Pass stats dict to handle_war ***
                    self.handle_war(play_pile) 
                
                sio.sleep(current_delay) # Pause to show result before next turn
            
            except Exception as e:
                log.error(f"Error in game loop for {self.room_code}: {e}", exc_info=True)
                self.end_game("An unexpected error occurred.")
                return # Exit loop on error

        log.info(f"Game loop finished for {self.room_code}. In progress: {self.game_in_progress}, Over: {self.game_over}")

    def handle_war(self, current_spoils):
        """Recursive function to handle a War. current_spoils contains all cards from the tie."""
        war_pile_this_round = []
        
        # --- 1. Check if players have enough cards for war ---
        # Need 2 cards: 1 face down, 1 face up
        if len(self.player_hands[0]) < 2:
            self.player_hands[1].extend(current_spoils) # Give spoils to P1
            self.player_hands[1].extend(self.player_hands[0]) # Give P1 all P0's remaining cards
            self.player_hands[0] = [] # P0 is out
            # *** ADDED: P1 wins hand and war by default ***
            self.stats[1]['hands_won'] += 1 
            self.stats[1]['wars_won'] += 1
            self.broadcast_state("Player 1 doesn't have enough cards for war! Player 2 wins!", play_pile=[], war_pile=current_spoils)
            return
            
        if len(self.player_hands[1]) < 2:
            self.player_hands[0].extend(current_spoils)
            self.player_hands[0].extend(self.player_hands[1])
            self.player_hands[1] = []
            # *** ADDED: P0 wins hand and war by default ***
            self.stats[0]['hands_won'] += 1
            self.stats[0]['wars_won'] += 1
            self.broadcast_state("Player 2 doesn't have enough cards for war! Player 1 wins!", play_pile=[], war_pile=current_spoils)
            return

        # --- 2. Both players have enough cards, draw 1 face down ---
        face_down_p0 = self.player_hands[0].pop(0)
        face_down_p1 = self.player_hands[1].pop(0)
        war_pile_this_round.extend([face_down_p0, face_down_p1])
        
        # Show spoils + face down cards
        self.broadcast_state("Players place 1 card face down...", play_pile=[], war_pile=current_spoils + war_pile_this_round)
        sio.sleep(self.base_delay)
        if not self.game_in_progress: return
        
        # --- 3. Draw 1 face up (battle card) ---
        p0_battle_card = self.player_hands[0].pop(0)
        p1_battle_card = self.player_hands[1].pop(0)
        war_pile_this_round.extend([p0_battle_card, p1_battle_card])
        
        all_cards_in_play = current_spoils + war_pile_this_round
        
        self.broadcast_state("...and 1 card face up!", play_pile=[], war_pile=all_cards_in_play)
        sio.sleep(self.base_delay)
        if not self.game_in_progress: return

        # --- 4. Compare war cards ---
        if p0_battle_card.rank > p1_battle_card.rank:
            self.player_hands[0].extend(all_cards_in_play)
            # *** ADDED: Update P0 stats for war win ***
            self.stats[0]['hands_won'] += 1
            self.stats[0]['wars_won'] += 1
            self.broadcast_state("Player 1 wins the WAR!", play_pile=[], war_pile=all_cards_in_play)
        elif p1_battle_card.rank > p0_battle_card.rank:
            self.player_hands[1].extend(all_cards_in_play)
            # *** ADDED: Update P1 stats for war win ***
            self.stats[1]['hands_won'] += 1
            self.stats[1]['wars_won'] += 1
            self.broadcast_state("Player 2 wins the WAR!", play_pile=[], war_pile=all_cards_in_play)
        else:
            # --- 5. Another War! ---
            self.broadcast_state("ANOTHER WAR!", play_pile=[], war_pile=all_cards_in_play)
            sio.sleep(self.base_delay)
            if not self.game_in_progress: return
            self.handle_war(all_cards_in_play) # Recurse


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
        # Using 4 chars for simplicity
        room_code = ''.join(random.choices('abcdefghjkmnpqrstuvwxyz23456789', k=4))
        if room_code not in games:
            break
    log.info(f"Creating new {game_type} game with code: {room_code}")
    games[room_code] = WarGame(room_code)
    return room_code

def get_game(room_code):
    """Retrieves an active game instance."""
    return games.get(room_code)


# --- Socket Event Handlers (Moved to end) ---

def register_handlers(socketio):
    """Registers all socket event handlers with the Flask-SocketIO app."""
    
    # This check ensures app.py called register_socketio_instance first
    if not sio:
        log.error("Socket.IO instance must be registered before registering handlers.")
        return

    log.info("Registering Socket.IO event handlers...")

    @socketio.on('connect')
    def on_connect():
        log.info(f"Client connected: {request.sid}")

    @socketio.on('disconnect')
    def on_disconnect():
        sid = request.sid 
        log.info(f"Client disconnected: {sid}")
        
        game_found = False
        for room_code, game in list(games.items()):
            if sid in game.players:
                game_found = True
                player_left = game.remove_player(sid) 
                
                if player_left and not game.players and not game.game_in_progress:
                    log.info(f"Room {room_code} is empty after disconnect, cleaning up immediately.")
                    if room_code in games: 
                         del games[room_code]
                         try:
                             close_room(room_code)
                         except Exception as e:
                             log.error(f"Error closing room {room_code} on disconnect cleanup: {e}")
                break 
        
        if not game_found:
             log.warning(f"Disconnected SID {sid} was not found in any active game.")


    @socketio.on('create_game')
    def on_create_game():
        sid = request.sid
        log.info(f"Received create_game request from {sid}")
        room_code = create_new_game('war_classic')
        if room_code:
            emit('game_created', {'room_code': room_code})
            log.info(f"Sent game_created event to {sid} for room {room_code}")
        else:
            emit('error', {'message': 'Failed to create game.'})
            log.error(f"Failed to create game for {sid}")

    @socketio.on('join_game')
    def on_join_game(data):
        sid = request.sid
        if not data or 'room_code' not in data:
             log.warning(f"Join request from {sid} missing room_code.")
             emit('join_error', {'message': 'Room code missing.'})
             return

        room_code = data.get('room_code').lower() # Normalize room code
        log.info(f"Received join_game request from {sid} for room {room_code}")

        game = get_game(room_code)
        if not game:
            log.warning(f"Player {sid} tried to join non-existent room: {room_code}")
            emit('join_error', {'message': 'Game not found. It may have expired.'})
            return

        if game.game_over:
             log.warning(f"Player {sid} tried to join finished game: {room_code}")
             emit('join_error', {'message': 'This game has already finished.'})
             return
        
        player_index = game.add_player(sid)
        
        if player_index is None:
            log.warning(f"Player {sid} tried to join full room: {room_code}")
            emit('join_error', {'message': 'This game is already full.'})
            return

        join_room(room_code)
        log.info(f"Added {sid} to socket.io room {room_code}")

        emit('you_joined', {'player_index': player_index})

        if len(game.players) == 2 and not game.game_in_progress:
            # (From previous step: Show start button)
            sio.emit('status_update', {'message': 'Both players are in the room. Press Start to begin!'}, to=room_code)
            log.info(f"Two players in {room_code}, ready to start.")
            sio.emit('show_start_button', to=room_code)
        elif len(game.players) == 1:
            emit('status_update', {'message': 'Waiting for Player 2 to join...'})
        else:
             if game.game_in_progress:
                game.broadcast_state("Player reconnected")

    @socketio.on('change_speed')
    def on_change_speed(data):
        sid = request.sid
        if not data or 'room_code' not in data or 'change' not in data:
             log.warning(f"Invalid change_speed request from {sid}: {data}")
             return

        room_code = data.get('room_code').lower()
        change = data.get('change', 0.0)
        log.info(f"Received change_speed request from {sid} for room {room_code}, change: {change}")

        game = get_game(room_code)
        if game:
            if sid in game.players: 
                game.change_speed(change)
            else:
                log.warning(f"Player {sid} tried to change speed for game {room_code} they aren't in.")
        else:
            log.warning(f"Player {sid} tried to change speed for non-existent game: {room_code}")

    # (From previous step: Start game handler)
    @socketio.on('start_game')
    def on_start_game(data):
        sid = request.sid
        if not data or 'room_code' not in data:
             log.warning(f"Start_game request from {sid} missing room_code.")
             return
        
        room_code = data.get('room_code').lower()
        log.info(f"Received start_game request from {sid} for room {room_code}")
        
        game = get_game(room_code)
        if not game:
            log.warning(f"Start_game error: Game {room_code} not found for {sid}.")
            return
        
        if sid not in game.players:
            log.warning(f"Start_game error: Player {sid} not in game {room_code}.")
            return

        if not game.game_in_progress:
            log.info(f"Game {room_code} started by {sid}.")
            game.start_game()
        else:
            log.warning(f"Player {sid} sent start_game but game {room_code} already in progress.")

    log.info("Socket.IO event handlers registered successfully.")
