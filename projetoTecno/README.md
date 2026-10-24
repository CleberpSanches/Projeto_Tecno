# Projeto Tecno — Fullstack (React + Vite + API Node/Express + Supabase)

Projeto unificado: **uma única pasta `src/`** contendo o frontend (`src/pages`, `src/api`, ...)
e a API backend em `src/server`.

## Estrutura

```
src/
  api/            # funções de chamada HTTP do frontend (cadlog, salas, membros, tarefas)
  components/     # Sidebar.jsx
  layout/         # Navbar.jsx
  pages/          # Inicio, LoginCadastro, Perfil, Projetos, Tarefas
  server/         # API backend (Node + Express + Supabase)
    database.js           # ARQUIVO UNIFICADO: cliente do banco + erros Postgres (servidor)
                          # e helper HTTP/sessão (frontend) — todos importam daqui
    middlewares/          # auth.middleware.js (JWT + verificação no banco)
    controllers/          # auth, salas, tarefas
    routes/               # auth, salas, tarefas
    services/             # permissoes.js (papeis: adm/membro/observador)
    test/                 # teste de integração com o Supabase
  App.jsx Router.jsx main.jsx index.css
supabase/
  rls.sql         # políticas RLS para uso com a anon key (somente dev!)
```

## Banco de dados (Supabase)

Tabelas usadas pela API: `usuario`, `sala`, `sala_usuario`, `tarefa`, `usuario_tarefa`.
Configure as credenciais em `.env` (veja `.env.example`):

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — projeto Supabase
- `JWT_SECRET` — assinatura dos tokens (obrigatório em produção)
- `CORS_ORIGIN` — origens permitidas em produção

Se o acesso anon estiver bloqueado por RLS, aplique `supabase/rls.sql`.

## Comandos

```
npm install         # dependências
npm run dev         # frontend (Vite)
npm run dev:server  # API com recarga (nodemon)
npm run start:server
npm run test:server # testes de integração (usam o Supabase configurado)
```

## Rotas da API

- `POST /api/auth/cadastro` — { nome, email, senha } → token
- `POST /api/auth/login` — { email, senha } → token
- `GET  /api/auth/conta` | `DELETE /api/auth/conta`
- `GET  /api/salas` — salas onde o usuário é membro
- `POST /api/salas` — { nome } (gera `codigo_sala`)
- `POST /api/salas/entrar` — { codigo }
- `GET  /api/salas/:id` | `DELETE /api/salas/:id` (só dono)
- `GET/PATCH/DELETE /api/salas/:id/membros/:usuarioId(/papel)` — gestão de membros/papéis
- `GET  /api/tarefas` — filtros: `id_sala, status, prioridade, responsavel_id, prazo_vencido, q`
- `POST /api/tarefas` — { id_sala, titulo, status?, prazo?, prioridade?, responsaveis? }
- `GET/PATCH/DELETE /api/tarefas/:id` — detalhe, atualização (status/prioridade/prazo/título), exclusão
- `PATCH /api/tarefas/:id/status` — atalho de status
- `PUT  /api/tarefas/:id/responsaveis` — { responsaveis: [ids] }

Status: `pendente | em_andamento | concluida` · Prioridade: `baixa | media | alta`
Papéis em sala: `administrador | membro | observador` (observador somente-leitura).

Funcionalidades **descartadas** por não terem tabela no banco: quadros, listas,
etiquetas, checklists, comentários, atividades, notificações, lembretes e
convites por token (substituídos pelo código da sala).
