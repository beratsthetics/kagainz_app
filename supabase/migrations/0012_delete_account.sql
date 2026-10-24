-- Hesabı silme (App Store ve Google Play şartı). Kullanıcı yalnızca kendi hesabını siler; profil,
-- mesajlar, check-in'ler, takipler ve diğer kayıtlar hesaba bağlı olduğu için onunla birlikte silinir.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Giriş yapılmamış';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.delete_my_account() from anon, public;
grant execute on function public.delete_my_account() to authenticated;
