-- Questions submitted by anon users
create table public.questions (
  id          uuid primary key default gen_random_uuid(),
  body        text not null check (char_length(body) between 1 and 280),
  created_at  timestamptz not null default now(),
  vote_count  integer not null default 0
);

create index questions_sort_idx
  on public.questions (vote_count desc, created_at desc);

-- One row per (question, user) — the PK is the dedup
create table public.votes (
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id     uuid not null references auth.users(id)       on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (question_id, user_id)
);

create index votes_user_idx on public.votes (user_id);

-- Trigger: maintain vote_count
create or replace function public.bump_vote_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.questions
       set vote_count = vote_count + 1
     where id = new.question_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.questions
       set vote_count = greatest(vote_count - 1, 0)
     where id = old.question_id;
    return old;
  end if;
  return null;
end $$;

create trigger votes_count_aiud
after insert or delete on public.votes
for each row execute function public.bump_vote_count();

-- Row Level Security
alter table public.questions enable row level security;
alter table public.votes     enable row level security;

-- questions: everyone can read; any authenticated user (incl. anon) can insert
create policy questions_read   on public.questions for select using (true);
create policy questions_insert on public.questions for insert to authenticated with check (true);

-- votes: everyone can read; you can only insert/delete your own row
create policy votes_read   on public.votes for select using (true);
create policy votes_insert on public.votes for insert to authenticated
  with check (user_id = auth.uid());
create policy votes_delete on public.votes for delete to authenticated
  using (user_id = auth.uid());

-- Realtime publication
alter publication supabase_realtime add table public.questions;
