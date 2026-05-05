-- =====================================================================
-- wpp-multi — Row Level Security policies para Supabase Postgres
-- Aplique APÓS a migration inicial. Recomenda-se rodar no SQL Editor do
-- Supabase ou via `prisma db execute --file prisma/rls.sql`.
--
-- IMPORTANTE: as colunas geradas pelo Prisma usam camelCase ("userId",
-- "departmentId", "contactId", etc.) — sempre referenciamos com aspas
-- duplas porque Postgres faz fold para minúsculas em identificadores
-- não citados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

create or replace function public.current_app_user()
returns public.users
language sql
stable
as $$
  select * from public.users where id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select role = 'SUPER_ADMIN' from public.users where id = auth.uid()), false)
$$;

create or replace function public.is_member_of(dept uuid)
returns boolean
language sql
stable
as $$
  select public.is_super_admin()
      or exists (
        select 1
        from public.department_members dm
        where dm."userId" = auth.uid()
          and dm."departmentId" = dept
      )
$$;

-- ---------------------------------------------------------------------
-- Habilita RLS em todas as tabelas de domínio
-- ---------------------------------------------------------------------

alter table public.departments         enable row level security;
alter table public.users               enable row level security;
alter table public.department_members  enable row level security;
alter table public.whatsapp_sessions   enable row level security;
alter table public.contacts            enable row level security;
alter table public.contact_notes       enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.media_assets        enable row level security;
alter table public.transfers           enable row level security;
alter table public.scheduled_returns   enable row level security;
alter table public.groups              enable row level security;
alter table public.group_members       enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.user_permissions    enable row level security;

-- ---------------------------------------------------------------------
-- Policies SELECT
-- ---------------------------------------------------------------------

drop policy if exists "select departments by membership" on public.departments;
create policy "select departments by membership"
on public.departments for select
to authenticated
using (public.is_super_admin() or public.is_member_of(id));

drop policy if exists "select users self or super admin" on public.users;
create policy "select users self or super admin"
on public.users for select
to authenticated
using (id = auth.uid() or public.is_super_admin());

drop policy if exists "select department_members by membership" on public.department_members;
create policy "select department_members by membership"
on public.department_members for select
to authenticated
using (public.is_super_admin() or public.is_member_of("departmentId"));

drop policy if exists "select whatsapp_sessions by membership" on public.whatsapp_sessions;
create policy "select whatsapp_sessions by membership"
on public.whatsapp_sessions for select
to authenticated
using (public.is_super_admin() or public.is_member_of("departmentId"));

drop policy if exists "select contacts by membership" on public.contacts;
create policy "select contacts by membership"
on public.contacts for select
to authenticated
using (public.is_super_admin() or public.is_member_of("departmentId"));

drop policy if exists "select contact_notes via contact" on public.contact_notes;
create policy "select contact_notes via contact"
on public.contact_notes for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.contacts c
    where c.id = contact_notes."contactId"
      and public.is_member_of(c."departmentId")
  )
);

drop policy if exists "select conversations by membership" on public.conversations;
create policy "select conversations by membership"
on public.conversations for select
to authenticated
using (public.is_super_admin() or public.is_member_of("departmentId"));

drop policy if exists "select messages via conversation" on public.messages;
create policy "select messages via conversation"
on public.messages for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.conversations cv
    where cv.id = messages."conversationId"
      and public.is_member_of(cv."departmentId")
  )
);

drop policy if exists "select media_assets via message" on public.media_assets;
create policy "select media_assets via message"
on public.media_assets for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.messages m
    join public.conversations cv on cv.id = m."conversationId"
    where m."mediaId" = media_assets.id
      and public.is_member_of(cv."departmentId")
  )
);

drop policy if exists "select transfers (sender or receiver)" on public.transfers;
create policy "select transfers (sender or receiver)"
on public.transfers for select
to authenticated
using (
  public.is_super_admin()
  or "fromUserId" = auth.uid()
  or "toUserId"   = auth.uid()
);

drop policy if exists "select scheduled_returns by membership" on public.scheduled_returns;
create policy "select scheduled_returns by membership"
on public.scheduled_returns for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.conversations cv
    where cv.id = scheduled_returns."conversationId"
      and public.is_member_of(cv."departmentId")
  )
);

drop policy if exists "select groups by membership" on public.groups;
create policy "select groups by membership"
on public.groups for select
to authenticated
using (public.is_super_admin() or public.is_member_of("departmentId"));

drop policy if exists "select group_members via group" on public.group_members;
create policy "select group_members via group"
on public.group_members for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.groups g
    where g.id = group_members."groupId"
      and public.is_member_of(g."departmentId")
  )
);

drop policy if exists "select audit_logs (super admin only)" on public.audit_logs;
create policy "select audit_logs (super admin only)"
on public.audit_logs for select
to authenticated
using (public.is_super_admin());

drop policy if exists "select user_permissions self or super admin" on public.user_permissions;
create policy "select user_permissions self or super admin"
on public.user_permissions for select
to authenticated
using ("userId" = auth.uid() or public.is_super_admin());

-- ---------------------------------------------------------------------
-- Policies de escrita
-- O backend usa SUPABASE_SERVICE_ROLE_KEY (bypass RLS) para criar/alterar
-- registros — então aqui ficamos restritivos por padrão.
-- ---------------------------------------------------------------------

drop policy if exists "insert contact_notes via membership" on public.contact_notes;
create policy "insert contact_notes via membership"
on public.contact_notes for insert
to authenticated
with check (
  "authorId" = auth.uid()
  and exists (
    select 1 from public.contacts c
    where c.id = contact_notes."contactId"
      and public.is_member_of(c."departmentId")
  )
);

drop policy if exists "update own user profile" on public.users;
create policy "update own user profile"
on public.users for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
