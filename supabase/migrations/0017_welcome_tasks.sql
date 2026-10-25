-- Hoş geldin görevleri: yeni üye TikTok hesaplarımızı takip edince 3 gün Pro alır (profiles.bonus_until).
-- Takip doğrulanamaz (TikTok takip listesini vermiyor); uygulama linkler açılınca bu fonksiyonu çağırır.
-- Hesap başına bir kez ve kayıttan sonraki ilk 7 gün içinde. Tekrar çalıştırılabilir.

alter table public.profiles add column if not exists welcome_claimed boolean not null default false;

create or replace function public.claim_welcome_reward() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid() for update;
  if me.id is null then raise exception 'Önce giriş yap.' using errcode = 'P0001'; end if;
  if me.welcome_claimed then raise exception 'Bu ödülü zaten aldın.' using errcode = 'P0001'; end if;
  if me.created_at < now() - interval '7 days' then
    raise exception 'Bu görevler sadece kayıttan sonraki ilk 7 gün geçerli.' using errcode = 'P0001';
  end if;
  update public.profiles
    set welcome_claimed = true,
        bonus_until = greatest(coalesce(bonus_until, now()), now()) + interval '3 days'
    where id = me.id
    returning bonus_until into me.bonus_until;
  return me.bonus_until;
end $$;
revoke execute on function public.claim_welcome_reward() from anon, public;
grant execute on function public.claim_welcome_reward() to authenticated;
