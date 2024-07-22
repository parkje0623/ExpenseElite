from flask import render_template, request, redirect, url_for, jsonify
from app import app, db
from app.models import User, Asset, ExpenseCategory, Transaction
from app.forms import LoginForm, RegisterForm, ForgotPwdForm, ResetPwdForm
from dotenv import load_dotenv
load_dotenv()
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from flask_login import login_user, current_user, logout_user
from app.decorators import login_required, already_logged_in
from datetime import datetime
from sqlalchemy import or_, extract, func
from sqlalchemy.orm import joinedload

import secrets
import bcrypt
import os

# Hashing Password for registration & database storing
def hash_password(password):
    # Generate a salt and hash the password using bcrypt
    salt = bcrypt.gensalt(rounds=12)
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_password

# Sending email through SendGrid to users - Registration, Reset Password
def send_sendgrid_email(email, subject, html_content):
    message = Mail(
        from_email='parkje0623@naver.com',
        to_emails=email,
        subject=subject,
        html_content=html_content
    )

    try:
        sg = SendGridAPIClient(os.getenv('SENDGRID_API'))
        response = sg.send(message)
        print(response.status_code)
        print(response.body)
        print(response.headers)
    except Exception as e:
        print(f'Error occurred sending verification email: {str(e)}')


# Home Page
@app.route('/')
@app.route("/index")
@login_required
def index():
    # Initially retrieve current year and month
    # From user: get the selected month and year from query parameters
    selected_year = request.args.get('year', default=datetime.now().year, type=int)
    selected_month = request.args.get('month', default=datetime.now().month, type=int)

    # Query transactions for the selected month
    transactions = db.session.query(Transaction).options(
            joinedload(Transaction.asset),
            joinedload(Transaction.category),
            joinedload(Transaction.from_asset),
            joinedload(Transaction.to_asset)
        ).filter(
            Transaction.user_id == current_user.id,
            extract('year', Transaction.date) == selected_year,
            extract('month', Transaction.date) == selected_month
        ).order_by(Transaction.date.desc()).all()

    # Grouping Transactions by its date
    transaction_groups = {}
    for transaction in transactions:
        date = transaction.date
        if date not in transaction_groups:
            transaction_groups[date] = []
        transaction_groups[date].append(transaction)

    # Calculate totals for each group date and overall total for the month
    daily_totals = {}
    total_income = 0
    total_expense = 0
    for date, transactions in transaction_groups.items():
        daily_income = 0
        daily_expense = 0
        for transaction in transactions:
            if transaction.type == 'income':
                daily_income += float(transaction.amount)
                total_income += float(transaction.amount)
            elif transaction.type == 'expense':
                daily_expense += float(transaction.amount)
                total_expense += float(transaction.amount)
        daily_totals[date] = {'income': daily_income, 'expense': daily_expense}

    overall_total = total_income + total_expense
    totals = {'income': total_income, 'expense': total_expense, 'overall': overall_total}

    return render_template('index.html',
                            transaction_groups=transaction_groups,
                            daily_totals=daily_totals,
                            totals=totals,
                            selected_year=selected_year,
                            selected_month=selected_month)


# Login page
@app.route('/login', methods=['GET', 'POST'])
@already_logged_in
def login():
    form = LoginForm()
    if form.validate_on_submit():
        if request.method == 'POST':
            email = request.form['email']
            password = request.form['password']

            # Check if email exists in Database
            user = User.query.filter_by(email=email).first()

            # If email exists proceed to password check procedure
            if user and bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
                login_user(user)
                return redirect(url_for('index'))
            else:
                return render_template('login.html', form=form, message="Invalid email or password. Please try again.", message_type="danger")

    return render_template('login.html', form=form)

# Logout
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# Register page
@app.route('/register', methods=['GET', 'POST'])
@already_logged_in
def register():
    form = RegisterForm()
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        # Check if the email is already in-use
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return render_template('register.html', form=form, message="Email is already in-use. Log-in with your email or use different email to register.", message_type="danger")

        # Generate verification token
        verification_token = secrets.token_urlsafe(32)
        # Hash Password
        hashed_password = hash_password(password)

        # Create new user object
        new_user = User(email=email, password=hashed_password, verification_token=verification_token)
        # Add user object to the database session
        db.session.add(new_user)
        db.session.commit()

        # Send verification email and redirect user
        subject = 'Expense Tracker Email Verification'
        html_content = f'''
            <strong>
                Thank you for registering with Expense Tracker. Please check the following link to verify your email address:
                <br><br>
                {url_for('verify_email', token=verification_token, _external=True)}
                <br><br>
                If you did not register for an account, please ignore this email.
            </strong>
        '''
        send_sendgrid_email(email, subject, html_content)

        return render_template('login.html', form=LoginForm(), message="Registration successful. Please check your email to verify your account.", message_type="success")

    return render_template('register.html', form=form)

# Verifying Email Page
@app.route('/verify_email/<token>')
@already_logged_in
def verify_email(token):
    # Find user by verification token
    verify_user = User.query.filter_by(verification_token=token).first()

    if verify_user:
        verify_user.is_verified = True
        db.session.commit()

        return render_template('login.html', form=LoginForm(), message="Verification Successful! Please log-in again!", message_type="success")
    else:
        return render_template('login.html', form=LoginForm(), message="Verification failed. Please contact parkje0623@naver.com for support.", message_type="danger")

    return redirect(url_for('login'))

# Forgot Password page
@app.route('/forgot_password', methods=['GET', 'POST'])
@already_logged_in
def forgot_password():
    form = ForgotPwdForm()
    if request.method == 'POST':
        email = request.form['email']

        # Check if the user's email is in the system
        existing_user = User.query.filter_by(email=email).first()
        if not existing_user:
            return render_template('forgot_password.html', form=form, message="Email not found. Please check your email again or register with us.", message_type="danger")

        # Send link to reset password
        subject = 'Expense Tracker - Reset Password'
        html_content = f'''
            <strong>
                Please check the following link to reset your password:
                <br><br>
                {url_for('reset_password', email=email, _external=True)}
                <br><br>
                If you did not request a password reset for an account, please contact us for security check.
            </strong>
        '''
        send_sendgrid_email(email, subject, html_content)

        return render_template('login.html', form=LoginForm(), message="Password reset email sent. Please log-in after password reset.", message_type="success")

    return render_template('forgot_password.html', form=form)

# Reset Password page
@app.route('/reset_password/<email>', methods=['GET', 'POST'])
@already_logged_in
def reset_password(email):
    form = ResetPwdForm()
    if request.method == 'POST':
        password = request.form['password']

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            # Hash Password
            hashed_password = hash_password(password)
            # Update User's Password
            existing_user.password = hashed_password
            db.session.commit()

            return render_template('login.html', form=LoginForm(), message="Password Reset Successful. Log-in with the new password!", message_type="success")
        else:
            return render_template('login.html', form=LoginForm(), message="Password Reset Fail. Please try again or contact us.", message_type="danger")

    return render_template('reset_password.html', form=form, email=email)


# Retrieve list of Categories for Expense list
@app.route('/get_categories', methods=['GET'])
@login_required
def get_categories():
    # Get all categories from current user and user_id=7 (global user, admin - stores default category values)
    categories = ExpenseCategory.query.filter(or_(ExpenseCategory.user_id==current_user.id, ExpenseCategory.user_id==7)).all()
    category_list = [{'id': category.id, 'name': category.name} for category in categories]
    return jsonify({'categories': category_list})


# Adding Expense Category List
@app.route('/add_category', methods=['POST'])
@login_required
def add_category():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400

    new_category = data.get('category')
    if new_category:
        existing_category = ExpenseCategory.query.filter_by(name=new_category, user_id=current_user.id).first()
        if existing_category:
            return jsonify({'success': False, 'message': 'Category already exists'})

        category = ExpenseCategory(name=new_category, user_id=current_user.id)
        db.session.add(category)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Invalid category name'})

# Delete Expense Category List
@app.route('/delete_category', methods=['POST'])
@login_required
def delete_category():
    data = request.get_json()
    if not data:
        return jsonify({'success':False, 'message':'Invalid data'}), 400

    category_name = data.get('category')
    if category_name:
        category = ExpenseCategory.query.filter_by(name=category_name, user_id=current_user.id).first()
        if category:
            check_txn_exist = Transaction.query.filter_by(category_id=category.id).first()
            if check_txn_exist:
                return jsonify({'success': False, 'message':'Transaction exist with selected category.'}), 200
            else:
                db.session.delete(category)
                db.session.commit()
                return jsonify({'success': True, 'message':'Category deleted'}), 200

    return jsonify({'success': False, 'message': 'Category not found'}), 400


# Adding Transaction to the Expense page & Transaction DB
@app.route('/add_transaction', methods=['POST'])
@login_required
def add_transaction():
    data = request.get_json()
    if not data:
        return jsonify({'success':False, 'message':'Invalid data'}), 400

    transaction_type = data.get('type')
    date = datetime.strptime(data.get('date'), '%Y-%m-%dT%H:%M')
    amount = data.get('amount')
    category_id = data.get('category_id')
    asset_id = data.get('asset_id')
    note = data.get('note')

    # Handle Transfer data
    from_asset_id = data.get('from_asset_id') if transaction_type == 'transfer' else None
    to_asset_id = data.get('to_asset_id') if transaction_type == 'transfer' else None

    new_transaction = Transaction(
          user_id=current_user.id,
          asset_id=asset_id if transaction_type != 'transfer' else None,
          category_id=category_id if transaction_type != 'transfer' else None,
          type=transaction_type,
          date=date,
          amount=amount,
          description=note,
          from_asset_id=from_asset_id,
          to_asset_id=to_asset_id
    )

    db.session.add(new_transaction)
    db.session.commit()

    # If Income - add, Expense - minus, Transfer - update both accounts
    if transaction_type in ['income', 'expense']:
        update_budget = Asset.query.get(asset_id)
        update_budget.asset_amount += amount
        # Expense is also indicated with a plus sign, because saved as negative value in db
    elif transaction_type == 'transfer':
        sent_budget = Asset.query.get(from_asset_id)
        rcvd_budget = Asset.query.get(to_asset_id)
        sent_budget.asset_amount -= amount
        rcvd_budget.asset_amount += amount
    else:
        return jsonify({'success':False, 'message': 'Transaction added, but value not calculated'})

    db.session.commit()
    return jsonify({'success': True, 'message': 'Transaction added successfully'})

# Editing Transaction to the Expense page & Transaction DB
@app.route('/update_transaction/<int:transaction_id>', methods=['POST'])
@login_required
def update_transaction(transaction_id):
    data = request.get_json()
    if not data:
        return jsonify({'success':False, 'message':'Invalid data'}), 400

    transaction = Transaction.query.get(transaction_id)
    if transaction.user_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403

    transaction_type = data.get('type')
    prev_asset_id = transaction.asset_id if transaction_type != 'transfer' else None
    prev_amount = float(transaction.amount)
    prev_from_asset_id = transaction.from_asset_id if transaction_type == 'transfer' else None
    prev_to_asset_id = transaction.to_asset_id if transaction_type == 'transfer' else None

    asset_id = data.get('asset_id') if transaction_type != 'transfer' else None
    amount = data.get('amount')
    from_asset_id = data.get('from_asset_id') if transaction_type == 'transfer' else None
    to_asset_id = data.get('to_asset_id') if transaction_type == 'transfer' else None

    transaction.type = transaction_type
    transaction.date = datetime.strptime(data.get('date'), '%Y-%m-%dT%H:%M')
    transaction.amount = amount
    transaction.category_id = data.get('category_id') if transaction_type != 'transfer' else None
    transaction.asset_id = asset_id
    transaction.description = data.get('note')

    transaction.from_asset_id = from_asset_id
    transaction.to_asset_id = to_asset_id

    db.session.commit()

    # If Income - add, Expense - minus, Transfer - update both accounts
    if transaction_type in ['income', 'expense']:
        prev_budget = Asset.query.get(prev_asset_id)
        prev_budget.asset_amount -= prev_amount
        update_budget = Asset.query.get(asset_id)
        update_budget.asset_amount += amount
        # Expense is also indicated with a plus sign, because saved as negative value in db
    elif transaction_type == 'transfer':
        prev_sent_budget = Asset.query.get(prev_from_asset_id)
        prev_rcvd_budget = Asset.query.get(prev_to_asset_id)
        prev_sent_budget.asset_amount += prev_amount
        prev_rcvd_budget.asset_amount -= prev_amount

        sent_budget = Asset.query.get(from_asset_id)
        rcvd_budget = Asset.query.get(to_asset_id)
        sent_budget.asset_amount -= amount
        rcvd_budget.asset_amount += amount
    else:
        return jsonify({'success':False, 'message': 'Transaction added, but value not calculated'})

    db.session.commit()
    return jsonify({"success": "Transaction updated successfully"}), 200

# Deleting Transaction
@app.route('/delete_transaction/<int:transaction_id>', methods=['DELETE'])
@login_required
def delete_transaction(transaction_id):
    transaction = Transaction.query.filter_by(id=transaction_id, user_id=current_user.id).first()
    if transaction is None:
        return jsonify({'error': 'Transaction not found or you do not have permission to delete it.'}), 404

    # If Income - add, Expense - minus, Transfer - update both accounts
    transaction_type = transaction.type
    transaction_amount = float(transaction.amount)
    if transaction_type in ['income', 'expense']:
        update_budget = Asset.query.get(transaction.asset_id)
        update_budget.asset_amount -= transaction_amount
        # Expense is also indicated with a plus sign, because saved as negative value in db
    elif transaction_type == 'transfer':
        sent_budget = Asset.query.get(transaction.from_asset_id)
        rcvd_budget = Asset.query.get(transaction.to_asset_id)
        sent_budget.asset_amount += transaction_amount
        rcvd_budget.asset_amount -= transaction_amount
    else:
        return jsonify({'success':False, 'message': 'Transaction added, but value not calculated'})
    db.session.commit()

    db.session.delete(transaction)
    db.session.commit()
    return jsonify({'success': 'Transaction deleted successfully'}), 200


# Budget Page
@app.route('/budget')
@login_required
def budget():
    # Fetch assets from the database
    all_assets = Asset.query.filter_by(user_id=current_user.id).all()

    # Save the data into asset_groups to be sent to budget.html
    asset_groups = {}
    for asset in all_assets:
        if asset.asset_group_name not in asset_groups:
            asset_groups[asset.asset_group_name] = {
                'assets': [],
                'total': 0
            }
        asset_groups[asset.asset_group_name]['assets'].append(asset)
        asset_groups[asset.asset_group_name]['total'] += asset.asset_amount

    # Calculate budget, debt, and total
    budget_total = sum(asset.asset_amount for asset in all_assets if asset.asset_amount > 0)
    debt_total = sum(asset.asset_amount for asset in all_assets if asset.asset_amount < 0)
    total = budget_total + debt_total

    return render_template('budget.html', asset_groups=asset_groups, budget=budget_total, debt=debt_total, total=total)

# Saving Asset in Budget page
@app.route('/save_asset', methods=['POST'])
@login_required
def save_asset():
    data = request.get_json()
    if not data:
        return jsonify({'success':False, 'message':'Invalid data'}), 400

    group = data.get('group')
    name = data.get('name')
    amount = data.get('amount')

    # Save asset to database
    asset = Asset(asset_group_name=group, asset_name=name, asset_amount=amount, user_id=current_user.id)
    db.session.add(asset)
    db.session.commit()

    return jsonify({'message': 'Asset saved successfully'}), 200

# Retrieve list of Assets for delete modal
@app.route('/get_assets', methods=['GET'])
@login_required
def get_assets():
    assets = Asset.query.filter_by(user_id=current_user.id).all()
    asset_list = [{'id': asset.id, 'asset_group_name': asset.asset_group_name, 'asset_name': asset.asset_name, 'asset_amount': asset.asset_amount} for asset in assets]
    return jsonify({'assets': asset_list})

# Delete the selected asset upon user's confirmation
@app.route('/delete_asset/<int:asset_id>', methods=['DELETE'])
@login_required
def delete_asset(asset_id):
    asset = Asset.query.get_or_404(asset_id)
    if asset.owner != current_user:
        return jsonify({'error': 'Unauthorized access'}), 403

    check_asset_exist = Transaction.query.filter_by(asset_id=asset_id).first()
    if check_asset_exist:
        return jsonify({'success': 'False', 'message': 'Transaction exists with selected asset. Cannot be deleted.'}), 200

    db.session.delete(asset)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Asset deleted successfully!'}), 200


# Stats Page
@app.route('/stats')
@login_required
def stats():
    return render_template('stats.html')

# Retrieving Data for Stats Page
@app.route('/stats/<type>_data')
@login_required
def stats_get_data(type):
    user_id = current_user.id
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if type == 'income':
        data = db.session.query(
            ExpenseCategory.name.label('category_name'),
            func.sum(Transaction.amount).label('amount')
        ).join(Transaction, Transaction.category_id == ExpenseCategory.id).filter(
            Transaction.user_id == user_id,
            Transaction.type == 'income',
            Transaction.date.between(start_date, end_date)
        ).group_by(ExpenseCategory.name).all()
    elif type == 'expense':
        data = db.session.query(
            ExpenseCategory.name.label('category_name'),
            func.sum(Transaction.amount).label('amount')
        ).join(Transaction, Transaction.category_id == ExpenseCategory.id).filter(
            Transaction.user_id == user_id,
            Transaction.type == 'expense',
            Transaction.date.between(start_date, end_date)
        ).group_by(ExpenseCategory.name).all()
    elif type == 'comparison':
        data = db.session.query(
            ExpenseCategory.name.label('category_name'),
            func.sum(Transaction.amount).label('amount'),
            Transaction.type,
            Transaction.date
        ).join(Transaction, Transaction.category_id == ExpenseCategory.id).filter(
            Transaction.user_id == user_id,
            Transaction.type != 'transfer',
            Transaction.date.between(start_date, end_date)
        ).group_by(ExpenseCategory.name).all()

        result = [{'category_name': item.category_name, 'amount': item.amount, 'type': item.type, 'date': item.date} for item in data]
        return jsonify(result)

    result = [{'category_name': item.category_name, 'amount': item.amount} for item in data]
    return jsonify(result)

# Get earliest and latest dates for line graph stats
@app.route('/getDateRange', methods=['GET'])
@login_required
def get_date_range():
    earliest_date = db.session.query(func.min(Transaction.date)).scalar()
    latest_date = db.session.query(func.max(Transaction.date)).scalar()
    return jsonify({
        'earliestDate': earliest_date.isoformat(),
        'latestDate': latest_date.isoformat()
    })


# Setting Page
@app.route('/setting')
@login_required
def setting():
    return render_template('setting.html')

# Update Password in Setting page
@app.route('/update_password', methods=['POST'])
@login_required
def update_password():
    data = request.get_json()

    user_id = current_user.id
    password = data.get('password')
    new_password = data.get('new_password')

    existing_user = User.query.filter_by(id=user_id).first()
    if existing_user:
        if bcrypt.checkpw(password.encode('utf-8'), existing_user.password.encode('utf-8')):
            # Hash New Password
            hashed_new_password = hash_password(new_password)
            # Update User's Password
            existing_user.password = hashed_new_password
            db.session.commit()
            return jsonify({'success': 'password updated'}), 200
        else:
            return jsonify({'error': 'confirm password incorrect'}), 200

    return jsonify({'error': 'cannot be updated'}), 403

# Delete the Account
@app.route('/delete_account', methods=['POST'])
@login_required
def delete_account():
    data = request.get_json()
    rcvd_pwd = data.get('password')

    existing_user = User.query.filter_by(id=current_user.id).first()
    if existing_user:
        if bcrypt.checkpw(rcvd_pwd.encode('utf-8'), existing_user.password.encode('utf-8')):
            # Send an email that the account has been deleted succesfully.
            subject = 'Expense Tracker - Account Deletion'
            html_content = '''
                <strong>
                    Account has been successfully deleted!
                </strong>
            '''
            send_sendgrid_email(existing_user.email, subject, html_content)

            db.session.delete(existing_user)
            db.session.commit()
            logout_user()
            return jsonify({'success': 'Account Deleted Successfully'}), 200
        else:
            return jsonify({'error': 'incorrect password'}), 200

    return jsonify({'error': 'account cannot be deleted'}), 400
