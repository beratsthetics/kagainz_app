-- Koçun hareket kütüphanesini düzenlemesi: yeni hareket ekler (custom_exercises) ya da
-- uygulamayla gelen bir hareketi listeden kaldırır (hidden_exercises). Herkes okur, koç yazar.
create table if not exists public.custom_exercises (
  id text primary key check (id ~ '^c_[a-z0-9_]{2,60}$'),
  name text not null check (char_length(name) between 2 and 80),
  tr_name text check (char_length(tr_name) <= 80),
  primary_muscles text[] not null check (cardinality(primary_muscles) between 1 and 4),
  secondary_muscles text[] not null default '{}',
  equipment text not null,
  pattern text not null,
  steps text[] not null default '{}',
  tip text,
  free boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.custom_exercises enable row level security;

drop policy if exists "hareketleri gör" on public.custom_exercises;
create policy "hareketleri gör" on public.custom_exercises for select using (auth.role() = 'authenticated');
drop policy if exists "koç hareket yazar" on public.custom_exercises;
create policy "koç hareket yazar" on public.custom_exercises for all using (public.is_coach()) with check (public.is_coach());

create table if not exists public.hidden_exercises (
  id text primary key,
  created_at timestamptz not null default now()
);
alter table public.hidden_exercises enable row level security;

drop policy if exists "gizlenenleri gör" on public.hidden_exercises;
create policy "gizlenenleri gör" on public.hidden_exercises for select using (auth.role() = 'authenticated');
drop policy if exists "koç hareket gizler" on public.hidden_exercises;
create policy "koç hareket gizler" on public.hidden_exercises for all using (public.is_coach()) with check (public.is_coach());
