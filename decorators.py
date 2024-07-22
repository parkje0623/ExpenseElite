from functools import wraps
from flask import redirect, url_for
from flask_login import current_user

def login_required(view):
    @wraps(view)
    def wrapped_view(*arg, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for('login'))
        return view(*arg, **kwargs)
    return wrapped_view

def already_logged_in(view):
    @wraps(view)
    def wrapped_view(*arg, **kwargs):
        if current_user.is_authenticated:
            return redirect(url_for('index'))
        return view(*arg, **kwargs)
    return wrapped_view