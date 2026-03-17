from flask import Blueprint, request, jsonify
from datetime import date as date_cls, timedelta

from app import db, FocusSession

bp = Blueprint('study_days', __name__)


@bp.route('/api/study-days/heatmap', methods=['GET'])
def study_heatmap():
    year = request.args.get('year', None, type=int)
    if not year:
        year = date_cls.today().year

    start = f'{year}-01-01'
    end = f'{year}-12-31'

    focus_rows = db.session.query(
        FocusSession.date,
        db.func.sum(FocusSession.duration_seconds).label('total_seconds')
    ).filter(
        FocusSession.mode == 'focus',
        FocusSession.date >= start,
        FocusSession.date <= end
    ).group_by(FocusSession.date).all()

    result = {}
    for row in focus_rows:
        result[row.date] = {
            'hours': round(row.total_seconds / 3600, 2),
        }

    return jsonify(result)


@bp.route('/api/study-days/streak', methods=['GET'])
def study_day_streak():
    focus_dates = db.session.query(
        db.distinct(FocusSession.date)
    ).filter(FocusSession.mode == 'focus').all()
    all_dates = {row[0] for row in focus_dates}

    today = date_cls.today()
    streak = 0
    current = today

    if today.isoformat() not in all_dates:
        current = today - timedelta(days=1)

    while current.isoformat() in all_dates:
        streak += 1
        current -= timedelta(days=1)

    return jsonify({'streak': streak})
