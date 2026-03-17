from flask import Blueprint, request, jsonify
import json
from sqlalchemy.orm import joinedload

from app import db, Lesson

bp = Blueprint('lessons', __name__)


@bp.route('/api/courses/<int:course_id>/lessons', methods=['GET'])
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

    # Se nao enviar page, retorna tudo (retrocompativel)
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


@bp.route('/api/update-lesson-progress', methods=['POST'])
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
        return jsonify({'message': 'Progresso da licao atualizado com sucesso'})
    else:
        return jsonify({'error': 'Licao nao encontrada'}), 404


@bp.route('/api/batch-update-lessons', methods=['POST'])
def batch_update_lessons():
    data = request.json
    lesson_ids = data.get('lessonIds', [])
    is_completed = data.get('isCompleted')

    if not lesson_ids or is_completed is None:
        return jsonify({'error': 'lessonIds e isCompleted sao obrigatorios'}), 400

    Lesson.query.filter(Lesson.id.in_(lesson_ids)).update(
        {'isCompleted': is_completed},
        synchronize_session='fetch'
    )
    db.session.commit()

    return jsonify({'message': f'{len(lesson_ids)} aulas atualizadas', 'updated': len(lesson_ids)})


@bp.route('/api/lessons/<int:lesson_id>', methods=['GET'])
def get_lesson_elapsed_time(lesson_id):
    lesson = Lesson.query.get_or_404(lesson_id)
    return jsonify({"elapsedTime": lesson.time_elapsed})
