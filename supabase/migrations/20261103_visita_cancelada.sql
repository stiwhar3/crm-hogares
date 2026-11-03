-- Stiwhar (03/11): «Visita cancelada» no borra la visita; el trigger avisa a la función calendario
-- también cuando cambia d.cancelada, para poner el evento en gris (o devolverle su color).
create or replace function public.cal_visita() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if coalesce(new.d->>'fecha','')='' or coalesce(new.d->>'hora','')='' then return new; end if;
  if tg_op='INSERT' and new.d ? 'calEventId' then return new; end if;
  if tg_op='UPDATE' and (new.d->>'fecha') is not distinct from (old.d->>'fecha')
     and (new.d->>'hora') is not distinct from (old.d->>'hora')
     and coalesce(new.d->>'cancelada','') = coalesce(old.d->>'cancelada','') then return new; end if;
  perform net.http_post(url:='https://uugzmmxucxrrmebfggrk.supabase.co/functions/v1/calendario',
    headers:=jsonb_build_object('Content-Type','application/json','x-secreto',(select v from push_config where k='secreto')),
    body:=jsonb_build_object('id',new.id));
  return new;
exception when others then return new;
end $$;
