-- Kagainz 0005: profil fotoğrafı. Tekrar çalıştırılabilir.

-- Profilde fotoğrafın depodaki yolu tutulur (ör. "<kullanıcı id>/1730000000.jpg").
alter table public.profiles add column if not exists avatar_url text;
grant update (username, avatar_url) on public.profiles to authenticated;

-- Sadece kendi klasöründeki bir dosyayı gösterebilir (başkasının fotoğrafını ya da dış link koyamaz).
do $$ begin
  alter table public.profiles add constraint profiles_avatar_path check (
    avatar_url is null or avatar_url like id::text || '/%'
  );
exception when duplicate_object then null;
end $$;

-- Profil fotoğrafları herkese açık (chat'te herkes görüyor), 2 MB sınırı, sadece resim.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profil fotoğrafı yükle" on storage.objects;
create policy "profil fotoğrafı yükle" on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "profil fotoğrafını sil" on storage.objects;
create policy "profil fotoğrafını sil" on storage.objects for delete to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "profil fotoğraflarını gör" on storage.objects;
create policy "profil fotoğraflarını gör" on storage.objects for select using (bucket_id = 'avatars');
