import secrets
import logging

# This will store all active games in memory.
# The key will be the room_code, and the value will be the game state.
# For Phase 1, the game state is just a simple dictionary.
active_games = {}

# Set up logging
log = logging.getLogger(__name__)

def create_new_game(game_type='war_classic'):
    """
    Generates a unique room code and initializes a new game in active_games.
    """
    while True:
        room_code = secrets.token_hex(4) # Generates a simple 8-char code
        if room_code not in active_games:
            break
            
    game_state = {
        "room_code": room_code,
        "game_type": game_type,
        "players": {} # We'll store players by their session ID (sid)
    }
    active_games[room_code] = game_state
    log.info(f"New game created with code: {room_code}")
    return room_code

def get_game(room_code):
    """
    Retrieves a game state from the active_games dictionary.
    """
    return active_games.get(room_code)

def add_player_to_game(room_code, player_sid, player_name="Player"):
    """
    Adds a player (identified by their session ID) to a game.
    """
    game = get_game(room_code)
    if game:
        player_count = len(game["players"])
        new_player = {
            "sid": player_sid,
            "name": f"{player_name} {player_count + 1}" # Simple name for now
        }
        game["players"][player_sid] = new_player
        log.info(f"Player {player_sid} joined room {room_code}. Total players: {len(game['players'])}")
        return new_player
    return None

def remove_player_from_game(room_code, player_sid):
    """
    Removes a player from a game using their session ID.
    """
    game = get_game(room_code)
    if game and player_sid in game["players"]:
        del game["players"][player_sid]
        log.info(f"Player {player_sid} left room {room_code}. Total players: {len(game['players'])}")
        
        # If no players are left, we can clean up the game room
        if not game["players"]:
            del active_games[room_code]
            log.info(f"Room {room_code} is empty and has been deleted.")
# Note: The extra '}' that was here has been removed.
