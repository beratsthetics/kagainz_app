-- Influencer kodları. Koç her influencer için bir kod açar (ör. ahmet). Takipçi kayıt olurken ya da
-- kayıttan sonraki 14 gün içinde kodu girer; kod hesabına yazılır (ödeme sistemi gelince indirimli fiyat bu
-- koda göre gösterilecek). Koç isterse koda hediye Pro günü de verir. Koç panelinde her kod için kaç kişinin
-- katıldığı ve kaçının ücretli pakete geçtiği görünür. Bir üye tek bir kod kullanabilir
-- (influencer kodu ya da arkadaş daveti). Tekrar çalıştırılabilir.

create table if not exists public.ref_codes (
  code text primary key check (code ~ '^[a-z0-9_]{3,20}$'),
  name text not null check (char_length(name) between 1 and 60),
  bonus_days int not null default 0 check (bonus_days between 0 and 90),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.ref_codes enable row level security;
drop policy if exists "koç okur" on public.ref_codes;
drop policy if exists "koç yönetir" on public.ref_codes;
create policy "koç okur" on public.ref_codes for select using (public.is_coach());
create policy "koç yönetir" on public.ref_codes for all using (public.is_coach()) with check (public.is_coach());

alter table public.profiles add column if not exists ref_code text references public.ref_codes (code) on update cascade on delete set null;
alter table public.profiles add column if not exists ref_paid boolean not null default false;
create index if not exists profiles_ref_code on public.profiles (ref_code) where ref_code is not null;

-- Kodla gelen üye ücretli pakete ilk geçtiğinde işaretlenir (koç paneli ya da ödeme webhook'u tier yazar).
create or replace function public.ref_paid() returns trigger
language plpgsql as $$
begin
  if new.tier <> 'free' and new.ref_code is not null then new.ref_paid := true; end if;
  return new;
end $$;
drop trigger if exists ref_paid on public.profiles;
create trigger ref_paid before update of tier on public.profiles
  for each row execute function public.ref_paid();

-- Arkadaş daveti: influencer kodu kullanan biri ayrıca davet kodu giremez.
create or replace function public.redeem_invite(code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles;
  inviter public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'Önce giriş yap.' using errcode = 'P0001'; end if;
  if me.invited_by is not null or me.ref_code is not null then raise exception 'Zaten bir davet kodu kullandın.' using errcode = 'P0001'; end if;
  if me.created_at < now() - interval '14 days' then
    raise exception 'Davet kodu sadece ilk 14 gün içinde girilebilir.' using errcode = 'P0001';
  end if;
  select * into inviter from public.profiles where username = lower(trim(leading '@' from trim(code)));
  if inviter.id is null then raise exception 'Bu kodla bir kullanıcı bulunamadı.' using errcode = 'P0001'; end if;
  if inviter.id = me.id then raise exception 'Kendi kodunu kullanamazsın.' using errcode = 'P0001'; end if;
  if inviter.invited_by = me.id then raise exception 'Seni davet eden birinin kodunu kullanamazsın.' using errcode = 'P0001'; end if;

  update public.profiles set invited_by = inviter.id where id = me.id;
  insert into public.notifications (user_id, title, body, data)
  values (inviter.id, 'Davet kodun kullanıldı', public.uname(me.id) || ' kodunla katıldı. Ücretli pakete geçince 1 hafta Pro kazanırsın.',
          jsonb_build_object('route', '/invite'));
  -- Zaten ücretli bir pakettense ödül hemen verilir.
  if me.tier <> 'free' then perform public.reward_inviter(me.id); end if;
  return inviter.username;
end $$;
revoke execute on function public.redeem_invite(text) from anon, public;
grant execute on function public.redeem_invite(text) to authenticated;

-- Tek giriş noktası: önce influencer kodu aranır, yoksa kullanıcı adı (arkadaş daveti) denenir.
-- Dönüş: {"kind":"ref","name":"Ahmet","bonus_days":7} ya da {"kind":"user","name":"berat"}.
create or replace function public.redeem_code(code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles;
  ref public.ref_codes;
begin
  select * into ref from public.ref_codes r where r.code = lower(trim(leading '@' from trim(redeem_code.code)));
  if ref.code is not null and not ref.active then raise exception 'Bu kod artık geçerli değil.' using errcode = 'P0001'; end if;
  if ref.code is null then
    return jsonb_build_object('kind', 'user', 'name', public.redeem_invite(code));
  end if;

  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'Önce giriş yap.' using errcode = 'P0001'; end if;
  if me.invited_by is not null or me.ref_code is not null then raise exception 'Zaten bir davet kodu kullandın.' using errcode = 'P0001'; end if;
  if me.created_at < now() - interval '14 days' then
    raise exception 'Davet kodu sadece ilk 14 gün içinde girilebilir.' using errcode = 'P0001';
  end if;

  update public.profiles
    set ref_code = ref.code,
        ref_paid = tier <> 'free',
        bonus_until = case when ref.bonus_days > 0
          then least(greatest(coalesce(bonus_until, now()), now()) + make_interval(days => ref.bonus_days), now() + interval '365 days')
          else bonus_until end
    where id = me.id;
  return jsonb_build_object('kind', 'ref', 'name', ref.name, 'bonus_days', ref.bonus_days);
end $$;
revoke execute on function public.redeem_code(text) from anon, public;
grant execute on function public.redeem_code(text) to authenticated;

-- Koç paneli: her kod için katılan, son 30 günde katılan, ücretli pakete geçen ve şu an ücretli olan sayısı.
create or replace function public.ref_stats()
returns table (code text, name text, bonus_days int, active boolean, created_at timestamptz, joined int, joined_30d int, paid int, paying int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_coach() then raise exception 'Sadece koçlar görebilir.' using errcode = 'P0001'; end if;
  return query
    select r.code, r.name, r.bonus_days, r.active, r.created_at,
           count(p.id)::int,
           count(p.id) filter (where p.created_at > now() - interval '30 days')::int,
           count(p.id) filter (where p.ref_paid)::int,
           count(p.id) filter (where p.tier <> 'free')::int
    from public.ref_codes r
    left join public.profiles p on p.ref_code = r.code
    group by r.code
    order by r.created_at desc;
end $$;
revoke execute on function public.ref_stats() from anon, public;
grant execute on function public.ref_stats() to authenticated;
