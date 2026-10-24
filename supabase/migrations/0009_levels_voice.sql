-- Kagainz 0009: aktifliğe göre seviye (XP) ve Max üyelere sesli mesaj. Tekrar çalıştırılabilir.
-- Önce 0004, 0006 ve 0008 çalışmış olmalı.

-- ───────────────────────── Seviye (XP) ─────────────────────────
-- XP'yi sadece sunucu yazar (istemcinin profiles üzerinde sadece username ve avatar_url yetkisi var).
-- Seviye uygulamada hesaplanır: seviye n için 25 × (n-1)² XP gerekir (Lv 5 = 400, Lv 10 = 2025).
alter table public.profiles add column if not exists xp int not null default 0;

create or replace function public.add_xp(member uuid, amount int) returns void
language sql security definer set search_path = public as $$
  update public.profiles set xp = xp + amount where id = member and amount > 0
$$;
revoke execute on function public.add_xp(uuid, int) from anon, authenticated, public;

-- Mesaj: +2, günde ilk 10 mesaj sayılır (spam XP getirmesin).
create or replace function public.xp_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.messages m
      where m.user_id = new.user_id and m.created_at >= date_trunc('day', now())) <= 10 then
    perform public.add_xp(new.user_id, 2);
  end if;
  return new;
end $$;
drop trigger if exists xp_message on public.messages;
create trigger xp_message after insert on public.messages for each row execute function public.xp_message();
create index if not exists messages_user_created on public.messages (user_id, created_at desc);

-- Haftalık check-in: +30.
create or replace function public.xp_checkin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.add_xp(new.user_id, 30);
  return new;
end $$;
drop trigger if exists xp_checkin on public.checkins;
create trigger xp_checkin after insert on public.checkins for each row execute function public.xp_checkin();

-- Haftalık meydan okuma: +50.
create or replace function public.xp_challenge() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.add_xp(new.user_id, 50);
  return new;
end $$;
drop trigger if exists xp_challenge on public.challenge_completions;
create trigger xp_challenge after insert on public.challenge_completions for each row execute function public.xp_challenge();

-- Form check: +20.
create or replace function public.xp_form_check() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.add_xp(new.user_id, 20);
  return new;
end $$;
drop trigger if exists xp_form_check on public.form_checks;
create trigger xp_form_check after insert on public.form_checks for each row execute function public.xp_form_check();

-- Tebrik alan: +5.
create or replace function public.xp_kudos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.add_xp(new.to_id, 5);
  return new;
end $$;
drop trigger if exists xp_kudos on public.kudos;
create trigger xp_kudos after insert on public.kudos for each row execute function public.xp_kudos();

-- Antrenman ve seri sıralama satırından gelir: biten antrenman başına +20, seri günü başına +5.
-- leaderboard_guard serinin günde en fazla 1 artmasını, antrenmanın haftada en fazla 21 olmasını sağlar.
create or replace function public.xp_leaderboard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.add_xp(new.user_id, 20 * new.week_workouts);
    return new;
  end if;
  if new.week_start = old.week_start and new.week_workouts > old.week_workouts then
    perform public.add_xp(new.user_id, 20 * (new.week_workouts - old.week_workouts));
  elsif new.week_start > old.week_start then
    perform public.add_xp(new.user_id, 20 * new.week_workouts);
  end if;
  if new.streak > old.streak then
    perform public.add_xp(new.user_id, 5 * (new.streak - old.streak));
  end if;
  return new;
end $$;
drop trigger if exists xp_leaderboard on public.leaderboard;
create trigger xp_leaderboard after insert or update on public.leaderboard for each row execute function public.xp_leaderboard();

-- Mevcut üyeler sıfırdan başlamasın: geçmiş kayıtlardan XP hesaplanır (tekrar çalıştırınca artmaz).
update public.profiles p set xp = greatest(p.xp, s.total)
from (
  select pr.id,
    coalesce((select count(*) from public.checkins c where c.user_id = pr.id), 0) * 30
    + coalesce((select count(*) from public.challenge_completions c where c.user_id = pr.id), 0) * 50
    + coalesce((select count(*) from public.form_checks f where f.user_id = pr.id), 0) * 20
    + coalesce((select count(*) from public.kudos k where k.to_id = pr.id), 0) * 5
    + least(coalesce((select count(*) from public.messages m where m.user_id = pr.id), 0) * 2, 500)
    + coalesce((select l.streak * 5 + l.week_workouts * 20 from public.leaderboard l where l.user_id = pr.id), 0) as total
  from public.profiles pr
) s
where s.id = p.id;

-- Kullanıcı sayfası seviyeyi de gösterir (dönüş tipi değiştiği için yeniden oluşturulur).
drop function if exists public.public_profile(text);
create or replace function public.public_profile(uname text)
returns table (
  id uuid, username text, avatar_url text, tier public.tier, role text, streak int, week_workouts int,
  followers bigint, following bigint, is_following boolean, follows_me boolean, kudos_today boolean, xp int
)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.avatar_url, p.tier, p.role,
    case when l.visible and l.updated_at > now() - interval '2 days' then l.streak end,
    case when l.visible and l.week_start = (date_trunc('week', now()))::date then l.week_workouts end,
    (select count(*) from public.follows f where f.followee_id = p.id),
    (select count(*) from public.follows f where f.follower_id = p.id),
    exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id),
    exists (select 1 from public.follows f where f.follower_id = p.id and f.followee_id = auth.uid()),
    exists (select 1 from public.kudos k where k.from_id = auth.uid() and k.to_id = p.id and k.day = current_date),
    p.xp
  from public.profiles p
  left join public.leaderboard l on l.user_id = p.id
  where p.username = lower(uname)
$$;
revoke execute on function public.public_profile(text) from anon, public;
grant execute on function public.public_profile(text) to authenticated;

-- ───────────────────────── Sesli mesaj (Max) ─────────────────────────
alter table public.messages add column if not exists audio_path text;
alter table public.messages add column if not exists audio_ms int check (audio_ms between 0 and 61000);

create or replace function public.can_send_voice() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_coach() or public.my_tier() = 'max'
$$;
revoke execute on function public.can_send_voice() from anon, public;
grant execute on function public.can_send_voice() to authenticated;

-- 0004'teki kurallar aynen, artı ses sadece Max'ta ve sadece kendi klasöründen.
drop policy if exists "doğrulanmış kullanıcı yazar" on public.messages;
create policy "doğrulanmış kullanıcı yazar" on public.messages for insert with check (
  auth.uid() = user_id
  and public.can_post()
  and public.can_read_room(room_id)
  and not pinned
  and not hidden
  and (image_path is null or image_path like room_id || '/' || auth.uid()::text || '/%')
  and (audio_path is null or (public.can_send_voice() and audio_path like room_id || '/' || auth.uid()::text || '/%'))
  and (reply_to is null or exists (select 1 from public.messages r where r.id = messages.reply_to and r.room_id = messages.room_id))
  and (meta is null or pg_column_size(meta) <= 8192)
);

-- Ses dosyaları fotoğraflarla aynı 'chat' deposunda: <oda>/<kullanıcı>/<dosya>.m4a
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/webm']
where id = 'chat';

drop policy if exists "chat fotoğrafı yükle" on storage.objects;
create policy "chat fotoğrafı yükle" on storage.objects for insert with check (
  bucket_id = 'chat'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.can_post()
  and public.can_read_room((storage.foldername(name))[1])
  and (name !~* '\.(m4a|webm|aac)$' or public.can_send_voice())
);
