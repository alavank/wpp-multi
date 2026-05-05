# wpp-multi — Memória do Projeto

> Documento de orientação na raiz. Resumo de escopo, stack e estado da fundação.
> Para detalhes do briefing original ver [`wpp-multi-prompt.md`](wpp-multi-prompt.md). Mockups visuais em [`design/`](design/).

---

## Visão

Sistema **on-premise** de **multiatendimento WhatsApp** para uso em vários departamentos da organização. Cada departamento opera um número de WhatsApp próprio com sua fila, atendido por múltiplos atendentes simultaneamente. Acesso desktop e mobile via **PWA**.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Repositório | Monorepo **pnpm workspaces** |
| Frontend | **React 18 + Vite + TypeScript**, PWA (`vite-plugin-pwa`), **Tailwind CSS + daisyUI** para temas dark/light, Zustand para estado |
| Backend | **Node.js + Fastify + TypeScript** |
| Banco | **PostgreSQL** via **Supabase** |
| ORM | **Prisma** |
| Auth | **Supabase Auth** (com RLS no Postgres) |
| Realtime | **Supabase Realtime** (canais Postgres por departamento) |
| WhatsApp | **Baileys** (WhatsApp Web) — sessão por departamento, on-premise |
| Validação | **Zod**, schemas em `packages/shared` |

---

## Hierarquia de papéis

| Papel | Poderes |
|---|---|
| **Super Admin** | Cria departamentos, vincula números WhatsApp, gerencia usuários globais e permissões |
| **Admin de Departamento** (Coordenador) | Dashboards de produtividade do setor, controle de filas, gestão de dados da equipe |
| **Atendente** | Acessa filas do(s) setor(es) que pertence, atende, transfere, encerra, visualiza histórico. Cadastro exige Nome Completo + Foto |

Um usuário pode pertencer a **múltiplos departamentos** (`DepartmentMember`).

---

## Filas de atendimento

Cada conversa transita por estados que viram abas no front:

| Aba | Estado da conversa | Regras |
|---|---|---|
| **Aguardando Atendimento** | `WAITING` | Ordenação **FIFO** por `waitingSince` (mais antigas no topo) |
| **Em Atendimento** | `IN_PROGRESS` | Conversas assumidas, com `assignedAgentId` |
| **Finalizadas** | `FINISHED` | Histórico encerrado. **Nova mensagem reabre como `WAITING` no fim da fila** |
| **Transferências** | (cross-cutting via `Transfer`) | Sub-abas **Enviadas** / **Recebidas** filtradas por `fromUserId` / `toUserId` |

### Transições

- **Inbound em contato sem conversa aberta** → cria `Conversation(WAITING)`.
- **"Assumir"** → `WAITING → IN_PROGRESS`, grava `assignedAgentId`, dispara `Message(type=SYSTEM, body="[Nome] vai iniciar seu atendimento...")`.
- **"Transferir"** → `Transfer(status=PENDING)`. Aceite altera `assignedAgentId`, conversa segue `IN_PROGRESS` com contexto preservado.
- **"Encerrar"** → `IN_PROGRESS → FINISHED`, registra `finishedAt` + `finishedById`.
- **Inbound em conversa `FINISHED`** → reabre como `WAITING` com novo `waitingSince`.

Estado global no front (Zustand) deriva 4 listas das `conversations` filtradas, atualizadas via Supabase Realtime.

---

## Regras de envio

- **Ao assumir**: mensagem automática `[Nome do Atendente] vai iniciar seu atendimento...` (gravada como `MessageType.SYSTEM`).
- **Em cada envio do atendente**: prefixo `[Nome do Atendente] disse: ` antes do corpo. Prefixo cacheado em `Message.agentDisplayPrefix` para histórico fiel mesmo se o nome mudar depois.
- **Encerramento**: explícito, com data/hora e responsável (`finishedAt`, `finishedById`).

---

## Agendamento de Retorno

Botão "Agendar Retorno" dentro do chat ativo abre modal com:

| Campo | Origem |
|---|---|
| Nome do Contato | autopreenchido da sessão |
| Número | autopreenchido da sessão |
| Data | usuário |
| Horário | usuário |
| Assunto | usuário |
| Enviar confirmação automática | checkbox (`notifyOnSave`) |

Se `notifyOnSave=true`, sistema envia mensagem de confirmação no chat ao salvar.

---

## Funcionalidades de chat (resumo)

- **Mídia**: áudio, imagem, vídeo, documento, vídeo instantâneo circular (`MessageType.INSTANT_VIDEO`).
- **Grupos**: mapeamento dos grupos que o número do departamento participa (`Group`, `GroupMember`).
- **Painel de Detalhes**: nome, foto, metadados livres (`Contact.metadata` JSONB), notas (`ContactNote`).
- **Histórico**: retenção mínima de **1 ano** por contato.

---

## Estado atual

> **Onde estamos:** projeto end-to-end **conectável**. Auth, rotas, Baileys, mídia, admin, worker, Docker Compose e CI prontos. Falta o cliente plugar `.env` real do Supabase e rodar a primeira migration.

Entregue:

- [x] Monorepo pnpm com `apps/web`, `apps/api`, `packages/shared`
- [x] Schema Prisma + **migration SQL inicial** (`apps/api/prisma/migrations/20260504000000_init/migration.sql`)
- [x] **RLS policies** Supabase (`apps/api/prisma/rls.sql`)
- [x] Auth Fastify (Supabase JWT) + helpers de autorização
- [x] Camada de domínio (transições de Conversation, prefixo `[Nome] disse:`)
- [x] Rotas: conversations, messages, **media (upload/download)**, transfers, scheduled-returns, whatsapp, departments, users
- [x] **Baileys SessionManager** por departamento + ingestão de texto **e mídia** (image/audio/video/instant_video/document/sticker)
- [x] Worker de **scheduled-returns** (notificação automática quando vence)
- [x] Frontend: login Supabase + react-router + RequireAuth, hooks `useConversations`/`useMessages`/`useDepartments` com **Realtime** Supabase
- [x] UI: lista de filas (5 abas), busca, painel de chat com bolhas + mídia (preview imagem/vídeo/áudio/documento, **vídeo circular instantâneo**), assumir/encerrar, modal de Agendar Retorno, painéis de admin (departamentos e usuários), seletor de departamento, tematização dark/light persistida
- [x] **Docker Compose** (postgres + api + web) para deploy on-premise
- [x] **CI** GitHub Actions: install + prisma validate/generate + typecheck + build

Próximos passos (já fora do que está no repo):

1. Plugar `.env` real do Supabase, rodar `pnpm db:migrate` e aplicar `apps/api/prisma/rls.sql` no SQL Editor.
2. Criar trigger Postgres `auth.users → public.users` (ou seedar via API).
3. Habilitar Realtime nas tabelas `conversations` e `messages` no painel Supabase.
4. Iniciar uma sessão Baileys: `POST /whatsapp/sessions/:departmentId/start` e ler o QR via `GET /whatsapp/sessions/:departmentId/qr.png`.
5. Refinar UI iterativamente conforme uso real.

---

## Estrutura

```
wpp-multi/
├── apps/
│   ├── web/        React + Vite + TS + PWA
│   └── api/        Fastify + Prisma + Baileys
├── packages/
│   └── shared/     enums, tipos, zod schemas (front + back)
├── design/         mockups (referência visual obrigatória)
├── prisma → apps/api/prisma/schema.prisma  (única fonte de verdade do schema)
└── wpp-multi-prompt.md  (briefing original)
```
