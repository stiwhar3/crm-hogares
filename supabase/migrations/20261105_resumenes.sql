-- Resumen del día de los asesores (Stiwhar, 05/11/2026: «quiero que se me quede ese historial en el CRM hasta el cambio de mes").
-- Lo escribe la tarea programada de las 14:37 y las 21:37. Solo lo ve Stiwhar (responsable).
create table if not exists public.resumenes (
  id text primary key,
  d jsonb not null default '{}'::jsonb,
  creado timestamptz not null default now()
);
alter table public.resumenes enable row level security;
drop policy if exists leer on public.resumenes;
create policy leer on public.resumenes for select using (es_responsable());
drop policy if exists borrar on public.resumenes;
create policy borrar on public.resumenes for delete using (es_responsable());
grant select, delete on public.resumenes to authenticated;
revoke all on public.resumenes from anon;
-- Se guardan hasta que cambia el mes: el día 1 a las 00:05 (Madrid ≈ 23:05 UTC del día anterior, se usa 00:05 UTC del día 1) se borran los del mes anterior.
select cron.unschedule('limpiar-resumenes') where exists (select 1 from cron.job where jobname='limpiar-resumenes');
select cron.schedule('limpiar-resumenes','5 0 1 * *',
  $c$delete from public.resumenes where creado < date_trunc('month', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'$c$);
