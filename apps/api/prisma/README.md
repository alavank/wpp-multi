# Prisma — wpp-multi

## Aplicar no Supabase

1. Crie um projeto no Supabase e copie a `DATABASE_URL` (Settings → Database → Connection string).
2. Crie `apps/api/.env` com:
   ```
   DATABASE_URL="..."
   DIRECT_URL="..."
   SUPABASE_URL="..."
   SUPABASE_ANON_KEY="..."
   SUPABASE_SERVICE_ROLE_KEY="..."
   SUPABASE_JWT_SECRET="..."
   ```
3. Rode a migration:
   ```bash
   pnpm db:migrate
   ```
   (ou `pnpm --filter @wpp/api exec prisma migrate deploy` em produção).
4. Aplique as policies de RLS:
   ```bash
   psql "$DATABASE_URL" -f prisma/rls.sql
   ```
   Alternativa: copie e cole o conteúdo de `prisma/rls.sql` no SQL Editor do Supabase.
5. Habilite **Realtime** nas tabelas `conversations` e `messages` (Database → Replication).

## Sincronizar usuário Supabase ↔ tabela `users`

Quando criar um usuário no Supabase Auth, crie a linha correspondente em
`public.users` com o mesmo `id`. Recomendado: trigger no Postgres.
