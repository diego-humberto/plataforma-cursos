# Backend — Plataforma de Cursos

API REST em Flask para a Plataforma de Cursos. Gerencia cursos, aulas, progresso, anotacoes e timer de foco.

## Requisitos

- **Python 3.10+**
- **FFmpeg** (opcional, para processar videos)

## Configuracao e execucao

### 1. Criar ambiente virtual

```bash
cd src
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

### 2. Instalar dependencias

```bash
pip install -r ../requirements.txt
```

### 3. (Opcional) Configurar variaveis de ambiente

```bash
cp ../.env.example .env
```

Os valores padrao funcionam para desenvolvimento local.

### 4. Executar o servidor

```bash
python app.py
```

O servidor inicia em `http://localhost:9823`.

## Estrutura

```
src/
├── app.py          # App Flask, modelos ORM, migracoes
├── routes.py       # Endpoints REST
├── config.py       # Configuracao (DB, uploads, secret key)
├── utils.py        # Escaneamento de diretorios e registro de aulas
├── video_utils.py  # Integracao FFmpeg
├── uploads/        # Arquivos enviados pelo usuario (ignorado pelo git)
└── instance/       # Banco SQLite (ignorado pelo git)
```

## Modelos

Course, Lesson, Note, FocusSession, StudyDay, CycleConfig, TimerState, ModuleLink

## Creditos

Baseado no projeto [platform_course](https://github.com/Alessandro-filho/platform_course) de Alessandro Filho.
