-- Buscador de viviendas del censo para el coordinador (no ve el censo): solo dirección, sin datos de propietarios.
create or replace function public.buscar_vivienda(p_calle text, p_num text)
returns table(id text, zona text, via text, num text, esc text, planta text, puerta text)
language sql stable security definer set search_path = public as $$
  select c.id||'.'||(e.bi-1)||'.'||(x.ui-1), c.d->>'zona', e.b->>'via', e.b->>'num', x.u->>'esc', x.u->>'planta', x.u->>'puerta'
  from censo c
  cross join lateral jsonb_array_elements(coalesce(c.d->'edificios','[]'::jsonb)) with ordinality e(b,bi)
  cross join lateral jsonb_array_elements(coalesce(e.b->'u','[]'::jsonb)) with ordinality x(u,ui)
  where ve_todo()
    and length(norm_dir(p_calle)) >= 3
    and norm_dir(e.b->>'via') like '%'||norm_dir(p_calle)||'%'
    and (coalesce(p_num,'') = '' or ltrim(e.b->>'num','0') = ltrim(p_num,'0'))
  limit 400
$$;
revoke all on function public.buscar_vivienda(text,text) from public, anon;
grant execute on function public.buscar_vivienda(text,text) to authenticated;
