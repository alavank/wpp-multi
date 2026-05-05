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

Um usuário pode pertencer a **múltiplos departamentos** (`DepartmentMember`). O **role** (Super/Dept admin/Agent) é o piso de capacidades — o **RBAC granular por usuário** vive em `UserPermission` (concede/revoga ações específicas, opcionalmente escopado a um departamento).

### Multi-departamento na UI

Como um mesmo atendente pode estar em vários setores ao mesmo tempo, **toda conversa exibe uma tag colorida com o nome do departamento** na lista de filas e no header do chat. A cor é estável por `departmentId` para evitar confusão entre setores.

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

## Auditoria e logs

Toda ação relevante grava em `AuditLog` com **Usuário**, **Ação**, **Timestamp**, **IP**, **Localização** (best-effort via header `X-Geo` ou geolookup futuro), **Dispositivo** e **User-Agent**. A captura é feita por hook Fastify (`auditPlugin`) que decora `req.audit.emit(action, entity?, metadata?)` — rotas chamam esse helper nas transições críticas (login, assumir, encerrar, transferir, enviar, criar departamento/usuário, etc.). O painel `/admin/audit` consulta com filtros (usuário, ação, intervalo).

## Monitoramento em tempo real (Timeline futurista)

Página `/admin/monitor` renderiza uma **timeline horizontal animada** alimentada por Supabase Realtime na tabela `audit_logs`. Cada evento entra como card pela direita e desliza por 60–120s até sair pela esquerda. O eixo Y é calculado para evitar sobreposição: alocação em **lanes** (faixas horizontais) com algoritmo first-fit — se uma lane está ocupada por um card cuja janela ainda intersecta a do novo, escolhe-se outra lane.

## Funcionalidades de chat (resumo)

- **Mídia**: áudio, imagem, vídeo, documento, vídeo instantâneo circular (`MessageType.INSTANT_VIDEO`).
- **Grupos**: mapeamento dos grupos que o número do departamento participa (`Group`, `GroupMember`).
- **Painel de Detalhes**: nome, foto, metadados livres (`Contact.metadata` JSONB), notas (`ContactNote`).
- **Histórico**: retenção mínima de **1 ano** por contato.

---

## Estado atual (2026-05-05)

> **Onde estamos:** sistema rodando em **produção** no Railway, conectado a um projeto Supabase real. Login, rotas, RLS, auditoria, monitor e admin operacionais. Banco já migrado, RLS aplicado, primeiro SUPER_ADMIN criado.

### URLs em produção

| Serviço | URL |
|---|---|
| **Web (PWA)** | https://wpp-multi.up.railway.app |
| **API** | https://wpp-multi-api.up.railway.app |
| **Health** | https://wpp-multi-api.up.railway.app/health |

### Infra

| Onde | O quê |
|---|---|
| **Supabase** (`ziiqjmmfyvurpsghzfua.supabase.co`) | Postgres + Auth + Realtime |
| **Railway** (projeto `considerate-luck`) | API (`@wpp/api`) e Web (`@wpp/web`), ambos via Dockerfile |
| **GitHub** (`alavank/wpp-multi`) | Origem dos deploys (auto-deploy on push to `main`) |

### Conta SUPER_ADMIN

- Email: `alavank.tecnologia@gmail.com`
- Senha: na sua password manager / `.env` local.

### Concluído

- [x] Monorepo pnpm + Schema Prisma + migrations + RLS aplicados no Supabase prod
- [x] Auth Fastify (Supabase JWT) + RBAC granular + auditoria detalhada
- [x] Rotas: conversations, messages, media (up/download), transfers, scheduled-returns, whatsapp, departments, users, audit-logs, permissions
- [x] Camada de domínio com transições (assumir, encerrar, reabrir, transferir, prefixos)
- [x] Baileys SessionManager + ingestão de texto e mídia
- [x] Worker de scheduled-returns
- [x] Frontend: login Supabase, router, hooks `useConversations`/`useMessages`/`useDepartments`, Realtime
- [x] UI: filas (5 abas), busca, chat com mídia (incl. vídeo circular), modal Agendar Retorno, admin (departamentos, usuários, permissões, auditoria), Monitor Timeline futurista
- [x] DepartmentTag colorida em conversas e chat (multi-departamento)
- [x] Docker Compose para on-premise
- [x] CI GitHub Actions
- [x] **Deploy em produção no Railway** (web + api)

### Pendências (próximos passos quando voltar)

1. **Habilitar Realtime nas tabelas no Supabase**: painel → Database → Replication → publicação `supabase_realtime` → marcar `conversations`, `messages`, `audit_logs`. Sem isso, a UI não atualiza sozinha e o Monitor fica vazio.
2. **Adicionar Volume no `@wpp/api`** no Railway: Settings → Volumes → mount path `/data`. Sem isso, sessões Baileys e mídia se perdem em cada redeploy.
3. **Conectar primeiro número WhatsApp**: criar departamento na UI → `POST /whatsapp/sessions/:id/start` → ler QR em `/whatsapp/sessions/:id/qr.png` → escanear no app do celular.
4. **Trigger Postgres** opcional: ao criar usuário em `auth.users`, espelhar em `public.users`. Hoje fazemos via API (`POST /users`).
5. **Polimento de UI** seguindo `/design`.
6. **Tela de Grupos** + tela de Contatos (rotas existem; UI não).
7. Iteração funcional conforme uso real.

---

## Continuar em outra máquina

Tudo o que está versionado fica no GitHub. Os `.env` (com segredos) **não** vão para o repo — você recria localmente puxando os mesmos valores do painel Supabase + Railway.

### Setup do zero em uma máquina nova

```bash
# 1) Clonar
git clone https://github.com/alavank/wpp-multi.git
cd wpp-multi

# 2) Pré-requisitos: Node 20+ e pnpm 9
# Se faltar pnpm: npm i -g pnpm@9.12.3

# 3) Instalar dependências
pnpm install

# 4) Criar os .env (são gitignored — você recria a partir dos exemplos):
cp .env.example .env
cp apps/api/.env.example apps/api/.env
# Crie também apps/web/.env (não tem .example):
#   VITE_API_URL=http://localhost:3333
#   VITE_SUPABASE_URL=https://ziiqjmmfyvurpsghzfua.supabase.co
#   VITE_SUPABASE_ANON_KEY=<o anon key — pegue em Supabase → Settings → API>
```

### Onde achar os segredos para preencher os `.env`

| Variável | Painel | Caminho |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Project Settings → API |
| `SUPABASE_JWT_SECRET` | Supabase | Project Settings → JWT Keys (Legacy JWT Secret) |
| `DATABASE_URL` | Supabase | Connect (botão topo) → **Session pooler** → URI (porta 5432) |
| `PRIMARY_*` | seus | inventou na primeira vez; o usuário já existe em `auth.users` então PRIMARY_PASSWORD precisa ser a senha real |

> **Atenção senha do DB**: se contém caracteres especiais (`#`, `@`, `%`), **URL-encode**:
> `node -e "console.log(encodeURIComponent('SUA_SENHA'))"`

### Subir ambiente local

```bash
pnpm dev
# api  → http://localhost:3333
# web  → http://localhost:5173
```

A migration **já foi aplicada** no Supabase prod e o SUPER_ADMIN **já existe**. Não precisa rodar `pnpm db:migrate` nem `bootstrap-admin.ts` de novo (mas se rodar, são idempotentes — não duplicam).

### Fluxo de desenvolvimento

```
git pull origin main
# faz alterações
git add .
git commit -m "..."
git push origin main
# Railway auto-deploya:
#   @wpp/web  → https://wpp-multi.up.railway.app
#   @wpp/api  → https://wpp-multi-api.up.railway.app
```

### Comandos úteis

```bash
pnpm dev                  # api + web em paralelo
pnpm dev:api              # só api
pnpm dev:web              # só web
pnpm typecheck            # tsc em todos os workspaces
pnpm build                # build de produção
pnpm db:studio            # Prisma Studio (UI do banco)
pnpm db:migrate           # cria/aplica migrations
pnpm db:generate          # gera Prisma Client
pnpm --filter @wpp/api exec tsx --env-file=.env scripts/bootstrap-admin.ts
                          # cria/atualiza primeiro SUPER_ADMIN
```

### Configurações específicas do Railway (caso precise mexer)

- **`@wpp/web`**: Builder = Dockerfile, Path = `apps/web/Dockerfile`, **Custom Build/Start Commands vazios** (importante!), Public Networking → Port 8080.
- **`@wpp/api`**: Builder = Dockerfile, Path = `apps/api/Dockerfile`, **Custom Build/Start Commands vazios**, Public Networking → Port 3333 (ou auto), Health = `/health`.
- **CORS**: `@wpp/api` precisa ter `API_CORS_ORIGIN=https://wpp-multi.up.railway.app`.
- **VITE_***: `@wpp/web` precisa ter as vars `VITE_API_URL=https://wpp-multi-api.up.railway.app`, `VITE_SUPABASE_URL=...`, `VITE_SUPABASE_ANON_KEY=...` na aba **Build** (são build-time, não runtime).

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
