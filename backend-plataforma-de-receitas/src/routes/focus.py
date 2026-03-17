from flask import Blueprint, request, jsonify, current_app
import json
from datetime import datetime

from app import db, FocusSession, CycleConfig, TimerState

bp = Blueprint('focus', __name__)


@bp.route('/api/focus/sessions', methods=['GET'])
def list_focus_sessions():
    date = request.args.get('date', None)
    query = FocusSession.query
    if date:
        query = query.filter_by(date=date)
    sessions = query.order_by(FocusSession.started_at.desc()).all()
    return jsonify([{
        'id': s.id,
        'subject_name': s.subject_name,
        'subject_id': s.subject_id,
        'started_at': s.started_at.isoformat(),
        'ended_at': s.ended_at.isoformat(),
        'duration_seconds': s.duration_seconds,
        'mode': s.mode,
        'completed': s.completed,
        'date': s.date,
    } for s in sessions])


@bp.route('/api/focus/sessions', methods=['POST'])
def create_focus_session():
    data = request.get_json(silent=True) or {}
    required = ['subject_name', 'subject_id', 'started_at', 'ended_at', 'duration_seconds', 'mode', 'date']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Campo obrigatorio: {field}'}), 400

    session = FocusSession(
        subject_name=data['subject_name'],
        subject_id=data['subject_id'],
        started_at=datetime.fromisoformat(data['started_at']),
        ended_at=datetime.fromisoformat(data['ended_at']),
        duration_seconds=data['duration_seconds'],
        mode=data['mode'],
        completed=1 if data.get('completed', True) else 0,
        date=data['date'],
    )
    db.session.add(session)
    db.session.commit()

    return jsonify({
        'id': session.id,
        'subject_name': session.subject_name,
        'subject_id': session.subject_id,
        'started_at': session.started_at.isoformat(),
        'ended_at': session.ended_at.isoformat(),
        'duration_seconds': session.duration_seconds,
        'mode': session.mode,
        'completed': session.completed,
        'date': session.date,
    }), 201


@bp.route('/api/focus/sessions/<int:session_id>', methods=['DELETE'])
def delete_focus_session(session_id):
    session = FocusSession.query.get_or_404(session_id)
    db.session.delete(session)
    db.session.commit()
    return jsonify({'message': 'Sessao excluida.'})


@bp.route('/api/focus/sessions/stats', methods=['GET'])
def focus_session_stats():
    from_date = request.args.get('from', None)
    to_date = request.args.get('to', None)

    query = FocusSession.query.filter_by(mode='focus')
    if from_date:
        query = query.filter(FocusSession.date >= from_date)
    if to_date:
        query = query.filter(FocusSession.date <= to_date)

    sessions = query.all()

    total_seconds = sum(s.duration_seconds for s in sessions)
    total_sessions = len(sessions)
    by_subject = {}
    by_date = {}

    for s in sessions:
        by_subject.setdefault(s.subject_name, 0)
        by_subject[s.subject_name] += s.duration_seconds
        by_date.setdefault(s.date, 0)
        by_date[s.date] += s.duration_seconds

    return jsonify({
        'total_seconds': total_seconds,
        'total_sessions': total_sessions,
        'by_subject': by_subject,
        'by_date': by_date,
    })


# -- Cycle Config --

@bp.route('/api/focus/cycle-config', methods=['GET'])
def get_cycle_config():
    config = CycleConfig.query.first()
    if not config:
        return jsonify({})
    return current_app.response_class(config.config_json, mimetype='application/json')


@bp.route('/api/focus/cycle-config', methods=['PUT'])
def save_cycle_config():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({'error': 'JSON invalido'}), 400

    config = CycleConfig.query.first()
    if config:
        config.config_json = json.dumps(data, ensure_ascii=False)
    else:
        config = CycleConfig(config_json=json.dumps(data, ensure_ascii=False))
        db.session.add(config)
    db.session.commit()
    return jsonify(data)


# -- Timer State (persistencia cross-browser) --

@bp.route('/api/focus/timer-state', methods=['GET'])
def get_timer_state():
    row = TimerState.query.first()
    if not row or not row.state_json:
        return jsonify({})
    return current_app.response_class(row.state_json, mimetype='application/json')


@bp.route('/api/focus/timer-state', methods=['PUT', 'POST'])
def save_timer_state():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({'error': 'JSON invalido'}), 400

    row = TimerState.query.first()
    if row:
        row.state_json = json.dumps(data, ensure_ascii=False)
    else:
        row = TimerState(state_json=json.dumps(data, ensure_ascii=False))
        db.session.add(row)
    db.session.commit()
    return jsonify(data)
