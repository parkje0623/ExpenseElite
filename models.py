from app import db, login_manager
from flask_login import UserMixin
from datetime import datetime

import pytz
vancouver_tz = pytz.timezone('America/Vancouver')
def vancouver_now():
    return datetime.now(vancouver_tz)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# User Table
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable = False)
    verification_token = db.Column(db.String(100), nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: vancouver_now())
    updated_at = db.Column(db.DateTime, default=lambda: vancouver_now(), onupdate=lambda: vancouver_now())

    assets = db.relationship('Asset', back_populates='owner', lazy=True, cascade="all, delete-orphan")
    expense_categories = db.relationship('ExpenseCategory', back_populates='user', lazy=True, cascade="all, delete-orphan")
    transactions = db.relationship('Transaction', back_populates='user', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return '<User %r>' % self.email

# Asset (Category) Table
class Asset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    asset_group_name = db.Column(db.String(100), nullable=False)
    asset_name = db.Column(db.String(100), nullable=False)
    asset_amount = db.Column(db.Float, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    owner = db.relationship('User', back_populates='assets')

    def __repr__(self):
        return f"Asset('{self.asset_group_name}', '{self.asset_name}', {self.asset_amount})"

# Expense Category Table
class ExpenseCategory(db.Model):
    __tablename__ = 'expense_category'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: vancouver_now())
    updated_at = db.Column(db.DateTime, default=lambda: vancouver_now(), onupdate=lambda: vancouver_now())

    user = db.relationship('User', back_populates='expense_categories')

    def __repr__(self):
        return f'<ExpenseCategory {self.name}>'

# Expense Transaction Table
class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    asset_id = db.Column(db.Integer, db.ForeignKey('asset.id'))
    category_id = db.Column(db.Integer, db.ForeignKey('expense_category.id')) # Expense category
    type = db.Column(db.String(20), nullable=False) # Income, Expense, or Transfer
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    date = db.Column(db.Date, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: vancouver_now())
    updated_at = db.Column(db.DateTime, default=lambda: vancouver_now(), onupdate=lambda: vancouver_now())

    from_asset_id = db.Column(db.Integer, db.ForeignKey('asset.id'))
    to_asset_id = db.Column(db.Integer, db.ForeignKey('asset.id'))

    user = db.relationship('User', back_populates='transactions')
    asset = db.relationship('Asset', foreign_keys=[asset_id])
    category = db.relationship('ExpenseCategory', foreign_keys=[category_id])
    from_asset = db.relationship('Asset', foreign_keys=[from_asset_id])
    to_asset = db.relationship('Asset', foreign_keys=[to_asset_id])

    def __repr__(self):
        return f'<Transaction {self.type} - {self.amount}>'

