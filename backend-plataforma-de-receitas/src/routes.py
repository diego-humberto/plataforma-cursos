
from flask import request, jsonify, send_file, abort, send_from_directory, render_template
from werkzeug.utils import secure_filename
import os
import json
import subprocess
import unicodedata
import threading
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import joinedload

from app import app, db, Lesson, Course, Note, FocusSession, StudyDay, CycleConfig, ModuleLink, TimerState
from datetime import datetime
from utils import list_and_register_lessons, scan_data_directory_and_register_courses, scan_progress, get_scan_lock
from video_utils import open_video

@app.route('/')
def index():
    return jsonify({'status': 'ok', 'message': 'API running on port 9823'})

@app.route('/api/courses', methods=['GET'])
def list_courses():
    page = request.args.get('page', None, type=int)
    per_page = request.args.get('per_page', 12, type=int)

    # Calcular porcentagens de conclusão em uma única query (apenas lições ativas)
    completion_rows = db.session.query(
        Lesson.course_id,
        db.func.count(Lesson.id).label('total'),
        db.func.sum(db.case((Lesson.isCompleted == 1, 1), else_=0)).label('completed')
    ).filter(Lesson.is_active == 1).group_by(Lesson.course_id).all()

    completion_map = {}
    for row in completion_rows:
        total = row.total or 0
        completed = row.completed or 0
        completion_map[row.course_id] = (completed / total * 100) if total > 0 else 0

    def serialize_course(c):
        extra = []
        if c.extra_paths:
            try:
                extra = json.loads(c.extra_paths)
            except (json.JSONDecodeError, TypeError):
                extra = []
        return {
            'id': c.id, 'name': c.name, 'path': c.path, 'extra_paths': extra,
            'isCoverUrl': c.isCoverUrl, 'fileCover': c.fileCover, 'urlCover': c.urlCover,
            'isFavorite': c.isFavorite, 'completion_percentage': completion_map.get(c.id, 0),
        }

    # Se não enviar page, retorna tudo (retrocompatível)
    if page is None:
        courses = Course.query.all()
        return jsonify([serialize_course(c) for c in courses])

    per_page = min(per_page, 100)
    pagination = Course.query.paginate(page=page, per_page=per_page, error_out=False)
    courses = pagination.items
    return jsonify({
        'data': [serialize_course(c) for c in courses],
        'page': pagination.page,
        'per_page': pagination.per_page,
        'total': pagination.total,
        'pages': pagination.pages,
    })

@app.route('/api/courses/<int:course_id>/lessons', methods=['GET'])
def list_lessons_for_course(course_id):
    page = request.args.get('page', None, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    search = request.args.get('search', '', type=str).strip()

    query = Lesson.query \
        .filter_by(course_id=course_id) \
        .filter(Lesson.is_active == 1) \
        .options(joinedload(Lesson.course))

    if search:
        query = query.filter(Lesson.title.ilike(f'%{search}%'))

    def serialize(lesson):
        return {
            'course_title': lesson.course.name if lesson.course else None,
            'id': lesson.id,
            'title': lesson.title,
            'module': lesson.module,
            'progressStatus': lesson.progressStatus,
            'isCompleted': lesson.isCompleted,
            'hierarchy_path': lesson.hierarchy_path,
            'time_elapsed': lesson.time_elapsed,
            'video_url': lesson.video_url,
            'duration': lesson.duration,
            'pdf_url': lesson.pdf_url,
            'subtitle_urls': json.loads(lesson.subtitle_urls) if lesson.subtitle_urls else [],
        }

    # Se não enviar page, retorna tudo (retrocompatível)
    if page is None:
        lessons = query.all()
        return jsonify([serialize(l) for l in lessons])

    per_page = min(per_page, 200)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'data': [serialize(l) for l in pagination.items],
        'page': pagination.page,
        'per_page': pagination.per_page,
        'total': pagination.total,
        'pages': pagination.pages,
    })


@app.route("/serve-content", methods=['GET'])
def serve_lesson_content():
    path = request.args.get('path')

    if not os.path.exists(path):
        abort(404)
        
    if path.lower().endswith(".ts") or path.lower().endswith(".mkv"):
        open_video(path)
        return send_from_directory("assets", "video-aviso-reproducao.mp4")      

    return send_file(path)

@app.route('/api/update-lesson-progress', methods=['POST'])
def update_lesson_for_end_progress():
    data = request.json
    lesson_id = data.get('lessonId')
    progress_status = data.get('progressStatus')
    is_completed = data.get('isCompleted')
    time_elapsed = data.get('time_elapsed', None)

    lesson = Lesson.query.get(lesson_id)
    if lesson:
        if progress_status:
            lesson.progressStatus = progress_status
        if is_completed is not None:
            lesson.isCompleted = is_completed
        if time_elapsed is not None:
            lesson.time_elapsed = time_elapsed

        db.session.commit()
        return jsonify({'message': 'Progresso da lição atualizado com sucesso'})
    else:
        return jsonify({'error': 'Lição não encontrada'}), 404


@app.route('/api/batch-update-lessons', methods=['POST'])
def batch_update_lessons():
    data = request.json
    lesson_ids = data.get('lessonIds', [])
    is_completed = data.get('isCompleted')

    if not lesson_ids or is_completed is None:
        return jsonify({'error': 'lessonIds e isCompleted são obrigatórios'}), 400

    Lesson.query.filter(Lesson.id.in_(lesson_ids)).update(
        {'isCompleted': is_completed},
        synchronize_session='fetch'
    )
    db.session.commit()

    return jsonify({'message': f'{len(lesson_ids)} aulas atualizadas', 'updated': len(lesson_ids)})


@app.route('/api/courses', methods=['POST'])
def add_course():
    name = request.form.get('name', '').strip()
    path = request.form.get('path', '').strip()

    if not name:
        return jsonify({'error': 'O nome do curso é obrigatório.'}), 400
    if not path:
        return jsonify({'error': 'O PATH do curso é obrigatório.'}), 400
    if not os.path.isdir(path):
        return jsonify({'error': f'O caminho informado não existe ou não é uma pasta: {path}'}), 400

    existing = Course.query.filter_by(path=path).first()
    if existing:
        return jsonify({'error': f'Já existe um curso cadastrado com este caminho: "{existing.name}"'}), 409

    isCoverUrl = 1 if 'imageURL' in request.form and request.form['imageURL'] else 0
    urlCover = request.form.get('imageURL', None)

    if not isCoverUrl:
        image_file = request.files.get('imageFile')
        if image_file:
            filename = secure_filename(image_file.filename)
            fileCover = filename
            image_file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        else:
            fileCover = None
    else:
        fileCover = None

    # Extra paths (JSON array ou separados por quebra de linha)
    extra_paths_raw = request.form.get('extra_paths', '').strip()
    extra_paths = []
    if extra_paths_raw:
        try:
            extra_paths = json.loads(extra_paths_raw)
        except (json.JSONDecodeError, TypeError):
            extra_paths = [p.strip() for p in extra_paths_raw.split('\n') if p.strip()]

    # Validar extra paths
    invalid_extras = [p for p in extra_paths if not os.path.isdir(p)]
    if invalid_extras:
        return jsonify({'error': f'Caminhos extras inválidos: {", ".join(invalid_extras)}'}), 400

    course = Course(
        name=name,
        path=path,
        extra_paths=json.dumps(extra_paths) if extra_paths else None,
        isCoverUrl=isCoverUrl,
        fileCover=fileCover,
        urlCover=urlCover if isCoverUrl else None
    )
    db.session.add(course)
    db.session.commit()

    # Processar lições em background thread
    def scan_lessons_background():
        with app.app_context():
            try:
                list_and_register_lessons(path, course.id, extra_paths=extra_paths or None)
            except Exception:
                scan_progress[course.id] = {"total": 0, "processed": 0, "current_file": "", "done": True, "error": True}

    thread = threading.Thread(target=scan_lessons_background)
    thread.daemon = True
    thread.start()

    extra = extra_paths if extra_paths else []
    return jsonify({'id': course.id, 'name': course.name, 'path': course.path, 'extra_paths': extra, 'isCoverUrl': course.isCoverUrl, 'fileCover': course.fileCover, 'urlCover': course.urlCover, 'isFavorite': course.isFavorite}), 201


@app.route('/api/courses/add-all', methods=['POST'])
def add_courses_automatically():
    data = request.get_json(silent=True) or {}
    scan_path = data.get('path', '')

    if not scan_path:
        return jsonify({'error': 'Informe o caminho da pasta com os cursos.'}), 400
    if not os.path.isdir(scan_path):
        return jsonify({'error': f'O caminho não existe ou não é uma pasta: {scan_path}'}), 400

    added = scan_data_directory_and_register_courses(scan_path)
    return jsonify({'added': added}), 201


@app.route('/api/courses/<int:course_id>', methods=['GET'])
def get_course(course_id):
    course = Course.query.get_or_404(course_id)
    return jsonify({'id': course.id, 'name': course.name, 'isFavorite': course.isFavorite})


@app.route('/api/courses/<int:course_id>/favorite', methods=['PUT'])
def toggle_favorite(course_id):
    course = Course.query.get_or_404(course_id)
    course.isFavorite = 0 if course.isFavorite else 1
    db.session.commit()
    return jsonify({'id': course.id, 'isFavorite': course.isFavorite})


@app.route('/api/courses/<int:course_id>/rescan', methods=['POST'])
def rescan_course(course_id):
    course = Course.query.get_or_404(course_id)

    if not os.path.isdir(course.path):
        return jsonify({'error': f'O caminho do curso não existe: {course.path}'}), 400

    lock = get_scan_lock(course_id)
    if lock.locked():
        return jsonify({'error': 'Escaneamento já em andamento.', 'courseId': course_id, 'already_scanning': True}), 409

    extra_paths = []
    if course.extra_paths:
        try:
            extra_paths = json.loads(course.extra_paths)
        except (json.JSONDecodeError, TypeError):
            extra_paths = []

    def rescan_background():
        with app.app_context():
            try:
                list_and_register_lessons(course.path, course.id, extra_paths=extra_paths or None)
            except Exception:
                scan_progress[course.id] = {"total": 0, "processed": 0, "current_file": "", "done": True, "error": True}

    thread = threading.Thread(target=rescan_background)
    thread.daemon = True
    thread.start()

    return jsonify({'message': 'Reescaneamento iniciado', 'courseId': course.id})


@app.route('/api/courses/<int:course_id>/scan-progress', methods=['GET'])
def get_scan_progress(course_id):
    if course_id not in scan_progress:
        return jsonify({'total': 0, 'processed': 0, 'current_file': '', 'done': True}), 200
    return jsonify(scan_progress[course_id]), 200


@app.route('/api/open-file', methods=['POST'])
def open_file_externally():
    data = request.get_json(silent=True) or {}
    file_path = data.get('path', '')

    if not file_path or not os.path.isfile(file_path):
        return jsonify({'error': 'Arquivo não encontrado.'}), 404

    try:
        os.startfile(file_path)
        return jsonify({'message': 'Arquivo aberto com sucesso.'})
    except Exception:
        try:
            subprocess.Popen(['xdg-open', file_path])
            return jsonify({'message': 'Arquivo aberto com sucesso.'})
        except Exception as e:
            return jsonify({'error': f'Não foi possível abrir o arquivo: {str(e)}'}), 500


@app.route('/api/lessons/<int:lesson_id>', methods=['GET'])
def get_lesson_elapsed_time(lesson_id):
    lesson = Lesson.query.get_or_404(lesson_id)
    print(lesson.time_elapsed)
    return jsonify({"elapsedTime": lesson.time_elapsed}) 


@app.route('/api/courses/<int:course_id>', methods=['PUT'])
def update_course(course_id):
    course = Course.query.get_or_404(course_id)
    old_path = course.path
    old_extra_paths = course.extra_paths
    course.name = request.form['name']
    course.path = request.form['path']

    if not os.path.isdir(course.path):
        return jsonify({'error': f'O caminho informado não existe ou não é uma pasta: {course.path}'}), 400

    # Extra paths
    extra_paths_raw = request.form.get('extra_paths', '').strip()
    extra_paths = []
    if extra_paths_raw:
        try:
            extra_paths = json.loads(extra_paths_raw)
        except (json.JSONDecodeError, TypeError):
            extra_paths = [p.strip() for p in extra_paths_raw.split('\n') if p.strip()]

    # Validar extra paths
    invalid_extras = [p for p in extra_paths if not os.path.isdir(p)]
    if invalid_extras:
        return jsonify({'error': f'Caminhos extras inválidos: {", ".join(invalid_extras)}'}), 400

    course.extra_paths = json.dumps(extra_paths) if extra_paths else None

    isCoverUrl = 1 if 'imageURL' in request.form and request.form['imageURL'] else 0

    if isCoverUrl:
        course.urlCover = request.form.get('imageURL')
        course.isCoverUrl = 1
        course.fileCover = None
    else:
        image_file = request.files.get('imageFile')
        if image_file:
            filename = secure_filename(image_file.filename)
            course.fileCover = filename
            course.isCoverUrl = 0
            course.urlCover = None
            image_file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        else:
            course.fileCover = course.fileCover
    db.session.commit()

    # Re-scan se path principal ou extra_paths mudaram
    new_extra_json = json.dumps(extra_paths) if extra_paths else None
    if old_path != course.path or old_extra_paths != new_extra_json:
        def rescan_background():
            with app.app_context():
                try:
                    list_and_register_lessons(course.path, course_id, extra_paths=extra_paths or None)
                except Exception:
                    scan_progress[course_id] = {"total": 0, "processed": 0, "current_file": "", "done": True, "error": True}

        thread = threading.Thread(target=rescan_background)
        thread.daemon = True
        thread.start()

    extra = extra_paths if extra_paths else []
    return jsonify({'id': course.id, 'name': course.name, 'path': course.path, 'extra_paths': extra, 'isCoverUrl': course.isCoverUrl, 'fileCover': course.fileCover, 'urlCover': course.urlCover, 'isFavorite': course.isFavorite})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/uploads/<path:subpath>')
def uploaded_file_subpath(subpath):
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    return send_from_directory(upload_dir, subpath)


@app.route('/api/courses/<int:course_id>', methods=['DELETE'])
def delete_course(course_id):
    course = Course.query.get_or_404(course_id)

    # Exportar notas antes de deletar
    lessons = Lesson.query.filter_by(course_id=course_id).all()
    lesson_ids = [l.id for l in lessons]
    exported_notes = []
    notes_export_path = None

    if lesson_ids:
        notes = Note.query.filter(Note.lesson_id.in_(lesson_ids)).all()
        if notes:
            # Montar dados de exportação com contexto da aula
            lesson_map = {l.id: l for l in lessons}
            for n in notes:
                lesson = lesson_map.get(n.lesson_id)
                exported_notes.append({
                    'note_id': n.id,
                    'lesson_title': lesson.title if lesson else 'Desconhecida',
                    'lesson_module': lesson.module if lesson else '',
                    'hierarchy_path': lesson.hierarchy_path if lesson else '',
                    'timestamp': n.timestamp,
                    'content': n.content,
                    'created_at': n.created_at.isoformat() if n.created_at else None,
                })

            # Salvar arquivo de exportação
            export_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'notas-exportadas')
            os.makedirs(export_dir, exist_ok=True)
            safe_name = course.name.replace(' ', '_').replace('/', '-').replace('\\', '-')[:50]
            export_filename = f'notas_{safe_name}_{course_id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
            notes_export_path = os.path.join(export_dir, export_filename)

            with open(notes_export_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'course_name': course.name,
                    'course_path': course.path,
                    'exported_at': datetime.now().isoformat(),
                    'total_notes': len(exported_notes),
                    'notes': exported_notes,
                }, f, ensure_ascii=False, indent=2)

            # Deletar notas do banco
            Note.query.filter(Note.lesson_id.in_(lesson_ids)).delete(synchronize_session=False)

    Lesson.query.filter_by(course_id=course_id).delete()

    if course.fileCover:
        try:
            os.remove(os.path.join(app.config['UPLOAD_FOLDER'], course.fileCover))
        except FileNotFoundError:
            pass

    db.session.delete(course)
    db.session.commit()

    result = {'message': 'Curso e aulas associadas deletados'}
    if exported_notes:
        result['notes_exported'] = len(exported_notes)
        result['notes_export_path'] = notes_export_path
    return jsonify(result)



@app.route('/api/courses/<int:course_id>/completed_percentage', methods=['GET'])
def course_completion_percentage(course_id):
    Course.query.get_or_404(course_id)

    total_lessons = Lesson.query.filter_by(course_id=course_id, is_active=1).count()

    if total_lessons == 0:
        return jsonify({'completion_percentage': 0})

    completed_lessons = Lesson.query.filter_by(course_id=course_id, isCompleted=1, is_active=1).count()

    completion_percentage = (completed_lessons / total_lessons) * 100

    return jsonify({'completion_percentage': completion_percentage})


# ── Anotações ──

@app.route('/api/lessons/<int:lesson_id>/notes', methods=['GET'])
def list_notes(lesson_id):
    notes = Note.query.filter_by(lesson_id=lesson_id).order_by(Note.timestamp.asc()).all()
    return jsonify([{
        'id': n.id,
        'lesson_id': n.lesson_id,
        'timestamp': n.timestamp,
        'content': n.content,
        'created_at': n.created_at.isoformat() if n.created_at else None,
    } for n in notes])


@app.route('/api/lessons/<int:lesson_id>/notes', methods=['POST'])
def create_note(lesson_id):
    Lesson.query.get_or_404(lesson_id)
    data = request.get_json(silent=True) or {}
    timestamp = data.get('timestamp', 0)
    content = data.get('content', '').strip()

    if not content:
        return jsonify({'error': 'O conteúdo da anotação é obrigatório.'}), 400

    note = Note(lesson_id=lesson_id, timestamp=float(timestamp), content=content)
    db.session.add(note)
    db.session.commit()

    return jsonify({
        'id': note.id,
        'lesson_id': note.lesson_id,
        'timestamp': note.timestamp,
        'content': note.content,
        'created_at': note.created_at.isoformat() if note.created_at else None,
    }), 201


@app.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    note = Note.query.get_or_404(note_id)
    data = request.get_json(silent=True) or {}
    content = data.get('content', '').strip()

    if not content:
        return jsonify({'error': 'O conteúdo da anotação é obrigatório.'}), 400

    note.content = content
    db.session.commit()

    return jsonify({
        'id': note.id,
        'lesson_id': note.lesson_id,
        'timestamp': note.timestamp,
        'content': note.content,
        'created_at': note.created_at.isoformat() if note.created_at else None,
    })


@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    note = Note.query.get_or_404(note_id)
    db.session.delete(note)
    db.session.commit()
    return jsonify({'message': 'Anotação excluída.'})


@app.route('/api/courses/<int:course_id>/annotated-lessons', methods=['GET'])
def list_annotated_lessons(course_id):
    """Retorna as aulas que possuem anotações, com contagem de notas."""
    results = db.session.query(
        Lesson.id,
        Lesson.title,
        Lesson.module,
        Lesson.hierarchy_path,
        db.func.count(Note.id).label('note_count')
    ).join(Note, Note.lesson_id == Lesson.id)\
     .filter(Lesson.course_id == course_id)\
     .filter(Lesson.is_active == 1)\
     .group_by(Lesson.id)\
     .order_by(db.func.max(Note.created_at).desc())\
     .all()

    return jsonify([{
        'lesson_id': r.id,
        'title': r.title,
        'module': r.module,
        'hierarchy_path': r.hierarchy_path,
        'note_count': r.note_count,
    } for r in results])


# ── Exportação de anotações em PDF ──

def _format_timestamp_pdf(seconds):
    """Formata segundos em HH:MM:SS ou MM:SS para PDF."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def _pdf_css():
    return """
        @page { size: A4; margin: 2cm 2.5cm; }
        body {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 11pt;
            color: #222;
            line-height: 1.5;
        }
        h1 {
            font-size: 14pt;
            color: #111;
            margin-bottom: 16px;
            border-bottom: 2px solid #333;
            padding-bottom: 8px;
        }
        h2 {
            font-size: 14pt;
            color: #222;
            margin-top: 24px;
            margin-bottom: 6px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4px;
        }
        h3 {
            font-size: 12pt;
            color: #333;
            margin-top: 16px;
            margin-bottom: 8px;
        }
        .course-name {
            font-size: 10pt;
            color: #555;
            margin-top: 0;
            margin-bottom: 4px;
        }
        .module-path {
            font-size: 10pt;
            color: #555;
            margin-top: 0;
            margin-bottom: 20px;
        }
        .note {
            margin-bottom: 6px;
            margin-top: 14px;
            padding: 0 0 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .timestamp {
            font-family: Courier;
            font-size: 9pt;
            color: #555;
            margin-bottom: 2px;
        }
        p, div, span, ol, ul, li, strong, em, u, s, code, pre, blockquote {
            border: 0;
        }
        p { margin: 3px 0; }
        ol {
            list-style-type: decimal;
            margin: 4px 0;
            padding-left: 30px;
        }
        ul {
            list-style-type: disc;
            margin: 4px 0;
            padding-left: 30px;
        }
        li {
            margin: 2px 0;
            padding-left: 4px;
        }
        strong { font-weight: bold; }
        em { font-style: italic; }
        u { text-decoration: underline; }
        s { text-decoration: line-through; }
        code {
            font-family: Courier;
            font-size: 10pt;
            background-color: #f0f0f0;
            padding: 1px 3px;
        }
        pre {
            font-family: Courier;
            font-size: 10pt;
            background-color: #f5f5f5;
            padding: 8px;
            margin: 6px 0;
        }
        blockquote {
            border-left: 3px solid #ccc;
            padding-left: 12px;
            margin: 6px 0;
            color: #555;
        }
    """


def _preprocess_html_for_pdf(html):
    """Converte <ol>/<ul> para itens numerados/com bullet manualmente (xhtml2pdf não renderiza list-style)."""
    import re

    def strip_p_tags(text):
        """Remove <p> e </p> do conteúdo interno de <li>."""
        return re.sub(r'</?p[^>]*>', '', text).strip()

    def replace_ol(match):
        content = match.group(1)
        items = re.findall(r'<li>(.*?)</li>', content, re.DOTALL)
        result = ''
        for i, item in enumerate(items, 1):
            result += f'<p style="margin-left:20px;">{i}. {strip_p_tags(item)}</p>\n'
        return result

    def replace_ul(match):
        content = match.group(1)
        items = re.findall(r'<li>(.*?)</li>', content, re.DOTALL)
        result = ''
        for item in items:
            result += f'<p style="margin-left:20px;">&bull; {strip_p_tags(item)}</p>\n'
        return result

    html = re.sub(r'<ol[^>]*>(.*?)</ol>', replace_ol, html, flags=re.DOTALL)
    html = re.sub(r'<ul[^>]*>(.*?)</ul>', replace_ul, html, flags=re.DOTALL)
    return html


def _generate_pdf(html_string):
    """Converte HTML em PDF usando xhtml2pdf."""
    from xhtml2pdf import pisa
    import io
    html_string = _preprocess_html_for_pdf(html_string)
    result = io.BytesIO()
    pisa_status = pisa.CreatePDF(html_string, dest=result)
    if pisa_status.err:
        return None
    result.seek(0)
    return result


@app.route('/api/lessons/<int:lesson_id>/notes/export-pdf', methods=['GET'])
def export_lesson_notes_pdf(lesson_id):
    """Exporta anotações de uma aula como PDF."""
    lesson = Lesson.query.get_or_404(lesson_id)
    notes = Note.query.filter_by(lesson_id=lesson_id).order_by(Note.timestamp.asc()).all()

    if not notes:
        return jsonify({'error': 'Nenhuma anotação encontrada para esta aula.'}), 404

    course = Course.query.get(lesson.course_id)
    course_name = course.name if course else ""

    # Montar caminho completo: Curso > Módulo > Aula
    path_parts = []
    if course_name:
        path_parts.append(course_name)
    if lesson.module:
        module_parts = lesson.module.split("/")
        path_parts.extend(p.strip() for p in module_parts[1:] if p.strip())
    path_parts.append(lesson.title)
    full_path = " &gt; ".join(path_parts)

    notes_html = ""
    for n in notes:
        notes_html += f'''
        <div class="note">
            <p class="timestamp">{_format_timestamp_pdf(n.timestamp)}</p>
            {n.content}
        </div>'''

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{_pdf_css()}</style></head>
<body>
    <h1>{full_path}</h1>
    {notes_html}
</body></html>"""

    pdf_buf = _generate_pdf(html)
    if not pdf_buf:
        return jsonify({'error': 'Erro ao gerar PDF.'}), 500

    safe_title = secure_filename(lesson.title) or f"aula-{lesson_id}"
    return send_file(pdf_buf, mimetype='application/pdf', as_attachment=True,
                     download_name=f"notas-{safe_title}.pdf")


@app.route('/api/courses/<int:course_id>/notes/export-pdf', methods=['GET'])
def export_course_notes_pdf(course_id):
    """Exporta todas as anotações de um curso como PDF, agrupadas por módulo > aula."""
    course = Course.query.get_or_404(course_id)

    lessons_with_notes = db.session.query(Lesson).join(Note).filter(
        Lesson.course_id == course_id,
        Lesson.is_active == 1
    ).order_by(Lesson.hierarchy_path.asc()).all()

    if not lessons_with_notes:
        return jsonify({'error': 'Nenhuma anotação encontrada neste curso.'}), 404

    from collections import OrderedDict
    modules = OrderedDict()
    for lesson in lessons_with_notes:
        module_key = lesson.module.split("/")[0] if lesson.module else "(Raiz)"
        if module_key not in modules:
            modules[module_key] = []
        modules[module_key].append(lesson)

    body_html = ""
    for module_name, lessons in modules.items():
        body_html += f'<h2>{module_name}</h2>'
        for lesson in lessons:
            notes = Note.query.filter_by(lesson_id=lesson.id).order_by(Note.timestamp.asc()).all()
            if not notes:
                continue

            sub_path = "/".join(lesson.module.split("/")[1:]) if lesson.module and "/" in lesson.module else ""
            display_title = f"{sub_path} &gt; {lesson.title}" if sub_path else lesson.title

            body_html += f'<h3>{display_title}</h3>'
            for n in notes:
                body_html += f'''
                <div class="note">
                    <p class="timestamp">{_format_timestamp_pdf(n.timestamp)}</p>
                    {n.content}
                </div>'''

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{_pdf_css()}</style></head>
<body>
    <h1>{course.name}</h1>
    <p class="course-name">Anotações do curso</p>
    {body_html}
</body></html>"""

    pdf_buf = _generate_pdf(html)
    if not pdf_buf:
        return jsonify({'error': 'Erro ao gerar PDF.'}), 500

    safe_name = secure_filename(course.name) or f"curso-{course_id}"
    return send_file(pdf_buf, mimetype='application/pdf', as_attachment=True,
                     download_name=f"notas-{safe_name}.pdf")


# ── Upload de imagens para anotações ──

@app.route('/api/upload-note-image', methods=['POST'])
def upload_note_image():
    """Recebe uma imagem e salva em uploads/note-images/."""
    if 'image' not in request.files:
        return jsonify({'error': 'Nenhuma imagem enviada.'}), 400

    file = request.files['image']
    if not file.filename:
        return jsonify({'error': 'Nome do arquivo vazio.'}), 400

    # Validar tipo
    allowed = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        return jsonify({'error': 'Tipo de arquivo não permitido.'}), 400

    # Garantir diretório
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'note-images')
    os.makedirs(upload_dir, exist_ok=True)

    # Gerar nome único
    import uuid
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    # Retornar URL relativa que o frontend pode usar
    url = f"/uploads/note-images/{filename}"
    return jsonify({'url': url}), 201


# ── Revisao diaria de anotacoes ──

@app.route('/api/notes/by-date', methods=['GET'])
def list_notes_by_date():
    """Retorna anotacoes de um dia especifico, agrupadas por curso > aula."""
    from datetime import datetime, timedelta
    date_str = request.args.get('date')
    if not date_str:
        date_str = datetime.now().strftime('%Y-%m-%d')

    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Formato de data invalido. Use YYYY-MM-DD.'}), 400

    next_day = date_obj + timedelta(days=1)

    notes = db.session.query(Note, Lesson, Course).join(
        Lesson, Note.lesson_id == Lesson.id
    ).join(
        Course, Lesson.course_id == Course.id
    ).filter(
        Note.created_at >= date_obj,
        Note.created_at < next_day
    ).order_by(Course.name.asc(), Lesson.hierarchy_path.asc(), Note.timestamp.asc()).all()

    # Agrupar por curso > aula
    from collections import OrderedDict
    courses = OrderedDict()
    for note, lesson, course in notes:
        if course.id not in courses:
            courses[course.id] = {
                'course_id': course.id,
                'course_name': course.name,
                'lessons': OrderedDict(),
                'note_count': 0,
            }
        if lesson.id not in courses[course.id]['lessons']:
            # Build sub_path from module
            sub_parts = lesson.module.split("/")[1:] if lesson.module and "/" in lesson.module else []
            sub_path = " > ".join(p.strip() for p in sub_parts if p.strip())
            display = f"{sub_path} > {lesson.title}" if sub_path else lesson.title
            courses[course.id]['lessons'][lesson.id] = {
                'lesson_id': lesson.id,
                'lesson_title': lesson.title,
                'display_path': display,
                'notes': [],
            }
        courses[course.id]['lessons'][lesson.id]['notes'].append({
            'id': note.id,
            'lesson_id': note.lesson_id,
            'timestamp': note.timestamp,
            'content': note.content,
            'created_at': note.created_at.isoformat() if note.created_at else None,
        })
        courses[course.id]['note_count'] += 1

    result = []
    for c in courses.values():
        c['lessons'] = list(c['lessons'].values())
        result.append(c)

    return jsonify({
        'date': date_str,
        'total_notes': len(notes),
        'total_lessons': len(set(n[1].id for n in notes)),
        'total_courses': len(courses),
        'courses': result,
    })


@app.route('/api/notes/by-date/export-pdf', methods=['GET'])
def export_daily_notes_pdf():
    """Exporta anotacoes de um dia como PDF."""
    from datetime import datetime, timedelta
    date_str = request.args.get('date')
    if not date_str:
        date_str = datetime.now().strftime('%Y-%m-%d')

    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Formato de data invalido.'}), 400

    next_day = date_obj + timedelta(days=1)

    notes = db.session.query(Note, Lesson, Course).join(
        Lesson, Note.lesson_id == Lesson.id
    ).join(
        Course, Lesson.course_id == Course.id
    ).filter(
        Note.created_at >= date_obj,
        Note.created_at < next_day
    ).order_by(Course.name.asc(), Lesson.hierarchy_path.asc(), Note.timestamp.asc()).all()

    if not notes:
        return jsonify({'error': 'Nenhuma anotacao encontrada nesta data.'}), 404

    # Agrupar por curso > aula
    from collections import OrderedDict
    courses = OrderedDict()
    for note, lesson, course in notes:
        if course.id not in courses:
            courses[course.id] = {'name': course.name, 'lessons': OrderedDict()}
        if lesson.id not in courses[course.id]['lessons']:
            sub_parts = lesson.module.split("/")[1:] if lesson.module and "/" in lesson.module else []
            sub_path = " > ".join(p.strip() for p in sub_parts if p.strip())
            display = f"{sub_path} > {lesson.title}" if sub_path else lesson.title
            courses[course.id]['lessons'][lesson.id] = {'display': display, 'notes': []}
        courses[course.id]['lessons'][lesson.id]['notes'].append(note)

    # Formatar data para exibicao
    formatted_date = date_obj.strftime('%d/%m/%Y')

    body_html = ""
    for course_data in courses.values():
        body_html += f'<h2>{course_data["name"]}</h2>'
        for lesson_data in course_data['lessons'].values():
            body_html += f'<h3>{lesson_data["display"]}</h3>'
            for n in lesson_data['notes']:
                body_html += f'''
                <div class="note">
                    <p class="timestamp">{_format_timestamp_pdf(n.timestamp)}</p>
                    {n.content}
                </div>'''

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{_pdf_css()}</style></head>
<body>
    <h1>Revisao do dia {formatted_date}</h1>
    <p class="course-name">{len(notes)} anotacoes em {len(courses)} curso(s)</p>
    {body_html}
</body></html>"""

    pdf_buf = _generate_pdf(html)
    if not pdf_buf:
        return jsonify({'error': 'Erro ao gerar PDF.'}), 500

    return send_file(pdf_buf, mimetype='application/pdf', as_attachment=True,
                     download_name=f"revisao-{date_str}.pdf")


# ── Abrir aplicativos ──

@app.route('/api/open-app', methods=['POST'])
def open_application():
    import shutil
    data = request.get_json(silent=True) or {}
    app_name = data.get('app', '').strip().lower()

    allowed_apps = {'anki': 'anki'}

    if app_name not in allowed_apps:
        return jsonify({'error': f'Aplicativo não permitido: {app_name}'}), 400

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

        return jsonify({'error': 'Anki não encontrado. Verifique se está instalado.'}), 404
    except Exception as e:
        return jsonify({'error': f'Erro ao abrir {app_name}: {str(e)}'}), 500


# ── Leituras diárias (Lei Seca / PDF) ──

DAILY_READING_FILE = os.path.join(app.config['UPLOAD_FOLDER'], 'daily_reading.json')


def _resolve_path(path):
    """Resolve a file path handling mixed Unicode normalization (NFC/NFD)."""
    if os.path.isfile(path):
        return path
    # Try full-path normalization first
    for form in ('NFC', 'NFD'):
        normalized = unicodedata.normalize(form, path)
        if os.path.isfile(normalized):
            return normalized
    # Mixed normalization: directory may be NFC, file may be NFD (or vice-versa)
    directory = os.path.dirname(path)
    basename = os.path.basename(path)
    # Resolve the directory (try both forms)
    resolved_dir = directory
    if not os.path.isdir(resolved_dir):
        for form in ('NFC', 'NFD'):
            candidate = unicodedata.normalize(form, directory)
            if os.path.isdir(candidate):
                resolved_dir = candidate
                break
    if os.path.isdir(resolved_dir):
        nfc_base = unicodedata.normalize('NFC', basename)
        for entry in os.listdir(resolved_dir):
            if unicodedata.normalize('NFC', entry) == nfc_base:
                return os.path.join(resolved_dir, entry)
    return path


def _read_daily_readings():
    if os.path.isfile(DAILY_READING_FILE):
        try:
            with open(DAILY_READING_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return [data] if data.get('path') else []
                if isinstance(data, list):
                    return data
        except (json.JSONDecodeError, IOError):
            pass
    return []


def _write_daily_readings(readings):
    os.makedirs(os.path.dirname(DAILY_READING_FILE), exist_ok=True)
    with open(DAILY_READING_FILE, 'w', encoding='utf-8') as f:
        json.dump(readings, f, ensure_ascii=False, indent=2)


@app.route('/api/daily-readings', methods=['GET'])
def list_daily_readings():
    return jsonify(_read_daily_readings())


@app.route('/api/daily-readings', methods=['POST'])
def add_daily_reading():
    data = request.get_json(silent=True) or {}
    path = data.get('path', '').strip().strip('"')
    name = data.get('name', '').strip()

    if not path:
        return jsonify({'error': 'Caminho do PDF é obrigatório.'}), 400

    path = _resolve_path(path)

    if not os.path.isfile(path):
        return jsonify({'error': 'Arquivo não encontrado.'}), 404

    if not name:
        name = os.path.splitext(os.path.basename(path))[0]

    readings = _read_daily_readings()
    if any(r.get('path') == path for r in readings):
        return jsonify({'error': 'Este PDF já está na lista.'}), 409

    reading = {'name': name, 'path': path}
    readings.append(reading)
    _write_daily_readings(readings)

    return jsonify(reading), 201


@app.route('/api/daily-readings', methods=['DELETE'])
def remove_daily_reading():
    data = request.get_json(silent=True) or {}
    path = data.get('path', '').strip()

    readings = _read_daily_readings()
    readings = [r for r in readings if r.get('path') != path]
    _write_daily_readings(readings)

    return jsonify({'message': 'Removido.'})


@app.route('/api/daily-readings/open', methods=['POST'])
def open_daily_reading():
    data = request.get_json(silent=True) or {}
    path = data.get('path', '').strip()

    path = _resolve_path(path) if path else path

    if not path or not os.path.isfile(path):
        return jsonify({'error': 'Arquivo não encontrado.'}), 404

    try:
        os.startfile(path)
        return jsonify({'message': 'Aberto.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Focus Sessions ──

@app.route('/api/focus/sessions', methods=['GET'])
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


@app.route('/api/focus/sessions', methods=['POST'])
def create_focus_session():
    data = request.get_json(silent=True) or {}
    required = ['subject_name', 'subject_id', 'started_at', 'ended_at', 'duration_seconds', 'mode', 'date']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Campo obrigatório: {field}'}), 400

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


@app.route('/api/focus/sessions/<int:session_id>', methods=['DELETE'])
def delete_focus_session(session_id):
    session = FocusSession.query.get_or_404(session_id)
    db.session.delete(session)
    db.session.commit()
    return jsonify({'message': 'Sessão excluída.'})


@app.route('/api/focus/sessions/stats', methods=['GET'])
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


# ── Cycle Config ──

@app.route('/api/focus/cycle-config', methods=['GET'])
def get_cycle_config():
    config = CycleConfig.query.first()
    if not config:
        return jsonify({})
    return app.response_class(config.config_json, mimetype='application/json')


@app.route('/api/focus/cycle-config', methods=['PUT'])
def save_cycle_config():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({'error': 'JSON inválido'}), 400

    config = CycleConfig.query.first()
    if config:
        config.config_json = json.dumps(data, ensure_ascii=False)
    else:
        config = CycleConfig(config_json=json.dumps(data, ensure_ascii=False))
        db.session.add(config)
    db.session.commit()
    return jsonify(data)


# ── Study Heatmap ──

@app.route('/api/study-days/heatmap', methods=['GET'])
def study_heatmap():
    from datetime import date as date_cls
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


@app.route('/api/study-days/streak', methods=['GET'])
def study_day_streak():
    from datetime import date as date_cls, timedelta

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


# ── Module Links (URLs de questões por módulo) ──

@app.route('/api/courses/<int:course_id>/module-links', methods=['GET'])
def get_module_links(course_id):
    links = ModuleLink.query.filter_by(course_id=course_id).all()
    result = {}
    for link in links:
        if link.module_name not in result:
            result[link.module_name] = []
        result[link.module_name].append({
            'id': link.id,
            'label': link.label or 'Questões',
            'url': link.questions_url,
        })
    return jsonify(result)


@app.route('/api/courses/<int:course_id>/module-links', methods=['POST'])
def create_module_link(course_id):
    data = request.get_json()
    module_name = data.get('module_name', '').strip()
    label = data.get('label', 'Questões').strip()
    url = data.get('url', '').strip()

    if not module_name or not url:
        return jsonify({'error': 'module_name and url are required'}), 400

    new_link = ModuleLink(course_id=course_id, module_name=module_name, label=label, questions_url=url)
    db.session.add(new_link)
    db.session.commit()
    return jsonify({'id': new_link.id, 'label': new_link.label, 'url': new_link.questions_url}), 201


@app.route('/api/module-links/<int:link_id>', methods=['PUT'])
def update_module_link(link_id):
    link = ModuleLink.query.get_or_404(link_id)
    data = request.get_json()
    label = data.get('label', '').strip()
    url = data.get('url', '').strip()

    if label:
        link.label = label
    if url:
        link.questions_url = url

    db.session.commit()
    return jsonify({'id': link.id, 'label': link.label, 'url': link.questions_url})


# ── Timer State (persistência cross-browser) ──

@app.route('/api/focus/timer-state', methods=['GET'])
def get_timer_state():
    row = TimerState.query.first()
    if not row or not row.state_json:
        return jsonify({})
    return app.response_class(row.state_json, mimetype='application/json')


@app.route('/api/focus/timer-state', methods=['PUT', 'POST'])
def save_timer_state():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({'error': 'JSON inválido'}), 400

    row = TimerState.query.first()
    if row:
        row.state_json = json.dumps(data, ensure_ascii=False)
    else:
        row = TimerState(state_json=json.dumps(data, ensure_ascii=False))
        db.session.add(row)
    db.session.commit()
    return jsonify(data)


@app.route('/api/module-link-labels', methods=['GET'])
def get_distinct_module_link_labels():
    rows = db.session.query(db.distinct(ModuleLink.label)).all()
    labels = sorted([row[0] for row in rows if row[0]])
    return jsonify(labels)


@app.route('/api/module-links/<int:link_id>', methods=['DELETE'])
def delete_module_link(link_id):
    link = ModuleLink.query.get_or_404(link_id)
    db.session.delete(link)
    db.session.commit()
    return jsonify({'status': 'deleted'})