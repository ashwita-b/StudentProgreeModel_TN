from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    school = db.Column(db.String(200), nullable=False, default='')
    role = db.Column(db.String(20), default='student')  # 'student' or 'examiner'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    test_sessions = db.relationship('TestSession', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def is_examiner(self):
        return self.role == 'examiner'


class TestSession(db.Model):
    __tablename__ = 'test_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    module_id = db.Column(db.String(20), nullable=False, default='module1')
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    is_completed = db.Column(db.Boolean, default=False)
    theta = db.Column(db.Float)
    sem = db.Column(db.Float)
    standardized_score = db.Column(db.Integer)
    total_questions = db.Column(db.Integer)
    correct_answers = db.Column(db.Integer)
    _parametric_values = db.Column('parametric_values', db.Text)

    @property
    def parametric_values(self):
        if self._parametric_values:
            try:
                return json.loads(self._parametric_values)
            except Exception:
                return {}
        return {}

    @parametric_values.setter
    def parametric_values(self, value):
        self._parametric_values = json.dumps(value) if value else '{}'

    # Relationships
    responses = db.relationship('Response', backref='session', lazy=True, cascade='all, delete-orphan')


class Response(db.Model):
    __tablename__ = 'responses'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('test_sessions.id'), nullable=False)
    question_code = db.Column(db.String(10), nullable=False)
    question_text = db.Column(db.Text)
    difficulty = db.Column(db.Float)
    user_answer = db.Column(db.String(10))
    correct_answer = db.Column(db.String(10))
    is_correct = db.Column(db.Boolean)
    answered_at = db.Column(db.DateTime, default=datetime.utcnow)
