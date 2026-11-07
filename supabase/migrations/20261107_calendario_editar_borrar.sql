-- Stiwhar (07/11/2026): lo que se edita en el CRM también va al Google Calendar.
-- Además de fecha, hora y cancelada, el trigger avisa a la función «calendario» cuando cambia el comprador,
-- su teléfono, el inmueble o el asesor (le pasa los valores anteriores para cambiar solo esa parte del título),
-- y al borrar una visita que tenía evento (el evento se pone en gris; no se borra del calendario).
create or replace function public.cal_visita() returns trigger language plpgsql security definer set search_path=public as $$
declare cambia_datos boolean := false;
begin
  if tg_op='DELETE' then
    if coalesce(old.d->>'calEventId','')<>'' then
      perform net.http_post(url:='https://uugzmmxucxrrmebfggrk.supabase.co/functions/v1/calendario',
        headers:=jsonb_build_object('Content-Type','application/json','x-secreto',(select v from push_config where k='secreto')),
        body:=jsonb_build_object('id',old.id,'borrado',true,'calEventId',old.d->>'calEventId'));
    end if;
    return old;
  end if;
  if coalesce(new.d->>'fecha','')='' or coalesce(new.d->>'hora','')='' then return new; end if;
  if tg_op='INSERT' and new.d ? 'calEventId' then return new; end if;
  if tg_op='UPDATE' then
    cambia_datos := coalesce(new.d->>'calEventId','')<>'' and (
         coalesce(new.d->>'compradorNombre','') <> coalesce(old.d->>'compradorNombre','')
      or coalesce(new.d->>'telComprador','')    <> coalesce(old.d->>'telComprador','')
      or coalesce(new.d->>'encargoId','')       <> coalesce(old.d->>'encargoId','')
      or coalesce(new.d->>'direccion','')       <> coalesce(old.d->>'direccion','')
      or coalesce(new.d->>'asesor','')          <> coalesce(old.d->>'asesor',''));
    if (new.d->>'fecha') is not distinct from (old.d->>'fecha')
       and (new.d->>'hora') is not distinct from (old.d->>'hora')
       and coalesce(new.d->>'cancelada','') = coalesce(old.d->>'cancelada','')
       and not cambia_datos then return new; end if;
  end if;
  perform net.http_post(url:='https://uugzmmxucxrrmebfggrk.supabase.co/functions/v1/calendario',
    headers:=jsonb_build_object('Content-Type','application/json','x-secreto',(select v from push_config where k='secreto')),
    body:=case when cambia_datos then jsonb_build_object('id',new.id,'antes',jsonb_build_object(
      'compradorNombre',coalesce(old.d->>'compradorNombre',''),'telComprador',coalesce(old.d->>'telComprador',''),
      'encargoId',coalesce(old.d->>'encargoId',''),'direccion',coalesce(old.d->>'direccion',''),'asesor',coalesce(old.d->>'asesor','')))
      else jsonb_build_object('id',new.id) end);
  return new;
exception when others then if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists cal_visita on public.visitas;
create trigger cal_visita after insert or update or delete on public.visitas for each row execute function public.cal_visita();
