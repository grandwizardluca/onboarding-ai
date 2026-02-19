-- Analytics tables for activity tracking, study sessions, and topic extraction

-- 1. Activity events: stores 30-second binary pulses
create table public.activity_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  mouse_active boolean not null default false,
  keyboard_active boolean not null default false,
  tab_focused boolean not null default true,
  message_sent boolean not null default false,
  created_at timestamp with time zone default now()
);

alter table public.activity_events enable row level security;

create policy "Users can read own activity_events"
  on public.activity_events for select
  using (auth.uid() = user_id);

create policy "Service role can manage activity_events"
  on public.activity_events for all
  using (true)
  with check (true);

create index idx_activity_events_user_time
  on public.activity_events (user_id, created_at desc);


-- 2. Study sessions: materialized from activity events
create table public.study_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone not null,
  duration_minutes integer not null,
  mouse_active_count integer not null default 0,
  keyboard_active_count integer not null default 0,
  messages_sent integer not null default 0,
  created_at timestamp with time zone default now()
);

alter table public.study_sessions enable row level security;

create policy "Users can read own study_sessions"
  on public.study_sessions for select
  using (auth.uid() = user_id);

create policy "Service role can manage study_sessions"
  on public.study_sessions for all
  using (true)
  with check (true);

create index idx_study_sessions_user_time
  on public.study_sessions (user_id, started_at desc);


-- 3. Conversation topics: extracted topic tags per conversation
create table public.conversation_topics (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  topic_key text not null,
  topic_label text not null,
  category text not null,
  mention_count integer not null default 1,
  last_mentioned_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  unique(conversation_id, topic_key)
);

alter table public.conversation_topics enable row level security;

create policy "Users can read own conversation_topics"
  on public.conversation_topics for select
  using (auth.uid() = user_id);

create policy "Service role can manage conversation_topics"
  on public.conversation_topics for all
  using (true)
  with check (true);

create index idx_conversation_topics_user
  on public.conversation_topics (user_id);
