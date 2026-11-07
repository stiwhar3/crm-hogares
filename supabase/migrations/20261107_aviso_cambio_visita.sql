-- Stiwhar (07/11/2026): «cada vez que haya un cambio que le salte una pantalla emergente a los que les afecte y a Daniel».
-- Cuando alguien cambia una visita de hoy en adelante (fecha, hora, cancelada/reactivada, inmueble, comprador,
-- teléfono o asesor) o la borra, se crea un aviso «Cambio de visita» para el asesor de la visita (el de antes y el
-- de ahora si cambia) y para Daniel, menos para quien ha hecho el cambio. La app lo enseña en una ventana emergente
-- y llega también como notificación (trigger push_aviso). Los cambios que hace el servidor (sin usuario) no avisan.
create or replace function public.fecha_corta(f text) returns text language sql immutable as $$
  select case when f ~ '^\d{4}-\d{2}-\d{2}$' then to_char(f::date,'DD/MM') else coalesce(nullif(f,''),'sin fecha') end $$;
create or replace function public.aviso_cambio_visita() returns trigger language plpgsql security definer set search_path=public as $$
declare
  yo text := mi_nombre();
  o jsonb := old.d;
  n jsonb := case when tg_op='DELETE' then null else new.d end;
  hoy text := ((now() at time zone 'Europe/Madrid')::date)::text;
  c text[] := '{}';
  quien text;
  b jsonb;
begin
  if yo is null then return null; end if;
  if greatest(coalesce(o->>'fecha',''), coalesce(n->>'fecha','')) < hoy then return null; end if;
  if tg_op='DELETE' then c := array['Visita borrada'];
  else
    if coalesce(n->>'cancelada','') not in ('','false') and coalesce(o->>'cancelada','') in ('','false') then c := c || 'Visita cancelada'::text; end if;
    if coalesce(n->>'cancelada','') in ('','false') and coalesce(o->>'cancelada','') not in ('','false') then c := c || 'Visita reactivada'::text; end if;
    if coalesce(n->>'fecha','') <> coalesce(o->>'fecha','') then
      c := c || ('Cambia el día: del ' || fecha_corta(o->>'fecha') || coalesce(' a las '||nullif(o->>'hora',''),'') || ' al ' || fecha_corta(n->>'fecha') || coalesce(' a las '||nullif(n->>'hora',''),''))::text;
    elsif coalesce(n->>'hora','') <> coalesce(o->>'hora','') then
      c := c || ('Cambia la hora: de las ' || coalesce(nullif(o->>'hora',''),'—') || ' a las ' || coalesce(nullif(n->>'hora',''),'—'))::text; end if;
    if coalesce(n->>'encargoId','') <> coalesce(o->>'encargoId','') or coalesce(n->>'direccion','') <> coalesce(o->>'direccion','') then
      c := c || ('Cambia el inmueble: antes ' || coalesce(nullif(o->>'direccion',''),'—'))::text; end if;
    if coalesce(n->>'compradorNombre','') <> coalesce(o->>'compradorNombre','') then
      c := c || ('Cambia el comprador: antes ' || coalesce(nullif(o->>'compradorNombre',''),'—'))::text; end if;
    if coalesce(n->>'telComprador','') <> coalesce(o->>'telComprador','') then
      c := c || ('Cambia el teléfono: antes ' || coalesce(nullif(o->>'telComprador',''),'—'))::text; end if;
    if coalesce(n->>'asesor','') <> coalesce(o->>'asesor','') then
      c := c || ('Cambia el asesor: de ' || coalesce(nullif(o->>'asesor',''),'—') || ' a ' || coalesce(nullif(n->>'asesor',''),'—'))::text; end if;
  end if;
  if array_length(c,1) is null then return null; end if;
  b := coalesce(n, o);
  for quien in select distinct x from unnest(array[o->>'asesor', n->>'asesor', 'Daniel']) x where coalesce(x,'') <> '' and x <> yo loop
    insert into public.avisos(id, d) values ('cv_' || replace(gen_random_uuid()::text,'-',''), jsonb_build_object(
      'tipo','Cambio de visita','de',yo,'para',quien,'col','visitas','refId',old.id,
      'direccion',coalesce(b->>'direccion',''),'nombre',coalesce(b->>'compradorNombre',''),'telefono',coalesce(b->>'telComprador',''),
      'fecha',coalesce(b->>'fecha',''),'hora',coalesce(b->>'hora',''),'asesorVisita',coalesce(b->>'asesor',''),
      'borrada',tg_op='DELETE','cambios',to_jsonb(c),'texto',array_to_string(c,'. '),'hecho',''));
  end loop;
  return null;
exception when others then return null;
end $$;
drop trigger if exists aviso_cambio_visita on public.visitas;
create trigger aviso_cambio_visita after update or delete on public.visitas for each row execute function public.aviso_cambio_visita();
