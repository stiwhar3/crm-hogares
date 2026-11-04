-- Cruce de compradores desde noticias y encargos (Stiwhar, 04/11/2026).
-- Los asesores no leen la tabla compradores; esta función les da solo lo necesario para cruzar y llamar
-- (nombre, teléfono y qué busca; sin DNI, email ni notas) de los compradores que están buscando.
create or replace function public.cruce_compradores() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', c.id, 'creado', c.creado,
    'nombre', c.d->'nombre', 'telefono', c.d->'telefono', 'estado', c.d->'estado', 'tipoInm', c.d->'tipoInm',
    'precioMax', c.d->'precioMax', 'habMin', c.d->'habMin', 'banosMin', c.d->'banosMin',
    'ascensor', c.d->'ascensor', 'terraza', c.d->'terraza', 'garaje', c.d->'garaje',
    'barrios', c.d->'barrios', 'zonasBusca', c.d->'zonasBusca', 'municipios', c.d->'municipios',
    'descartados', c.d->'descartados', 'finanhogar', c.d->'finanhogar', 'financiacion', c.d->'financiacion', 'urgencia', c.d->'urgencia', 'llamadas', c.d->'llamadas',
    'visitados', (select jsonb_agg(distinct v.d->>'encargoId') from public.visitas v
                  where v.d->>'compradorId' = c.id and v.d->>'encargoId' is not null)
  ))), '[]'::jsonb)
  from public.compradores c
  where exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo)
    and c.d->>'estado' in ('Activo', 'Visitando')
$$;
revoke all on function public.cruce_compradores() from public, anon;
grant execute on function public.cruce_compradores() to authenticated;

-- Apuntar una llamada a un comprador desde el cruce (quién, cuándo, piso y resultado). «No le interesa» en un encargo lo descarta para ese encargo.
create or replace function public.apuntar_llamada_comprador(p_id text, p_piso text, p_dir text, p_res text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo) then raise exception 'sin permiso' using errcode = '42501'; end if;
  if p_res not in ('Quiere visita', 'No le interesa', 'No contesta') then raise exception 'resultado no válido'; end if;
  update public.compradores c set d = jsonb_set(c.d, '{llamadas}',
      (coalesce(c.d->'llamadas', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'f', now(), 'quien', public.mi_nombre(), 'piso', coalesce(p_piso, ''), 'dir', left(coalesce(p_dir, ''), 200), 'res', p_res))))
  where c.id = p_id;
  if p_res = 'No le interesa' and exists (select 1 from public.encargos e where e.id = p_piso) then
    update public.compradores c set d = jsonb_set(c.d, '{descartados}', coalesce(c.d->'descartados', '[]'::jsonb) || to_jsonb(p_piso))
    where c.id = p_id and not coalesce(c.d->'descartados', '[]'::jsonb) ? p_piso;
  end if;
end $$;
revoke all on function public.apuntar_llamada_comprador(text, text, text, text) from public, anon;
grant execute on function public.apuntar_llamada_comprador(text, text, text, text) to authenticated;
