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

<!-- gitnexus:start -->
# GitNexus MCP

This project is indexed by GitNexus as **CURSOS** (620 symbols, 1429 relationships, 44 execution flows).

GitNexus provides a knowledge graph over this codebase — call chains, blast radius, execution flows, and semantic search.

## Always Start Here

For any task involving code understanding, debugging, impact analysis, or refactoring, you must:

1. **Read `gitnexus://repo/{name}/context`** — codebase overview + check index freshness
2. **Match your task to a skill below** and **read that skill file**
3. **Follow the skill's workflow and checklist**

> If step 1 warns the index is stale, run `npx gitnexus analyze` in the terminal first.

## Skills

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/refactoring/SKILL.md` |

## Tools Reference

| Tool | What it gives you |
|------|-------------------|
| `query` | Process-grouped code intelligence — execution flows related to a concept |
| `context` | 360-degree symbol view — categorized refs, processes it participates in |
| `impact` | Symbol blast radius — what breaks at depth 1/2/3 with confidence |
| `detect_changes` | Git-diff impact — what do your current changes affect |
| `rename` | Multi-file coordinated rename with confidence-tagged edits |
| `cypher` | Raw graph queries (read `gitnexus://repo/{name}/schema` first) |
| `list_repos` | Discover indexed repos |

## Resources Reference

Lightweight reads (~100-500 tokens) for navigation:

| Resource | Content |
|----------|---------|
| `gitnexus://repo/{name}/context` | Stats, staleness check |
| `gitnexus://repo/{name}/clusters` | All functional areas with cohesion scores |
| `gitnexus://repo/{name}/cluster/{clusterName}` | Area members |
| `gitnexus://repo/{name}/processes` | All execution flows |
| `gitnexus://repo/{name}/process/{processName}` | Step-by-step trace |
| `gitnexus://repo/{name}/schema` | Graph schema for Cypher |

## Graph Schema

**Nodes:** File, Function, Class, Interface, Method, Community, Process
**Edges (via CodeRelation.type):** CALLS, IMPORTS, EXTENDS, IMPLEMENTS, DEFINES, MEMBER_OF, STEP_IN_PROCESS

```cypher
MATCH (caller)-[:CodeRelation {type: 'CALLS'}]->(f:Function {name: "myFunc"})
RETURN caller.name, caller.filePath
```

<!-- gitnexus:end -->
