-- Notificaciones push (Stiwhar, 02/11/2026)
create table if not exists public.push_subs(
  id text primary key,
  d jsonb not null default '{}'::jsonb,
  nombre text generated always as (d->>'nombre') stored,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now());
alter table public.push_subs enable row level security;
drop policy if exists leer on public.push_subs; drop policy if exists crear on public.push_subs;
drop policy if exists editar on public.push_subs; drop policy if exists borrar on public.push_subs;
create policy leer on public.push_subs for select using (nombre = mi_nombre());
create policy crear on public.push_subs for insert with check (mi_nombre() is not null and nombre = mi_nombre());
create policy editar on public.push_subs for update using (nombre = mi_nombre()) with check (nombre = mi_nombre());
create policy borrar on public.push_subs for delete using (nombre = mi_nombre());
grant select, insert, update, delete on public.push_subs to authenticated;

-- Claves del servidor: sin políticas, solo las lee el servidor (service role)
create table if not exists public.push_config(k text primary key, v text not null);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;
insert into public.push_config values ('secreto','<secreto>'),('vapid_publica','BENyYxD2VpiiK4V7qXG0Hcps8otXBafDYGQV2eEJRSb7SlPXP8jDRoq8shbzjzyAYLLK3tKlOjjQymuxNG7j4FA'),('vapid_privada','<vapid_privada>')
  on conflict (k) do nothing;

-- Al crear un aviso o una visita, avisa al servidor de push
create or replace function public.push_disparar() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='visitas' and (new.id like 'imp_%' or coalesce(new.d->>'encargoId','')='') then return new; end if;
  perform net.http_post(
    url:='https://uugzmmxucxrrmebfggrk.supabase.co/functions/v1/push',
    headers:=jsonb_build_object('Content-Type','application/json','x-secreto',(select v from push_config where k='secreto')),
    body:=jsonb_build_object('tabla',tg_table_name,'id',new.id));
  return new;
exception when others then return new;
end $$;
drop trigger if exists push_aviso on public.avisos;
create trigger push_aviso after insert on public.avisos for each row execute function public.push_disparar();
drop trigger if exists push_visita on public.visitas;
create trigger push_visita after insert on public.visitas for each row execute function public.push_disparar();

-- Cada media hora: el servidor mira si toca el aviso de las 12:00, 17:00 o 18:30 (hora de Madrid)
select cron.unschedule('push-horario') where exists (select 1 from cron.job where jobname='push-horario');
select cron.schedule('push-horario','*/30 * * * *', $c$select net.http_post(url:='https://uugzmmxucxrrmebfggrk.supabase.co/functions/v1/push',headers:=jsonb_build_object('Content-Type','application/json','x-secreto',(select v from public.push_config where k='secreto')),body:='{"tabla":"horario"}'::jsonb)$c$);

-- Botón «Hecho» en avisos: el upsert del CRM pasa por la regla de crear; se permite si el aviso ya existe
drop policy if exists crear on public.avisos;
create policy crear on public.avisos for insert with check (mi_nombre() is not null and (de = mi_nombre() or exists (select 1 from public.avisos a where a.id = avisos.id)));
