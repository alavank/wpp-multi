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

## Estado atual da fundação

> **Onde estamos:** estrutura inicial criada — monorepo, schema Prisma, bootstraps mínimos. Sem rotas, telas, ou integração Baileys ainda.

Entregue nesta primeira execução:

- [x] `MEMORY.md` (este arquivo) com escopo + stack + estado
- [x] Monorepo pnpm: `apps/web`, `apps/api`, `packages/shared`
- [x] Schema Prisma completo com todas as entidades do briefing
- [x] Bootstraps mínimos compiláveis (Fastify hello + Vite shell PWA)

Próximos passos (fora do escopo desta etapa):

1. Configurar `.env` com `DATABASE_URL` do Supabase e rodar `pnpm --filter @wpp/api prisma migrate dev`.
2. Implementar módulo Baileys (`apps/api/src/modules/whatsapp`): SessionManager por departamento, listeners de eventos (mensagens, conexão, QR).
3. Rotas REST do Fastify para conversations / messages / transfers / scheduled-returns / departments / users.
4. Policies RLS no Supabase + plugin de auth Fastify validando JWT do Supabase.
5. Telas React seguindo mockups em `design/`: lista de filas (4 abas), painel de chat, painel de detalhes, modal de agendamento, gestão de usuários e departamentos.
6. Workers: download/processamento de mídia, notificação de retorno agendado.
7. Tematização dark/light via CSS variables Tailwind + toggle persistido.
8. Empacotamento on-premise (Docker Compose).

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
