-- Kagainz 0006: sıralama tablosu. Tekrar çalıştırılabilir.

-- Her üyenin özet sayıları; uygulama değiştikçe kendi satırını günceller.
create table if not exists public.leaderboard (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  streak int not null default 0 check (streak between 0 and 3650),
  week_start date not null default (date_trunc('week', now()))::date,
  week_workouts int not null default 0 check (week_workouts between 0 and 21),
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.leaderboard enable row level security;

drop policy if exists "sıralamanı gör" on public.leaderboard;
create policy "sıralamanı gör" on public.leaderboard for select using (user_id = auth.uid());
drop policy if exists "sıralamanı yaz" on public.leaderboard;
create policy "sıralamanı yaz" on public.leaderboard for insert with check (user_id = auth.uid());
drop policy if exists "sıralamanı güncelle" on public.leaderboard;
create policy "sıralamanı güncelle" on public.leaderboard for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.leaderboard from anon;

-- Zamanı istemci değil sunucu yazar; seri bir günde en fazla 1 artabilir (elle şişirilemesin).
create or replace function public.leaderboard_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.streak := least(new.streak, 400);
  elsif new.streak > old.streak + greatest(1, (current_date - old.updated_at::date)) then
    new.streak := old.streak + greatest(1, (current_date - old.updated_at::date));
  end if;
  return new;
end $$;
drop trigger if exists leaderboard_guard on public.leaderboard;
create trigger leaderboard_guard before insert or update on public.leaderboard
  for each row execute function public.leaderboard_guard();

-- Sıralama: board = 'streak' (güncel seri), 'week' (bu haftaki antrenman), 'challenge' (tamamlanan meydan okuma).
-- İlk 50 ve çağıranın kendi satırı döner. Gizli profiller ve kullanıcı adı olmayanlar listelenmez.
create or replace function public.leaderboard_top(board text)
returns table (rank bigint, user_id uuid, username text, avatar_url text, tier public.tier, value int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with scores as (
    select l.user_id, l.streak as value
    from public.leaderboard l
    where board = 'streak' and l.visible and l.streak > 0 and l.updated_at > now() - interval '2 days'
    union all
    select l.user_id, l.week_workouts
    from public.leaderboard l
    where board = 'week' and l.visible and l.week_workouts > 0 and l.week_start = (date_trunc('week', now()))::date
    union all
    select c.user_id, count(*)::int
    from public.challenge_completions c
    left join public.leaderboard l on l.user_id = c.user_id
    where board = 'challenge' and coalesce(l.visible, true)
    group by c.user_id
  ),
  ranked as (
    select rank() over (order by s.value desc) as rank, s.user_id, p.username, p.avatar_url, p.tier, s.value
    from scores s join public.profiles p on p.id = s.user_id
    where p.username is not null
  )
  select r.rank, r.user_id, r.username, r.avatar_url, r.tier, r.value, r.user_id = auth.uid()
  from ranked r
  where r.rank <= 50 or r.user_id = auth.uid()
  order by r.rank, r.username
$$;
revoke execute on function public.leaderboard_top(text) from anon, public;
grant execute on function public.leaderboard_top(text) to authenticated;
