-- Subida del Excel diario de captaciones (Daniel). Una captación por dirección (portal):
-- si ya existe, se suma una vez más («veces») y se guarda la fecha de la petición en «pedidas».
create or replace function public.norm_dir(t text) returns text language sql immutable as $$
  select regexp_replace(regexp_replace(regexp_replace(
    translate(upper(coalesce(t,'')), 'ÁÉÍÓÚÜÑÀÈÌÒÙÇ', 'AEIOUUNAEIOUC'),
    '^\s*(C/|(CALLE|CL|AVENIDA|AVDA|AV|PLAZA|PZA|PZ|PASEO|PS|URBANIZACION|URB|CAMINO|TRAVESIA|RONDA)\.?\s+)', ''),
    '\m(DE|DEL|LA|LAS|LOS|EL)\M', '', 'g'),
    '[^A-Z0-9]', '', 'g') $$;

create or replace function public.importar_captaciones(filas jsonb) returns jsonb
language plpgsql security definer set search_path = 'public' as $$
declare
  f jsonb; k text; c record; ped jsonb; ts text; dia text; nuevas int := 0; sumadas int := 0; repetidas int := 0; sinDir int := 0;
  ahora text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'); nd jsonb; nv int;
begin
  if not ve_todo() then raise exception 'sin permiso' using errcode = '42501'; end if;
  for f in select * from jsonb_array_elements(filas) loop
    k := norm_dir(f->>'direccion'); ts := coalesce(f->>'ts',''); dia := left(ts, 10);
    if k = '' or ts = '' then sinDir := sinDir + 1; continue; end if;
    select id, d into c from captaciones where norm_dir(d->>'direccion') = k
      order by (d->>'estado' = 'Descartada'), coalesce(d->>'fecha','') desc, id limit 1;
    if found then
      ped := coalesce(c.d->'pedidas', '[]'::jsonb);
      if ped ? ts then repetidas := repetidas + 1; continue; end if;
      if jsonb_array_length(ped) = 0 and coalesce(c.d->>'fecha','') = dia then
        -- es la misma petición que creó la ficha (antes de contar veces)
        update captaciones set d = d || jsonb_build_object('pedidas', jsonb_build_array(ts), 'veces', 1) where id = c.id;
        repetidas := repetidas + 1; continue;
      end if;
      nv := greatest(coalesce((c.d->>'veces')::int, jsonb_array_length(ped)), case when jsonb_array_length(ped) = 0 then 1 else 0 end) + 1;
      nd := jsonb_build_object('pedidas', ped || jsonb_build_array(ts), 'veces', nv, 'ultimaPedida', greatest(coalesce(c.d->>'ultimaPedida',''), dia),
        'historial', coalesce(c.d->'historial','[]'::jsonb) || jsonb_build_array(jsonb_build_object('f', ahora, 'n',
          'Han vuelto a pedir valoración el ' || to_char(dia::date, 'DD/MM/YYYY') || ' (' || nv || ' veces).')));
      if dia > coalesce(c.d->>'fecha','') then
        nd := nd || jsonb_build_object('fecha', dia) || jsonb_strip_nulls(jsonb_build_object('valVenta', f->'valVenta', 'm2', nullif(f->>'m2',''),
          'relacion', nullif(f->>'relacion',''), 'venderEn', nullif(f->>'venderEn','')));
      end if;
      update captaciones set d = d || nd where id = c.id;
      sumadas := sumadas + 1;
    elsif coalesce((f->>'crear')::boolean, true) then
      insert into captaciones(id, d) values ('cap-' || replace(gen_random_uuid()::text, '-', ''), jsonb_strip_nulls(jsonb_build_object(
        'direccion', f->>'direccion', 'zona', coalesce(f->>'zona',''), 'asesor', coalesce(f->>'asesor',''),
        'estado', case when coalesce(f->>'zona','') = '' then 'Descartada' else 'Pendiente' end,
        'comentario', case when coalesce(f->>'zona','') = '' then 'Fuera de nuestras zonas.' else coalesce(f->>'comentario','') end,
        'origen', coalesce(f->>'origen',''), 'tipo', f->>'tipo', 'm2', f->>'m2', 'valVenta', f->'valVenta', 'valAlquiler', f->>'valAlquiler',
        'relacion', f->>'relacion', 'venderEn', f->>'venderEn', 'fecha', dia, 'ultimaPedida', dia, 'encontrado', f->>'encontrado',
        'pisosPosibles', f->>'pisosPosibles', 'pedidas', jsonb_build_array(ts), 'veces', 1, 'creado', ahora, 'actualizado', ahora,
        'historial', jsonb_build_array(jsonb_build_object('f', ahora, 'alta', true, 'n', 'Subida desde el Excel de captaciones.')))));
      nuevas := nuevas + 1;
    end if;
  end loop;
  return jsonb_build_object('nuevas', nuevas, 'sumadas', sumadas, 'repetidas', repetidas, 'sinDireccion', sinDir);
end $$;
revoke all on function public.importar_captaciones(jsonb) from public, anon;
grant execute on function public.importar_captaciones(jsonb) to authenticated;
