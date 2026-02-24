import os
import json
import glob as glob_mod
import threading
from app import db, Lesson, Course, Note
from video_utils import get_video_duration_v1

SUPPORTED_EXTENSIONS = (".mp4", ".avi", ".mov", ".wmv", ".flv", ".mkv", ".webm", ".pdf", ".ts", ".txt", ".html")
SUBTITLE_EXTENSIONS = (".srt", ".vtt")

# Progresso de escaneamento por course_id
scan_progress = {}

# Lock por course_id para impedir rescans simultâneos
_scan_locks = {}
_locks_lock = threading.Lock()


def get_scan_lock(course_id):
    with _locks_lock:
        if course_id not in _scan_locks:
            _scan_locks[course_id] = threading.Lock()
        return _scan_locks[course_id]


def count_files_recursive(directory):
    total = 0
    try:
        for entry in os.scandir(directory):
            if entry.is_dir():
                total += count_files_recursive(entry.path)
            elif entry.is_file() and entry.name.lower().endswith(SUPPORTED_EXTENSIONS):
                total += 1
    except PermissionError:
        pass
    return total


def list_and_register_lessons(course_path, course_id, extra_paths=None):
    lock = get_scan_lock(course_id)
    if not lock.acquire(blocking=False):
        # Já existe um scan em andamento para este curso — ignorar
        return

    try:
        # Construir mapa de lições existentes por caminho do arquivo
        existing_lessons = Lesson.query.filter_by(course_id=course_id).all()
        existing_by_path = {}
        for lesson in existing_lessons:
            file_path = lesson.video_url or lesson.pdf_url
            if file_path:
                existing_by_path[file_path] = lesson

        # Coletar todos os paths para escanear
        all_paths = [course_path]
        if extra_paths:
            all_paths.extend([p for p in extra_paths if p and p.strip() and os.path.isdir(p)])

        total = sum(count_files_recursive(p) for p in all_paths if os.path.isdir(p))
        scan_progress[course_id] = {"total": total, "processed": 0, "current_file": "", "done": False}

        # Rastrear arquivos encontrados no disco
        found_file_paths = set()

        for path in all_paths:
            if os.path.isdir(path):
                _merge_lessons_in_directory(path, course_id, "", existing_by_path, found_file_paths)

        # Soft delete: desativar lições cujos arquivos não existem mais no disco
        for file_path, lesson in existing_by_path.items():
            if file_path not in found_file_paths:
                lesson.is_active = 0

        db.session.commit()

        scan_progress[course_id]["current_file"] = ""
        scan_progress[course_id]["done"] = True
    finally:
        lock.release()


def _find_subtitles_for_video(video_path):
    """Busca arquivos de legenda (.srt, .vtt) ao lado do vídeo.
    Procura: nome_base.srt, nome_base.vtt, nome_base.*.srt, nome_base.*.vtt
    Retorna JSON string com lista de caminhos encontrados, ou None."""
    directory = os.path.dirname(video_path)
    base_name = os.path.splitext(os.path.basename(video_path))[0]
    found = []
    for ext in SUBTITLE_EXTENSIONS:
        # Legenda com nome exato: aula01.srt
        exact = os.path.join(directory, base_name + ext)
        if os.path.isfile(exact):
            found.append(exact)
        # Legenda com código de idioma: aula01.pt.srt, aula01.en.vtt
        pattern = os.path.join(directory, base_name + ".*" + ext)
        for match in glob_mod.glob(pattern):
            if match not in found:
                found.append(match)
    return json.dumps(found) if found else None


def _merge_lessons_in_directory(directory, course_id, hierarchy_prefix, existing_by_path, found_file_paths):
    try:
        entries = list(os.scandir(directory))
    except PermissionError:
        return

    entries.sort(key=lambda e: (e.is_file(), os.path.splitext(e.name)[0]))

    for entry in entries:
        if entry.is_dir():
            new_hierarchy_prefix = f"{hierarchy_prefix}/{entry.name}" if hierarchy_prefix else entry.name
            _merge_lessons_in_directory(entry.path, course_id, new_hierarchy_prefix, existing_by_path, found_file_paths)
        elif entry.is_file() and entry.name.lower().endswith(SUPPORTED_EXTENSIONS):
            title = os.path.splitext(entry.name)[0]
            is_pdf = entry.name.lower().endswith(".pdf")
            file_path = entry.path

            if course_id in scan_progress:
                scan_progress[course_id]["current_file"] = entry.name

            found_file_paths.add(file_path)

            # Detectar legendas para vídeos (não para PDFs, TXT, HTML)
            subtitle_json = None
            is_document = entry.name.lower().endswith((".pdf", ".txt", ".html"))
            if not is_document:
                subtitle_json = _find_subtitles_for_video(file_path)

            if file_path in existing_by_path:
                # Lição existente: preservar progresso e notas, atualizar hierarquia
                lesson = existing_by_path[file_path]
                lesson.title = title
                lesson.module = hierarchy_prefix
                lesson.hierarchy_path = hierarchy_prefix
                lesson.is_active = 1  # Reativar se estava desativada
                lesson.subtitle_urls = subtitle_json
            else:
                # Nova lição: tentar copiar progresso de outro curso com mesmo arquivo
                video_url = "" if is_pdf else file_path
                pdf_url = file_path if is_pdf else ""

                donor = Lesson.query.filter(
                    Lesson.course_id != course_id,
                    db.or_(
                        db.and_(Lesson.video_url == file_path, Lesson.video_url != ""),
                        db.and_(Lesson.pdf_url == file_path, Lesson.pdf_url != "")
                    )
                ).first()

                if donor:
                    progressStatus = donor.progressStatus
                    isCompleted = donor.isCompleted
                    time_elapsed = donor.time_elapsed
                    duration = donor.duration or str(get_video_duration_v1(file_path))
                else:
                    progressStatus = 'not_started'
                    isCompleted = 0
                    time_elapsed = '0'
                    duration = str(get_video_duration_v1(file_path))

                lesson = Lesson(
                    course_id=course_id,
                    title=title,
                    module=hierarchy_prefix,
                    hierarchy_path=hierarchy_prefix,
                    video_url=video_url,
                    duration=duration,
                    progressStatus=progressStatus,
                    isCompleted=isCompleted,
                    time_elapsed=time_elapsed,
                    pdf_url=pdf_url,
                    subtitle_urls=subtitle_json,
                    is_active=1
                )
                db.session.add(lesson)
                db.session.flush()  # Para obter lesson.id

                # Copiar notas do donor
                if donor:
                    donor_notes = Note.query.filter_by(lesson_id=donor.id).all()
                    for note in donor_notes:
                        new_note = Note(
                            lesson_id=lesson.id,
                            timestamp=note.timestamp,
                            content=note.content
                        )
                        db.session.add(new_note)

            if course_id in scan_progress:
                scan_progress[course_id]["processed"] += 1


def scan_data_directory_and_register_courses(scan_path):
    entries = list(os.scandir(scan_path))
    added = 0

    for entry in entries:
        if entry.is_dir():
            if Course.query.filter(Course.path == entry.path).first():
                continue

            course = Course(
                name=entry.name,
                path=entry.path,
                isCoverUrl=0,
                fileCover=None,
                urlCover=None
            )

            db.session.add(course)
            db.session.commit()

            list_and_register_lessons(course.path, course.id)
            added += 1

    return added
