# Contactos del censo: de «Comentarios» al historial (01/11/2026)

Pedido por Stiwhar: en el censo, los contactos con fecha que estaban en `com` pasan al `historial`
de la vivienda; `com` queda para lo reseñable (empadronados 2019, Bittools, buzón y notas sin fecha).

- Hecho con una función temporal de Supabase (`index.ts` + `parser.js`), ya desactivada.
- 1.467 viviendas del censo y 2 de `censo_edits`, 1.904 entradas `{f, d:1, n, deCenso:true}`.
- Notas por años («2016: M») → 1 de enero de ese año con la etiqueta «(Año 2016)».
- Copia previa: `respaldo.censo_20261101_antes_historial` y `respaldo.censo_edits_20261101_antes_historial`.

## Arreglo tras la revisión (01/11/2026, aprobado por Stiwhar)
Revisión contra la copia: ningún texto perdido ni otros campos tocados. Corregidos 36 pisos (`arreglo.js`, `arreglo_index.ts`):
contactos escritos detrás de los empadronados del censo 2019 (Callao 62 y otros), Orotava 14 y 16 (fechas internas)
y 6 casos sueltos con una palabra delante de la fecha. +41 entradas. Copia previa: `respaldo.censo_20261101_tras_historial`.
Sin tocar: Nicaragua 4 4º2 («22/10/36») y Bogotá 8 («29/29/26»), fechas imposibles.
