-- Recordatorios de llamada con hora (Stiwhar, 05/11/2026)
-- Cada asesor se pone en una ficha a qué hora tiene que llamar. Se guardan en «avisos» (tipo «Recordatorio», de = para),
-- con d.cuando = fecha y hora en ISO (UTC). Cada minuto, si hay alguno que ya toca y no se ha avisado,
-- se llama a la función «push», que manda la notificación y lo marca (d.avisado = d.cuando).
-- No hace falta tocar tablas ni permisos: los avisos que uno se pone a sí mismo ya los permiten las reglas de «avisos».
select cron.unschedule('push-recordatorios') where exists (select 1 from cron.job where jobname='push-recordatorios');
select cron.schedule('push-recordatorios','* * * * *', $c$
select net.http_post(
  url:='https://uugzmmxucxrrmebfggrk.supabase.co/functions/v1/push',
  headers:=jsonb_build_object('Content-Type','application/json','x-secreto',(select v from public.push_config where k='secreto')),
  body:='{"tabla":"recordatorios"}'::jsonb)
where exists (
  select 1 from public.avisos
  where d->>'tipo'='Recordatorio' and coalesce(d->>'hecho','')=''
    and d->>'cuando' <= to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    and d->>'cuando' >= to_char((now() - interval '12 hours') at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    and coalesce(d->>'avisado','') <> d->>'cuando')
$c$);
