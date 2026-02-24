# Plataforma de Cursos

Plataforma local de cursos em video, estilo Udemy. Assista seus cursos organizados com player de video, anotacoes, timer de foco (Pomodoro) e acompanhamento de progresso.

## Requisitos

- **Python 3.10+** — [Instalar](https://www.python.org/downloads/)
- **Node.js 18+** — [Instalar](https://nodejs.org/)
- **FFmpeg** (opcional, para processar videos) — [Instalar](https://ffmpeg.org/download.html)

## Instalacao rapida

### 1. Clonar o repositorio

```bash
git clone https://github.com/diego-humberto/plataforma-cursos.git
cd plataforma-cursos
```

### 2. Backend (Flask)

```bash
cd backend-plataforma-de-receitas/src
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r ../requirements.txt

# (Opcional) Configurar variaveis de ambiente:
cp ../.env.example .env

python app.py
```

O backend inicia na porta **9823**.

### 3. Frontend (React + Vite)

Em outro terminal:

```bash
cd frontend-plataforma-de-receitas
npm install
npm run dev
```

O frontend inicia na porta **5173**. Acesse http://localhost:5173

### Atalho Windows

Execute `iniciar-plataforma.bat` na raiz para abrir backend e frontend de uma vez.

## Estrutura

```
plataforma-cursos/
├── backend-plataforma-de-receitas/   # API Flask + SQLite
│   └── src/
│       ├── app.py                    # App principal + modelos ORM
│       ├── routes.py                 # Endpoints REST
│       ├── config.py                 # Configuracao
│       └── utils.py                  # Utilitarios
├── frontend-plataforma-de-receitas/  # SPA React
│   └── src/
│       ├── pages/                    # Paginas (home, cursos, foco)
│       ├── components/               # Componentes UI
│       ├── services/                 # Chamadas API
│       └── hooks/                    # Hooks customizados
├── iniciar-plataforma.bat            # Script de inicio (Windows)
└── CLAUDE.md                         # Instrucoes para Claude Code
```

## Stack

| Camada | Tecnologias |
|--------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, Vidstack |
| Backend | Flask, SQLAlchemy, SQLite, Flask-CORS |

## Creditos

Baseado no projeto [platform_course](https://github.com/Alessandro-filho/platform_course) de Alessandro Filho.
