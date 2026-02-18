-- Settings table for app-wide configuration
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default now()
);

alter table public.settings enable row level security;

create policy "Service role can manage settings"
  on public.settings for all
  using (true)
  with check (true);

-- Seed default: chat enabled
insert into public.settings (key, value) values ('student_chat_enabled', 'true');
