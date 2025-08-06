# app.py
from flask import Flask, render_template_string
import os

app = Flask(__name__)

# Read the HTML content
html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Wescoup.com</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            text-align: center;
        }
        .container {
            max-width: 600px;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            backdrop-filter: blur(4px);
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .status {
            background: rgba(255, 255, 255, 0.2);
            padding: 1rem;
            border-radius: 5px;
            margin-top: 2rem;
        }
        .date {
            font-size: 0.9rem;
            opacity: 0.7;
            margin-top: 1rem;
        }
        a {
            color: #ffeb3b;
            text-decoration: none;
            font-weight: bold;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Hello World!</h1>
        <p>Welcome to <strong>Wescoup.com</strong></p>
        <p>This is Felipe's new domain, successfully deployed on Heroku!</p>
        
        <div class="status">
            <strong>🚀 Status:</strong> Live and Running<br>
            <strong>🌐 Domain:</strong> wescoup.com<br>
            <strong>☁️ Hosting:</strong> Heroku<br>
            <strong>📝 Content:</strong> Ready for updates
        </div>
        
        <div class="date">
            Launched: August 6, 2025
        </div>
        
        <p style="margin-top: 2rem;">
            <a href="https://bonete-wescoup.com">Visit Bonete-Wescoup.com</a>
        </p>
    </div>
</body>
</html>
"""

@app.route('/')
def home():
    return render_template_string(html_content)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))

---

# requirements.txt
Flask==2.3.3
gunicorn==21.2.0

---

# Procfile
web: gunicorn app:app

---

# README.md
# Wescoup.com

Simple Hello World landing page for wescoup.com

## Deployment
- Platform: Heroku
- Framework: Flask (Python)
- Domain: wescoup.com

## Updates
- Initial launch: August 6, 2025
- Ready for content migration from W3Schools Spaces
