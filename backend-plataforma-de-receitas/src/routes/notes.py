from flask import Blueprint, request, jsonify, send_file, current_app
from werkzeug.utils import secure_filename
import os
import json
import uuid
from collections import OrderedDict
from datetime import datetime, timedelta

from app import db, Lesson, Course, Note
from helpers.notes_pdf import format_timestamp_pdf, pdf_css, generate_pdf

bp = Blueprint('notes', __name__)


@bp.route('/api/lessons/<int:lesson_id>/notes', methods=['GET'])
def list_notes(lesson_id):
    notes = Note.query.filter_by(lesson_id=lesson_id).order_by(Note.timestamp.asc()).all()
    return jsonify([{
        'id': n.id,
        'lesson_id': n.lesson_id,
        'timestamp': n.timestamp,
        'content': n.content,
        'created_at': n.created_at.isoformat() if n.created_at else None,
    } for n in notes])


@bp.route('/api/lessons/<int:lesson_id>/notes', methods=['POST'])
def create_note(lesson_id):
    Lesson.query.get_or_404(lesson_id)
    data = request.get_json(silent=True) or {}
    timestamp = data.get('timestamp', 0)
    content = data.get('content', '').strip()

    if not content:
        return jsonify({'error': 'O conteudo da anotacao e obrigatorio.'}), 400

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


@bp.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    note = Note.query.get_or_404(note_id)
    data = request.get_json(silent=True) or {}
    content = data.get('content', '').strip()

    if not content:
        return jsonify({'error': 'O conteudo da anotacao e obrigatorio.'}), 400

    note.content = content
    db.session.commit()

    return jsonify({
        'id': note.id,
        'lesson_id': note.lesson_id,
        'timestamp': note.timestamp,
        'content': note.content,
        'created_at': note.created_at.isoformat() if note.created_at else None,
    })


@bp.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    note = Note.query.get_or_404(note_id)
    db.session.delete(note)
    db.session.commit()
    return jsonify({'message': 'Anotacao excluida.'})


@bp.route('/api/courses/<int:course_id>/annotated-lessons', methods=['GET'])
def list_annotated_lessons(course_id):
    """Retorna as aulas que possuem anotacoes, com contagem de notas."""
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


# -- Exportacao de anotacoes em PDF --

@bp.route('/api/lessons/<int:lesson_id>/notes/export-pdf', methods=['GET'])
def export_lesson_notes_pdf(lesson_id):
    """Exporta anotacoes de uma aula como PDF."""
    lesson = Lesson.query.get_or_404(lesson_id)
    notes = Note.query.filter_by(lesson_id=lesson_id).order_by(Note.timestamp.asc()).all()

    if not notes:
        return jsonify({'error': 'Nenhuma anotacao encontrada para esta aula.'}), 404

    course = Course.query.get(lesson.course_id)
    course_name = course.name if course else ""

    # Montar caminho completo: Curso > Modulo > Aula
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
            <p class="timestamp">{format_timestamp_pdf(n.timestamp)}</p>
            {n.content}
        </div>'''

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{pdf_css()}</style></head>
<body>
    <h1>{full_path}</h1>
    {notes_html}
</body></html>"""

    pdf_buf = generate_pdf(html)
    if not pdf_buf:
        return jsonify({'error': 'Erro ao gerar PDF.'}), 500

    safe_title = secure_filename(lesson.title) or f"aula-{lesson_id}"
    return send_file(pdf_buf, mimetype='application/pdf', as_attachment=True,
                     download_name=f"notas-{safe_title}.pdf")


@bp.route('/api/courses/<int:course_id>/notes/export-pdf', methods=['GET'])
def export_course_notes_pdf(course_id):
    """Exporta todas as anotacoes de um curso como PDF, agrupadas por modulo > aula."""
    course = Course.query.get_or_404(course_id)

    lessons_with_notes = db.session.query(Lesson).join(Note).filter(
        Lesson.course_id == course_id,
        Lesson.is_active == 1
    ).order_by(Lesson.hierarchy_path.asc()).all()

    if not lessons_with_notes:
        return jsonify({'error': 'Nenhuma anotacao encontrada neste curso.'}), 404

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
                    <p class="timestamp">{format_timestamp_pdf(n.timestamp)}</p>
                    {n.content}
                </div>'''

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{pdf_css()}</style></head>
<body>
    <h1>{course.name}</h1>
    <p class="course-name">Anotacoes do curso</p>
    {body_html}
</body></html>"""

    pdf_buf = generate_pdf(html)
    if not pdf_buf:
        return jsonify({'error': 'Erro ao gerar PDF.'}), 500

    safe_name = secure_filename(course.name) or f"curso-{course_id}"
    return send_file(pdf_buf, mimetype='application/pdf', as_attachment=True,
                     download_name=f"notas-{safe_name}.pdf")


# -- Upload de imagens para anotacoes --

@bp.route('/api/upload-note-image', methods=['POST'])
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
        return jsonify({'error': 'Tipo de arquivo nao permitido.'}), 400

    # Garantir diretorio
    upload_dir = os.path.join(current_app.root_path, 'uploads', 'note-images')
    os.makedirs(upload_dir, exist_ok=True)

    # Gerar nome unico
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    # Retornar URL relativa que o frontend pode usar
    url = f"/uploads/note-images/{filename}"
    return jsonify({'url': url}), 201


# -- Revisao diaria de anotacoes --

@bp.route('/api/notes/by-date', methods=['GET'])
def list_notes_by_date():
    """Retorna anotacoes de um dia especifico, agrupadas por curso > aula."""
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


@bp.route('/api/notes/by-date/export-pdf', methods=['GET'])
def export_daily_notes_pdf():
    """Exporta anotacoes de um dia como PDF."""
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
                    <p class="timestamp">{format_timestamp_pdf(n.timestamp)}</p>
                    {n.content}
                </div>'''

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{pdf_css()}</style></head>
<body>
    <h1>Revisao do dia {formatted_date}</h1>
    <p class="course-name">{len(notes)} anotacoes em {len(courses)} curso(s)</p>
    {body_html}
</body></html>"""

    pdf_buf = generate_pdf(html)
    if not pdf_buf:
        return jsonify({'error': 'Erro ao gerar PDF.'}), 500

    return send_file(pdf_buf, mimetype='application/pdf', as_attachment=True,
                     download_name=f"revisao-{date_str}.pdf")
