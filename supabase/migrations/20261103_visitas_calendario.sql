-- Visitas del CRM → Google Calendar: al crear una visita o cambiarle la fecha o la hora,
-- la base de datos avisa a la función «calendario», que crea o mueve el evento.
create or replace function public.cal_visita() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if coalesce(new.d->>'fecha','')='' or coalesce(new.d->>'hora','')='' then return new; end if;
  if tg_op='INSERT' and new.d ? 'calEventId' then return new; end if;
  if tg_op='UPDATE' and (new.d->>'fecha') is not distinct from (old.d->>'fecha')
     and (new.d->>'hora') is not distinct from (old.d->>'hora') then return new; end if;
  perform net.http_post(
    url:='https://uugzmmxucxrrmebfggrk.supabase.co/functions/v1/calendario',
    headers:=jsonb_build_object('Content-Type','application/json','x-secreto',(select v from push_config where k='secreto')),
    body:=jsonb_build_object('id',new.id));
  return new;
exception when others then return new;
end $$;
drop trigger if exists cal_visita on public.visitas;
create trigger cal_visita after insert or update on public.visitas for each row execute function public.cal_visita();
