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

# --- build stage: compila TS e gera Prisma Client ---
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @wpp/api exec prisma generate \
 && pnpm --filter @wpp/api build

# --- runtime stage: copia o workspace inteiro (preserva symlinks pnpm) ---
# Mantemos toda a estrutura de /repo para que os symlinks de
# apps/api/node_modules apontem para .pnpm em node_modules na raiz.
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo /app
WORKDIR /app/apps/api
EXPOSE 3333
CMD ["node", "dist/index.js"]
