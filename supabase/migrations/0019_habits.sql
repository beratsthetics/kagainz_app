-- Koçun verdiği günlük alışkanlıklar (Max): koç üyeye "10 bin adım", "3 litre su" gibi görevler atar,
-- üye her gün işaretler. Tekrar çalıştırılabilir.

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id);
alter table public.habits enable row level security;
drop policy if exists "alışkanlıkları gör" on public.habits;
create policy "alışkanlıkları gör" on public.habits for select using (auth.uid() = user_id or public.is_coach());
drop policy if exists "koç alışkanlık atar" on public.habits;
create policy "koç alışkanlık atar" on public.habits for all using (public.is_coach()) with check (public.is_coach());
revoke all on public.habits from anon;

create table if not exists public.habit_logs (
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day date not null,
  primary key (habit_id, day)
);
alter table public.habit_logs enable row level security;
drop policy if exists "alışkanlık kayıtlarını gör" on public.habit_logs;
create policy "alışkanlık kayıtlarını gör" on public.habit_logs for select using (auth.uid() = user_id or public.is_coach());
-- Üye sadece kendine atanmış alışkanlığı, bugün ya da dün için işaretler (saat farkı için dün de açık).
drop policy if exists "alışkanlığı işaretle" on public.habit_logs;
create policy "alışkanlığı işaretle" on public.habit_logs for insert with check (
  auth.uid() = user_id
  and day between current_date - 1 and current_date + 1
  and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid())
);
drop policy if exists "işareti kaldır" on public.habit_logs;
create policy "işareti kaldır" on public.habit_logs for delete using (auth.uid() = user_id);
revoke all on public.habit_logs from anon;
