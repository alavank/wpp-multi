-- =====================================================================
-- wpp-multi — Row Level Security policies para Supabase Postgres
-- Aplique APÓS a migration inicial. Recomenda-se rodar no SQL Editor do
-- Supabase ou via `supabase db push`.
--
-- Modelo:
--   - Cada usuário do app tem User.id = auth.users.id (mesma UUID).
--   - Pertencimento a departamentos via department_members.
--   - SUPER_ADMIN tem acesso total; demais filtram por departmentIds.
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
        where dm.user_id = auth.uid()
          and dm.department_id = dept
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

create policy "select departments by membership"
on public.departments for select
to authenticated
using (public.is_super_admin() or public.is_member_of(id));

create policy "select users self or super admin"
on public.users for select
to authenticated
using (id = auth.uid() or public.is_super_admin());

create policy "select department_members by membership"
on public.department_members for select
to authenticated
using (public.is_super_admin() or public.is_member_of(department_id));

create policy "select whatsapp_sessions by membership"
on public.whatsapp_sessions for select
to authenticated
using (public.is_super_admin() or public.is_member_of(department_id));

create policy "select contacts by membership"
on public.contacts for select
to authenticated
using (public.is_super_admin() or public.is_member_of(department_id));

create policy "select contact_notes via contact"
on public.contact_notes for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.contacts c
    where c.id = contact_notes.contact_id
      and public.is_member_of(c.department_id)
  )
);

create policy "select conversations by membership"
on public.conversations for select
to authenticated
using (public.is_super_admin() or public.is_member_of(department_id));

create policy "select messages via conversation"
on public.messages for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.conversations cv
    where cv.id = messages.conversation_id
      and public.is_member_of(cv.department_id)
  )
);

create policy "select media_assets via message"
on public.media_assets for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.messages m
    join public.conversations cv on cv.id = m.conversation_id
    where m."mediaId" = media_assets.id
      and public.is_member_of(cv.department_id)
  )
);

create policy "select transfers (sender or receiver)"
on public.transfers for select
to authenticated
using (
  public.is_super_admin()
  or "fromUserId" = auth.uid()
  or "toUserId"   = auth.uid()
);

create policy "select scheduled_returns by membership"
on public.scheduled_returns for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.conversations cv
    where cv.id = scheduled_returns.conversation_id
      and public.is_member_of(cv.department_id)
  )
);

create policy "select groups by membership"
on public.groups for select
to authenticated
using (public.is_super_admin() or public.is_member_of(department_id));

create policy "select group_members via group"
on public.group_members for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.groups g
    where g.id = group_members.group_id
      and public.is_member_of(g.department_id)
  )
);

create policy "select audit_logs (super admin only)"
on public.audit_logs for select
to authenticated
using (public.is_super_admin());

create policy "select user_permissions self or super admin"
on public.user_permissions for select
to authenticated
using ("userId" = auth.uid() or public.is_super_admin());

-- ---------------------------------------------------------------------
-- Policies de escrita
-- O backend usa SUPABASE_SERVICE_ROLE_KEY (bypass RLS) para criar/alterar
-- registros — então aqui ficamos restritivos por padrão. Ajustar depois
-- se quiser permitir INSERT direto pelo cliente (não recomendado).
-- ---------------------------------------------------------------------

-- Atendentes podem inserir notas de contato dos seus departamentos
create policy "insert contact_notes via membership"
on public.contact_notes for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.contacts c
    where c.id = contact_notes.contact_id
      and public.is_member_of(c.department_id)
  )
);

-- Updates self em users (perfil próprio)
create policy "update own user profile"
on public.users for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
