-- Propietarios inversores (Stiwhar, 07/11/2026: «esto que le salga solo a Daniel»).
-- Daniel no lee las noticias: esta función le da solo las alquiladas, con lo necesario para llamar al propietario.
create or replace function public.inversores_alquiler() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', c.id, 'direccion', c.d->'direccion', 'nombre', c.d->'nombre', 'telefono', c.d->'telefono', 'titulares', c.d->'titulares',
    'asesor', c.d->'asesor', 'zona', c.d->'zona', 'etapa', c.d->'etapa', 'vendida', c.d->'vendida', 'censoId', c.d->'censoId',
    'alquilada', c.d->'alquilada', 'alqInicio', c.d->'alqInicio', 'alqRenta', c.d->'alqRenta', 'alqFin', c.d->'alqFin', 'alqAviso', c.d->'alqAviso',
    'alqInquilino', c.d->'alqInquilino', 'alqRespuesta', c.d->'alqRespuesta', 'alqRespVence', c.d->'alqRespVence', 'alqLlamadas', c.d->'alqLlamadas',
    'notas', left(coalesce(c.d->>'notas', ''), 600)
  ))), '[]'::jsonb)
  from public.contactos c
  where public.ve_todo() and coalesce((c.d->>'alquilada')::boolean, false)
$$;
revoke all on function public.inversores_alquiler() from public, anon;
grant execute on function public.inversores_alquiler() to authenticated;

-- Apuntar la respuesta del propietario desde el Hoy de Daniel: guarda la respuesta, para qué vencimiento es,
-- la llamada (quién, cuándo, nota) y una entrada en el historial de la noticia, que el asesor ve.
create or replace function public.apuntar_alquiler(p_id text, p_resp text, p_vence text, p_nota text) returns void
language plpgsql security definer set search_path = public as $$
declare v_antes text;
begin
  if not public.ve_todo() then raise exception 'sin permiso' using errcode = '42501'; end if;
  if coalesce(p_resp, '') not in ('', 'Quiere vender', 'Se lo pensará', 'No contesta', 'Sigue alquilando', 'Quiere recuperarla') then raise exception 'respuesta no válida'; end if;
  select coalesce(d->>'alqRespuesta', '') into v_antes from public.contactos where id = p_id and coalesce((d->>'alquilada')::boolean, false);
  if not found then raise exception 'no es una noticia alquilada'; end if;
  update public.contactos c set d = c.d || jsonb_build_object(
      'alqRespuesta', coalesce(p_resp, ''), 'alqRespVence', case when coalesce(p_resp, '') = '' then '' else coalesce(p_vence, '') end,
      'alqLlamadas', coalesce(c.d->'alqLlamadas', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('f', now(), 'quien', public.mi_nombre(), 'res', coalesce(p_resp, ''), 'nota', left(coalesce(p_nota, ''), 500))),
      'actualizado', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'historial', coalesce(c.d->'historial', '[]'::jsonb) || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'f', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'n', 'Llamada al propietario por el fin del alquiler (' || public.mi_nombre() || ')' || case when coalesce(p_nota, '') <> '' then ': ' || left(p_nota, 500) else '' end,
        'c', case when v_antes <> coalesce(p_resp, '') then jsonb_build_array(jsonb_build_object('campo', '¿Qué quiere hacer el propietario?', 'antes', v_antes, 'despues', coalesce(p_resp, ''))) end))))
  where c.id = p_id;
end $$;
revoke all on function public.apuntar_alquiler(text, text, text, text) from public, anon;
grant execute on function public.apuntar_alquiler(text, text, text, text) to authenticated;
