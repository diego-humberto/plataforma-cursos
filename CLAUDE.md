# Plataforma de Cursos - Local Study Platform

## Overview

Plataforma local de gerenciamento de cursos (estilo Udemy) com ferramentas integradas de estudo. Funciona 100% offline após setup inicial. Cursos são mapeados a partir de pastas no disco (vídeos, PDFs, legendas).

## Architecture

```
CURSOS/
├── backend-plataforma-de-receitas/   # Flask API + SQLite
│   └── src/
│       ├── app.py                    # Flask app + SQLAlchemy models
│       ├── routes.py                 # All API endpoints (~1400 lines)
│       ├── utils.py                  # Course/lesson scanning logic
│       ├── video_utils.py            # FFmpeg video duration
│       └── instance/platform_course.sqlite
├── frontend-plataforma-de-receitas/  # React 18 + Vite + TypeScript
│   └── src/
│       ├── pages/                    # 7 route pages
│       ├── components/               # UI & feature components
│       ├── services/                 # API client functions
│       ├── hooks/                    # Custom React hooks
│       ├── models/models.ts          # All TypeScript types
│       └── utils/                    # Helpers
└── iniciar-plataforma.bat            # Windows one-click start
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite 5, React Router 6, Tailwind CSS 3.4 |
| UI | shadcn/ui (Radix), Lucide icons, Sonner toasts |
| Video | Vidstack 1.10.9 (@vidstack/react) |
| Rich text | Tiptap editor (notes) |
| State | Zustand (focus timer), localStorage, React state |
| Layout | react-resizable-panels (course page) |
| Backend | Flask 3.0, SQLAlchemy 2.0, Flask-CORS |
| Database | SQLite |
| PDF export | xhtml2pdf |

## Running

```bash
# Backend (porta 9823)
cd backend-plataforma-de-receitas/src
pip install -r requirements.txt
python app.py

# Frontend (porta 5173, proxy para backend)
cd frontend-plataforma-de-receitas
npm install
npm run dev
```

Or just run `iniciar-plataforma.bat` on Windows.

## Routes (Frontend)

| Route | Page | Description |
|-------|------|-------------|
| `/` | HomeScreen | Dashboard: cursos, heatmap, atalhos, "continuar de onde parou" |
| `/cursos` | CoursesPage | Gestão de cursos (adicionar, editar, deletar, escanear) |
| `/cursos/:courseId` | CoursePage | Player + sidebar resizable com aulas e anotações |
| `/foco` | FocusPage | Timer Pomodoro, ciclo de estudos, sessões |
| `/revisao` | DailyReviewPage | Revisão de notas por data com export PDF |
| `/notas-popup` | NotesPopupPage | Janela popup para anotações (BroadcastChannel sync) |
| `/configuracoes` | SettingsPage | Configurações do app |

## Key Features

### Course Management
- Adicionar cursos apontando para pasta local (ou auto-descobrir subpastas)
- Rescan em background (thread-safe) com progresso em tempo real
- Suporte a múltiplos paths (`extra_paths`) por curso
- Soft-delete de aulas removidas do disco (`is_active=0`)

### Video Player (Vidstack)
- Controles customizados: play, seek ±10s, volume, fullscreen, PiP
- Legendas multi-idioma auto-detectadas (`.srt`/`.vtt`)
- Playback rate persistido no localStorage
- Autoplay próxima aula com countdown
- Tracking de tempo: salva progresso a cada 5s + sendBeacon no unload
- Marca aula como concluída automaticamente a 10s do final

### Lesson Organization
- Hierarquia de módulos mapeada da estrutura de pastas no disco
- Árvore expansível com subpastas recursivas
- Busca de aulas (Ctrl+K)
- Barra de navegação entre aulas da mesma pasta (sibling lessons)
- Card "Continuar de onde parou" (por curso na sidebar + global na home)

### Floating PDF Viewer
- Painel flutuante (draggable/resizable) para PDFs
- Abre sobre o vídeo quando clica em Materiais durante reprodução
- Se não tem vídeo tocando, PDF abre no player principal (iframe)
- `position: fixed`, z-index 9999, drag por mousedown/mousemove nativo

### Notes System
- Editor rich text (Tiptap) com captura de timestamp do vídeo
- Janela popup separada para anotar (sync via BroadcastChannel)
- Export PDF: por aula, por curso, ou revisão diária
- Upload de imagens nas notas

### Focus Timer / Pomodoro
- Modos: Pomodoro (focus→break ciclo) e Contínuo (stopwatch)
- Subjects: definir matérias com ênfase e alocação de tempo
- Configuração semanal de horas por dia (dom-sáb)
- Mini widget flutuante (draggable) com timer
- Persistência: Zustand + localStorage + backend sync
- Atalhos: Space (play/pause), R (reset), S (skip)
- Histórico de sessões com stats por matéria

### Study Tracking
- Heatmap estilo GitHub (horas/dia por ano)
- Streak de dias consecutivos
- Stats agregados por matéria e período

### Other
- Dark mode (next-themes)
- Daily Readings: gerenciar PDFs de leitura diária
- Anki integration: botão para abrir Anki
- Module Links: URLs externas para questões vinculadas a módulos

## API Endpoints (Backend)

### Courses
- `GET/POST /api/courses` - Listar/criar cursos
- `GET/PUT/DELETE /api/courses/<id>` - CRUD individual
- `PUT /api/courses/<id>/favorite` - Toggle favorito
- `POST /api/courses/<id>/rescan` - Reescanear aulas
- `GET /api/courses/<id>/scan-progress` - Progresso do scan

### Lessons
- `GET /api/courses/<id>/lessons` - Listar aulas (paginado, buscável)
- `POST /api/update-lesson-progress` - Atualizar progresso (time_elapsed, isCompleted)
- `POST /api/batch-update-lessons` - Marcar múltiplas aulas

### File Serving
- `GET /serve-content?path=<path>` - Servir vídeo/PDF do disco
- `POST /api/open-file` - Abrir arquivo no app padrão do OS

### Notes
- `GET/POST /api/lessons/<id>/notes` - CRUD notas
- `GET /api/lessons/<id>/notes/export-pdf` - Export PDF
- `GET /api/courses/<id>/notes/export-pdf` - Export curso inteiro
- `GET /api/notes/by-date` - Notas por data (revisão diária)

### Focus
- `GET/POST /api/focus/sessions` - Sessões de foco
- `GET/PUT /api/focus/cycle-config` - Configuração do ciclo
- `GET/PUT /api/focus/timer-state` - Estado do timer
- `GET /api/focus/study-heatmap` - Dados do heatmap
- `GET /api/focus/study-day-streak` - Streak atual

## Database Tables

| Table | Key Columns |
|-------|-------------|
| `course` | id, name, path, extra_paths, isFavorite, fileCover, urlCover |
| `lesson` | id, course_id, title, module, hierarchy_path, video_url, pdf_url, subtitle_urls, isCompleted, time_elapsed, duration, is_active |
| `note` | id, lesson_id, timestamp, content (HTML), created_at |
| `focus_session` | id, subject_name, subject_id, started_at, ended_at, duration_seconds, mode, completed, date |
| `study_day` | id, date, created_at |
| `cycle_config` | id, config_json, updated_at |
| `timer_state` | id, state_json, updated_at |
| `module_link` | id, course_id, module_name, label, questions_url |

## Component Hierarchy (Course Page)

```
CoursePage
├── Breadcrumbs (curso > módulo > subpasta)
├── PanelGroup (react-resizable-panels)
│   ├── Panel (Left, 70%): LessonViewer
│   │   ├── Player (Vidstack) ou iframe (PDF/HTML/TXT)
│   │   ├── FloatingPdfViewer (draggable, quando vídeo + PDF)
│   │   ├── Next Lesson Overlay (countdown autoplay)
│   │   ├── Sibling Lessons Bar
│   │   └── Lesson Info + Materiais + Anotar
│   ├── PanelResizeHandle
│   └── Panel (Right, 30%): CourseSidebar
│       ├── Tabs: Aulas | Anotações
│       ├── Search (Ctrl+K)
│       ├── LastWatchedCard
│       ├── ModuleList (accordion, recursivo)
│       │   └── LessonListItem (checkbox, badge, duration)
│       └── NoteList (editor Tiptap, timestamps)
```

## localStorage Keys

| Key | Value |
|-----|-------|
| `apiUrl` | URL do backend (default: `http://localhost:9823`) |
| `vite-ui-theme` | `'light'` ou `'dark'` |
| `autoPlayNextLesson` | `'true'` ou `'false'` |
| `playbackRate` | Taxa de reprodução (ex: `'1.5'`) |
| `course-sidebar-tab` | Aba ativa na sidebar (`'aulas'` ou `'anotacoes'`) |
| `<courseId>` (número) | JSON da última aula assistida naquele curso |
| `focus-mini-widget-pos` | JSON `{x, y}` posição do widget flutuante |

## File Types Supported

- **Video**: `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.mkv`, `.webm`
- **Documents**: `.pdf`, `.html`, `.txt`
- **Subtitles**: `.srt`, `.vtt` (auto-linked, multi-idioma por sufixo: `aula.pt.srt`)
- **Covers**: Uploaded ou URL externa

## Conventions

- **Language**: Interface em Português (PT-BR), código em Inglês
- **Commits**: Prefixo `feat:`, `fix:`, `refactor:` em português
- **Styling**: Tailwind CSS utility classes, cores roxas como tema principal
- **Components**: shadcn/ui com customizações via className
- **State**: React state local para UI, Zustand para focus timer, localStorage para preferências
- **API client**: Axios via `src/lib/api.ts` com baseURL dinâmico

## Important Notes

- Backend roda na porta 9823 (hardcoded em app.py)
- Frontend em dev mode (porta 5173) usa proxy Vite para backend
- Scanning de cursos é thread-safe com locks por curso
- O `serve-content` endpoint serve arquivos direto do disco do usuário
- Notas são auto-exportadas em JSON antes de deletar um curso
- FFmpeg é opcional (duração = 0 se ausente)
- O timer Pomodoro sincroniza estado com backend periodicamente, não a cada tick
