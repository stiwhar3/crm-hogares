-- Checklist «Hasta la firma» de cada operación (Stiwhar, 07/11/2026).
-- Las operaciones solo las editan Stiwhar y Daniel, pero el asesor de la operación tiene que poder marcar
-- cómo va cada papel (nota simple, CEE, ITE, hipoteca, tasación…) y poner las fechas de arras y notaría.
-- Esta función deja tocar SOLO eso: d.firma, las fechas/horas de arras y notaría y la notaría.
create or replace function public.marcar_firma(p_id text, p_firma jsonb, p_fechas jsonb, p_nota text default null) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_d jsonb;
  v_now text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  k text;
begin
  if public.mi_nombre() is null then raise exception 'sin permiso' using errcode = '42501'; end if;
  select d into v_d from public.operaciones where id = p_id for update;
  if v_d is null then raise exception 'la operación no existe'; end if;
  if not (public.ve_todo() or v_d->>'asesor' = public.mi_nombre()) then raise exception 'sin permiso' using errcode = '42501'; end if;
  if p_firma is not null and jsonb_typeof(p_firma) = 'object' then v_d := jsonb_set(v_d, '{firma}', p_firma); end if;
  for k in select jsonb_object_keys(coalesce(p_fechas, '{}'::jsonb)) loop
    if k in ('fechaArras', 'horaArras', 'fechaLimiteArras', 'fechaEscritura', 'horaNotaria', 'notaria') then
      v_d := jsonb_set(v_d, array[k], p_fechas->k);
    end if;
  end loop;
  if coalesce(p_nota, '') <> '' then
    v_d := jsonb_set(v_d, '{historial}', coalesce(v_d->'historial', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('f', v_now, 'n', left(p_nota, 300), 'por', public.mi_nombre())));
  end if;
  v_d := jsonb_set(v_d, '{actualizado}', to_jsonb(v_now));
  update public.operaciones set d = v_d where id = p_id;
  return v_now;
end $$;
revoke all on function public.marcar_firma(text, jsonb, jsonb, text) from public, anon;
grant execute on function public.marcar_firma(text, jsonb, jsonb, text) to authenticated;
