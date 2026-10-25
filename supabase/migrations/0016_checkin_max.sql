-- Haftalık check-in artık sadece Max üyelere açık (berat, 2026-10-25). Eski check-in'ler görünmeye devam eder.
-- Tekrar çalıştırılabilir.

drop policy if exists "check-in gir" on public.checkins;
create policy "check-in gir" on public.checkins for insert with check (
  auth.uid() = user_id
  and public.tier_rank(public.my_tier()) >= public.tier_rank('max')
  and not exists (select 1 from unnest(photos) p where p not like auth.uid()::text || '/%')
);

drop policy if exists "check-in fotoğrafı yükle" on storage.objects;
create policy "check-in fotoğrafı yükle" on storage.objects for insert with check (
  bucket_id = 'checkins'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.tier_rank(public.my_tier()) >= public.tier_rank('max')
);
