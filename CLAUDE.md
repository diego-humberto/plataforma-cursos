# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plataforma de cursos em vídeo local (estilo Udemy). Monorepo com dois projetos separados:
- **frontend-plataforma-de-receitas/** — React SPA
- **backend-plataforma-de-receitas/** — Flask API

## Commands

### Running locally
```bash
# Backend (porta 9823)
cd backend-plataforma-de-receitas/src && python app.py

# Frontend dev server (porta 5173, proxies /api → localhost:9823)
cd frontend-plataforma-de-receitas && npm run dev

# Ou usar o script batch que abre ambos:
./iniciar-plataforma.bat
```

### Frontend
```bash
cd frontend-plataforma-de-receitas
npm run dev          # Dev server (Vite, porta 5173)
npm run build        # Production build
npm run preview      # Preview build (porta 4173)
npm run lint         # ESLint
```

### Backend
```bash
cd backend-plataforma-de-receitas/src
python app.py        # Inicia Flask na porta 9823
pip install -r requirements.txt  # Instalar dependências
```

## Architecture

### Frontend (React + TypeScript + Vite)

**Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix), Zustand, Axios, Vidstack (player), Tiptap (rich text)

**Path alias:** `@/*` → `src/*`

**Rotas:**
- `/` — Home/Dashboard
- `/cursos` — Lista de cursos
- `/cursos/:courseId` — Visualização do curso (sidebar de módulos + player)
- `/foco` — Timer Pomodoro / Cronômetro
- `/configuracoes` — Configurações
- `/notas-popup` — Popup de anotações

**API URL:** Armazenada em `localStorage("apiUrl")`, default `http://localhost:9823`. O Vite faz proxy de `/api`, `/serve-content`, `/uploads` para o backend em dev.

**Estado global:** Zustand com middleware `persist` (localStorage). O hook principal é `useFocusTimer.ts` que gerencia timer+cycle e sincroniza com o backend via debounce.

**Axios:** `src/lib/api.ts` configura retry automático (3x com backoff exponencial) em erros de rede e 5xx.

**Padrão de services:** Cada domínio tem um arquivo em `src/services/` que exporta funções async chamando a API via axios. Components nunca chamam axios diretamente.

### Backend (Flask + SQLAlchemy + SQLite)

**Estrutura:** Tudo em `backend-plataforma-de-receitas/src/`
- `app.py` — Inicialização Flask, definição de modelos ORM, migrações automáticas
- `routes.py` — Todos os endpoints REST
- `utils.py` — Escaneamento de diretórios e registro de aulas
- `config.py` — Configuração (DB path, upload folder)
- `video_utils.py` — Integração FFmpeg

**Banco:** SQLite em `instance/platform_course.sqlite`. Migrações são feitas via `ALTER TABLE` no startup (`app.py` linhas 90+), não usa Alembic.

**Modelos:** Course, Lesson, Note, FocusSession, StudyDay, CycleConfig, TimerState, ModuleLink

**Padrão de API:**
- GET retorna JSON (lista ou objeto)
- POST/PUT recebem JSON (`request.get_json()`) ou form-data (para uploads)
- Rotas de escaneamento rodam em background threads

### Comunicação Frontend ↔ Backend

O frontend monta URLs completas: `${apiUrl}/api/endpoint`. Em dev, o Vite proxy redireciona `/api` para `localhost:9823`, mas os services passam a URL completa via parâmetro `apiUrl`.

## Key Conventions

- **Idioma:** UI e comentários em português brasileiro. Nomes de variáveis, funções e tipos em inglês.
- **UI components:** Usar shadcn/ui (`src/components/ui/`). Não instalar bibliotecas UI adicionais sem necessidade.
- **Toasts:** Usar `sonner` (`toast.error()`, `toast.success()`).
- **Novas colunas no banco:** Adicionar o modelo no ORM E uma migração try/except no final de `app.py` para compatibilidade com databases existentes.
- **Timer state:** Persistido tanto em localStorage (Zustand persist) quanto no backend (`/api/focus/timer-state`). O backend é a fonte da verdade para cross-browser.
