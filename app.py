import os
import logging
import eventlet # Import eventlet for async mode

# Use eventlet for async capabilities required by background tasks
eventlet.monkey_patch()

from flask import Flask, render_template, redirect, url_for, session, request
from flask_socketio import SocketIO # No need for emit, join_room, etc. here anymore

# --- App Setup ---
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'a_very_secret_key_please_change')

# --- Logging Setup ---
# Configure logging before initializing SocketIO or importing manager
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
log = logging.getLogger(__name__)

# --- SocketIO Setup ---
# Initialize SocketIO after Flask app, including CORS configuration
socketio = SocketIO(app, async_mode="eventlet", cors_allowed_origins=[
    "https://wescoup-website-jlf2h.ondigitalocean.app", # Allow frontend origin
    # Add other origins if needed, e.g., "http://localhost:5001" for local testing
])

# --- Game Logic Import and Handler Registration ---
# Import the manager module AFTER socketio has been created
try:
    from game_logic import manager
    # Pass the initialized socketio instance to the manager
    manager.register_socketio_instance(socketio)
    # Register all event handlers defined within the manager module
    manager.register_handlers(socketio)
    log.info("Game logic manager imported and handlers registered.")
except ImportError:
    log.error("Failed to import game_logic.manager. Ensure the module exists.")
except Exception as e:
    log.error(f"An error occurred during manager initialization: {e}", exc_info=True)


# --- Standard Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/tonys-tennis-tools')
def tonys_tennis_tools():
    return render_template('tennis/tonys-tennis-tools.html')

# Add other standard tool routes if they exist...
@app.route('/tonys-pickleball-tools')
def tonys_pickleball_tools():
    return render_template('pickleball/tonys-pickleball-tools.html')


# --- Game Routes ---
@app.route('/tonys-time-traps')
def tonys_time_traps():
    """Serves the main game selection page."""
    return render_template('games/tonys-time-traps.html')

@app.route('/tonys-war-game')
def tonys_war_game():
    """Serves the single-player War game page."""
    return render_template('games/tonys-war-game.html')

# --- Multiplayer War Routes ---
@app.route('/war/new')
def war_new_game():
    """Renders the 2-player lobby page."""
    log.info("Serving 2-player War lobby page.")
    return render_template('games/war_lobby.html')

@app.route('/war/game/<code>')
def war_game_room(code):
    """Renders the 2-player game board page."""
    log.info(f"Serving 2-player War game page for room: {code}")
    # Pass the room code to the template so JavaScript can access it
    return render_template('games/war_multiplayer.html', room_code=code)


# --- Test/Utility Routes (Keep or remove as needed) ---
@app.route("/socketio-test")
def socketio_test():
    """ A simple page for testing Socket.IO connection """
    return render_template("socketio_test.html")


# --- Main Execution ---
if __name__ == '__main__':
    log.info("Starting Wescoup website locally with Flask-SocketIO...")
    # Get port from environment or default to 5001 for local dev
    port = int(os.environ.get('PORT', 5001))
    # Use socketio.run() for development server which handles WebSockets correctly
    socketio.run(app, debug=True, host='0.0.0.0', port=port)

# Note: The Procfile uses gunicorn, which is correct for Heroku deployment.
# The `if __name__ == '__main__':` block is only for running locally (e.g., `python app.py`).
