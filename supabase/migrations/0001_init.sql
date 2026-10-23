-- Kagainz: profiller, üyelik seviyeleri ve seviyeye göre chat odaları.

create type public.tier as enum ('free', 'pro', 'plus', 'max');

create or replace function public.tier_rank(t public.tier) returns int
language sql immutable as $$
  select case t when 'free' then 0 when 'pro' then 1 when 'plus' then 2 when 'max' then 3 end
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  -- Sadece sunucu (abonelik webhook'u) değiştirir, istemci değiştiremez.
  tier public.tier not null default 'free',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiller herkese açık" on public.profiles for select using (true);
create policy "kendi profilini güncelle" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
-- İstemci sadece kullanıcı adını değiştirebilir; tier sütununa yazamaz.
revoke update on public.profiles from anon, authenticated;
grant update (username) on public.profiles to authenticated;

-- Kayıt olan her kullanıcıya otomatik profil.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.my_tier() returns public.tier
language sql stable security definer set search_path = public as $$
  select coalesce((select tier from public.profiles where id = auth.uid()), 'free'::public.tier)
$$;

create table public.chat_rooms (
  id text primary key,
  name text not null,
  description text,
  min_tier public.tier not null default 'free',
  sort int not null default 0
);

alter table public.chat_rooms enable row level security;
create policy "odalar listelenebilir" on public.chat_rooms for select using (true);

insert into public.chat_rooms (id, name, description, min_tier, sort) values
  ('genel', 'Genel', 'Öğünlerini, antrenmanlarını ve gününü paylaş', 'free', 0),
  ('pro', 'Pro Kulüp', 'Sadece Pro ve üstü üyeler', 'pro', 1),
  ('plus', 'Plus Kulüp', 'Sadece Plus ve üstü üyeler', 'plus', 2);

create type public.message_kind as enum ('text', 'meal', 'workout', 'activity');

create table public.messages (
  id bigint generated always as identity primary key,
  room_id text not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.message_kind not null default 'text',
  body text not null check (char_length(body) between 1 and 2000),
  -- Öğün paylaşımlarında hesaplanan makrolar: {kcal, protein, fat, carb}
  macros jsonb,
  created_at timestamptz not null default now()
);

create index messages_room_created on public.messages (room_id, created_at desc);
alter table public.messages enable row level security;

-- Okuma: odanın seviyesine erişimi olan herkes (genel oda girişsiz de okunur).
create policy "seviyeye göre oku" on public.messages for select using (
  public.tier_rank(public.my_tier()) >= public.tier_rank((select min_tier from public.chat_rooms r where r.id = room_id))
);

-- Yazma: numara doğrulanmış, kullanıcı adı olan ve seviyesi yeten kullanıcı.
create policy "doğrulanmış kullanıcı yazar" on public.messages for insert with check (
  auth.uid() = user_id
  and (auth.jwt() ->> 'phone') is not null and (auth.jwt() ->> 'phone') <> ''
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.username is not null)
  and public.tier_rank(public.my_tier()) >= public.tier_rank((select min_tier from public.chat_rooms r where r.id = room_id))
);

create policy "kendi mesajını sil" on public.messages for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.messages;
