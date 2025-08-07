from flask import Flask, render_template
import os

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/tonys-tennis-page')
def tonys_tennis_page():
    return render_template('tonys-tennis-page.html')

@app.route('/tonys-tennis-tracker')
def tonys_tennis_tracker():
    return render_template('tonys_tennis_tracker.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
