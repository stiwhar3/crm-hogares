-- Toda noticia marcada como vendida pasa a KO (Stiwhar, 03/11/2026). Refuerzo en la base: la app ya lo hace al guardar.
create or replace function public.vendida_a_ko() returns trigger language plpgsql set search_path=public as $$
begin
  if coalesce(new.d->>'vendida','') not in ('','false') and coalesce(new.d->>'etapa','')<>'KO' then
    new.d := jsonb_set(new.d,'{etapa}','"KO"');
  end if;
  return new;
end $$;
drop trigger if exists vendida_a_ko on public.contactos;
create trigger vendida_a_ko before insert or update on public.contactos for each row execute function public.vendida_a_ko();
