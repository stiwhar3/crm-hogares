-- Rol coordinador (Daniel): compradores, visitas, captaciones de todas las zonas,
-- encargos de todos (leer y editar), operaciones de todos (solo leer). No ve noticias ni censo.
alter table public.perfiles drop constraint perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check check (rol = any (array['responsable','asesor','coordinador']));
alter table public.invitados drop constraint invitados_rol_check;
alter table public.invitados add constraint invitados_rol_check check (rol = any (array['responsable','asesor','coordinador']));

create or replace function public.es_coordinador() returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists(select 1 from public.perfiles where id = auth.uid() and rol = 'coordinador' and activo) $$;
create or replace function public.ve_todo() returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists(select 1 from public.perfiles where id = auth.uid() and rol in ('responsable','coordinador') and activo) $$;

-- Captaciones: todas, crear y editar (borrar sigue siendo solo de Stiwhar, con solicitud)
alter policy leer on public.captaciones using (ve_todo() or asesor = mi_nombre());
alter policy crear on public.captaciones with check (ve_todo() or asesor = mi_nombre());
alter policy editar on public.captaciones using (ve_todo() or asesor = mi_nombre()) with check (ve_todo() or asesor = mi_nombre());
-- Encargos: todos, leer y editar (datos para atender llamadas de compradores)
alter policy leer on public.encargos using (ve_todo() or asesor = mi_nombre());
alter policy editar on public.encargos using (ve_todo() or asesor = mi_nombre()) with check (ve_todo() or asesor = mi_nombre());
-- Operaciones: todas, solo leer
alter policy leer on public.operaciones using (ve_todo() or asesor = mi_nombre());

-- Noticias: el coordinador no las ve, pero puede crear una para un asesor (llamada de un vendedor o captación)
create or replace function public.crear_noticia(p_id text, p_d jsonb) returns text language plpgsql security definer set search_path = 'public' as $$
begin
  if not (es_coordinador() or es_responsable()) then raise exception 'sin permiso' using errcode = '42501'; end if;
  insert into public.contactos(id, d) values (p_id, p_d) on conflict (id) do nothing;
  return p_id;
end $$;
revoke all on function public.crear_noticia(text, jsonb) from public, anon;
grant execute on function public.crear_noticia(text, jsonb) to authenticated;

-- Compradores y visitas
create table public.compradores (
  id text primary key default (gen_random_uuid())::text,
  d jsonb not null default '{}'::jsonb,
  creado timestamptz default now(), actualizado timestamptz default now());
create table public.visitas (
  id text primary key default (gen_random_uuid())::text,
  d jsonb not null default '{}'::jsonb,
  asesor text generated always as (coalesce(d->>'asesor','')) stored,
  creado timestamptz default now(), actualizado timestamptz default now());
alter table public.compradores enable row level security;
alter table public.visitas enable row level security;
create policy leer on public.compradores for select using (ve_todo());
create policy crear on public.compradores for insert with check (ve_todo());
create policy editar on public.compradores for update using (ve_todo()) with check (ve_todo());
create policy borrar on public.compradores for delete using (es_responsable());
-- El asesor del encargo ve (y puede apuntar) las visitas de sus encargos
create policy leer on public.visitas for select using (ve_todo() or asesor = mi_nombre());
create policy crear on public.visitas for insert with check (ve_todo() or asesor = mi_nombre());
create policy editar on public.visitas for update using (ve_todo() or asesor = mi_nombre()) with check (ve_todo() or asesor = mi_nombre());
create policy borrar on public.visitas for delete using (es_responsable());
create trigger auditar after insert or update or delete on public.compradores for each row execute function public.auditar();
create trigger auditar after insert or update or delete on public.visitas for each row execute function public.auditar();
create trigger marcar_actualizado before insert or update on public.compradores for each row execute function public.marcar_actualizado();
create trigger marcar_actualizado before insert or update on public.visitas for each row execute function public.marcar_actualizado();
alter publication supabase_realtime add table public.compradores, public.visitas;

-- La copia diaria incluye compradores y visitas
create or replace function public.hacer_copia() returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  d jsonb;
  ultima_censo timestamptz;
begin
  -- Solo se guardan los últimos 3 meses de copias (decidido por Stiwhar, 31/10/2026).
  delete from public.copias where fecha < ((now() at time zone 'Europe/Madrid')::date - interval '3 months');
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
  -- El censo solo se copia si cambió o si ya no queda ninguna copia que lo tenga (tras borrar las antiguas).
  select max(actualizado) into ultima_censo from public.censo;
  if not exists (select 1 from public.copias c where c.datos ? 'censo' and c.hecha >= ultima_censo) then
    d := d || jsonb_build_object('censo', (select coalesce(jsonb_object_agg(id, t.d), '{}') from public.censo t));
  end if;
  insert into public.copias(fecha, datos) values ((now() at time zone 'Europe/Madrid')::date, d)
  on conflict (fecha) do update set datos = excluded.datos || (case when public.copias.datos ? 'censo' and not excluded.datos ? 'censo' then jsonb_build_object('censo', public.copias.datos->'censo') else '{}'::jsonb end), hecha = now();
end $function$;

-- crear_noticia sin duplicar (misma captación o misma dirección)
create or replace function public.crear_noticia(p_id text, p_d jsonb) returns text language plpgsql security definer set search_path = 'public' as $$
declare v text;
begin
  if not (es_coordinador() or es_responsable()) then raise exception 'sin permiso' using errcode = '42501'; end if;
  select id into v from public.contactos
   where (coalesce(p_d->>'capId','') <> '' and d->>'capId' = p_d->>'capId')
      or (coalesce(p_d->>'direccion','') <> '' and upper(regexp_replace(d->>'direccion','[^A-Za-z0-9]','','g')) = upper(regexp_replace(p_d->>'direccion','[^A-Za-z0-9]','','g')))
   limit 1;
  if found then return v; end if;
  insert into public.contactos(id, d) values (p_id, p_d) on conflict (id) do nothing;
  return p_id;
end $$;
