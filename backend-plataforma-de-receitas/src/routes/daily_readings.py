from flask import Blueprint, request, jsonify, current_app
import os
import json

from helpers.file_security import resolve_path

bp = Blueprint('daily_readings', __name__)


def _get_daily_reading_file():
    return os.path.join(current_app.config['UPLOAD_FOLDER'], 'daily_reading.json')


def _read_daily_readings():
    path = _get_daily_reading_file()
    if os.path.isfile(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return [data] if data.get('path') else []
                if isinstance(data, list):
                    return data
        except (json.JSONDecodeError, IOError):
            pass
    return []


def _write_daily_readings(readings):
    path = _get_daily_reading_file()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(readings, f, ensure_ascii=False, indent=2)


@bp.route('/api/daily-readings', methods=['GET'])
def list_daily_readings():
    return jsonify(_read_daily_readings())


@bp.route('/api/daily-readings', methods=['POST'])
def add_daily_reading():
    data = request.get_json(silent=True) or {}
    path = data.get('path', '').strip().strip('"')
    name = data.get('name', '').strip()

    if not path:
        return jsonify({'error': 'Caminho do PDF e obrigatorio.'}), 400

    path = resolve_path(path)

    if not os.path.isfile(path):
        return jsonify({'error': 'Arquivo nao encontrado.'}), 404

    if not name:
        name = os.path.splitext(os.path.basename(path))[0]

    readings = _read_daily_readings()
    if any(r.get('path') == path for r in readings):
        return jsonify({'error': 'Este PDF ja esta na lista.'}), 409

    reading = {'name': name, 'path': path}
    readings.append(reading)
    _write_daily_readings(readings)

    return jsonify(reading), 201


@bp.route('/api/daily-readings', methods=['DELETE'])
def remove_daily_reading():
    data = request.get_json(silent=True) or {}
    path = data.get('path', '').strip()

    readings = _read_daily_readings()
    readings = [r for r in readings if r.get('path') != path]
    _write_daily_readings(readings)

    return jsonify({'message': 'Removido.'})


@bp.route('/api/daily-readings/open', methods=['POST'])
def open_daily_reading():
    data = request.get_json(silent=True) or {}
    path = data.get('path', '').strip()

    path = resolve_path(path) if path else path

    if not path or not os.path.isfile(path):
        return jsonify({'error': 'Arquivo nao encontrado.'}), 404

    try:
        os.startfile(path)
        return jsonify({'message': 'Aberto.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
