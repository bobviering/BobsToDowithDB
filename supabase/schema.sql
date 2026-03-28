create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  notes text,
  due_date date,
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  list_name text not null default 'Home',
  completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tasks_user_due_idx on public.tasks (user_id, due_date);
create index if not exists tasks_user_completed_idx on public.tasks (user_id, completed);

alter table public.tasks enable row level security;

create or replace function public.handle_new_task_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_task_user_before_insert on public.tasks;
create trigger set_task_user_before_insert
before insert on public.tasks
for each row
execute function public.handle_new_task_user();

create or replace function public.touch_task_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists touch_task_updated_at on public.tasks;
create trigger touch_task_updated_at
before update on public.tasks
for each row
execute function public.touch_task_updated_at();

drop policy if exists "Users can view their own tasks" on public.tasks;
create policy "Users can view their own tasks"
on public.tasks for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own tasks" on public.tasks;
create policy "Users can insert their own tasks"
on public.tasks for insert
with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
on public.tasks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
on public.tasks for delete
using (auth.uid() = user_id);
