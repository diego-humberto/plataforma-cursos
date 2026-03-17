from .courses import bp as courses_bp
from .lessons import bp as lessons_bp
from .notes import bp as notes_bp
from .focus import bp as focus_bp
from .files import bp as files_bp
from .daily_readings import bp as daily_readings_bp
from .module_links import bp as module_links_bp
from .study_days import bp as study_days_bp


def register_blueprints(app):
    app.register_blueprint(courses_bp)
    app.register_blueprint(lessons_bp)
    app.register_blueprint(notes_bp)
    app.register_blueprint(focus_bp)
    app.register_blueprint(files_bp)
    app.register_blueprint(daily_readings_bp)
    app.register_blueprint(module_links_bp)
    app.register_blueprint(study_days_bp)
