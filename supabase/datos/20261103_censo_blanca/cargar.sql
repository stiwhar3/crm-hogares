-- Carga del censo «sin color» (zona BLANCA, sin asesor), 03/11/2026.
-- Copia previa: respaldo.censo_20261103_antes_blanca y respaldo.ajustes_20261103_antes_blanca.
-- Solo añade filas nuevas blanca-NN; no toca las zonas que ya estaban.
-- 1) Pedir el fichero:
--    select net.http_get('https://raw.githubusercontent.com/stiwhar3/crm-hogares/<rama>/supabase/datos/20261103_censo_blanca/nuevos_censo.json');
-- 2) Con el id que devuelve:
insert into public.censo (id, zona, d)
select x->>'id', x->>'zona', x->'d'
from net._http_response r, jsonb_array_elements(r.content::jsonb) x
where r.id = :peticion and r.status_code = 200
on conflict (id) do nothing;
