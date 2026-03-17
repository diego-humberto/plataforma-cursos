from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import json
import threading
from datetime import datetime

from app import db, Course, Lesson, Note
from utils import list_and_register_lessons, scan_data_directory_and_register_courses, scan_progress, get_scan_lock

bp = Blueprint('courses', __name__)


def _serialize_course(c, completion_map=None):
    extra = []
    if c.extra_paths:
        try:
            extra = json.loads(c.extra_paths)
        except (json.JSONDecodeError, TypeError):
            extra = []
    result = {
        'id': c.id, 'name': c.name, 'path': c.path, 'extra_paths': extra,
        'isCoverUrl': c.isCoverUrl, 'fileCover': c.fileCover, 'urlCover': c.urlCover,
        'isFavorite': c.isFavorite,
    }
    if completion_map is not None:
        result['completion_percentage'] = completion_map.get(c.id, 0)
    return result


@bp.route('/api/courses', methods=['GET'])
def list_courses():
    page = request.args.get('page', None, type=int)
    per_page = request.args.get('per_page', 12, type=int)

    # Calcular porcentagens de conclusao em uma unica query (apenas licoes ativas)
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

    # Se nao enviar page, retorna tudo (retrocompativel)
    if page is None:
        courses = Course.query.all()
        return jsonify([_serialize_course(c, completion_map) for c in courses])

    per_page = min(per_page, 100)
    pagination = Course.query.paginate(page=page, per_page=per_page, error_out=False)
    courses = pagination.items
    return jsonify({
        'data': [_serialize_course(c, completion_map) for c in courses],
        'page': pagination.page,
        'per_page': pagination.per_page,
        'total': pagination.total,
        'pages': pagination.pages,
    })


@bp.route('/api/courses', methods=['POST'])
def add_course():
    name = request.form.get('name', '').strip()
    path = request.form.get('path', '').strip()

    if not name:
        return jsonify({'error': 'O nome do curso e obrigatorio.'}), 400
    if not path:
        return jsonify({'error': 'O PATH do curso e obrigatorio.'}), 400
    if not os.path.isdir(path):
        return jsonify({'error': f'O caminho informado nao existe ou nao e uma pasta: {path}'}), 400

    existing = Course.query.filter_by(path=path).first()
    if existing:
        return jsonify({'error': f'Ja existe um curso cadastrado com este caminho: "{existing.name}"'}), 409

    isCoverUrl = 1 if 'imageURL' in request.form and request.form['imageURL'] else 0
    urlCover = request.form.get('imageURL', None)

    if not isCoverUrl:
        image_file = request.files.get('imageFile')
        if image_file:
            filename = secure_filename(image_file.filename)
            fileCover = filename
            image_file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], filename))
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
        return jsonify({'error': f'Caminhos extras invalidos: {", ".join(invalid_extras)}'}), 400

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

    # Processar licoes em background thread
    app_obj = current_app._get_current_object()

    def scan_lessons_background():
        with app_obj.app_context():
            try:
                list_and_register_lessons(path, course.id, extra_paths=extra_paths or None)
            except Exception:
                scan_progress[course.id] = {"total": 0, "processed": 0, "current_file": "", "done": True, "error": True}

    thread = threading.Thread(target=scan_lessons_background)
    thread.daemon = True
    thread.start()

    extra = extra_paths if extra_paths else []
    return jsonify({'id': course.id, 'name': course.name, 'path': course.path, 'extra_paths': extra, 'isCoverUrl': course.isCoverUrl, 'fileCover': course.fileCover, 'urlCover': course.urlCover, 'isFavorite': course.isFavorite}), 201


@bp.route('/api/courses/add-all', methods=['POST'])
def add_courses_automatically():
    data = request.get_json(silent=True) or {}
    scan_path = data.get('path', '')

    if not scan_path:
        return jsonify({'error': 'Informe o caminho da pasta com os cursos.'}), 400
    if not os.path.isdir(scan_path):
        return jsonify({'error': f'O caminho nao existe ou nao e uma pasta: {scan_path}'}), 400

    added = scan_data_directory_and_register_courses(scan_path)
    return jsonify({'added': added}), 201


@bp.route('/api/courses/<int:course_id>', methods=['GET'])
def get_course(course_id):
    course = Course.query.get_or_404(course_id)
    return jsonify({'id': course.id, 'name': course.name, 'isFavorite': course.isFavorite})


@bp.route('/api/courses/<int:course_id>/favorite', methods=['PUT'])
def toggle_favorite(course_id):
    course = Course.query.get_or_404(course_id)
    course.isFavorite = 0 if course.isFavorite else 1
    db.session.commit()
    return jsonify({'id': course.id, 'isFavorite': course.isFavorite})


@bp.route('/api/courses/<int:course_id>/rescan', methods=['POST'])
def rescan_course(course_id):
    course = Course.query.get_or_404(course_id)

    if not os.path.isdir(course.path):
        return jsonify({'error': f'O caminho do curso nao existe: {course.path}'}), 400

    lock = get_scan_lock(course_id)
    if lock.locked():
        return jsonify({'error': 'Escaneamento ja em andamento.', 'courseId': course_id, 'already_scanning': True}), 409

    extra_paths = []
    if course.extra_paths:
        try:
            extra_paths = json.loads(course.extra_paths)
        except (json.JSONDecodeError, TypeError):
            extra_paths = []

    app_obj = current_app._get_current_object()

    def rescan_background():
        with app_obj.app_context():
            try:
                list_and_register_lessons(course.path, course.id, extra_paths=extra_paths or None)
            except Exception:
                scan_progress[course.id] = {"total": 0, "processed": 0, "current_file": "", "done": True, "error": True}

    thread = threading.Thread(target=rescan_background)
    thread.daemon = True
    thread.start()

    return jsonify({'message': 'Reescaneamento iniciado', 'courseId': course.id})


@bp.route('/api/courses/<int:course_id>/scan-progress', methods=['GET'])
def get_scan_progress(course_id):
    if course_id not in scan_progress:
        return jsonify({'total': 0, 'processed': 0, 'current_file': '', 'done': True}), 200
    return jsonify(scan_progress[course_id]), 200


@bp.route('/api/courses/<int:course_id>', methods=['PUT'])
def update_course(course_id):
    course = Course.query.get_or_404(course_id)
    old_path = course.path
    old_extra_paths = course.extra_paths
    course.name = request.form['name']
    course.path = request.form['path']

    if not os.path.isdir(course.path):
        return jsonify({'error': f'O caminho informado nao existe ou nao e uma pasta: {course.path}'}), 400

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
        return jsonify({'error': f'Caminhos extras invalidos: {", ".join(invalid_extras)}'}), 400

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
            image_file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], filename))
        else:
            course.fileCover = course.fileCover
    db.session.commit()

    # Re-scan se path principal ou extra_paths mudaram
    new_extra_json = json.dumps(extra_paths) if extra_paths else None
    if old_path != course.path or old_extra_paths != new_extra_json:
        app_obj = current_app._get_current_object()

        def rescan_background():
            with app_obj.app_context():
                try:
                    list_and_register_lessons(course.path, course_id, extra_paths=extra_paths or None)
                except Exception:
                    scan_progress[course_id] = {"total": 0, "processed": 0, "current_file": "", "done": True, "error": True}

        thread = threading.Thread(target=rescan_background)
        thread.daemon = True
        thread.start()

    extra = extra_paths if extra_paths else []
    return jsonify({'id': course.id, 'name': course.name, 'path': course.path, 'extra_paths': extra, 'isCoverUrl': course.isCoverUrl, 'fileCover': course.fileCover, 'urlCover': course.urlCover, 'isFavorite': course.isFavorite})


@bp.route('/api/courses/<int:course_id>', methods=['DELETE'])
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
            # Montar dados de exportacao com contexto da aula
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

            # Salvar arquivo de exportacao
            export_dir = os.path.join(current_app.root_path, 'uploads', 'notas-exportadas')
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
            os.remove(os.path.join(current_app.config['UPLOAD_FOLDER'], course.fileCover))
        except FileNotFoundError:
            pass

    db.session.delete(course)
    db.session.commit()

    result = {'message': 'Curso e aulas associadas deletados'}
    if exported_notes:
        result['notes_exported'] = len(exported_notes)
        result['notes_export_path'] = notes_export_path
    return jsonify(result)


@bp.route('/api/courses/<int:course_id>/completed_percentage', methods=['GET'])
def course_completion_percentage(course_id):
    Course.query.get_or_404(course_id)

    total_lessons = Lesson.query.filter_by(course_id=course_id, is_active=1).count()

    if total_lessons == 0:
        return jsonify({'completion_percentage': 0})

    completed_lessons = Lesson.query.filter_by(course_id=course_id, isCompleted=1, is_active=1).count()

    completion_percentage = (completed_lessons / total_lessons) * 100

    return jsonify({'completion_percentage': completion_percentage})
