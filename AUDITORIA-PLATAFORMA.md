# Auditoria Completa — Plataforma de Cursos

> **Gerado em:** 25/02/2026
> **Escopo:** Frontend (React/TS) + Backend (Flask/SQLite) + Infraestrutura
> **Símbolos analisados:** 620 nodes, 1.429 relações, 44 fluxos de execução

---

## Sumário

- [1. Visão Geral do que está Implementado](#1-visão-geral-do-que-está-implementado)
- [2. O que Pode Quebrar / Dar Erro](#2-o-que-pode-quebrar--dar-erro)
- [3. O que Pode ser Melhorado](#3-o-que-pode-ser-melhorado)
- [4. O que Pode ser Implementado](#4-o-que-pode-ser-implementado)
- [5. O que Pode ser Retirado](#5-o-que-pode-ser-retirado)
- [6. Scorecard Geral](#6-scorecard-geral)

---

## 1. Visão Geral do que está Implementado

### 1.1 Páginas & Rotas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | HomeScreen | Dashboard com lista de cursos, heatmap de estudo, acesso rápido |
| `/cursos` | CoursesPage | Gerenciar cursos (adicionar, editar, excluir, favoritar) |
| `/cursos/:courseId` | CoursePage | Player de vídeo + sidebar de módulos + anotações |
| `/foco` | FocusPage | Timer Pomodoro / Cronômetro com ciclos e matérias |
| `/configuracoes` | SettingsPage | Configuração de URL da API |
| `/revisao` | DailyReviewPage | Revisão diária de anotações com navegação por data |
| `/notas-popup` | NotesPopupPage | Popup externo de anotações (window.open + BroadcastChannel) |

### 1.2 Backend — 49 Endpoints

**Cursos (12 endpoints):**
- CRUD completo de cursos
- Scan automático de diretórios para registrar cursos/aulas
- Favoritar/desfavoritar
- Progresso de scan em tempo real
- Porcentagem de conclusão
- Aulas com anotações

**Aulas (5 endpoints):**
- Listagem com paginação
- Streaming de conteúdo (vídeo/PDF)
- Atualização de progresso (individual e em lote)
- Abrir arquivo externamente

**Anotações (8 endpoints):**
- CRUD completo
- Upload de imagens
- Exportação em PDF (por aula, por curso, por dia)
- Agrupamento por data para revisão diária

**Timer/Foco (7 endpoints):**
- Sessões de foco (CRUD + estatísticas)
- Configuração de ciclo Pomodoro
- Estado do timer (persistência cross-browser)

**Analytics (2 endpoints):**
- Heatmap de dias de estudo (ano inteiro)
- Streak de estudo consecutivo

**Links de Módulo (4 endpoints):**
- CRUD completo para URLs de questões por módulo

**Leituras Diárias (4 endpoints):**
- CRUD + abrir PDF externamente

**Outros (7 endpoints):**
- Servir arquivos estáticos/uploads
- Abrir aplicativo externo (Anki)

### 1.3 Frontend — Features Principais

**Player de Vídeo (Vidstack):**
- Player customizado com controles
- Suporte a legendas (auto-detecção por nome de arquivo)
- Picture-in-Picture
- Fullscreen / Modo teatro
- Tracking de tempo assistido (sincroniza com backend)
- Detecção de conclusão de vídeo
- Countdown para próxima aula (estilo Netflix)
- Navegação entre aulas do mesmo módulo

**Editor de Anotações (Tiptap):**
- Rich text completo (bold, italic, listas, code blocks)
- Upload de imagens inline
- Captura de timestamp do vídeo
- Exportação em PDF

**Timer Pomodoro/Cronômetro:**
- Modo Pomodoro (foco/pausa curta/pausa longa)
- Modo contínuo com alocação proporcional por matéria
- Cronômetro livre (stopwatch)
- Gerenciamento de matérias (adicionar/remover/reordenar/ênfase)
- Configuração de horas semanais por dia
- Progresso diário (ciclo + cronômetro combinados)
- Notificações sonoras e do navegador
- Histórico de sessões
- Persistência cross-browser (localStorage + backend)

**Layout & UX:**
- Tema claro/escuro (ThemeProvider)
- Layout responsivo (desktop 2 colunas, mobile empilhado)
- Painéis redimensionáveis (react-resizable-panels)
- Busca de aulas na sidebar
- Breadcrumb navigation
- Toasts de feedback (Sonner)

### 1.4 Modelos de Dados (8 tabelas)

| Modelo | Campos principais |
|--------|-------------------|
| **Course** | name, path, extra_paths, cover (file/URL), isFavorite |
| **Lesson** | course_id, title, module, video_url, pdf_url, progress, duration, subtitles |
| **Note** | lesson_id, timestamp, content (HTML), created_at |
| **FocusSession** | subject, duration, mode, completed, date |
| **StudyDay** | date (unique) |
| **CycleConfig** | config_json |
| **TimerState** | state_json |
| **ModuleLink** | course_id, module_name, label, questions_url |

### 1.5 Stack Técnica

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 18, TypeScript 5.2, Vite 5.1, Tailwind 3.4, shadcn/ui, Zustand 4.5, Axios 1.6, Vidstack 1.10, Tiptap 3.19, React Router 6.22, Zod 3.22, React Hook Form 7.51 |
| **Backend** | Flask 3.0.2, SQLAlchemy 2.0.28, Flask-CORS 4.0, SQLite |
| **Ferramentas** | Vite (build), PostCSS, Autoprefixer, FFmpeg (duração de vídeo) |

---

## 2. O que Pode Quebrar / Dar Erro

### 2.1 CRÍTICO — Bugs e Vulnerabilidades Ativas

#### BUG: Path Traversal no `/serve-content` (Backend)
**Arquivo:** `routes.py` — endpoint `/serve-content`
**Problema:** O parâmetro `path` não é validado. Um usuário pode acessar QUALQUER arquivo do sistema usando `../../etc/passwd`.
**Impacto:** Leitura de arquivos sensíveis do sistema operacional.
**Correção:** Validar que o path está dentro dos diretórios permitidos com `os.path.abspath()`.

#### BUG: XSS nas Anotações (Frontend)
**Arquivo:** `note-list.tsx`
**Problema:** Conteúdo HTML das anotações é renderizado com `dangerouslySetInnerHTML` sem sanitização.
**Impacto:** Código malicioso pode ser executado se conteúdo HTML inseguro for inserido.
**Correção:** Usar DOMPurify antes de renderizar.

#### BUG: Race Condition na Hidratação do Timer (Frontend)
**Arquivo:** `useFocusTimer.ts` — `onRehydrateStorage`
**Problema:** Três chamadas async rodam em paralelo sem coordenação:
```
getCycleConfig() → recalculateAllocations()
getTimerState()
getFocusSessions()
```
Se a config carregar DEPOIS do timer state, as alocações são sobrescritas.
**Impacto:** Timer pode mostrar valores incorretos ao recarregar a página.

#### BUG: Sessões Duplicadas no Reload (Frontend)
**Arquivo:** `useFocusTimer.ts` — `subscribe`
**Problema:** O listener de pomodoroCount dispara durante a hidratação do store, criando sessões duplicadas no banco.
**Impacto:** Dados de estudo inflados.

#### BUG: Timer Contínuo Reseta ao Completar (Frontend)
**Arquivo:** `useFocusTimer.ts`
**Problema:** Quando `completedMs >= allocatedMinutes`, o timer reseta para a duração total em vez de mostrar 0.
**Impacto:** Usuário pensa que ainda tem tempo restante na matéria.

#### BUG: Dependência `xhtml2pdf` Faltando (Backend)
**Arquivo:** `requirements.txt`
**Problema:** `xhtml2pdf` é usado em `routes.py` para exportar PDFs mas NÃO está no requirements.txt.
**Impacto:** Exportação de PDF falha com ImportError se o pacote não estiver instalado manualmente.

#### BUG: Regex do FFmpeg Incompleta (Backend)
**Arquivo:** `video_utils.py`
**Problema:** O regex `Duration: (\d+):(\d+):(\d+)` não captura decimais (FFmpeg retorna `00:05:12.34`).
**Impacto:** Duração de vídeos retorna 0 silenciosamente.

### 2.2 ALTO — Pode Causar Problemas em Uso Normal

#### Sem Timeout nas Requisições HTTP (Frontend)
**Arquivo:** `src/lib/api.ts`
**Problema:** Axios não tem timeout configurado. Requisições podem ficar penduradas infinitamente.
**Impacto:** UI congela esperando resposta.

#### Falhas Silenciosas nos Services (Frontend)
**Arquivos:** `src/services/*.ts`
**Problema:** Todos os services fazem `catch { return null }` sem feedback ao usuário.
**Impacto:** Usuário não sabe se os dados falharam ao carregar ou se realmente estão vazios.

#### Background Threads sem Error Handling (Backend)
**Arquivo:** `routes.py` — scan de cursos
**Problema:** Threads de scan de aulas rodam sem try/catch. Se `list_and_register_lessons` crashar, o erro é perdido.
**Impacto:** Scan trava silenciosamente sem notificar o frontend.

#### Race Condition no Lock de Scan (Backend)
**Arquivo:** `utils.py`
**Problema:** `lock.locked()` check não é atômico — entre checar e adquirir o lock, outra thread pode iniciar o scan.
**Impacto:** Scans duplicados do mesmo curso.

#### SECRET_KEY Exposta (Backend)
**Arquivo:** `config.py`
**Problema:** `SECRET_KEY` default é `'dev-secret-key-change-in-production'` e nunca é alterada.
**Impacto:** Qualquer token de sessão/CSRF pode ser forjado.

#### Validação de Path no `open_file_externally` (Backend)
**Arquivo:** `routes.py`
**Problema:** Apenas verifica `os.path.isfile()` mas não valida se o path é seguro.
**Impacto:** Pode abrir arquivos do sistema.

#### updateWatchedTime Sem Debounce (Frontend)
**Problema:** Chamada em cada evento `timeupdate` do player (potencialmente centenas por minuto).
**Impacto:** Sobrecarrega o backend com requisições desnecessárias.

### 2.3 MÉDIO — Problemas que Afetam Performance/UX

| Problema | Arquivo | Impacto |
|----------|---------|---------|
| Sem paginação em courses/lessons/notes | Services | Lento com muitos dados |
| N+1 queries no export de PDF | routes.py | Lento com muitas anotações |
| LocalStorage atualizado a cada 500ms | useFocusTimer.ts | Pode ser lento com datasets grandes |
| Bundle de 1.411 KB | vite build | Carregamento inicial lento |
| ESLint não configurado | projeto raiz | Sem enforcement de qualidade |
| Polling de 500ms para detectar popup fechado | course.tsx | Desperdício de CPU |
| Print statements de debug em produção | routes.py:323, video_utils.py:24 | Poluição de logs |

---

## 3. O que Pode ser Melhorado

### 3.1 Arquitetura & Código

   #### Dividir `CoursePage` (700+ linhas)
   **Arquivo:** `src/pages/course.tsx`
   **Estado atual:** Uma única componente gerencia layout, fetch de dados, organização de módulos, seleção de aulas, notas, popup e batch operations.
   **Sugestão:** Extrair em sub-componentes:
   - `CoursePlayerPanel` — player + controles
   - `CourseSidebar` — módulos + busca + lista de aulas
   - `CourseNotes` — aba de notas
   - `useCourseData` — hook para fetch e organização de dados

   #### Refatorar `useFocusTimer` (950+ linhas)
   **Arquivo:** `src/hooks/useFocusTimer.ts`
   **Estado atual:** Store monolítico com timer, matérias, ciclo, persistência e sync.
   **Sugestão:** Separar em:
   - `useFocusTimerCore` — lógica do timer (play/pause/reset)
   - `useFocusSubjects` — gerenciamento de matérias
   - `useFocusCycle` — lógica de ciclo/modo contínuo
   - `useFocusSync` — persistência backend

#### Error Handling Centralizado (Frontend)
**Estado atual:** Cada service faz `catch { return null }` sem feedback.
**Sugestão:** Criar interceptor Axios que mostra toast de erro automaticamente:
```typescript
api.interceptors.response.use(
  response => response,
  error => {
    if (!error.config?.silentError) {
      toast.error("Erro ao conectar com o servidor");
    }
    return Promise.reject(error);
  }
);
```

#### Migrar de ALTER TABLE para Alembic (Backend)
**Estado atual:** Migrações manuais com try/except no `app.py`.
**Problema:** Frágil, não rastreia versão do schema, difícil de reverter.
**Sugestão:** Configurar Flask-Migrate (Alembic) para migrações versionadas.

### 3.2 Performance

| Melhoria | Onde | Como |
|----------|------|------|
| Paginação real | Services + Backend | Backend já suporta `page` param; usar no frontend |
| Debounce no `updateWatchedTime` | `course.tsx` | Enviar a cada 5-10 segundos, não a cada frame |
| Lazy load do Tiptap | `note-list.tsx` | `React.lazy()` — editor é pesado |
| Code splitting | `vite.config.ts` | Dynamic imports para rotas e componentes grandes |
| Cache de completion_percentage | Frontend | Zustand store com TTL em vez de re-fetch constante |
| Indexes no SQLite | `app.py` | Adicionar index em `lesson.course_id`, `note.lesson_id`, `focus_session.date` |
| Eager loading nas queries | `routes.py` | `joinedload()` para evitar N+1 em exports |
| Debounce na busca de aulas | `course.tsx` | 300ms delay antes de filtrar |

### 3.3 UX

| Melhoria | Descrição |
|----------|-----------|
| Loading skeletons | Mostrar skeleton enquanto dados carregam (cursos, aulas, notas) |
| Retry button | Quando API falha, mostrar botão "Tentar novamente" |
| Atalhos de teclado no player | Play/pause (espaço), seek (setas), volume (+/-) |
| Confirmação antes de deletar matéria | Toast com "Desfazer" em vez de deletar imediatamente |
| Persistência de volume | Salvar volume do player no localStorage |
| Validação de inputs | Feedback em tempo real nos formulários (nome do curso, URL da API) |
| Optimistic updates nas notas | Atualizar UI imediatamente, reverter se API falhar |
| Toast de erro quando API está offline | Em vez de falha silenciosa |

### 3.4 Segurança

| Melhoria | Prioridade | Ação |
|----------|------------|------|
| Validar paths no `/serve-content` | URGENTE | `os.path.commonpath()` + allowlist |
| Sanitizar HTML nas notas | URGENTE | Instalar e usar DOMPurify |
| Gerar SECRET_KEY aleatória | ALTA | `os.urandom(24).hex()` em produção |
| Validar uploads (MIME + tamanho) | ALTA | Checar tipo real do arquivo, limitar a 10MB |
| Configurar CORS restritivo | MÉDIA | Permitir apenas `localhost:5173` em dev |
| Timeout nas requisições | MÉDIA | 30s no Axios |

### 3.5 Qualidade de Código

| Melhoria | Impacto |
|----------|---------|
| Configurar ESLint + Prettier | Consistência de código |
| Adicionar `.gitattributes` | Resolver problemas de line endings (LF/CRLF) |
| Remover `console.log` e `print` de debug | Logs mais limpos |
| Criar `.editorconfig` | Consistência entre editores |
| Type safety mais rígida nos services | Validar respostas da API com Zod |

---

## 4. O que Pode ser Implementado

### 4.1 Features de Alto Valor (Curto Prazo)

#### UI para Module Links
**Contexto:** Backend tem CRUD completo para links de questões por módulo, mas não há interface no frontend.
**Implementação:** Adicionar seção na sidebar do curso mostrando links de questões para o módulo selecionado. Botão para adicionar/editar links.

#### Atalhos de Teclado Globais
**Contexto:** Vidstack suporta keybindings customizados, mas nenhum está configurado.
**Implementação:**
- Espaço → Play/Pause
- Setas esquerda/direita → Seek ±10s
- Setas cima/baixo → Volume
- N → Próxima aula
- P → Aula anterior
- F → Fullscreen
- T → Modo teatro

#### Indicador de Progresso por Módulo
**Contexto:** Existe porcentagem de conclusão por curso, mas não por módulo.
**Implementação:** Barra de progresso em cada seção do módulo na sidebar.

#### Busca Global
**Contexto:** Busca existe apenas dentro de um curso.
**Implementação:** Search bar no header que busca em cursos, aulas e anotações.

#### Backup Automático do Banco
**Contexto:** SQLite é um arquivo único sem backup.
**Implementação:** Endpoint para exportar `.sqlite` + backup automático diário.

### 4.2 Features de Médio Valor (Médio Prazo)

| Feature | Descrição |
|---------|-----------|
| **Offline support** | Service worker para cache de página + indicador "sem conexão" |
| **Drag & reorder aulas** | Reordenar aulas dentro de um módulo por drag-and-drop |
| **Gamificação** | Badges por streak, total de horas, cursos completos |
| **Marcadores no vídeo** | Bookmarks visuais na timeline do player |
| **Modo revisão** | Flashcards gerados a partir das anotações |
| **Estatísticas avançadas** | Gráficos de tempo por curso, matéria, dia da semana |
| **Importação de cursos** | Importar estrutura de curso a partir de JSON/CSV |
| **Multi-idioma** | i18n para EN/PT |

### 4.3 Features de Longo Prazo

| Feature | Descrição |
|---------|-----------|
| **Autenticação** | Login simples (senha) para proteção local |
| **API REST documentada** | OpenAPI/Swagger spec |
| **Testes automatizados** | Jest + React Testing Library (frontend), pytest (backend) |
| **Task queue** | Celery/RQ para scans e exports pesados |
| **Cache layer** | Redis para completion percentages e stats |
| **PWA** | Manifest + service worker para instalar como app |

---

## 5. O que Pode ser Retirado

### 5.1 Código Morto / Sem Uso

| Arquivo/Código | Motivo |
|----------------|--------|
| `useFocusSessionSaver.ts` | Hook no-op — lógica foi movida para o store. É importado no FocusPage mas não faz nada. |
| `print(lesson.time_elapsed)` em `routes.py:323` | Debug print esquecido em produção |
| `print(video_path)` em `video_utils.py:24` | Debug print esquecido em produção |
| `docker-compose.yml` | Referencia imagens antigas (`ghcr.io/ryanrpj/*`) que não existem mais |
| `course.fileCover = course.fileCover` em `routes.py:369` | Auto-atribuição redundante (bug?) |

### 5.2 Dependências Não Utilizadas

| Dependência | Arquivo | Motivo |
|-------------|---------|--------|
| `greenlet` | requirements.txt | Não importado diretamente no código |
| `colorama` | requirements.txt | Não importado no código |

### 5.3 Simplificações Possíveis

| O que | Por que |
|-------|---------|
| Polling de popup (setInterval 500ms) | Substituir por `BroadcastChannel.postMessage("popup-closed")` |
| Migrações manuais em `app.py` | Se migrar para Alembic, remover todos os try/except ALTER TABLE |
| `open_video()` em `video_utils.py` | Função de 5 linhas usada 0 vezes — já existe `open_file_externally` |
| Worker file referenciado (`focus-worker.js`) | Referenciado em `useFocusTimerDisplay` mas arquivo não existe no repo |

---

## 6. Scorecard Geral

### Por Categoria

| Categoria | Nota | Observação |
|-----------|------|------------|
| Funcionalidade | 8/10 | Features core completas e funcionais |
| Arquitetura | 7/10 | Bem organizado, mas componentes grandes |
| Type Safety | 8/10 | Bom uso de TypeScript, gaps menores |
| Error Handling | 4/10 | Falhas silenciosas em quase tudo |
| Testes | 0/10 | Zero testes no repositório |
| Performance | 6/10 | Sem paginação, bundle grande, muitas requisições |
| Segurança | 4/10 | Path traversal, XSS, SECRET_KEY fraca |
| UX | 7/10 | Boa interface, falta feedback de erros |
| Documentação | 5/10 | CLAUDE.md bom, código sem comentários |
| Manutenibilidade | 6/10 | Componentes grandes, sem lint |

### Por Componente

| Componente | Status | Risco |
|------------|--------|-------|
| Player de vídeo | Estável | Baixo |
| Anotações | Funcional | Médio (XSS) |
| Timer Pomodoro | Complexo, com bugs | Alto |
| Scan de cursos | Funcional | Médio (race conditions) |
| Export PDF | Funcional | Alto (dependência faltando) |
| Configurações | Simples | Baixo |
| Heatmap/Analytics | Funcional | Baixo |

### Prioridades de Ação

```
🔴 URGENTE (bugs ativos / segurança):
   1. Corrigir path traversal no /serve-content
   2. Adicionar DOMPurify nas anotações
   3. Adicionar xhtml2pdf ao requirements.txt
   4. Corrigir race condition na hidratação do timer
   5. Corrigir sessões duplicadas no reload

🟠 IMPORTANTE (estabilidade):
   6. Adicionar timeout no Axios (30s)
   7. Error toasts nos services (em vez de falha silenciosa)
   8. Corrigir regex do FFmpeg (decimais)
   9. Gerar SECRET_KEY aleatória
   10. Debounce no updateWatchedTime

🟡 MELHORIA (qualidade):
   11. Configurar ESLint
   12. Dividir CoursePage em sub-componentes
   13. Refatorar useFocusTimer
   14. Adicionar paginação real
   15. Code splitting / lazy loading

⚪ FUTURO (features):
   16. UI para module links
   17. Atalhos de teclado
   18. Busca global
   19. Backup automático
   20. Testes automatizados
```

---

> **Nota:** Este documento é um snapshot do estado atual da plataforma. Deve ser atualizado conforme as correções e melhorias são implementadas.
