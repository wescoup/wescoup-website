import os
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_socketio import SocketIO, join_room, leave_room, emit

# Import our new game manager
from game_logic import manager

app = Flask(__name__)
# A secret key is required for Flask sessions and Socket.IO
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'a_very_secret_key_you_should_change')
socketio = SocketIO(app)

# --- Standard Routes ---
@app.route('/')
def index():
    return render_template('index.html')

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
    """
    Serves the "lobby" page where a player can create or join a game.
    """
    return render_template('games/war_lobby.html')

@app.route('/war/game/<string:game_id>')
def war_game_room(game_id):
    """
    Serves the actual game room page for a specific game ID.
    """
    game = manager.get_game(game_id)
    if not game:
        # If the game ID doesn't exist, send them back to the lobby
        return redirect(url_for('war_new_game'))
    
    # We store the room code in the user's session
    session['room_code'] = game_id
    return render_template('games/war_multiplayer.html', game_code=game_id)

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


# --- Main Runner ---
if __name__ == '__main__':
    # Use socketio.run() instead of app.run() to start the server
    socketio.run(app, debug=True)
