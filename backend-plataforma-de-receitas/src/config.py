import os

class Config:
    # cache=shared removido: shared cache gera erros "database is locked" entre
    # threads que o busy_timeout não resolve. WAL (ver app.py) é a solução correta.
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///platform_course.sqlite'
    SQLALCHEMY_ENGINE_OPTIONS = {'connect_args': {'timeout': 30}}
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = 'uploads'
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')