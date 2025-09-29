from flask import Flask, render_template
import os

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/tonys-tennis-tools')
def tonys_tennis_page():
    return render_template('tennis/tonys-tennis-tools.html')

@app.route('/tonys-tennis-tracker')
def tonys_tennis_tracker():
    return render_template('tennis/tonys-tennis-tracker.html')

@app.route('/tonys-doubles-tracker')
def tonys_doubles_tracker():
    return render_template('tennis/tonys-doubles-tracker.html')

@app.route('/second-shot')
def second_shot():
    return render_template('tennis/second-shot.html')

@app.route('/tonys-tennis-tracker-20')
def tonys_tennis_tracker_20():
    return render_template('tennis/tonys-tennis-tracker-20.html')

@app.route("/tonys-strategy-calculator")
def tonys_strategy_calculator():
    """Show Tony's Strategy Calculator page"""
    return render_template("tennis/tonys-strategy-calculator.html")

@app.route("/tonys-strategy-calculator-instructions")
def tonys_strategy_calculator_instructions():
    """Show Tony's Strategy Calculator instructions page"""
    return render_template("tennis/tonys-strategy-calculator-instructions.html")

@app.route("/tonys-tracker-instructions")
def tonys_tracker_instructions():
    """Show the instructions page for the tennis trackers"""
    return render_template("tennis/tonys-tracker-instructions.html")

@app.route('/tonys-pickleball-tools')
def tonys_pickleball_tools():
    return render_template('pickleball/tonys-pickleball-tools.html')

@app.route('/tonys-pickleball-tracker')
def tonys_tennis_tracker():
    return render_template('pickleball/tonys-pickleball-tracker.html')

@app.route("/tonys-pickleball-instructions")
def tonys_tracker_instructions():
    """Show the instructions page for the pickleball trackers"""
    return render_template("pickleball/tonys-pickleball-instructions.html")

@app.route("/testpage")
def testpage():
    """Show the test page"""
    return render_template("testpage.html")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
