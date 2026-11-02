-- Formulario público para compradores (alta.html): entra directo como comprador con origen «Formulario web».
create or replace function public.alta_comprador_web(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  nom text := left(btrim(coalesce(p->>'nombre','')), 80);
  tel text := regexp_replace(coalesce(p->>'telefono',''), '\D', '', 'g');
  t9 text; v_id text; ahora text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  zonas jsonb; nd jsonb;
begin
  if coalesce((p->>'consentimiento')::boolean, false) is not true then raise exception 'Falta aceptar la política de privacidad'; end if;
  if length(nom) < 2 then raise exception 'Falta el nombre'; end if;
  if length(tel) < 9 or length(tel) > 15 then raise exception 'Teléfono no válido'; end if;
  if (select count(*) from compradores where compradores.d->>'origen' = 'Formulario web' and compradores.creado > now() - interval '1 hour') > 30 then
    raise exception 'Demasiadas solicitudes, inténtalo más tarde'; end if;
  t9 := right(tel, 9);
  select coalesce(jsonb_agg(left(z, 80)), '[]'::jsonb) into zonas
    from (select jsonb_array_elements_text(case when jsonb_typeof(p->'zonasBusca') = 'array' then p->'zonasBusca' else '[]'::jsonb end) z limit 20) s;
  nd := jsonb_strip_nulls(jsonb_build_object(
    'nombre', nom, 'telefono', tel, 'email', nullif(left(btrim(coalesce(p->>'email','')), 120), ''),
    'zonasBusca', zonas,
    'precioMax', case when coalesce(p->>'precioMax','') ~ '^\d{4,8}$' then (p->>'precioMax')::numeric end,
    'habMin', case when coalesce(p->>'habMin','') ~ '^\d{1,2}$' then (p->>'habMin')::int end,
    'financiacion', nullif(left(coalesce(p->>'financiacion',''), 60), ''),
    'viveEn', nullif(left(coalesce(p->>'viveEn',''), 40), ''),
    'necesitaVender', nullif(left(coalesce(p->>'necesitaVender',''), 20), ''),
    'direccionActual', nullif(left(btrim(coalesce(p->>'direccionActual','')), 160), ''),
    'busca', nullif(left(btrim(coalesce(p->>'mensaje','')), 1000), '')));
  select c.id into v_id from compradores c where right(regexp_replace(coalesce(c.d->>'telefono',''), '\D', '', 'g'), 9) = t9 limit 1;
  if found then
    update compradores c set d = c.d || jsonb_build_object('web', true, 'webPendiente', true,
      'notas', coalesce(c.d->>'notas','') || E'\n[' || left(ahora,10) || '] Ha vuelto a escribir desde el formulario web: ' || coalesce(nd->>'busca', '') ) where id = v_id;
    return 'ok';
  end if;
  insert into compradores(id, d) values ('web-' || gen_random_uuid(),
    nd || jsonb_build_object('origen', 'Formulario web', 'estado', 'Activo', 'web', true, 'webPendiente', true, 'consentimiento', ahora, 'creado', ahora, 'actualizado', ahora));
  return 'ok';
end $$;
revoke all on function public.alta_comprador_web(jsonb) from public;
grant execute on function public.alta_comprador_web(jsonb) to anon, authenticated;
