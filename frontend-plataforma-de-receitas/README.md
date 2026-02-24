# Frontend — Plataforma de Cursos

SPA em React para a Plataforma de Cursos. Interface para assistir aulas, fazer anotacoes, timer de foco (Pomodoro) e acompanhar progresso.

## Requisitos

- **Node.js 18+**

## Configuracao e execucao

### 1. Instalar dependencias

```bash
npm install
```

### 2. Iniciar servidor de desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:5173`. O Vite faz proxy de `/api`, `/serve-content` e `/uploads` para o backend em `localhost:9823`.

### 3. Build de producao

```bash
npm run build
npm run preview  # Preview na porta 4173
```

## Estrutura

```
src/
├── pages/          # Paginas (home, cursos, curso, foco, configuracoes)
├── components/     # Componentes UI (shadcn/ui + custom)
├── services/       # Chamadas API (axios, nunca direto nos components)
├── hooks/          # Hooks customizados (timer, curso, api)
├── lib/            # Utilitarios (api.ts com retry automatico)
├── models/         # Tipos TypeScript
└── utils/          # Funcoes auxiliares
```

## Stack

React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix), Zustand, Axios, Vidstack (player), Tiptap (rich text), Sonner (toasts)
