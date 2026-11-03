create table respaldo.contactos_20261103_antes_enlace_blanca as select * from public.contactos;
create table respaldo.censo_edits_20261103_antes_enlace_blanca as select * from public.censo_edits;
with m(cid_noticia, cid, u) as (values
('ros-val-0102','blanca-00.36.48','{"rc": "9415604VK2691N0049SZ", "esc": "3", "planta": "1", "puerta": "B", "m2": "133", "anio": "1997"}'::jsonb),
('azu-not-0204','blanca-00.38.16','{"rc": "9415603VK2691N0017EZ", "esc": "1", "planta": "3", "puerta": "C", "m2": "109", "anio": "1997"}'::jsonb),
('nar-not-0053','blanca-00.94.27','{"rc": "9117101VK2691N0040DS", "esc": "1", "planta": "7", "puerta": "D", "m2": "125", "anio": "1997"}'::jsonb),
('nar-val-0028','blanca-00.96.0','{"rc": "9021208VK2692S0001BP", "esc": "T", "planta": "OD", "puerta": "OS", "m2": "210", "anio": "1997"}'::jsonb),
('azu-seg-0187','blanca-00.169.33','{"rc": "9310302VK2691S0098XJ", "esc": "1", "planta": "9", "puerta": "B", "m2": "101", "anio": "2000"}'::jsonb),
('azu-val-0155','blanca-00.168.20','{"rc": "9310302VK2691S0053SU", "esc": "1", "planta": "6", "puerta": "A", "m2": "101", "anio": "2000"}'::jsonb),
('nar-val-0003','blanca-00.223.5','{"rc": "2802502VK3620S0009LF", "esc": "1", "planta": "2", "puerta": "C", "m2": "82", "anio": "1973"}'::jsonb),
('nar-val-0027','blanca-01.45.6','{"rc": "9131002VK2693S0078KF", "esc": "3", "planta": "2", "puerta": "C", "m2": "155", "anio": "1998"}'::jsonb),
('nar-val-0005','blanca-01.45.21','{"rc": "9131002VK2693S0093RM", "esc": "3", "planta": "6", "puerta": "B", "m2": "151", "anio": "1998"}'::jsonb),
('nar-not-0073','blanca-01.45.20','{"rc": "9131002VK2693S0092EX", "esc": "3", "planta": "6", "puerta": "A", "m2": "125", "anio": "1998"}'::jsonb),
('nar-val-0034','blanca-02.5.1','{"rc": "9031802VK2683S0006UT", "esc": "1", "planta": "1", "puerta": "B", "m2": "83", "anio": "1979"}'::jsonb),
('nar-val-0030','blanca-02.15.20','{"rc": "8832403VK2683S0021YF", "esc": "1", "planta": "6", "puerta": "A", "m2": "89", "anio": "1975"}'::jsonb),
('nar-not-0076','blanca-01.51.19','{"rc": "9031202VK2693S0020FJ", "esc": "1", "planta": "5", "puerta": "A", "m2": "94", "anio": "1980"}'::jsonb),
('azu-seg-0179','blanca-01.10.4','{"rc": "9409001VK2690N0071TJ", "esc": "1", "planta": "2", "puerta": "A", "m2": "107", "anio": "1978"}'::jsonb),
('azu-not-0198','blanca-01.35.40','{"rc": "9415001VK2691S0041XZ", "esc": "1", "planta": "11", "puerta": "B", "m2": "117", "anio": "1994"}'::jsonb),
('azu-seg-0172','blanca-01.42.3','{"rc": "9310401VK2690N0172MZ", "esc": "4", "planta": "1", "puerta": "D", "m2": "59", "anio": "1990"}'::jsonb),
('azu-val-0159','blanca-01.1.25','{"rc": "9308104VK2690N0026OP", "esc": "1", "planta": "7", "puerta": "B", "m2": "83", "anio": "1977"}'::jsonb),
('azu-not-0202','blanca-01.10.27','{"rc": "9409001VK2690N0094XA", "esc": "1", "planta": "7", "puerta": "D", "m2": "107", "anio": "1978"}'::jsonb),
('azu-seg-0171','blanca-01.30.29','{"rc": "9410701VK2690N0041WL", "esc": "1", "planta": "8", "puerta": "B", "m2": "96", "anio": "1989"}'::jsonb),
('azu-seg-0189','blanca-01.33.1','{"rc": "9310401VK2690N0012QX", "esc": "1", "planta": "1", "puerta": "B", "m2": "58", "anio": "1990"}'::jsonb),
('azu-not-0203','blanca-01.39.3','{"rc": "9410701VK2690N0123HP", "esc": "3", "planta": "1", "puerta": "D", "m2": "65", "anio": "1989"}'::jsonb),
('azu-not-0209','blanca-01.39.1','{"rc": "9410701VK2690N0121FI", "esc": "3", "planta": "1", "puerta": "B", "m2": "65", "anio": "1989"}'::jsonb),
('azu-not-0208','blanca-01.39.11','{"rc": "9410701VK2690N0131ZG", "esc": "3", "planta": "3", "puerta": "D", "m2": "97", "anio": "1989"}'::jsonb),
('azu-not-0210','blanca-01.5.18','{"rc": "9309501VK2690N0081JQ", "esc": "3", "planta": "5", "puerta": "C", "m2": "85", "anio": "1978"}'::jsonb),
('nar-not-0087','blanca-00.276.0','{"rc": "9018601VK2691N0002BO", "esc": "2", "planta": "0", "puerta": "2", "m2": "154", "anio": "1997"}'::jsonb)),
upd as (update public.contactos c set d = c.d || jsonb_build_object('censoId', m.cid)
  from m where c.id = m.cid_noticia and coalesce(c.d->>'censoId','') = '' returning c.id, c.d, m.cid, m.u),
ed as (insert into public.censo_edits (id, zona, d)
  select cid, 'BLANCA', u || jsonb_strip_nulls(jsonb_build_object(
     'prop', nullif(nullif(trim(replace(coalesce(d->>'nombre',''),' [DNI]','')),''),'-'),
     'tel', nullif(trim(coalesce(d->>'telefono','')),''),
     'noticia', true,
     'historial', jsonb_build_array(jsonb_build_object('f', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'n', 'Datos copiados desde su noticia.')),
     'actualizado', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
  from upd on conflict (id) do nothing returning id)
select (select count(*) from upd) noticias, (select count(*) from ed) viviendas;