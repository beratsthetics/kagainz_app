-- Form check = vücut formu kontrolü: üye önden, yandan ve arkadan 3 fotoğraf (isteğe bağlı kısa poz videosu)
-- gönderir, koç formuna bakıp yorum yazar. Eski hareket videoları olduğu gibi kalır. Tekrar çalıştırılabilir.

alter table public.form_checks add column if not exists photos text[] not null default '{}';
alter table public.form_checks alter column video_path drop not null;
alter table public.form_checks alter column exercise_id set default 'physique';

-- Fotoğraflar da aynı kovaya yüklenir.
update storage.buckets
  set allowed_mime_types = array['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
  where id = 'form-checks';

drop policy if exists "form check gönder" on public.form_checks;
create policy "form check gönder" on public.form_checks for insert with check (
  auth.uid() = user_id
  and status = 'pending'
  and cardinality(photos) = 3
  and not exists (select 1 from unnest(photos) p where p not like auth.uid()::text || '/%')
  and (video_path is null or video_path like auth.uid()::text || '/%')
  and public.can_submit_form_check()
);

-- Koça giden bildirim artık video değil vücut fotoğrafı diyor (fonksiyonun geri kalanı 0002 ile aynı).
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
    select p.id, 'Yeni form check', public.uname(new.user_id) || ' form fotoğraflarını gönderdi', jsonb_build_object('route', '/form-check/' || new.id)
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
