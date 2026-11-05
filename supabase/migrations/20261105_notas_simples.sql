-- Nota simple (05/11/2026, Stiwhar): en cada noticia y en cada vivienda del censo se marca
-- «Por pedir / Pedida / Recibida» (va dentro de la ficha, campo d.notaSimple) y, al recibirla, se sube el PDF.
-- Los PDF van al bucket privado «notas-simples», con los mismos permisos que la ficha:
--   contactos/<id noticia>/<archivo>.pdf  → quien puede ver esa noticia (Stiwhar o su asesor)
--   censo/<id vivienda>/<archivo>.pdf     → quien ve esa zona del censo (Stiwhar, Daniel o el asesor de la zona)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notas-simples', 'notas-simples', false, 15728640, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.puede_nota_simple(p_name text) returns boolean
language sql stable set search_path = public as $$
  select case (storage.foldername(p_name))[1]
    when 'contactos' then exists (select 1 from public.contactos c where c.id = (storage.foldername(p_name))[2])
    when 'censo' then ve_todo() or upper(split_part((storage.foldername(p_name))[2], '-', 1)) = mi_zona()
    else false end
$$;
-- SECURITY INVOKER: la consulta a contactos pasa por su RLS, así que solo cuenta si quien sube/lee ve esa noticia.
revoke execute on function public.puede_nota_simple(text) from public, anon;
grant execute on function public.puede_nota_simple(text) to authenticated;

drop policy if exists "notas simples leer" on storage.objects;
drop policy if exists "notas simples subir" on storage.objects;
drop policy if exists "notas simples cambiar" on storage.objects;
drop policy if exists "notas simples borrar" on storage.objects;
create policy "notas simples leer" on storage.objects for select to authenticated
  using (bucket_id = 'notas-simples' and public.puede_nota_simple(name));
create policy "notas simples subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'notas-simples' and public.puede_nota_simple(name));
create policy "notas simples cambiar" on storage.objects for update to authenticated
  using (bucket_id = 'notas-simples' and public.puede_nota_simple(name))
  with check (bucket_id = 'notas-simples' and public.puede_nota_simple(name));
-- Borrar un PDF (al cambiarlo por otro): solo Stiwhar, como el resto de borrados.
create policy "notas simples borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'notas-simples' and es_responsable());
