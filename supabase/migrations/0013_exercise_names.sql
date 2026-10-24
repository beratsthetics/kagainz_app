-- Koç, uygulamayla gelen hareketlerin adını değiştirir. Koçun eklediği hareketlerin adı
-- custom_exercises tablosunda değişir; bu tablo sadece hazır hareketler içindir. Herkes okur, koç yazar.
create table if not exists public.exercise_names (
  id text primary key check (id !~ '^c_'),
  name text not null check (char_length(name) between 2 and 80),
  tr_name text check (char_length(tr_name) <= 80),
  updated_at timestamptz not null default now()
);
alter table public.exercise_names enable row level security;

drop policy if exists "hareket adlarını gör" on public.exercise_names;
create policy "hareket adlarını gör" on public.exercise_names for select using (auth.role() = 'authenticated');
drop policy if exists "koç hareket adı değiştirir" on public.exercise_names;
create policy "koç hareket adı değiştirir" on public.exercise_names for all using (public.is_coach()) with check (public.is_coach());
