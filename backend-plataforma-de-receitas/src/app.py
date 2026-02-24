from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config

app = Flask(__name__, static_folder='../../frontend-plataforma-de-receitas/dist', static_url_path='')
app.config.from_object(Config)

db = SQLAlchemy(app)
CORS(app)

class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    path = db.Column(db.String(255), nullable=False)
    extra_paths = db.Column(db.Text, nullable=True)  # JSON array de caminhos extras
    isCoverUrl = db.Column(db.Integer, default=0)
    fileCover = db.Column(db.String(255), nullable=True)
    urlCover = db.Column(db.String(255), nullable=True)
    isFavorite = db.Column(db.Integer, default=0)

    def get_all_paths(self):
        """Retorna path principal + extra_paths como lista."""
        import json
        paths = [self.path]
        if self.extra_paths:
            try:
                extras = json.loads(self.extra_paths)
                if isinstance(extras, list):
                    paths.extend([p for p in extras if p and p.strip()])
            except (json.JSONDecodeError, TypeError):
                pass
        return paths

class Lesson(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    course = db.relationship('Course', backref=db.backref('lessons', lazy=True))
    title = db.Column(db.String(150), nullable=False)
    module = db.Column(db.Text)
    hierarchy_path = db.Column(db.Text, nullable=False)
    video_url = db.Column(db.String(255))
    pdf_url = db.Column(db.String(255))
    progressStatus = db.Column(db.Text)
    isCompleted = db.Column(db.Integer)
    time_elapsed = db.Column(db.Text)
    duration = db.Column(db.Text, nullable=True)
    subtitle_urls = db.Column(db.Text, nullable=True)  # JSON array de caminhos de legenda
    is_active = db.Column(db.Integer, default=1)

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lesson.id'), nullable=False)
    lesson = db.relationship('Lesson', backref=db.backref('notes', lazy=True))
    timestamp = db.Column(db.Float, nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now())

class FocusSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_name = db.Column(db.String(150), nullable=False)
    subject_id = db.Column(db.String(50), nullable=False)
    started_at = db.Column(db.DateTime, nullable=False)
    ended_at = db.Column(db.DateTime, nullable=False)
    duration_seconds = db.Column(db.Integer, nullable=False)
    mode = db.Column(db.String(20), nullable=False)
    completed = db.Column(db.Integer, default=1)
    date = db.Column(db.String(10), nullable=False)

class StudyDay(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(10), nullable=False, unique=True)  # YYYY-MM-DD
    created_at = db.Column(db.DateTime, default=db.func.now())

class CycleConfig(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    config_json = db.Column(db.Text, nullable=False, default='{}')
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

class TimerState(db.Model):
    __tablename__ = 'timer_state'
    id = db.Column(db.Integer, primary_key=True)
    state_json = db.Column(db.Text, nullable=False, default='{}')
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())


class ModuleLink(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    module_name = db.Column(db.Text, nullable=False)
    label = db.Column(db.Text, nullable=False, default='Questões')
    questions_url = db.Column(db.Text, nullable=False)
    course = db.relationship('Course', backref=db.backref('module_links', lazy=True))

from routes import *

with app.app_context():
    db.create_all()
    # Migração: adicionar coluna isFavorite se não existir (para databases antigas)
    try:
        db.session.execute(db.text("SELECT isFavorite FROM course LIMIT 1"))
    except Exception:
        db.session.rollback()
        db.session.execute(db.text("ALTER TABLE course ADD COLUMN isFavorite INTEGER DEFAULT 0"))
        db.session.commit()

    # Migração: adicionar coluna extra_paths se não existir
    try:
        db.session.execute(db.text("SELECT extra_paths FROM course LIMIT 1"))
    except Exception:
        db.session.rollback()
        db.session.execute(db.text("ALTER TABLE course ADD COLUMN extra_paths TEXT"))
        db.session.commit()

    # Migração: adicionar coluna is_active se não existir
    try:
        db.session.execute(db.text("SELECT is_active FROM lesson LIMIT 1"))
    except Exception:
        db.session.rollback()
        db.session.execute(db.text("ALTER TABLE lesson ADD COLUMN is_active INTEGER DEFAULT 1"))
        db.session.commit()

    # Migração: adicionar coluna subtitle_urls se não existir
    try:
        db.session.execute(db.text("SELECT subtitle_urls FROM lesson LIMIT 1"))
    except Exception:
        db.session.rollback()
        db.session.execute(db.text("ALTER TABLE lesson ADD COLUMN subtitle_urls TEXT"))
        db.session.commit()

    # Migração: adicionar coluna label em module_link se não existir
    try:
        db.session.execute(db.text("SELECT label FROM module_link LIMIT 1"))
    except Exception:
        db.session.rollback()
        try:
            db.session.execute(db.text("ALTER TABLE module_link ADD COLUMN label TEXT DEFAULT 'Questões'"))
            db.session.commit()
        except Exception:
            db.session.rollback()

if __name__ == '__main__':
    app.run(debug=True, port=9823, host="0.0.0.0")