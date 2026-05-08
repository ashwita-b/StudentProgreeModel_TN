# app.py

# ============================
# IMPORT REQUIRED LIBRARIES
# ============================
import sys

from flask import Flask, request, jsonify, session, Response
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from models import db, User, TestSession, Response as UserResponse
from adaptive_test import AdaptiveTest
from config import Config, ALLOWED_SCHOOLS, MODULES
from datetime import datetime
import os
import re
import random
import csv
from io import StringIO

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# ============================
# INITIALIZE FLASK APPLICATION
# ============================
app = Flask(__name__)
app.config.from_object(Config)

# ============================
# ENABLE CORS
# ============================
CORS(app, supports_credentials=True, origins=app.config['CORS_ORIGINS'])

# ============================
# INITIALIZE DATABASE & LOGIN SYSTEM
# ============================
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)

# ============================
# STORE ACTIVE TESTS IN MEMORY
# ============================
active_tests = {}

# ============================
# LOAD USER FROM DATABASE
# ============================
@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# ============================
# DATABASE INITIALIZATION
# ============================
with app.app_context():
    if not os.path.exists('instance'):
        os.makedirs('instance')
    db.create_all()

    examiner = User.query.filter_by(email='admin@technova.com').first()
    if not examiner:
        examiner = User(
            email='admin@technova.com',
            full_name='Admin',
            school='',
            role='examiner'
        )
        examiner.set_password('admin123')
        db.session.add(examiner)
        db.session.commit()
        print("✓ Default admin account created: admin@technova.com / admin123")

# ============================
# INPUT VALIDATION HELPERS
# ============================
def validate_email(email):
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return bool(re.match(pattern, email)) if email else False

def validate_password(password):
    """Minimum 6 chars, at least one letter and one number"""
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters long"
    if not re.search(r'[A-Za-z]', password):
        return False, "Password must contain at least one letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    return True, None

def sanitize_string(value, max_length=200):
    if not value or not isinstance(value, str):
        return None
    return value.strip()[:max_length]

# ============================
# AUTHENTICATION ROUTES
# ============================
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid request body'}), 400

    email = sanitize_string(data.get('email'), 120)
    password = data.get('password', '')
    full_name = sanitize_string(data.get('name'), 100)
    school = sanitize_string(data.get('school'), 200)

    # Validate all fields
    if not full_name or len(full_name) < 2:
        return jsonify({'error': 'Full name must be at least 2 characters'}), 400

    if not validate_email(email):
        return jsonify({'error': 'Please enter a valid email address'}), 400

    if not school:
        return jsonify({'error': 'Please select your school'}), 400

    if school not in ALLOWED_SCHOOLS:
        return jsonify({'error': 'Invalid school selected'}), 400

    valid_pw, pw_error = validate_password(password)
    if not valid_pw:
        return jsonify({'error': pw_error}), 400

    if User.query.filter_by(email=email.lower()).first():
        return jsonify({'error': 'An account with this email already exists'}), 400

    user = User(email=email.lower(), full_name=full_name, school=school, role='student')
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Registration successful'}), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid request body'}), 400

    email = sanitize_string(data.get('email'), 120)
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email.lower()).first()
    if user and user.check_password(password):
        login_user(user)
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.full_name,
                'school': user.school,
                'role': user.role
            }
        }), 200
    return jsonify({'error': 'Invalid email or password'}), 401


@app.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    active_tests.pop(current_user.id, None)
    logout_user()
    return jsonify({'success': True}), 200


@app.route('/api/auth/me', methods=['GET'])
@login_required
def get_current_user():
    return jsonify({
        'id': current_user.id,
        'email': current_user.email,
        'name': current_user.full_name,
        'school': current_user.school,
        'role': current_user.role
    }), 200


# ============================
# SCHOOLS LIST
# ============================
@app.route('/api/schools', methods=['GET'])
def get_schools():
    return jsonify({'schools': ALLOWED_SCHOOLS}), 200


# ============================
# MODULE ROUTES
# ============================
@app.route('/api/modules', methods=['GET'])
@login_required
def get_modules():
    """Return all modules with unlock status. Students also see which they have already completed."""
    result = []
    for mod_id, mod_info in MODULES.items():
        entry = {
            'id': mod_id,
            'label': mod_info['label'],
            'description': mod_info['description'],
            'unlocked': mod_info['unlocked'],
        }
        if not current_user.is_examiner():
            # Check if student already completed this module
            completed = TestSession.query.filter_by(
                user_id=current_user.id,
                module_id=mod_id,
                is_completed=True
            ).first()
            entry['already_taken'] = completed is not None
        result.append(entry)
    return jsonify(result), 200


@app.route('/api/admin/modules/<module_id>/unlock', methods=['POST'])
@login_required
def unlock_module(module_id):
    if not current_user.is_examiner():
        return jsonify({'error': 'Access denied'}), 403
    if module_id not in MODULES:
        return jsonify({'error': 'Module not found'}), 404
    MODULES[module_id]['unlocked'] = True
    return jsonify({'success': True, 'module': module_id, 'unlocked': True}), 200


@app.route('/api/admin/modules/<module_id>/lock', methods=['POST'])
@login_required
def lock_module(module_id):
    if not current_user.is_examiner():
        return jsonify({'error': 'Access denied'}), 403
    if module_id not in MODULES:
        return jsonify({'error': 'Module not found'}), 404
    MODULES[module_id]['unlocked'] = False
    return jsonify({'success': True, 'module': module_id, 'unlocked': False}), 200


# ============================
# ADAPTIVE TEST ROUTES
# ============================
@app.route('/api/test/start', methods=['POST'])
@login_required
def start_test():
    if current_user.is_examiner():
        return jsonify({'error': 'Examiners cannot take tests'}), 403

    data = request.get_json(silent=True) or {}
    module_id = sanitize_string(data.get('module_id'), 20)

    if not module_id or module_id not in MODULES:
        return jsonify({'error': 'Invalid module selected'}), 400

    mod_info = MODULES[module_id]
    if not mod_info['unlocked']:
        return jsonify({'error': 'This module is not yet unlocked by the admin'}), 403

    # Check if student already completed this specific module
    existing = TestSession.query.filter_by(
        user_id=current_user.id,
        module_id=module_id,
        is_completed=True
    ).first()
    if existing:
        return jsonify({'error': f'You have already completed {mod_info["label"]}'}), 400

    # Clear any incomplete sessions for this module
    TestSession.query.filter_by(
        user_id=current_user.id,
        module_id=module_id,
        is_completed=False
    ).delete()
    db.session.commit()

    test_session = TestSession(user_id=current_user.id, module_id=module_id)
    db.session.add(test_session)
    db.session.commit()

    csv_path = mod_info['csv_file']
    test = AdaptiveTest(
        csv_file=csv_path,
        max_items=app.config['MAX_ITEMS'],
        sem_threshold=app.config['SEM_THRESHOLD']
    )
    test.load_items()
    test.theta = random.uniform(-0.5, 0.5)
    active_tests[current_user.id] = test
    session['current_session_id'] = test_session.id

    return jsonify({'success': True, 'session_id': test_session.id}), 201


@app.route('/api/test/question', methods=['GET'])
@login_required
def get_question():
    test = active_tests.get(current_user.id)
    if not test:
        return jsonify({'error': 'Test not started'}), 400

    # FIRST QUESTION
    if test.current_question is None and len(test.responses) == 0:
        next_q = test.get_next_item()
        if not next_q:
            return jsonify({'completed': True})
        return jsonify({
            'question': {
                'id': next_q['coditem'],
                'text': next_q['text'],
                'difficulty': next_q['b'],
                'options': [
                    next_q['option1'],
                    next_q['option2'],
                    next_q['option3'],
                    next_q['option4']
                ]
            },
            'progress': {
                'current': 1,
                'total': test.max_items
            }
        })

    # RETURN CURRENT QUESTION
    if test.current_question:
        q = test.current_question
        return jsonify({
            'question': {
                'id': q['coditem'],
                'text': q['text'],
                'difficulty': q['b'],
                'options': [
                    q['option1'],
                    q['option2'],
                    q['option3'],
                    q['option4']
                ]
            },
            'progress': {
                'current': len(test.responses) + 1,
                'total': test.max_items
            }
        })

    if test.should_stop():
        return jsonify({'completed': True})

    return jsonify({'error': 'No active question'}), 400


@app.route('/api/test/answer', methods=['POST'])
@login_required
def submit_answer():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400

    selected = data.get('answer')
    if not selected or selected not in ['1', '2', '3', '4']:
        return jsonify({'error': 'Invalid answer format (must be "1","2","3" or "4")'}), 400

    test = active_tests.get(current_user.id)
    if not test:
        return jsonify({'error': 'Test not started'}), 400

    if not test.current_question:
        return jsonify({'error': 'No active question — please restart test'}), 400

    try:
        result = test.submit_answer(selected)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    response = {
        'should_stop': test.should_stop(),
        'theta': round(result['theta'], 3),
        'sem': round(result['sem'], 3),
        'is_correct': result['is_correct'],
    }

    sess_id = session.get('current_session_id')
    if not sess_id:
        return jsonify({'error': 'Session ID missing'}), 400

    test_session = db.session.get(TestSession, sess_id)
    if not test_session:
        return jsonify({'error': 'Session not found in database'}), 404

    submitted = result["submitted_question"]
    db_resp = UserResponse(
        session_id=sess_id,
        question_code=submitted["coditem"],
        question_text=submitted["text"],
        difficulty=submitted["b"],
        user_answer=selected,
        correct_answer=submitted["key"],
        is_correct=result['is_correct'],
        answered_at=datetime.utcnow()
    )
    db.session.add(db_resp)

    if test.should_stop():
        results = test.get_results()
        if results:
            test_session.completed_at = datetime.utcnow()
            test_session.is_completed = True
            test_session.theta = results['theta']
            test_session.sem = results['sem']
            test_session.standardized_score = results['standardized_score']
            test_session.total_questions = results['total_questions']
            test_session.correct_answers = results['correct_answers']
            test_session.parametric_values = results.get('parametric_values', {})
            db.session.commit()

            active_tests.pop(current_user.id, None)
            session.pop('current_session_id', None)

            response['should_stop'] = True
            response['results'] = {
                'score': results['correct_answers'],
                'total_questions': results['total_questions'],
                'accuracy': round(results['accuracy'], 1),
                'theta': results['theta'],
                'sem': results['sem'],
                'standardized_score': results['standardized_score'],
                'parametric_values': results.get('parametric_values', {}),
            }
        else:
            response['should_stop'] = True
            response['error'] = 'Could not generate final results'
    else:
        next_q = test.get_next_item()
        if next_q:
            test.current_question = next_q
            response['next_question'] = {
                'id': next_q['coditem'],
                'text': next_q['text'],
                'difficulty': next_q['b'],
                'options': [
                    next_q['option1'],
                    next_q['option2'],
                    next_q['option3'],
                    next_q['option4']
                ]
            }
            response['progress'] = {
                'current': len(test.responses) + 1,
                'total': app.config['MAX_ITEMS']
            }
        else:
            response['should_stop'] = True

    db.session.commit()
    return jsonify(response)


@app.route('/api/test/finish', methods=['POST'])
@login_required
def finish_test():
    sess_id = session.get('current_session_id')
    test = active_tests.get(current_user.id)
    test_session = None

    if not sess_id:
        test_session = TestSession.query.filter_by(
            user_id=current_user.id,
            is_completed=False
        ).order_by(TestSession.started_at.desc()).first()
    else:
        test_session = db.session.get(TestSession, sess_id)

    if not test_session:
        return jsonify({'error': 'No test session found'}), 404

    results = None
    if test:
        results = test.get_results()
        active_tests.pop(current_user.id, None)

    if results:
        test_session.theta = results['theta']
        test_session.sem = results['sem']
        test_session.standardized_score = results['standardized_score']
        test_session.total_questions = results['total_questions']
        test_session.correct_answers = results['correct_answers']
        test_session.parametric_values = results.get('parametric_values', {})

    test_session.completed_at = datetime.utcnow()
    test_session.is_completed = True
    db.session.commit()

    session.pop('current_session_id', None)

    return jsonify({
        'success': True,
        'results': {
            'score': test_session.correct_answers or 0,
            'total_questions': test_session.total_questions or 0,
            'accuracy': 0.0,
            'theta': test_session.theta or 0.0,
            'sem': test_session.sem or 10.0,
            'standardized_score': test_session.standardized_score or 0,
            'parametric_values': test_session.parametric_values or {}
        }
    }), 200


@app.route('/api/test_result', methods=['GET'])
@login_required
def get_test_result():
    test_session = TestSession.query.filter_by(
        user_id=current_user.id,
        is_completed=True
    ).order_by(TestSession.completed_at.desc()).first()

    if not test_session:
        return jsonify({'error': 'No test results found'}), 404

    accuracy = round((test_session.correct_answers / test_session.total_questions) * 100, 1) if test_session.total_questions else 0

    return jsonify({
        'score': test_session.correct_answers,
        'total_questions': test_session.total_questions,
        'accuracy': accuracy,
        'theta': test_session.theta,
        'sem': test_session.sem,
        'standardized_score': test_session.standardized_score,
        'module_id': test_session.module_id,
        'completed_at': test_session.completed_at.isoformat() if test_session.completed_at else None
    }), 200


# ============================
# ADMIN ROUTES
# ============================
@app.route('/api/admin/stats', methods=['GET'])
@login_required
def get_admin_stats():
    if not current_user.is_examiner():
        return jsonify({'error': 'Access denied'}), 403

    sessions = TestSession.query.filter_by(is_completed=True).all()
    students = User.query.filter_by(role='student').all()
    total_students = len(students)
    completed_tests = len(sessions)
    avg_score = sum(s.standardized_score for s in sessions if s.standardized_score) / completed_tests if completed_tests else 0
    avg_questions = sum(s.total_questions for s in sessions if s.total_questions) / completed_tests if completed_tests else 0

    return jsonify({
        'total_students': total_students,
        'completed_tests': completed_tests,
        'average_score': round(avg_score, 1),
        'average_questions': round(avg_questions, 1)
    }), 200


@app.route('/api/admin/students', methods=['GET'])
@login_required
def get_all_students():
    if not current_user.is_examiner():
        return jsonify({'error': 'Access denied'}), 403

    school_filter = request.args.get('school', '').strip()

    query = TestSession.query.filter_by(is_completed=True).order_by(TestSession.completed_at.desc())
    sessions = query.all()

    results = []
    for s in sessions:
        user = db.session.get(User, s.user_id)
        if not user:
            continue
        if school_filter and user.school != school_filter:
            continue
        accuracy = round((s.correct_answers / s.total_questions) * 100, 1) if s.total_questions else 0
        results.append({
            'student_id': user.id,
            'student_name': user.full_name,
            'student_email': user.email,
            'school': user.school,
            'module_id': s.module_id,
            'module_label': MODULES.get(s.module_id, {}).get('label', s.module_id),
            'session_id': s.id,
            'score': s.correct_answers,
            'total_questions': s.total_questions,
            'accuracy': accuracy,
            'theta': s.theta,
            'sem': s.sem,
            'standardized_score': s.standardized_score,
            'completed_at': s.completed_at.isoformat() if s.completed_at else None,
        })

    return jsonify(results), 200


@app.route('/api/admin/student/<int:session_id>', methods=['GET'])
@login_required
def get_student_detail(session_id):
    if not current_user.is_examiner():
        return jsonify({'error': 'Access denied'}), 403

    session_obj = db.session.get(TestSession, session_id)
    if not session_obj:
        return jsonify({'error': 'Session not found'}), 404

    user = db.session.get(User, session_obj.user_id)
    responses = UserResponse.query.filter_by(session_id=session_id).order_by(UserResponse.answered_at).all()
    correct = sum(1 for r in responses if r.is_correct)
    total = len(responses)

    response_list = []
    for r in responses:
        response_list.append({
            'question_code': r.question_code,
            'question_text': r.question_text,
            'difficulty': r.difficulty,
            'user_answer': r.user_answer,
            'correct_answer': r.correct_answer,
            'is_correct': r.is_correct,
            'answered_at': r.answered_at.isoformat() if r.answered_at else None
        })

    return jsonify({
        'student_name': user.full_name,
        'student_email': user.email,
        'school': user.school,
        'module_id': session_obj.module_id,
        'module_label': MODULES.get(session_obj.module_id, {}).get('label', session_obj.module_id),
        'score': session_obj.correct_answers,
        'total_questions': session_obj.total_questions,
        'accuracy': round((correct / total) * 100, 1) if total else 0,
        'theta': session_obj.theta,
        'sem': session_obj.sem,
        'standardized_score': session_obj.standardized_score,
        'completed_at': session_obj.completed_at.isoformat() if session_obj.completed_at else None,
        'parametric_values': session_obj.parametric_values,
        'responses': response_list
    }), 200


# ============================
# EXPORT ALL RESULTS AS CSV (with confirmation token)
# ============================
@app.route('/api/admin/export/preview', methods=['GET'])
@login_required
def export_preview():
    """Returns count + confirmation token before destructive export."""
    if not current_user.is_examiner():
        return jsonify({'error': 'Access denied'}), 403

    count = TestSession.query.filter_by(is_completed=True).count()
    school_filter = request.args.get('school', '').strip()

    import secrets
    token = secrets.token_hex(16)
    session['export_confirm_token'] = token

    return jsonify({
        'total_sessions': count,
        'school_filter': school_filter or None,
        'confirm_token': token,
        'warning': 'Exporting will permanently delete ALL test data from the database after download.'
    }), 200


@app.route('/api/admin/export', methods=['POST'])
@login_required
def export_data():
    if not current_user.is_examiner():
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json(silent=True) or {}
    confirm_token = data.get('confirm_token', '')
    school_filter = data.get('school_filter', '').strip()
    delete_after = data.get('delete_after', False)

    # Validate confirmation token
    expected_token = session.get('export_confirm_token')
    if not expected_token or confirm_token != expected_token:
        return jsonify({'error': 'Invalid or expired confirmation token. Please request export again.'}), 400

    session.pop('export_confirm_token', None)

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "School",
        "Student Name",
        "Email",
        "Module",
        "Score",
        "Total Questions",
        "Accuracy (%)",
        "Theta",
        "SEM",
        "Standardized Score",
        "Completed At"
    ])

    sessions_q = TestSession.query.filter_by(is_completed=True).all()
    # Sort by school then student name
    sessions_sorted = sorted(
        sessions_q,
        key=lambda s: (
            db.session.get(User, s.user_id).school if db.session.get(User, s.user_id) else '',
            db.session.get(User, s.user_id).full_name if db.session.get(User, s.user_id) else ''
        )
    )

    for s in sessions_sorted:
        user = db.session.get(User, s.user_id)
        if not user:
            continue
        if school_filter and user.school != school_filter:
            continue

        accuracy = 0
        if s.total_questions:
            accuracy = round((s.correct_answers / s.total_questions) * 100, 1)

        writer.writerow([
            user.school,
            user.full_name,
            user.email,
            MODULES.get(s.module_id, {}).get('label', s.module_id),
            s.correct_answers,
            s.total_questions,
            accuracy,
            round(s.theta, 3) if s.theta else '',
            round(s.sem, 3) if s.sem else '',
            s.standardized_score,
            s.completed_at.isoformat() if s.completed_at else ""
        ])

    csv_data = output.getvalue()
    output.close()

    # Only wipe database if admin explicitly chose delete_after
    if delete_after:
        UserResponse.query.delete()
        TestSession.query.delete()
        db.session.commit()

    filename = f"technova_results{'_' + school_filter.replace(' ', '_').replace(',', '') if school_filter else ''}.csv"

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============================
# SERVE FRONTEND (Production)
# ============================
from flask import send_from_directory

@app.route('/')
def home():
    static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
    if os.path.exists(static_folder):
        return send_from_directory(static_folder, 'index.html')
    return "Backend is running - Frontend not built yet"

@app.route('/<path:path>')
def serve_frontend(path):
    static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
    if os.path.exists(static_folder):
        if os.path.exists(os.path.join(static_folder, path)):
            return send_from_directory(static_folder, path)
        return send_from_directory(static_folder, 'index.html')
    return "Frontend not available"

# ============================
# START FLASK SERVER
# ============================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
