#app.py

# ============================ 
# IMPORT REQUIRED LIBRARIES 
# ============================ 
from flask import Flask, request, jsonify, session, Response
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from models import db, User, TestSession, Response as UserResponse
from adaptive_test import AdaptiveTest
from config import Config
from datetime import datetime
import os
import random
import csv
from io import StringIO

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
            role='examiner'
        )
        examiner.set_password('admin123')
        db.session.add(examiner)
        db.session.commit()
        print("✓ Default admin account created: admin@technova.com / admin123")

# ============================ 
# AUTHENTICATION ROUTES 
# ============================ 
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('name')
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    user = User(email=email, full_name=full_name, role='student')
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Registration successful'}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email).first()
    if user and user.check_password(password):
        login_user(user)
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.full_name,
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
        'role': current_user.role
    }), 200

# ============================ 
# ADAPTIVE TEST ROUTES 
# ============================ 
@app.route('/api/test/start', methods=['POST'])
@login_required
def start_test():
    if current_user.is_examiner():
        return jsonify({'error': 'Examiners cannot take tests'}), 403

    existing = TestSession.query.filter_by(user_id=current_user.id, is_completed=True).first()
    if existing:
        return jsonify({'error': 'Test already completed'}), 400

    TestSession.query.filter_by(user_id=current_user.id, is_completed=False).delete()
    db.session.commit()

    test_session = TestSession(user_id=current_user.id)
    db.session.add(test_session)
    db.session.commit()

    test = AdaptiveTest(
        csv_file=app.config['CSV_FILE'],
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
    if not selected or selected not in ['1','2','3','4']:
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

    # Prepare response
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

    # Save this response to DB
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

    # If this was the last question → finalize everything NOW
    if test.should_stop():
        print(f"[LAST ANSWER] Finalizing test for user {current_user.id} after {len(test.responses)} questions")

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

            # Clean memory & session
            active_tests.pop(current_user.id, None)
            session.pop('current_session_id', None)

            # Return results directly in this response
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
        # Normal case: get next question
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

    db.session.commit()  # always commit at end
    return jsonify(response)

@app.route('/api/test/finish', methods=['POST'])
@login_required
def finish_test():
    print(f"[FINISH] Called by user {current_user.id}")

    sess_id = session.get('current_session_id')
    test = active_tests.get(current_user.id)
    test_session = None

    # Always try to find the latest incomplete session as fallback
    if not sess_id:
        test_session = TestSession.query.filter_by(
            user_id=current_user.id,
            is_completed=False
        ).order_by(TestSession.started_at.desc()).first()
    else:
        test_session = db.session.get(TestSession, sess_id)

    if not test_session:
        print("[FINISH] No session found")
        return jsonify({'error': 'No test session found'}), 404

    # If test still in memory → use it
    results = None
    if test:
        print("[FINISH] Found active test object")
        results = test.get_results()
        active_tests.pop(current_user.id, None)

    # Save / update session
    if results:
        test_session.theta = results['theta']
        test_session.sem = results['sem']
        test_session.standardized_score = results['standardized_score']
        test_session.total_questions = results['total_questions']
        test_session.correct_answers = results['correct_answers']
        test_session.parametric_values = results.get('parametric_values', {})
    else:
        print("[FINISH] No fresh results — using existing DB values")

    test_session.completed_at = datetime.utcnow()
    test_session.is_completed = True
    db.session.commit()

    # Clean session cookie
    session.pop('current_session_id', None)

    # Return minimal results (enough for frontend)
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
    test_session = TestSession.query.filter_by(user_id=current_user.id, is_completed=True).order_by(TestSession.completed_at.desc()).first()
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
    avg_score = sum(s.standardized_score for s in sessions) / completed_tests if completed_tests else 0
    avg_questions = sum(s.total_questions for s in sessions) / completed_tests if completed_tests else 0
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
    sessions = TestSession.query.filter_by(is_completed=True).order_by(TestSession.completed_at.desc()).all()
    results = []
    for session in sessions:
        user = User.query.get(session.user_id)
        results.append({
            'student_id': user.id,
            'student_name': user.full_name,
            'student_email': user.email,
            'session_id': session.id,
            'score': session.correct_answers,
            'total_questions': session.total_questions,
            'accuracy': round((session.correct_answers / session.total_questions) * 100, 1),
            'theta': session.theta,
            'sem': session.sem,
            'standardized_score': session.standardized_score,
            'completed_at': session.completed_at.isoformat()
        })
    return jsonify(results), 200

# ============================
# EXPORT ALL RESULTS AS CSV
# ============================
@app.route('/api/admin/export', methods=['GET'])
@login_required
def export_data():

    if not current_user.is_examiner():
        return jsonify({'error': 'Access denied'}), 403

    import csv
    from io import StringIO
    from flask import Response

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Student Name",
        "Email",
        "Score",
        "Total Questions",
        "Accuracy",
        "Theta",
        "SEM",
        "Standardized Score",
        "Completed At"
    ])

    sessions = TestSession.query.filter_by(is_completed=True).all()

    for s in sessions:
        user = User.query.get(s.user_id)

        accuracy = 0
        if s.total_questions:
            accuracy = round((s.correct_answers / s.total_questions) * 100, 1)

        writer.writerow([
            user.full_name,
            user.email,
            s.correct_answers,
            s.total_questions,
            accuracy,
            s.theta,
            s.sem,
            s.standardized_score,
            s.completed_at.isoformat() if s.completed_at else ""
        ])

    csv_data = output.getvalue()
    output.close()

    # 🔴 RESET DATABASE AFTER CSV CREATED
    UserResponse.query.delete()
    TestSession.query.delete()

    db.session.commit()

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=technova_results.csv"
        }
    )

@app.route('/api/admin/student/<int:session_id>', methods=['GET'])
@login_required
def get_student_detail(session_id):
    if not current_user.is_examiner():
        return jsonify({'error': 'Access denied'}), 403
    session_obj = db.session.get(TestSession, session_id)
    if not session_obj:
        return jsonify({'error': 'Session not found'}), 404
    user = User.query.get(session_obj.user_id)
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
        'score': session_obj.correct_answers,
        'total_questions': session_obj.total_questions,
        'accuracy': round((correct / total) * 100, 1) if total else 0,
        'theta': session_obj.theta,
        'sem': session_obj.sem,
        'standardized_score': session_obj.standardized_score,
        'completed_at': session_obj.completed_at.isoformat(),
        'responses': response_list
    }), 200



# ============================ 
# SERVE FRONTEND (Production)
# ============================ 
from flask import send_from_directory

@app.route('/')
def home():
    # Serve the built frontend index.html
    static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
    if os.path.exists(static_folder):
        return send_from_directory(static_folder, 'index.html')
    return "Backend is running - Frontend not built yet"

@app.route('/<path:path>')
def serve_frontend(path):
    # Serve static files for frontend routes
    static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
    if os.path.exists(static_folder):
        if os.path.exists(os.path.join(static_folder, path)):
            return send_from_directory(static_folder, path)
        # For SPA routing, return index.html for all non-file paths
        return send_from_directory(static_folder, 'index.html')
    return "Frontend not available"

# ============================ 
# START FLASK SERVER 
# ============================ 
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)