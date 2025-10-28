import os
from flask import Flask, render_template, redirect, url_for, session, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import logging
from werkzeug.serving import run_simple # For local testing
import eventlet # Import eventlet

# Use eventlet for async
eventlet.monkey_patch()

# --- App Setup ---
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'a_very_secret_key_you_should_change')

# Create socketio first
socketio = SocketIO(app, async_mode="eventlet")

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
log = logging.getLogger(__name__)

# --- Game Logic Import ---
# Import AFTER socketio exists
from game_logic import manager
# Pass the socketio instance to the manager
manager.register_socketio_instance(socketio)
# Register all event handlers defined in the manager
manager.register_handlers(socketio)

# --- Session Management ---
@app.before_request
def assign_session_id():
    """Assign a unique SID to the user's session if one doesn't exist."""
    if 'sid' not in session:
        session['sid'] = request.sid
        log.info(f"New session created with SID: {session['sid']}")

@app.route("/")
def index():
    return render_template("index.html")

@app.route('/testpage')
def testpage():
    return render_template('testpage.html')

# --- Tennis Routes ---
# ... (all your existing tennis routes are unchanged) ...
@app.route('/tonys-tennis-tools')
def tonys_tennis_tools():
    return render_template('tennis/tonys-tennis-tools.html')
    
@app.route('/tonys-tennis-tracker')
def tonys_tennis_tracker():
    return render_template('tennis/tonys-tennis-tracker.html')

@app.route('/tonys-tennis-tracker-20')
def tonys_tennis_tracker_20():
    return render_template('tennis/tonys-tennis-tracker-20.html')

@app.route('/tonys-doubles-tracker')
def tonys_doubles_tracker():
    return render_template('tennis/tonys-doubles-tracker.html')

@app.route('/tonys-tracker-instructions')
def tonys_tracker_instructions():
    return render_template('tennis/tonys-tracker-instructions.html')

@app.route('/tonys-strategy-calculator')
def tonys_strategy_calculator():
    return render_template('tennis/tonys-strategy-calculator.html')

@app.route('/tonys-strategy-calculator-instructions')
def tonys_strategy_calculator_instructions():
    return render_template('tennis/tonys-strategy-calculator-instructions.html')

@app.route('/tonys-strategy-calculator-2x2')
def tonys_strategy_calculator_2x2():
    return render_template('tennis/tonys-strategy-calculator-2x2.html')

@app.route('/tonys-strategy-calculator-3x3')
def tonys_strategy_calculator_3x3():
    return render_template('tennis/tonys-strategy-calculator-3x3.html')

@app.route('/tonys-strategy-calculator-NxN')
def tonys_strategy_calculator_NxN():
    return render_template('tennis/tonys-strategy-calculator-NxN.html')

@app.route('/second-shot')
def second_shot():
    return render_template('tennis/second-shot.html')


# --- Pickleball Routes ---
# ... (all your existing pickleball routes are unchanged) ...
@app.route('/tonys-pickleball-tools')
def tonys_pickleball_tools():
    return render_template('pickleball/tonys-pickleball-tools.html')

@app.route('/tonys-pickleball-tracker')
def tonys_pickleball_tracker():
    return render_template('pickleball/tonys-pickleball-tracker.html')

@app.route('/tonys-pickleball-doubles-tracker')
def tonys_pickleball_doubles_tracker():
    return render_template('pickleball/tonys-pickleball-doubles-tracker.html')

@app.route('/tonys-pickleball-instructions')
def tonys_pickleball_instructions():
    return render_template('pickleball/tonys-pickleball-instructions.html')


# --- GAME ROUTES ---
@app.route('/tonys-time-traps')
def tonys_time_traps():
    return render_template('games/tonys-time-traps.html')

@app.route('/tonys-war-game')
def tonys_war_game():
    # This is your existing 1-Player game, untouched.
    return render_template('games/tonys-war-game.html')

# --- NEW 2-Player War Routes ---
@app.route('/war/new')
def war_new_game():
    """Renders the 2-player lobby."""
    return render_template('games/war_lobby.html')

@app.route('/war/game/<code>')
def war_game_room(code):
    """Renders the 2-player game board."""
    log.info(f"Serving game page for room: {code}")
    # Pass the room code to the template
    return render_template('games/war_multiplayer.html', room_code=code)

# --- SOCKET.IO EVENTS ---

@socketio.on('create_game')
def on_create_game():
    """
    Event handler for when a user clicks 'Create Game'.
    """
    room_code = manager.create_new_game('war_classic')
    # Send an event *only* to the user who created the game
    emit('game_created', {'room_code': room_code})

@socketio.on('join_game')
def on_join_game(data):
    """
    Event handler for when a user loads the game room page.
    """
    room_code = data.get('room_code')
    player_sid = request.sid
    
    game = manager.get_game(room_code)
    if game:
        manager.add_player_to_game(room_code, player_sid)
        # Use Socket.IO's 'join_room' to subscribe this user to room-specific broadcasts
        join_room(room_code)
        
        # Broadcast the new player count to *everyone* in the room
        player_count = len(game["players"])
        emit('player_list_updated', {'count': player_count}, to=room_code)
    else:
        # Handle case where room doesn't exist (e.g., server restarted)
        emit('error', {'message': 'Game not found.'})

@socketio.on('disconnect')
def on_disconnect():
    """
    Event handler for when a user closes their browser or tab.
    """
    player_sid = request.sid
    # Get the room from the user's session
    room_code = session.get('room_code')
    
    if room_code:
        game = manager.get_game(room_code)
        if game:
            manager.remove_player_from_game(room_code, player_sid)
            # Broadcast the new player count to everyone *still* in the room
            player_count = len(game["players"])
            emit('player_list_updated', {'count': player_count}, to=room_code)
            leave_room(room_code)

@app.route("/socketio-test")
def socketio_test():
    return render_template("socketio_test.html")

# --- Main Runner ---
if __name__ == '__main__':
    log.info("Starting Wescoup website in debug mode with Socket.IO...")
    # Use socketio.run for local development
    socketio.run(app, debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5001)))
