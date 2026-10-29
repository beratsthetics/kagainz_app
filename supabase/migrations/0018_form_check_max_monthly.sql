-- Form check artık sadece Max üyelere açık ve ayda bir (30 günde bir) gönderilir (berat, 2026-10-29).
-- Eski form check'ler ve koç yorumları görünmeye devam eder. Tekrar çalıştırılabilir.

create or replace function public.can_submit_form_check() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_tier() = 'max' and not exists (
    select 1 from public.form_checks f
    where f.user_id = auth.uid()
      and f.created_at > now() - interval '30 days'
  )
$$;
