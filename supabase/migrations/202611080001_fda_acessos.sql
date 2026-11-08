create table public.fda_acessos (id uuid primary key default gen_random_uuid());
alter table public.fda_acessos enable row level security;
revoke all on public.fda_acessos from anon, authenticated;
grant select, insert on public.fda_acessos to anon, authenticated;
create policy "Consultar acessos" on public.fda_acessos for select to anon, authenticated using (true);
create policy "Registrar acesso" on public.fda_acessos for insert to anon, authenticated with check (true);
create function public.registrar_acesso_fda(acesso_id uuid) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare total bigint;
begin
  insert into public.fda_acessos(id) values (acesso_id) on conflict (id) do nothing;
  select count(*) into total from public.fda_acessos;
  return total;
end;
$$;
revoke all on function public.registrar_acesso_fda(uuid) from public;
grant execute on function public.registrar_acesso_fda(uuid) to anon, authenticated;