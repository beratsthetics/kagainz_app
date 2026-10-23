-- Kagainz 0007: koçun yüklediği hareket animasyonları. Tekrar çalıştırılabilir.

-- Her hareket için tek animasyon (video ya da GIF). Hareket kimliği uygulamadaki listeden gelir (ör. bench_press).
create table if not exists public.exercise_media (
  exercise_id text primary key check (char_length(exercise_id) <= 80),
  path text not null check (path like exercise_id || '/%'),
  kind text not null check (kind in ('video', 'image')),
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);
alter table public.exercise_media enable row level security;

drop policy if exists "animasyonları gör" on public.exercise_media;
create policy "animasyonları gör" on public.exercise_media for select using (auth.role() = 'authenticated');
drop policy if exists "koç animasyon ekler" on public.exercise_media;
create policy "koç animasyon ekler" on public.exercise_media for insert with check (public.is_coach());
drop policy if exists "koç animasyon değiştirir" on public.exercise_media;
create policy "koç animasyon değiştirir" on public.exercise_media for update using (public.is_coach()) with check (public.is_coach());
drop policy if exists "koç animasyon siler" on public.exercise_media;
create policy "koç animasyon siler" on public.exercise_media for delete using (public.is_coach());
revoke all on public.exercise_media from anon;

-- Dosyalar özel kovada: sadece ücretli üyeler (Pro, Plus, Max) ve koçlar izleyebilir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('exercise-media', 'exercise-media', false, 52428800, array['video/mp4', 'video/quicktime', 'image/gif', 'image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "hareket animasyonunu izle" on storage.objects;
create policy "hareket animasyonunu izle" on storage.objects for select using (
  bucket_id = 'exercise-media'
  and (public.is_coach() or public.tier_rank(public.my_tier()) >= public.tier_rank('pro'))
);
drop policy if exists "koç hareket animasyonu yükler" on storage.objects;
create policy "koç hareket animasyonu yükler" on storage.objects for insert with check (
  bucket_id = 'exercise-media' and public.is_coach()
);
drop policy if exists "koç hareket animasyonu siler" on storage.objects;
create policy "koç hareket animasyonu siler" on storage.objects for delete using (
  bucket_id = 'exercise-media' and public.is_coach()
);
