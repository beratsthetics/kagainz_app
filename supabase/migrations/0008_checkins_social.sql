-- Kagainz 0008: haftalık check-in, takip ve tebrik, davet kodu, koçun makro hedefi. Tekrar çalıştırılabilir.
-- Önce 0005 (profil fotoğrafı) ve 0006 (sıralama) çalışmış olmalı.

-- ───────────────────────── Haftalık check-in ─────────────────────────
-- Pro ve üstü haftada bir kilo, ölçü, en fazla 3 fotoğraf ve not girer.
-- Plus ve Max'ta koç check-in'i görür ve yorum yazar.
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  week_start date not null,
  weight numeric(5, 1) check (weight between 20 and 400),
  waist numeric(5, 1) check (waist between 10 and 300),
  chest numeric(5, 1) check (chest between 10 and 300),
  hip numeric(5, 1) check (hip between 10 and 300),
  arm numeric(5, 1) check (arm between 10 and 300),
  thigh numeric(5, 1) check (thigh between 10 and 300),
  photos text[] not null default '{}' check (cardinality(photos) <= 3),
  note text check (char_length(note) <= 1000),
  coach_note text check (char_length(coach_note) <= 2000),
  coach_id uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);
create index if not exists checkins_created on public.checkins (created_at desc);
alter table public.checkins enable row level security;

-- Hafta Türkiye saatine göre pazartesi başlar.
create or replace function public.this_week() returns date
language sql stable as $$ select (date_trunc('week', now() at time zone 'Europe/Istanbul'))::date $$;

-- Üye koç alanlarına, koç üyenin alanlarına dokunamaz; hafta ve sahibi değişmez.
create or replace function public.checkin_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.week_start := public.this_week();
    new.coach_note := null;
    new.coach_id := null;
    new.reviewed_at := null;
    return new;
  end if;
  new.id := old.id;
  new.user_id := old.user_id;
  new.week_start := old.week_start;
  new.created_at := old.created_at;
  if public.is_coach() and auth.uid() <> old.user_id then
    new.weight := old.weight; new.waist := old.waist; new.chest := old.chest; new.hip := old.hip;
    new.arm := old.arm; new.thigh := old.thigh; new.photos := old.photos; new.note := old.note;
    new.coach_id := auth.uid();
    new.reviewed_at := case when new.coach_note is null then null else now() end;
  else
    new.coach_note := old.coach_note;
    new.coach_id := old.coach_id;
    new.reviewed_at := old.reviewed_at;
  end if;
  return new;
end $$;
drop trigger if exists checkin_guard on public.checkins;
create trigger checkin_guard before insert or update on public.checkins
  for each row execute function public.checkin_guard();

drop policy if exists "check-in gör" on public.checkins;
create policy "check-in gör" on public.checkins for select using (auth.uid() = user_id or public.is_coach());
drop policy if exists "check-in gir" on public.checkins;
create policy "check-in gir" on public.checkins for insert with check (
  auth.uid() = user_id
  and public.tier_rank(public.my_tier()) >= public.tier_rank('pro')
  and not exists (select 1 from unnest(photos) p where p not like auth.uid()::text || '/%')
);
drop policy if exists "check-in düzenle" on public.checkins;
create policy "check-in düzenle" on public.checkins for update
  using (auth.uid() = user_id or public.is_coach())
  with check (
    (auth.uid() = user_id and not exists (select 1 from unnest(photos) p where p not like auth.uid()::text || '/%'))
    or public.is_coach()
  );
drop policy if exists "check-in sil" on public.checkins;
create policy "check-in sil" on public.checkins for delete using (auth.uid() = user_id);
revoke all on public.checkins from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('checkins', 'checkins', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "check-in fotoğrafını gör" on storage.objects;
create policy "check-in fotoğrafını gör" on storage.objects for select using (
  bucket_id = 'checkins' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach())
);
drop policy if exists "check-in fotoğrafı yükle" on storage.objects;
create policy "check-in fotoğrafı yükle" on storage.objects for insert with check (
  bucket_id = 'checkins'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.tier_rank(public.my_tier()) >= public.tier_rank('pro')
);
drop policy if exists "check-in fotoğrafını sil" on storage.objects;
create policy "check-in fotoğrafını sil" on storage.objects for delete using (
  bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text
);

-- ───────────────────────── Takip ve tebrik ─────────────────────────
create table if not exists public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee on public.follows (followee_id);
alter table public.follows enable row level security;
drop policy if exists "takipleri gör" on public.follows;
create policy "takipleri gör" on public.follows for select using (auth.role() = 'authenticated');
drop policy if exists "takip et" on public.follows;
create policy "takip et" on public.follows for insert with check (auth.uid() = follower_id);
drop policy if exists "takibi bırak" on public.follows;
create policy "takibi bırak" on public.follows for delete using (auth.uid() = follower_id);
revoke all on public.follows from anon;

-- Aynı kişiye günde bir tebrik.
create table if not exists public.kudos (
  id bigint generated always as identity primary key,
  from_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null default '👏' check (emoji in ('👏', '🔥', '💪')),
  day date not null default current_date,
  created_at timestamptz not null default now(),
  unique (from_id, to_id, day),
  check (from_id <> to_id)
);
alter table public.kudos enable row level security;
drop policy if exists "tebrikleri gör" on public.kudos;
create policy "tebrikleri gör" on public.kudos for select using (auth.uid() in (from_id, to_id));
drop policy if exists "tebrik et" on public.kudos;
create policy "tebrik et" on public.kudos for insert with check (auth.uid() = from_id and day = current_date);
revoke all on public.kudos from anon;

-- Takip ve tebrikte dakikada en fazla 20 işlem.
create or replace function public.social_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare recent int;
begin
  if tg_table_name = 'follows' then
    select count(*) into recent from public.follows where follower_id = auth.uid() and created_at > now() - interval '1 minute';
  else
    select count(*) into recent from public.kudos where from_id = auth.uid() and created_at > now() - interval '1 minute';
  end if;
  if recent >= 20 then raise exception 'Çok hızlı gidiyorsun, biraz bekle.' using errcode = 'P0001'; end if;
  return new;
end $$;
drop trigger if exists rate_limit on public.follows;
create trigger rate_limit before insert on public.follows for each row execute function public.social_rate_limit();
drop trigger if exists rate_limit on public.kudos;
create trigger rate_limit before insert on public.kudos for each row execute function public.social_rate_limit();

-- Profil sayfası: sıralamadaki seri ve haftalık antrenman (gizli değilse), takip sayıları.
create or replace function public.public_profile(uname text)
returns table (
  id uuid, username text, avatar_url text, tier public.tier, role text, streak int, week_workouts int,
  followers bigint, following bigint, is_following boolean, follows_me boolean, kudos_today boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.avatar_url, p.tier, p.role,
    case when l.visible and l.updated_at > now() - interval '2 days' then l.streak end,
    case when l.visible and l.week_start = (date_trunc('week', now()))::date then l.week_workouts end,
    (select count(*) from public.follows f where f.followee_id = p.id),
    (select count(*) from public.follows f where f.follower_id = p.id),
    exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id),
    exists (select 1 from public.follows f where f.follower_id = p.id and f.followee_id = auth.uid()),
    exists (select 1 from public.kudos k where k.from_id = auth.uid() and k.to_id = p.id and k.day = current_date)
  from public.profiles p
  left join public.leaderboard l on l.user_id = p.id
  where p.username = lower(uname)
$$;
revoke execute on function public.public_profile(text) from anon, public;
grant execute on function public.public_profile(text) to authenticated;

-- Sıralama: only_following = true ise sadece takip ettiklerin ve sen.
drop function if exists public.leaderboard_top(text);
create or replace function public.leaderboard_top(board text, only_following boolean default false)
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
      and (not only_following or s.user_id = auth.uid()
           or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = s.user_id))
  )
  select r.rank, r.user_id, r.username, r.avatar_url, r.tier, r.value, r.user_id = auth.uid()
  from ranked r
  where r.rank <= 50 or r.user_id = auth.uid()
  order by r.rank, r.username
$$;
revoke execute on function public.leaderboard_top(text, boolean) from anon, public;
grant execute on function public.leaderboard_top(text, boolean) to authenticated;

-- ───────────────────────── Davet kodu ─────────────────────────
-- Davet kodu = davet edenin kullanıcı adı. Yeni üye (hesabı 14 günden yeni) kodu bir kez girer.
-- Davetle gelen üye ücretli bir pakete (Pro, Plus, Max) ilk kez geçtiğinde davet eden 1 hafta Pro kazanır.
-- Hediye Pro en fazla 1 yıl ileriye birikir.
alter table public.profiles add column if not exists bonus_until timestamptz;
alter table public.profiles add column if not exists invited_by uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists invite_rewarded boolean not null default false;

-- Ücretsiz üyenin hediye Pro süresi varsa seviyesi Pro sayılır.
create or replace function public.my_tier() returns public.tier
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case when tier = 'free' and bonus_until > now() then 'pro'::public.tier else tier end
     from public.profiles where id = auth.uid()),
    'free'::public.tier)
$$;

create or replace function public.redeem_invite(code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles;
  inviter public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'Önce giriş yap.' using errcode = 'P0001'; end if;
  if me.invited_by is not null then raise exception 'Zaten bir davet kodu kullandın.' using errcode = 'P0001'; end if;
  if me.created_at < now() - interval '14 days' then
    raise exception 'Davet kodu sadece ilk 14 gün içinde girilebilir.' using errcode = 'P0001';
  end if;
  select * into inviter from public.profiles where username = lower(trim(leading '@' from trim(code)));
  if inviter.id is null then raise exception 'Bu kodla bir kullanıcı bulunamadı.' using errcode = 'P0001'; end if;
  if inviter.id = me.id then raise exception 'Kendi kodunu kullanamazsın.' using errcode = 'P0001'; end if;
  if inviter.invited_by = me.id then raise exception 'Seni davet eden birinin kodunu kullanamazsın.' using errcode = 'P0001'; end if;

  update public.profiles set invited_by = inviter.id where id = me.id;
  insert into public.notifications (user_id, title, body, data)
  values (inviter.id, 'Davet kodun kullanıldı', public.uname(me.id) || ' kodunla katıldı. Ücretli pakete geçince 1 hafta Pro kazanırsın.',
          jsonb_build_object('route', '/invite'));
  -- Zaten ücretli bir pakettense ödül hemen verilir.
  if me.tier <> 'free' then perform public.reward_inviter(me.id); end if;
  return inviter.username;
end $$;
revoke execute on function public.redeem_invite(text) from anon, public;
grant execute on function public.redeem_invite(text) to authenticated;

-- Davet edene 1 hafta Pro; her davetli için bir kez.
create or replace function public.reward_inviter(member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  inviter uuid;
begin
  update public.profiles set invite_rewarded = true
    where id = member and invited_by is not null and not invite_rewarded
    returning invited_by into inviter;
  if inviter is null then return; end if;
  update public.profiles
    set bonus_until = least(greatest(coalesce(bonus_until, now()), now()) + interval '7 days', now() + interval '365 days')
    where id = inviter;
  insert into public.notifications (user_id, title, body, data)
  values (inviter, '1 hafta Pro kazandın 🎉', public.uname(member) || ' ücretli pakete geçti.', jsonb_build_object('route', '/invite'));
end $$;
revoke execute on function public.reward_inviter(uuid) from anon, public, authenticated;

-- Paket ücretsizden ücretliye geçince (koç paneli ya da ödeme webhook'u) ödül verilir.
create or replace function public.invite_paid() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tier <> 'free' and old.tier = 'free' and new.invited_by is not null and not new.invite_rewarded then
    perform public.reward_inviter(new.id);
  end if;
  return new;
end $$;
drop trigger if exists invite_paid on public.profiles;
create trigger invite_paid after update of tier on public.profiles
  for each row execute function public.invite_paid();

-- Davet ettiklerinin sayısı ve kaçının ücretli pakete geçtiği.
drop function if exists public.my_invite_count();
create or replace function public.my_invites() returns table (joined int, paid int)
language sql stable security definer set search_path = public as $$
  select count(*)::int, count(*) filter (where invite_rewarded)::int from public.profiles where invited_by = auth.uid()
$$;
revoke execute on function public.my_invites() from anon, public;
grant execute on function public.my_invites() to authenticated;

-- ───────────────────────── Koçun makro hedefi ─────────────────────────
create table if not exists public.assigned_nutrition (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  kcal int not null check (kcal between 800 and 8000),
  protein int not null check (protein between 0 and 500),
  carbs int not null check (carbs between 0 and 1000),
  fat int not null check (fat between 0 and 400),
  note text check (char_length(note) <= 500),
  assigned_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.assigned_nutrition enable row level security;
drop policy if exists "makro hedefini gör" on public.assigned_nutrition;
create policy "makro hedefini gör" on public.assigned_nutrition for select using (auth.uid() = user_id or public.is_coach());
drop policy if exists "koç makro hedefi atar" on public.assigned_nutrition;
create policy "koç makro hedefi atar" on public.assigned_nutrition for all using (public.is_coach()) with check (public.is_coach());
revoke all on public.assigned_nutrition from anon;

-- ───────────────────────── Bildirimler ─────────────────────────
create or replace function public.notify_social() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'follows' then
    insert into public.notifications (user_id, title, body, data)
    values (new.followee_id, public.uname(new.follower_id), 'seni takip etmeye başladı',
            jsonb_build_object('route', '/u/' || (select username from public.profiles where id = new.follower_id)));
  elsif tg_table_name = 'kudos' then
    insert into public.notifications (user_id, title, body, data)
    values (new.to_id, public.uname(new.from_id) || ' ' || new.emoji, 'seni tebrik etti',
            jsonb_build_object('route', '/u/' || (select username from public.profiles where id = new.from_id)));
  elsif tg_table_name = 'checkins' and tg_op = 'INSERT' then
    -- Koç sadece Plus ve Max check-in'lerinden haberdar edilir.
    if public.tier_rank(public.my_tier()) >= public.tier_rank('plus') then
      insert into public.notifications (user_id, title, body, data)
      select p.id, 'Yeni check-in', public.uname(new.user_id) || ' haftalık check-in gönderdi', jsonb_build_object('route', '/checkin/' || new.id)
      from public.profiles p where p.role = 'coach';
    end if;
  elsif tg_table_name = 'checkins' and new.coach_note is not null and new.coach_note is distinct from old.coach_note then
    insert into public.notifications (user_id, title, body, data)
    values (new.user_id, 'Koçun check-in''ine yorum yaptı', public.snip(new.coach_note), jsonb_build_object('route', '/checkin/' || new.id));
  end if;
  return new;
end $$;
drop trigger if exists notify_follow on public.follows;
create trigger notify_follow after insert on public.follows for each row execute function public.notify_social();
drop trigger if exists notify_kudos on public.kudos;
create trigger notify_kudos after insert on public.kudos for each row execute function public.notify_social();
drop trigger if exists notify_checkin on public.checkins;
create trigger notify_checkin after insert or update on public.checkins for each row execute function public.notify_social();
