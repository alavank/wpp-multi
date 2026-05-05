FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN npm install -g pnpm@9.12.3
WORKDIR /repo

# --- deps stage: instala todo o workspace ---
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

# --- runtime stage ---
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
RUN npm install -g pnpm@9.12.3
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/node_modules /app/node_modules
COPY --from=build /repo/packages /app/packages
COPY --from=build /repo/apps/api/dist /app/apps/api/dist
COPY --from=build /repo/apps/api/prisma /app/apps/api/prisma
COPY --from=build /repo/apps/api/package.json /app/apps/api/package.json
COPY --from=build /repo/pnpm-workspace.yaml /repo/package.json /repo/pnpm-lock.yaml /app/

WORKDIR /app/apps/api
EXPOSE 3333
CMD ["node", "dist/index.js"]
