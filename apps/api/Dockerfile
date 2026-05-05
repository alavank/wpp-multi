FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN npm install -g pnpm@9.12.3
WORKDIR /repo

# --- deps stage ---
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @wpp/api... --filter @wpp/shared

# --- build stage ---
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @wpp/api exec prisma generate \
 && pnpm --filter @wpp/api build

# --- prune stage ---
# `pnpm deploy` cria em /deploy um diretório auto-contido com TODAS as
# dependências resolvidas dentro de node_modules — sem symlinks externos
# para .pnpm na raiz. É exatamente o que precisamos para mover para a
# imagem final sem quebrar o resolve do Node.
FROM build AS prune
RUN pnpm --filter @wpp/api deploy --prod --legacy /deploy
RUN cp -r /repo/apps/api/dist /deploy/dist \
 && cp -r /repo/apps/api/prisma /deploy/prisma

# --- runtime stage ---
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prune /deploy /app
EXPOSE 3333
CMD ["node", "dist/index.js"]
