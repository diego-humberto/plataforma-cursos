import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///platform_course.sqlite?cache=shared'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = 'uploads'
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')