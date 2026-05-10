-- Run in Supabase SQL editor. Enable Google provider in Authentication > Providers.

create table if not exists public.user_inventories (
  user_id uuid primary key references auth.users (id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  title text,
  updated_at timestamptz not null default now()
);

alter table public.user_inventories enable row level security;

create policy "user_inventories_select_own"
  on public.user_inventories for select
  using (auth.uid() = user_id);

create policy "user_inventories_insert_own"
  on public.user_inventories for insert
  with check (auth.uid() = user_id);

create policy "user_inventories_update_own"
  on public.user_inventories for update
  using (auth.uid() = user_id);

create policy "user_inventories_delete_own"
  on public.user_inventories for delete
  using (auth.uid() = user_id);
