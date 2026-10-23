-- Şimdilik chat'e yazmak için telefon doğrulaması gerekmesin (SMS sağlayıcısı sonra bağlanacak).
-- 0002'yi bu değişiklikten önce çalıştırdıysan bunu da çalıştır; tekrar çalıştırmak zararsız.
create or replace function public.can_post() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.username is not null
      and (p.muted_until is null or p.muted_until < now())
  )
$$;
