-- Kagainz 0002: koç rolü, moderasyon, chat fotoğraf/tepki/yanıt, form check, koç mesajları,
-- atanan programlar, meydan okumalar, hesap senkronu, bildirimler ve depolama kovaları.
-- Birden fazla kez çalıştırılabilir (her şey "if not exists" / "or replace").

-- ───────────────────────── Profiller: rol ve susturma ─────────────────────────
alter table public.profiles add column if not exists role text not null default 'member';
alter table public.profiles add column if not exists muted_until timestamptz;
do $$ begin
  alter table public.profiles add constraint profiles_role_check check (role in ('member', 'coach'));
exception when duplicate_object then null;
end $$;
-- İstemci hâlâ sadece kullanıcı adını değiştirebilir; rol, paket ve susturma sunucuda kalır.

create or replace function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
$$;

create or replace function public.can_read_room(room text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_coach() or public.tier_rank(public.my_tier()) >=
    public.tier_rank(coalesce((select min_tier from public.chat_rooms where id = room), 'max'::public.tier))
$$;

-- Yazabilmek için: kullanıcı adı, doğrulanmış telefon, susturulmamış olmak. Koçlar telefonsuz yazabilir.
create or replace function public.can_post() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.username is not null
      and (p.muted_until is null or p.muted_until < now())
      and (p.role = 'coach' or coalesce(auth.jwt() ->> 'phone', '') <> '')
  )
$$;

-- Koç bir üyeyi süreli susturur.
create or replace function public.mute_user(target uuid, minutes int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_coach() then raise exception 'Sadece koçlar susturabilir'; end if;
  update public.profiles set muted_until = now() + make_interval(mins => greatest(minutes, 1)) where id = target and role <> 'coach';
end $$;

-- Ödeme sistemi açılana kadar koç paketi elle verir.
create or replace function public.set_member_tier(target uuid, new_tier public.tier) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_coach() then raise exception 'Sadece koçlar paket değiştirebilir'; end if;
  update public.profiles set tier = new_tier where id = target;
end $$;

revoke execute on function public.mute_user(uuid, int) from anon;
revoke execute on function public.set_member_tier(uuid, public.tier) from anon;

-- ───────────────────────── Chat ─────────────────────────
insert into public.chat_rooms (id, name, description, min_tier, sort)
values ('max', 'Max Salonu', 'Max üyeler ve koçlar', 'max', 3)
on conflict (id) do nothing;

alter type public.message_kind add value if not exists 'photo';

alter table public.messages add column if not exists image_path text;
alter table public.messages add column if not exists reply_to bigint references public.messages (id) on delete set null;
alter table public.messages add column if not exists pinned boolean not null default false;
alter table public.messages add column if not exists meta jsonb;

drop policy if exists "seviyeye göre oku" on public.messages;
create policy "seviyeye göre oku" on public.messages for select using (public.can_read_room(room_id));

drop policy if exists "doğrulanmış kullanıcı yazar" on public.messages;
create policy "doğrulanmış kullanıcı yazar" on public.messages for insert with check (
  auth.uid() = user_id
  and public.can_post()
  and public.can_read_room(room_id)
  and not pinned
  -- Fotoğraf sadece kendi klasöründen: <oda>/<kullanıcı>/<dosya>
  and (image_path is null or image_path like room_id || '/' || auth.uid()::text || '/%')
  and (reply_to is null or exists (select 1 from public.messages r where r.id = messages.reply_to and r.room_id = messages.room_id))
);

drop policy if exists "koç siler" on public.messages;
create policy "koç siler" on public.messages for delete using (public.is_coach());

-- Güncelleme sadece koçun sabitlemesi için.
revoke update on public.messages from anon, authenticated;
grant update (pinned) on public.messages to authenticated;
drop policy if exists "koç sabitler" on public.messages;
create policy "koç sabitler" on public.messages for update using (public.is_coach()) with check (public.is_coach());

create table if not exists public.message_reactions (
  message_id bigint not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('💪', '🔥', '👏', '❤️', '😂')),
  room_id text not null references public.chat_rooms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
alter table public.message_reactions enable row level security;
-- Silme olayında tepkinin tamamı gelsin diye (anahtar zaten tüm sütunlar).
alter table public.message_reactions replica identity full;

drop policy if exists "tepkileri oku" on public.message_reactions;
create policy "tepkileri oku" on public.message_reactions for select using (public.can_read_room(room_id));
drop policy if exists "tepki ver" on public.message_reactions;
create policy "tepki ver" on public.message_reactions for insert with check (
  auth.uid() = user_id
  and public.can_post()
  and room_id = (select m.room_id from public.messages m where m.id = message_id)
  and public.can_read_room(room_id)
);
drop policy if exists "tepkini geri al" on public.message_reactions;
create policy "tepkini geri al" on public.message_reactions for delete using (auth.uid() = user_id);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  message_id bigint references public.messages (id) on delete set null,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  body_snapshot text,
  reason text not null default 'uygunsuz',
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);
alter table public.reports enable row level security;
drop policy if exists "şikayet et" on public.reports;
create policy "şikayet et" on public.reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "koç şikayetleri görür" on public.reports;
create policy "koç şikayetleri görür" on public.reports for select using (public.is_coach());
drop policy if exists "koç şikayeti kapatır" on public.reports;
create policy "koç şikayeti kapatır" on public.reports for update using (public.is_coach()) with check (public.is_coach());

-- Mesaj silinse bile koç neyin şikayet edildiğini görsün.
create or replace function public.fill_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select m.user_id, m.body into new.reported_user_id, new.body_snapshot from public.messages m where m.id = new.message_id;
  return new;
end $$;
drop trigger if exists fill_report on public.reports;
create trigger fill_report before insert on public.reports for each row execute function public.fill_report();

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "kendi engellerin" on public.blocks;
create policy "kendi engellerin" on public.blocks for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- ───────────────────────── Meydan okuma ─────────────────────────
create table if not exists public.challenge_completions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_key text not null check (char_length(challenge_key) <= 60),
  created_at timestamptz not null default now(),
  primary key (user_id, challenge_key)
);
alter table public.challenge_completions enable row level security;
drop policy if exists "tamamlayanlar görünür" on public.challenge_completions;
create policy "tamamlayanlar görünür" on public.challenge_completions for select using (auth.role() = 'authenticated');
drop policy if exists "kendi tamamlaman" on public.challenge_completions;
create policy "kendi tamamlaman" on public.challenge_completions for insert with check (auth.uid() = user_id);

-- ───────────────────────── Form check ─────────────────────────
create table if not exists public.form_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  exercise_id text not null,
  note text check (char_length(note) <= 500),
  video_path text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists form_checks_user_created on public.form_checks (user_id, created_at desc);
alter table public.form_checks enable row level security;

-- Plus 14, Max 7 günde bir gönderebilir.
create or replace function public.can_submit_form_check() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_tier() in ('plus', 'max') and not exists (
    select 1 from public.form_checks f
    where f.user_id = auth.uid()
      and f.created_at > now() - make_interval(days => case public.my_tier() when 'max' then 7 else 14 end)
  )
$$;

drop policy if exists "form check gör" on public.form_checks;
create policy "form check gör" on public.form_checks for select using (auth.uid() = user_id or public.is_coach());
drop policy if exists "form check gönder" on public.form_checks;
create policy "form check gönder" on public.form_checks for insert with check (
  auth.uid() = user_id
  and status = 'pending'
  and video_path like auth.uid()::text || '/%'
  and public.can_submit_form_check()
);
revoke update on public.form_checks from anon, authenticated;
grant update (status, reviewed_at) on public.form_checks to authenticated;
drop policy if exists "koç değerlendirir" on public.form_checks;
create policy "koç değerlendirir" on public.form_checks for update using (public.is_coach()) with check (public.is_coach());
drop policy if exists "kendi form checkini sil" on public.form_checks;
create policy "kendi form checkini sil" on public.form_checks for delete using (auth.uid() = user_id);

create table if not exists public.form_check_comments (
  id bigint generated always as identity primary key,
  form_check_id uuid not null references public.form_checks (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  at_seconds numeric(6, 1) check (at_seconds >= 0),
  created_at timestamptz not null default now()
);
alter table public.form_check_comments enable row level security;
drop policy if exists "yorumları gör" on public.form_check_comments;
create policy "yorumları gör" on public.form_check_comments for select using (
  public.is_coach() or exists (select 1 from public.form_checks f where f.id = form_check_id and f.user_id = auth.uid())
);
drop policy if exists "yorum yaz" on public.form_check_comments;
create policy "yorum yaz" on public.form_check_comments for insert with check (
  auth.uid() = author_id
  and (public.is_coach() or exists (select 1 from public.form_checks f where f.id = form_check_id and f.user_id = auth.uid()))
);

-- ───────────────────────── Koçla birebir ─────────────────────────
create table if not exists public.coach_messages (
  id bigint generated always as identity primary key,
  member_id uuid not null,
  sender_id uuid not null default auth.uid(),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint coach_messages_member_id_fkey foreign key (member_id) references public.profiles (id) on delete cascade,
  constraint coach_messages_sender_id_fkey foreign key (sender_id) references public.profiles (id) on delete cascade
);
create index if not exists coach_messages_member_created on public.coach_messages (member_id, created_at);
alter table public.coach_messages enable row level security;
drop policy if exists "konuşmanı gör" on public.coach_messages;
create policy "konuşmanı gör" on public.coach_messages for select using (auth.uid() = member_id or public.is_coach());
drop policy if exists "koçuna yaz" on public.coach_messages;
create policy "koçuna yaz" on public.coach_messages for insert with check (
  auth.uid() = sender_id
  and ((auth.uid() = member_id and public.my_tier() = 'max') or public.is_coach())
);

-- ───────────────────────── Atanan programlar ─────────────────────────
create table if not exists public.assigned_programs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  program jsonb not null,
  assigned_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.assigned_programs enable row level security;
drop policy if exists "programını gör" on public.assigned_programs;
create policy "programını gör" on public.assigned_programs for select using (auth.uid() = user_id or public.is_coach());
drop policy if exists "koç program atar" on public.assigned_programs;
create policy "koç program atar" on public.assigned_programs for all using (public.is_coach()) with check (public.is_coach());

-- ───────────────────────── Hesap senkronu ─────────────────────────
-- Uygulamadaki günlük, hedefler, antrenmanlar vb. her cihazda aynı olsun diye anahtar/değer olarak saklanır.
create table if not exists public.user_data (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (char_length(key) <= 120),
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.user_data enable row level security;
drop policy if exists "kendi verin" on public.user_data;
create policy "kendi verin" on public.user_data for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ───────────────────────── Yapay zekâ kullanımı ─────────────────────────
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_kind on public.ai_usage (user_id, kind, created_at desc);
alter table public.ai_usage enable row level security;
-- Silme izni yok: kullanıcı aylık hakkını sıfırlayamaz.
drop policy if exists "kullanımını gör" on public.ai_usage;
create policy "kullanımını gör" on public.ai_usage for select using (auth.uid() = user_id);
drop policy if exists "kullanım ekle" on public.ai_usage;
create policy "kullanım ekle" on public.ai_usage for insert with check (auth.uid() = user_id);

-- ───────────────────────── Bildirimler ─────────────────────────
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
drop policy if exists "kendi tokenların" on public.push_tokens;
create policy "kendi tokenların" on public.push_tokens for select using (auth.uid() = user_id);

-- Aynı telefonda hesap değişince token yeni hesaba geçer.
create or replace function public.register_push_token(p_token text, p_platform text) returns void
language sql security definer set search_path = public as $$
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now()
$$;
revoke execute on function public.register_push_token(text, text) from anon;

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  pushed_at timestamptz,
  read_at timestamptz
);
create index if not exists notifications_user_created on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "bildirimlerini gör" on public.notifications;
create policy "bildirimlerini gör" on public.notifications for select using (auth.uid() = user_id);
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;
drop policy if exists "okundu işaretle" on public.notifications;
create policy "okundu işaretle" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.uname(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce('@' || (select username from public.profiles where id = uid), 'Biri')
$$;

create or replace function public.snip(t text) returns text
language sql immutable as $$ select case when char_length(t) > 80 then left(t, 77) || '...' else t end $$;

-- Tepki, yanıt, koç mesajı, form check ve yorum geldiğinde bildirim satırı oluşur;
-- veritabanı webhook'u bu satırı "push" fonksiyonuna yollar.
create or replace function public.notify_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  owner uuid;
begin
  if tg_table_name = 'message_reactions' then
    select user_id into target from public.messages where id = new.message_id;
    if target is not null and target <> new.user_id then
      insert into public.notifications (user_id, title, body, data)
      select target, public.uname(new.user_id) || ' ' || new.emoji, public.snip(m.body), jsonb_build_object('route', '/chat/' || m.room_id)
      from public.messages m where m.id = new.message_id;
    end if;
  elsif tg_table_name = 'messages' then
    if new.reply_to is not null then
      select user_id into target from public.messages where id = new.reply_to;
      if target is not null and target <> new.user_id then
        insert into public.notifications (user_id, title, body, data)
        values (target, public.uname(new.user_id) || ' yanıtladı', public.snip(new.body), jsonb_build_object('route', '/chat/' || new.room_id));
      end if;
    end if;
  elsif tg_table_name = 'coach_messages' then
    if new.sender_id = new.member_id then
      insert into public.notifications (user_id, title, body, data)
      select p.id, public.uname(new.sender_id) || ' yazdı', public.snip(new.body), jsonb_build_object('route', '/dm/' || new.member_id)
      from public.profiles p where p.role = 'coach';
    else
      insert into public.notifications (user_id, title, body, data)
      values (new.member_id, 'Koçun yazdı', public.snip(new.body), jsonb_build_object('route', '/dm/me'));
    end if;
  elsif tg_table_name = 'form_checks' then
    insert into public.notifications (user_id, title, body, data)
    select p.id, 'Yeni form check', public.uname(new.user_id) || ' video gönderdi', jsonb_build_object('route', '/form-check/' || new.id)
    from public.profiles p where p.role = 'coach';
  elsif tg_table_name = 'form_check_comments' then
    select user_id into owner from public.form_checks where id = new.form_check_id;
    if owner <> new.author_id then
      insert into public.notifications (user_id, title, body, data)
      values (owner, 'Form check yorumu', public.snip(new.body), jsonb_build_object('route', '/form-check/' || new.form_check_id));
    end if;
  end if;
  return new;
end $$;

drop trigger if exists notify_reaction on public.message_reactions;
create trigger notify_reaction after insert on public.message_reactions for each row execute function public.notify_event();
drop trigger if exists notify_reply on public.messages;
create trigger notify_reply after insert on public.messages for each row when (new.reply_to is not null) execute function public.notify_event();
drop trigger if exists notify_dm on public.coach_messages;
create trigger notify_dm after insert on public.coach_messages for each row execute function public.notify_event();
drop trigger if exists notify_form_check on public.form_checks;
create trigger notify_form_check after insert on public.form_checks for each row execute function public.notify_event();
drop trigger if exists notify_form_comment on public.form_check_comments;
create trigger notify_form_comment after insert on public.form_check_comments for each row execute function public.notify_event();

-- ───────────────────────── Depolama ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('chat', 'chat', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('form-checks', 'form-checks', false, 52428800, array['video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

drop policy if exists "chat fotoğraflarını gör" on storage.objects;
create policy "chat fotoğraflarını gör" on storage.objects for select using (
  bucket_id = 'chat' and public.can_read_room((storage.foldername(name))[1])
);
drop policy if exists "chat fotoğrafı yükle" on storage.objects;
create policy "chat fotoğrafı yükle" on storage.objects for insert with check (
  bucket_id = 'chat'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.can_post()
  and public.can_read_room((storage.foldername(name))[1])
);
drop policy if exists "form videolarını gör" on storage.objects;
create policy "form videolarını gör" on storage.objects for select using (
  bucket_id = 'form-checks' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach())
);
drop policy if exists "form videosu yükle" on storage.objects;
create policy "form videosu yükle" on storage.objects for insert with check (
  bucket_id = 'form-checks'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.my_tier() in ('plus', 'max')
);

-- ───────────────────────── Canlı güncellemeler ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['message_reactions', 'coach_messages', 'form_check_comments', 'notifications'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
