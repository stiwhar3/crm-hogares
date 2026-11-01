-- Copias dentro de Supabase: solo los últimos 30 días (decidido por Stiwhar, 01/11/2026).
-- Los 3 meses se guardan fuera, en la carpeta del proyecto (copias/hacer_copia.py).
CREATE OR REPLACE FUNCTION public.hacer_copia()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d jsonb;
  ultima_censo timestamptz;
begin
  -- Solo se guardan los últimos 30 días de copias en Supabase (decidido por Stiwhar, 01/11/2026).
  delete from public.copias where fecha < ((now() at time zone 'Europe/Madrid')::date - interval '30 days');
  d := jsonb_build_object(
    'contactos',   (select coalesce(jsonb_object_agg(id, t.d), '{}') from public.contactos t),
    'captaciones', (select coalesce(jsonb_object_agg(id, t.d), '{}') from public.captaciones t),
    'encargos',    (select coalesce(jsonb_object_agg(id, t.d), '{}') from public.encargos t),
    'operaciones', (select coalesce(jsonb_object_agg(id, t.d), '{}') from public.operaciones t),
    'compradores', (select coalesce(jsonb_object_agg(id, t.d), '{}') from public.compradores t),
    'visitas',     (select coalesce(jsonb_object_agg(id, t.d), '{}') from public.visitas t),
    'censoEdits',  (select coalesce(jsonb_object_agg(id, t.d), '{}') from public.censo_edits t),
    'portales',    (select coalesce(jsonb_object_agg(id, t.d), '{}') from public.portales t),
    'borrados',    (select coalesce(jsonb_object_agg(id, t.d), '{}') from public.borrados t),
    'ajustes',     (select coalesce(jsonb_object_agg(id, t.d), '{}') from public.ajustes t),
    'invitados',   (select coalesce(jsonb_agg(to_jsonb(i)), '[]') from public.invitados i));
  select max(actualizado) into ultima_censo from public.censo;
  if not exists (select 1 from public.copias c where c.datos ? 'censo' and c.hecha >= ultima_censo) then
    d := d || jsonb_build_object('censo', (select coalesce(jsonb_object_agg(id, t.d), '{}') from public.censo t));
  end if;
  insert into public.copias(fecha, datos) values ((now() at time zone 'Europe/Madrid')::date, d)
  on conflict (fecha) do update set datos = excluded.datos || (case when public.copias.datos ? 'censo' and not excluded.datos ? 'censo' then jsonb_build_object('censo', public.copias.datos->'censo') else '{}'::jsonb end), hecha = now();
end $function$;
