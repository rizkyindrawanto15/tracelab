-- ════════════════════════════════════════════════════════════════════════════
-- TraceLab — initial schema
-- Tables: profiles, workspaces, workspace_members, collections, requests,
--         environments, request_history, api_documentations
-- Every table has Row Level Security enabled. Access is derived from
-- workspace membership; request history is private to the user who sent it.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Utility: updated_at trigger ────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── profiles ───────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text check (char_length(full_name) <= 120),
  avatar_url  text check (char_length(avatar_url) <= 2048),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_email_lower_idx on public.profiles (lower(email));

-- ─── workspaces ─────────────────────────────────────────────────────────────
create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index workspaces_owner_idx on public.workspaces (owner_id);

-- ─── workspace_members ──────────────────────────────────────────────────────
create table public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  role          text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

-- ─── collections ────────────────────────────────────────────────────────────
create table public.collections (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 120),
  description   text not null default '' check (char_length(description) <= 5000),
  sort_order    integer not null default 0,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- lets child tables guarantee they stay in the same workspace
  unique (id, workspace_id)
);
create index collections_workspace_idx on public.collections (workspace_id, sort_order);

-- ─── requests ───────────────────────────────────────────────────────────────
create table public.requests (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces (id) on delete cascade,
  collection_id  uuid not null,
  name           text not null check (char_length(btrim(name)) between 1 and 200),
  description    text not null default '' check (char_length(description) <= 10000),
  config         jsonb not null default '{}'::jsonb
                   check (jsonb_typeof(config) = 'object' and octet_length(config::text) <= 1048576),
  sort_order     integer not null default 0,
  created_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, workspace_id),
  -- composite FK: a request can only live in a collection of the same workspace
  foreign key (collection_id, workspace_id)
    references public.collections (id, workspace_id) on delete cascade
);
create index requests_workspace_idx on public.requests (workspace_id);
create index requests_collection_idx on public.requests (collection_id, sort_order);

-- ─── environments ───────────────────────────────────────────────────────────
create table public.environments (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 80),
  variables     jsonb not null default '[]'::jsonb
                  check (jsonb_typeof(variables) = 'array' and octet_length(variables::text) <= 262144),
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index environments_workspace_idx on public.environments (workspace_id);

-- ─── request_history ────────────────────────────────────────────────────────
create table public.request_history (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  method        text not null check (method in ('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS')),
  url           text not null check (char_length(url) <= 8192),
  status        integer check (status between 0 and 999),
  duration_ms   double precision check (duration_ms >= 0),
  size_bytes    bigint check (size_bytes >= 0),
  error         text check (char_length(error) <= 2000),
  request_name  text check (char_length(request_name) <= 200),
  -- redacted client-side: literal credentials are replaced before insert
  config        jsonb not null default '{}'::jsonb
                  check (jsonb_typeof(config) = 'object' and octet_length(config::text) <= 1048576),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index request_history_lookup_idx on public.request_history (workspace_id, user_id, created_at desc);
create index request_history_user_idx on public.request_history (user_id);

-- ─── api_documentations ─────────────────────────────────────────────────────
create table public.api_documentations (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces (id) on delete cascade,
  request_id        uuid,
  name              text not null check (char_length(btrim(name)) between 1 and 200),
  method            text not null check (method in ('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS')),
  url               text not null default '' check (char_length(url) <= 8192),
  description       text not null default '' check (char_length(description) <= 20000),
  headers           jsonb not null default '[]'::jsonb check (jsonb_typeof(headers) = 'array'),
  params            jsonb not null default '[]'::jsonb check (jsonb_typeof(params) = 'array'),
  example_request   text not null default '' check (char_length(example_request) <= 200000),
  example_response  text not null default '' check (char_length(example_response) <= 500000),
  created_by        uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (request_id, workspace_id)
    references public.requests (id, workspace_id) on delete set null (request_id)
);
create index api_documentations_workspace_idx on public.api_documentations (workspace_id);
create index api_documentations_request_idx on public.api_documentations (request_id);

-- ─── updated_at triggers ────────────────────────────────────────────────────
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger workspace_members_updated_at before update on public.workspace_members for each row execute function public.set_updated_at();
create trigger collections_updated_at before update on public.collections for each row execute function public.set_updated_at();
create trigger requests_updated_at before update on public.requests for each row execute function public.set_updated_at();
create trigger environments_updated_at before update on public.environments for each row execute function public.set_updated_at();
create trigger request_history_updated_at before update on public.request_history for each row execute function public.set_updated_at();
create trigger api_documentations_updated_at before update on public.api_documentations for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- Authorization helpers (SECURITY DEFINER so policies don't recurse into RLS)
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(p_workspace_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = auth.uid()
      and m.role = any (p_roles)
  );
$$;

create or replace function public.shares_workspace_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members a
    join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = auth.uid() and b.user_id = p_user_id
  );
$$;

-- ─── Workspace bootstrap: owner membership + default environments ───────────
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do update set role = 'owner';

  insert into public.environments (workspace_id, name, variables, created_by) values
    (new.id, 'Local', jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid(), 'key', 'base_url', 'value', 'http://localhost:3000', 'enabled', true, 'secret', false),
        jsonb_build_object('id', gen_random_uuid(), 'key', 'api_token', 'value', '', 'enabled', true, 'secret', true)), new.owner_id),
    (new.id, 'Development', jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid(), 'key', 'base_url', 'value', 'https://jsonplaceholder.typicode.com', 'enabled', true, 'secret', false),
        jsonb_build_object('id', gen_random_uuid(), 'key', 'api_token', 'value', '', 'enabled', true, 'secret', true),
        jsonb_build_object('id', gen_random_uuid(), 'key', 'user_id', 'value', '1', 'enabled', true, 'secret', false)), new.owner_id),
    (new.id, 'Staging', jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid(), 'key', 'base_url', 'value', 'https://staging.api.example.com', 'enabled', true, 'secret', false),
        jsonb_build_object('id', gen_random_uuid(), 'key', 'api_token', 'value', '', 'enabled', true, 'secret', true)), new.owner_id),
    (new.id, 'Production', jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid(), 'key', 'base_url', 'value', 'https://api.example.com', 'enabled', true, 'secret', false),
        jsonb_build_object('id', gen_random_uuid(), 'key', 'api_token', 'value', '', 'enabled', true, 'secret', true)), new.owner_id);
  return new;
end;
$$;

create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- ─── New auth user → profile + default workspace with a starter collection ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_collection_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120), ''));

  insert into public.workspaces (name, owner_id)
  values ('My Workspace', new.id)
  returning id into v_workspace_id;

  insert into public.collections (workspace_id, name, description, created_by)
  values (v_workspace_id, 'Getting Started', 'Example requests against public, CORS-enabled APIs.', new.id)
  returning id into v_collection_id;

  insert into public.requests (workspace_id, collection_id, name, description, config, sort_order, created_by) values
    (v_workspace_id, v_collection_id, 'List posts', 'Fetch the first five posts.',
      jsonb_build_object('method', 'GET', 'url', '{{base_url}}/posts?_limit=5'), 0, new.id),
    (v_workspace_id, v_collection_id, 'Get user', 'Fetch a single user by id, with assertions.',
      jsonb_build_object('method', 'GET', 'url', '{{base_url}}/users/{{user_id}}',
        'assertions', jsonb_build_array(
          jsonb_build_object('id', gen_random_uuid(), 'type', 'status_equals', 'target', '', 'expected', '200', 'enabled', true),
          jsonb_build_object('id', gen_random_uuid(), 'type', 'json_property_exists', 'target', 'address.city', 'expected', '', 'enabled', true))), 1, new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ─── Keep request history bounded (per user, per workspace) ─────────────────
create or replace function public.trim_request_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.request_history h
  where h.workspace_id = new.workspace_id
    and h.user_id = new.user_id
    and h.id in (
      select id from public.request_history
      where workspace_id = new.workspace_id and user_id = new.user_id
      order by created_at desc
      offset 500
    );
  return null;
end;
$$;

create trigger request_history_trim
  after insert on public.request_history
  for each row execute function public.trim_request_history();

-- ─── Prevent ownership hijacking ────────────────────────────────────────────
create or replace function public.protect_workspace_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Workspace ownership cannot be changed';
  end if;
  return new;
end;
$$;

create trigger workspaces_protect_owner
  before update on public.workspaces
  for each row execute function public.protect_workspace_owner();

create or replace function public.protect_workspace_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'Records cannot be moved between workspaces';
  end if;
  return new;
end;
$$;

create trigger collections_protect_ws before update on public.collections for each row execute function public.protect_workspace_id();
create trigger requests_protect_ws before update on public.requests for each row execute function public.protect_workspace_id();
create trigger environments_protect_ws before update on public.environments for each row execute function public.protect_workspace_id();
create trigger request_history_protect_ws before update on public.request_history for each row execute function public.protect_workspace_id();
create trigger api_documentations_protect_ws before update on public.api_documentations for each row execute function public.protect_workspace_id();
create trigger workspace_members_protect_ws before update on public.workspace_members for each row execute function public.protect_workspace_id();

-- ════════════════════════════════════════════════════════════════════════════
-- RPCs
-- ════════════════════════════════════════════════════════════════════════════

-- Create a workspace owned by the caller (trigger adds membership + envs).
create or replace function public.create_workspace(p_name text)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then
    raise exception 'Workspace name must be between 1 and 80 characters';
  end if;
  if (select count(*) from public.workspaces where owner_id = auth.uid()) >= 50 then
    raise exception 'Workspace limit reached';
  end if;
  insert into public.workspaces (name, owner_id)
  values (btrim(p_name), auth.uid())
  returning * into v_ws;
  return v_ws;
end;
$$;

-- Add (or update the role of) an existing TraceLab user. Owners only.
create or replace function public.add_workspace_member(p_workspace_id uuid, p_email text, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if not public.has_workspace_role(p_workspace_id, array['owner']) then
    raise exception 'Only workspace owners can add members';
  end if;
  if p_role not in ('editor', 'viewer') then
    raise exception 'Role must be editor or viewer';
  end if;
  select id into v_user_id from public.profiles where lower(email) = lower(btrim(p_email)) limit 1;
  if v_user_id is null then
    -- Deliberately generic to avoid leaking which emails have accounts.
    raise exception 'Could not add member. Ask them to create a TraceLab account first.';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (p_workspace_id, v_user_id, p_role)
  on conflict (workspace_id, user_id) do update
    set role = excluded.role
    where public.workspace_members.role <> 'owner';
end;
$$;

revoke all on function public.create_workspace(text) from public, anon;
revoke all on function public.add_workspace_member(uuid, text, text) from public, anon;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.add_workspace_member(uuid, text, text) to authenticated;
revoke all on function public.is_workspace_member(uuid) from public, anon;
revoke all on function public.has_workspace_role(uuid, text[]) from public, anon;
revoke all on function public.shares_workspace_with(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;
grant execute on function public.shares_workspace_with(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles            enable row level security;
alter table public.workspaces          enable row level security;
alter table public.workspace_members   enable row level security;
alter table public.collections         enable row level security;
alter table public.requests            enable row level security;
alter table public.environments        enable row level security;
alter table public.request_history     enable row level security;
alter table public.api_documentations  enable row level security;

-- profiles: you can see yourself and people you share a workspace with.
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces
create policy "workspaces_select_member" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "workspaces_insert_self" on public.workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "workspaces_update_owner" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner']))
  with check (public.has_workspace_role(id, array['owner']));
create policy "workspaces_delete_owner" on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- workspace_members
create policy "members_select" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members_insert_owner" on public.workspace_members for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner']) and role <> 'owner');
create policy "members_update_owner" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']) and role <> 'owner')
  with check (public.has_workspace_role(workspace_id, array['owner']) and role <> 'owner');
create policy "members_delete" on public.workspace_members for delete to authenticated
  using (role <> 'owner' and (public.has_workspace_role(workspace_id, array['owner']) or user_id = (select auth.uid())));

-- Shared content tables: members read, owners/editors write.
create policy "collections_select" on public.collections for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "collections_insert" on public.collections for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner','editor']));
create policy "collections_update" on public.collections for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','editor']))
  with check (public.has_workspace_role(workspace_id, array['owner','editor']));
create policy "collections_delete" on public.collections for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','editor']));

create policy "requests_select" on public.requests for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "requests_insert" on public.requests for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner','editor']));
create policy "requests_update" on public.requests for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','editor']))
  with check (public.has_workspace_role(workspace_id, array['owner','editor']));
create policy "requests_delete" on public.requests for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','editor']));

create policy "environments_select" on public.environments for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "environments_insert" on public.environments for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner','editor']));
create policy "environments_update" on public.environments for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','editor']))
  with check (public.has_workspace_role(workspace_id, array['owner','editor']));
create policy "environments_delete" on public.environments for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','editor']));

create policy "docs_select" on public.api_documentations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "docs_insert" on public.api_documentations for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner','editor']));
create policy "docs_update" on public.api_documentations for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','editor']))
  with check (public.has_workspace_role(workspace_id, array['owner','editor']));
create policy "docs_delete" on public.api_documentations for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','editor']));

-- request_history: strictly private to the user who sent the request.
create policy "history_select_own" on public.request_history for select to authenticated
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy "history_insert_own" on public.request_history for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy "history_delete_own" on public.request_history for delete to authenticated
  using (user_id = (select auth.uid()));

-- The anon role gets nothing.
revoke all on all tables in schema public from anon;
