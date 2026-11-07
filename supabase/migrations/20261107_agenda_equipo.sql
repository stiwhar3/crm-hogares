-- Agenda de la semana (Stiwhar, 07/11/2026): «que todos puedan verse entre ellos».
-- Los asesores solo leen sus visitas y noticias; esta función les da, para la agenda, las visitas y valoraciones
-- de todo el equipo entre dos fechas (como mucho 62 días), solo con lo necesario: fecha, hora, dirección, asesor,
-- nombre del comprador o propietario y si está cancelada. Sin teléfonos, notas ni el resto de la ficha.
create or replace function public.agenda_equipo(p_desde text, p_hasta text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo) then raise exception 'sin permiso' using errcode = '42501'; end if;
  if p_desde !~ '^\d{4}-\d{2}-\d{2}$' or p_hasta !~ '^\d{4}-\d{2}-\d{2}$' or p_hasta::date - p_desde::date > 62 then raise exception 'fechas no válidas'; end if;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into r from (
    select jsonb_strip_nulls(jsonb_build_object('tipo', 'visita', 'id', v.id, 'fecha', v.d->'fecha', 'hora', v.d->'hora',
      'direccion', v.d->'direccion', 'asesor', v.d->'asesor', 'nombre', coalesce(v.d->'compradorNombre', c.d->'nombre'),
      'cancelada', case when coalesce(v.d->>'cancelada', '') in ('', 'false') then null else true end)) x
    from public.visitas v left join public.compradores c on c.id = v.d->>'compradorId'
    where v.d->>'fecha' between p_desde and p_hasta
    union all
    select jsonb_strip_nulls(jsonb_build_object('tipo', 'valoracion', 'id', n.id, 'fecha', n.d->'fechaValoracion',
      'direccion', n.d->'direccion', 'asesor', n.d->'asesor', 'nombre', n.d->'nombre', 'etapa', n.d->'etapa'))
    from public.contactos n
    where n.d->>'fechaValoracion' between p_desde and p_hasta and coalesce(n.d->>'etapa', '') <> 'KO'
  ) t;
  return r;
end $$;
revoke all on function public.agenda_equipo(text, text) from public, anon;
grant execute on function public.agenda_equipo(text, text) to authenticated;
