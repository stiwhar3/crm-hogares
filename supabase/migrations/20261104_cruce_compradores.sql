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
    'descartados', c.d->'descartados', 'finanhogar', c.d->'finanhogar', 'financiacion', c.d->'financiacion', 'urgencia', c.d->'urgencia',
    'visitados', (select jsonb_agg(distinct v.d->>'encargoId') from public.visitas v
                  where v.d->>'compradorId' = c.id and v.d->>'encargoId' is not null)
  ))), '[]'::jsonb)
  from public.compradores c
  where exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo)
    and c.d->>'estado' in ('Activo', 'Visitando')
$$;
revoke all on function public.cruce_compradores() from public, anon;
grant execute on function public.cruce_compradores() to authenticated;
