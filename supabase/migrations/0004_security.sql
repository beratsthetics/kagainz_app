-- Kagainz 0004: güvenlik sıkılaştırmaları. Tekrar çalıştırılabilir.

-- 1) Chat'te spam sınırı: dakikada en fazla 8 mesaj, 10 tepki.
create or replace function public.rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent int;
  max_per_minute int := case tg_table_name when 'messages' then 8 when 'message_reactions' then 10 else 6 end;
begin
  if public.is_coach() then return new; end if;
  execute format('select count(*) from public.%I where %I = $1 and created_at > now() - interval ''1 minute''',
                 tg_table_name, case tg_table_name when 'coach_messages' then 'sender_id' else 'user_id' end)
    into recent using auth.uid();
  if recent >= max_per_minute then
    raise exception 'Çok hızlı yazıyorsun, biraz bekle.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists rate_limit on public.messages;
create trigger rate_limit before insert on public.messages for each row execute function public.rate_limit();
drop trigger if exists rate_limit on public.message_reactions;
create trigger rate_limit before insert on public.message_reactions for each row execute function public.rate_limit();
drop trigger if exists rate_limit on public.coach_messages;
create trigger rate_limit before insert on public.coach_messages for each row execute function public.rate_limit();

-- 2) Koç ya da uygulama gibi görünen kullanıcı adları alınamasın.
create or replace function public.check_username() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.username is not null and new.username is distinct from old.username
     and new.role <> 'coach'
     and new.username ~ '^(admin|administrator|kagainz|kagainzz|koc|koç|coach|destek|support|moderator|mod|tanvogue|system|sistem)([._0-9].*)?$' then
    raise exception 'Bu kullanıcı adı alınamaz.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists check_username on public.profiles;
create trigger check_username before update of username on public.profiles for each row execute function public.check_username();

-- 3) 3 farklı kişinin şikayet ettiği mesaj koç bakana kadar gizlenir (App Store kuralı: hızlı müdahale).
alter table public.messages add column if not exists hidden boolean not null default false;

drop policy if exists "seviyeye göre oku" on public.messages;
create policy "seviyeye göre oku" on public.messages for select using (
  public.can_read_room(room_id) and (not hidden or user_id = auth.uid() or public.is_coach())
);

create or replace function public.auto_hide_reported() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.message_id is not null
     and (select count(distinct reporter_id) from public.reports where message_id = new.message_id and status = 'open') >= 3 then
    update public.messages set hidden = true where id = new.message_id;
  end if;
  return new;
end $$;
drop trigger if exists auto_hide_reported on public.reports;
create trigger auto_hide_reported after insert on public.reports for each row execute function public.auto_hide_reported();

-- Koç gizlenmiş mesajı geri açabilir.
grant update (pinned, hidden) on public.messages to authenticated;

-- 4) Form check videosu yükleme hakkı da gönderme aralığına bağlı (boş yere 50 MB'lık dosya yığılmasın).
drop policy if exists "form videosu yükle" on storage.objects;
create policy "form videosu yükle" on storage.objects for insert with check (
  bucket_id = 'form-checks'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.can_submit_form_check()
);

-- 5) Hesap senkronunda tek kayıt en fazla 2 MB.
do $$ begin
  alter table public.user_data add constraint user_data_value_size check (pg_column_size(value) <= 2097152);
exception when duplicate_object then null;
end $$;

-- 6) İstemcinin değiştirmemesi gereken alanlar.
-- Şikayet durumu sadece koçta; kullanıcı "kapalı" şikayet açamaz.
drop policy if exists "şikayet et" on public.reports;
create policy "şikayet et" on public.reports for insert with check (auth.uid() = reporter_id and status = 'open');
-- Mesajlarda sabitlenmiş ya da gizli olarak yazılamaz.
drop policy if exists "doğrulanmış kullanıcı yazar" on public.messages;
create policy "doğrulanmış kullanıcı yazar" on public.messages for insert with check (
  auth.uid() = user_id
  and public.can_post()
  and public.can_read_room(room_id)
  and not pinned
  and not hidden
  and (image_path is null or image_path like room_id || '/' || auth.uid()::text || '/%')
  and (reply_to is null or exists (select 1 from public.messages r where r.id = messages.reply_to and r.room_id = messages.room_id))
  and (meta is null or pg_column_size(meta) <= 8192)
);

-- 7) Fonksiyonlar oturumsuz (anon) çağrılamasın.
revoke execute on function public.can_submit_form_check() from anon;
revoke execute on function public.mute_user(uuid, int) from anon, public;
revoke execute on function public.set_member_tier(uuid, public.tier) from anon, public;
revoke execute on function public.register_push_token(text, text) from anon, public;
grant execute on function public.mute_user(uuid, int) to authenticated;
grant execute on function public.set_member_tier(uuid, public.tier) to authenticated;
grant execute on function public.register_push_token(text, text) to authenticated;
