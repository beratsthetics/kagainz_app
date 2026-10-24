-- Koçun hazırladığı hazır antrenman şablonları: 3, 4, 5 ve 6 günlük.
-- Koç yazar; Pro, Plus ve Max üyeler (ve koç) okur. Üye birini seçer, koç ona özel program
-- atamışsa (assigned_programs) o önce gelir.
create table if not exists public.program_templates (
  days int primary key check (days between 3 and 6),
  program jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.program_templates enable row level security;

drop policy if exists "şablonları gör" on public.program_templates;
create policy "şablonları gör" on public.program_templates for select
  using (public.is_coach() or public.tier_rank(public.my_tier()) >= public.tier_rank('pro'));
drop policy if exists "koç şablon yazar" on public.program_templates;
create policy "koç şablon yazar" on public.program_templates for all
  using (public.is_coach()) with check (public.is_coach());
