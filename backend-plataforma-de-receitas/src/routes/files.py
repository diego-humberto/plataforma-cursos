from flask import Blueprint, request, jsonify, send_file, send_from_directory, current_app
import os
import subprocess
import shutil

from video_utils import open_video

bp = Blueprint('files', __name__)


@bp.route('/')
def index():
    return jsonify({'status': 'ok', 'message': 'API running on port 9823'})


@bp.route("/serve-content", methods=['GET'])
def serve_lesson_content():
    path = request.args.get('path')

    if not os.path.exists(path):
        return jsonify({'error': 'Arquivo nao encontrado.'}), 404

    if path.lower().endswith(".ts") or path.lower().endswith(".mkv"):
        open_video(path)
        return send_from_directory("assets", "video-aviso-reproducao.mp4")

    return send_file(path)


@bp.route('/api/open-file', methods=['POST'])
def open_file_externally():
    data = request.get_json(silent=True) or {}
    file_path = data.get('path', '')

    if not file_path or not os.path.isfile(file_path):
        return jsonify({'error': 'Arquivo nao encontrado.'}), 404

    try:
        os.startfile(file_path)
        return jsonify({'message': 'Arquivo aberto com sucesso.'})
    except Exception:
        try:
            subprocess.Popen(['xdg-open', file_path])
            return jsonify({'message': 'Arquivo aberto com sucesso.'})
        except Exception as e:
            return jsonify({'error': f'Nao foi possivel abrir o arquivo: {str(e)}'}), 500


@bp.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)


@bp.route('/uploads/<path:subpath>')
def uploaded_file_subpath(subpath):
    upload_dir = os.path.join(current_app.root_path, 'uploads')
    return send_from_directory(upload_dir, subpath)


@bp.route('/api/open-app', methods=['POST'])
def open_application():
    data = request.get_json(silent=True) or {}
    app_name = data.get('app', '').strip().lower()

    allowed_apps = {'anki': 'anki'}

    if app_name not in allowed_apps:
        return jsonify({'error': f'Aplicativo nao permitido: {app_name}'}), 400

    try:
        exe_path = shutil.which(app_name)
        if exe_path:
            subprocess.Popen([exe_path])
            return jsonify({'message': f'{app_name} aberto com sucesso.'})

        # Fallback: tentar os.startfile no Windows
        try:
            os.startfile(app_name)
            return jsonify({'message': f'{app_name} aberto com sucesso.'})
        except Exception:
            pass

        # Fallback: caminhos comuns do Anki no Windows
        common_paths = [
            os.path.expandvars(r'%LOCALAPPDATA%\Programs\Anki\anki.exe'),
            os.path.expandvars(r'%PROGRAMFILES%\Anki\anki.exe'),
            os.path.expandvars(r'%PROGRAMFILES(x86)%\Anki\anki.exe'),
        ]
        for p in common_paths:
            if os.path.isfile(p):
                subprocess.Popen([p])
                return jsonify({'message': f'{app_name} aberto com sucesso.'})

        return jsonify({'error': 'Anki nao encontrado. Verifique se esta instalado.'}), 404
    except Exception as e:
        return jsonify({'error': f'Erro ao abrir {app_name}: {str(e)}'}), 500
