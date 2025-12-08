import os
import logging
import eventlet # Import eventlet for async mode
import uuid # For generating the unique user ID

# Use eventlet for async capabilities required by background tasks
eventlet.monkey_patch()

from flask import Flask, render_template, redirect, url_for, session, request
from flask_socketio import SocketIO # No need for emit, join_room, etc. here anymore
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Length, Email, EqualTo, ValidationError
from flask_bcrypt import Bcrypt
from flask import g, make_response, redirect, url_for, flash

# --- App Setup ---
app = Flask(__name__)
# --- Database Configuration ---
# Heroku uses 'postgres://', but SQLAlchemy 2+ expects 'postgresql://'
if 'DATABASE_URL' in os.environ:
    uri = os.environ.get('DATABASE_URL').replace("://", "ql://", 1)
else:
    # Use SQLite for local development
    uri = 'sqlite:///site.db' 

app.config['SQLALCHEMY_DATABASE_URI'] = uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Recommended to silence a warning

# THIS LINE IS CRUCIAL: it defines the 'db' object
db = SQLAlchemy(app) 
bcrypt = Bcrypt(app) # Initialize Bcrypt

# --- Database Models ---
# --- Database Models ---
class User(db.Model):
    # CHANGE: Use db.String(36) to store the UUID string
    id = db.Column(db.String(36), primary_key=True) 
    username = db.Column(db.String(20), nullable=False, default='Player1')
    email = db.Column(db.String(120), unique=True, nullable=True) 
    password_hash = db.Column(db.String(60), nullable=True) 

    def __repr__(self):
        return f"User('{self.username}', '{self.email}')"

# --- Identity Management ---
USER_ID_COOKIE_NAME = 'user_id' # The key for the cookie

@app.before_request
def load_or_create_user():
    """Checks for a user cookie; loads the user or creates a new one."""
    user_id_cookie = request.cookies.get(USER_ID_COOKIE_NAME)

    user = None # Initialize user object

    if user_id_cookie:
        # 1. Cookie exists: Try to load the user from the database using db.session.get()
        # This is more robust than User.query.get(id) in certain contexts.
        user = db.session.get(User, user_id_cookie)
        if user:
            g.user = user # Store user object on Flask's global request context
            return # Continue to the requested route
        # If user_id_cookie exists but user is not in DB, we treat it as new.

    # 2. No valid cookie/user found: Create a new anonymous user (Tier 1)
    if not user: # If the user object is still None, create a new one
        new_user_id = str(uuid.uuid4()) # Generate a UUID for the primary key
        new_user = User(
            id=new_user_id,
            username='Player1', # Default name as requested
        )

        # Add and commit the new user within a transaction
        try:
            db.session.add(new_user)
            db.session.commit()
            
            # CRUCIAL: After commit, the object is technically detached, but since 
            # we are using db.session.get() above for existing users, and the 
            # new_user object is fresh, storing it in g.user is generally safe, 
            # but we can improve it by being explicit:
            
            # Reload the object (optional, but robust)
            g.user = db.session.get(User, new_user_id) 

        except Exception as e:
            db.session.rollback()
            # If an error occurs here, we still need to set g.user to something 
            # to prevent further failure, but since it's a critical failure, 
            # it's best to log and redirect.
            app.logger.error(f"Failed to create new user: {e}")
            # In a real app, you would redirect to an error page. For now, 
            # we let the request continue and rely on the existing g.user setting 
            # in the happy path.
            # We'll stick to setting g.user = new_user, as the error path 
            # likely caused the redirect you saw before.
            g.user = new_user
    
    return
    
@app.after_request
def set_user_cookie(response):
    """Sets the long-term cookie if g.user is new or missing the cookie."""
    if not request.cookies.get(USER_ID_COOKIE_NAME):
        # Only set if the cookie is not already present from the request
        # Setting a cookie requires a response object, which is why we do this here.
        # We set a long-term cookie (e.g., 5 years)
        response.set_cookie(USER_ID_COOKIE_NAME, g.user.id, max_age=60*60*24*365*5) 
    return response

# (Your existing app.config['SECRET_KEY'] should be here or moved up)
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'a_very_secret_key_please_change')

# --- Logging Setup ---
# Configure logging before initializing SocketIO or importing manager
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
log = logging.getLogger(__name__)

# --- SocketIO Setup ---
# Initialize SocketIO after Flask app, including CORS configuration
socketio = SocketIO(app, async_mode="eventlet", cors_allowed_origins="*")

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

# --- Math Routes ---
@app.route('/tonys-math-musings')
def tonys_math_musings():
    return render_template('math/tonys-math-musings.html')

@app.route('/space-launch-assist')
def space_launch_assist():
    return render_template('math/space-launch-assist.html')

@app.route('/optimal-strategy')
def optimal_strategy():
    return render_template('math/optimal-strategy.html')

@app.route('/prime-number-generation')
def prime_number_generation():
    return render_template('math/prime-number-generation.html')

@app.route('/cosmological-redshift-hypothesis')
def cosmological_redshift_hypothesis():
    return render_template('math/cosmological-redshift-hypothesis.html')

@app.route('/redefining-gravity')
def redefining_gravity():
    return render_template('math/redefining-gravity.html')

# --- Tennis & Pickleblall Routes ---
@app.route('/tonys-tennis-tools')
def tonys_tennis_tools():
    return render_template('tennis/tonys-tennis-tools.html')

@app.route('/tonys-tracker-instructions')
def tonys_tracker_instructions():
    return render_template('tennis/tonys-tracker-instructions.html')

@app.route('/tonys-tennis-tracker')
def tonys_tennis_tracker():
    return render_template('tennis/tonys-tennis-tracker.html')

@app.route('/tonys-doubles-tracker')
def tonys_doubles_tracker():
    return render_template('tennis/tonys-doubles-tracker.html')

@app.route('/tonys-pickleball-tools')
def tonys_pickleball_tools():
    return render_template('pickleball/tonys-pickleball-tools.html')

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

# --- Game Routes ---
@app.route('/tonys-time-traps')
def tonys_time_traps():
    """Serves the main game selection page."""
    return render_template('games/tonys-time-traps.html')

@app.route('/tonys-war-game')
def tonys_war_game():
    """Serves the single-player War game page."""
    # Use g.user.username, which is guaranteed to be set by the @app.before_request hook
    player_username = g.user.username
    return render_template('games/tonys-war-game.html', player_username=player_username)

# --- Multiplayer War Routes ---
@app.route('/war/new')
def war_new_game():
    """Renders the 2-player lobby page."""
    log.info("Serving 2-player War lobby page.")
    # g.user is populated in load_or_create_user()
    return render_template(
        'games/war_lobby.html',
        player_username=g.user.username
    )


@app.route('/war/game/<code>')
def war_game_room(code):
    """Renders the 2-player game board page."""
    log.info(f"Serving 2-player War game page for room: {code}")
    # Pass room code + username to the template so JS can use both
    return render_template(
        'games/war_multiplayer.html',
        room_code=code,
        player_username=g.user.username
    )

@app.route('/profile')
def user_profile():
    """Renders the user profile page using the current user (Tier 1 or Tier 2)."""
    # g.user is guaranteed to be set by the @app.before_request function
    # We check if email is set to determine if the user is authenticated (Tier 2)
    user_data = {
        'id': g.user.id,
        'username': g.user.username,
        'email': g.user.email,
        'is_authenticated': g.user.email is not None, # User is Tier 2 if email is not NULL
    }
    return render_template('user_profile.html', user=user_data)
    
@app.route('/change_username', methods=['POST'])
def change_username():
    """Handles the POST request to change the user's display name."""
    if request.method == 'POST':
        new_username = request.form.get('username')
        
        # Simple validation: prevent empty submissions
        if not new_username or len(new_username.strip()) < 2:
            flash('Username must be at least 2 characters long.', 'danger')
            return redirect(url_for('user_profile'))

        # Check for reserved/default name if Tier 2 (optional, can be expanded)
        # For now, let's keep it simple: just update the current user.
        
        try:
            # g.user is the current user's object loaded by @app.before_request
            g.user.username = new_username.strip()
            db.session.commit()
            flash('Your display name has been updated successfully!', 'success')
            return redirect(url_for('user_profile'))
            
        except Exception as e:
            db.session.rollback()
            flash('An error occurred while changing your username.', 'danger')
            app.logger.error(f"Username change failed for user {g.user.id}: {e}")
            return redirect(url_for('user_profile'))
            
    return redirect(url_for('user_profile'))

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
