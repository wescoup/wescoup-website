import os
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# ... (your existing routes like /) ...

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/testpage')
def testpage():
    return render_template('testpage.html')

# --- Tennis Routes ---
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


# --- NEW GAME ROUTES ---
@app.route('/tonys-time-traps')
def tonys_time_traps():
    return render_template('games/tonys-time-traps.html')

@app.route('/tonys-war-game')
def tonys_war_game():
    return render_template('games/tonys-war-game.html')
# --- END NEW GAME ROUTES ---


if __name__ == '__main__':
    app.run(debug=True)
