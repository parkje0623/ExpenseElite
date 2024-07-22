from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect

import os

# Create Flask application instance
app = Flask(__name__)

load_dotenv()

# DB Connection
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')
db_host = os.getenv('DB_HOST')
db_name = os.getenv('DB_NAME')
db_uri = f'mysql+mysqlconnector://{db_user}:{db_password}@{db_host}/{db_name}'

app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Secret Key for session
app.config['SECRET_KEY'] = os.getenv('APP_SECRET_KEY')

# Flask-Login
login_manager = LoginManager(app)
login_manager.session_protection = "strong"
login_manager.login_view = "login"
login_manager.login_message_category = "info"

# CSRF Protection
csrf = CSRFProtect(app)

# Absoulte (Math filter)
@app.template_filter('abs')
def abs_filter(value):
    try:
        return abs(float(value))
    except (ValueError, TypeError):
        return value

app.jinja_env.filters['abs'] = abs_filter

from app import routes, models