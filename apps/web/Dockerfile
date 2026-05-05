FROM node:20-alpine AS deps
RUN npm install -g pnpm@9.12.3
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @wpp/web... --filter @wpp/shared

FROM deps AS build
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @wpp/web build

FROM nginx:1.27-alpine AS runtime
# Remove default.conf que vem na imagem para evitar conflito de "listen 80".
RUN rm -f /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY apps/web/docker-entrypoint.sh /docker-entrypoint-wpp.sh
RUN chmod +x /docker-entrypoint-wpp.sh
EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint-wpp.sh"]
