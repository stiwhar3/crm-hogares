# Contactos del censo: de «Comentarios» al historial (01/11/2026)

Pedido por Stiwhar: en el censo, los contactos con fecha que estaban en `com` pasan al `historial`
de la vivienda; `com` queda para lo reseñable (empadronados 2019, Bittools, buzón y notas sin fecha).

- Hecho con una función temporal de Supabase (`index.ts` + `parser.js`), ya desactivada.
- 1.467 viviendas del censo y 2 de `censo_edits`, 1.904 entradas `{f, d:1, n, deCenso:true}`.
- Notas por años («2016: M») → 1 de enero de ese año con la etiqueta «(Año 2016)».
- Copia previa: `respaldo.censo_20261101_antes_historial` y `respaldo.censo_edits_20261101_antes_historial`.
