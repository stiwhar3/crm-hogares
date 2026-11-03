# Censo sin color (zona BLANCA) · 03/11/2026

Stiwhar pasó dos Excel del Catastro (La Blanca y La Avanzada). Se compararon por referencia catastral con el censo:

- La Avanzada: 11.683 de 11.695 ya estaban. Faltaba Leganés 38 (12 viviendas).
- La Blanca: 9.786 de 13.575 ya estaban. Faltaban 3.787 viviendas.
- Descartadas: una parcela rústica sin calle y Gregorio Marañón 75 entero (ya están sus dos viviendas en zona Roja).

Total añadido: 3.799 viviendas en 355 portales, en `censo` como zona `BLANCA` (sin color, sin asesor), filas `blanca-00` a `blanca-02`. Solo las ve el responsable.
No se tocó el índice de zonas (`zonas/indice`), para que las noticias y captaciones que ya tienen zona no cambien al guardarlas.

`preparar.py` genera `nuevos_censo.json`; `cargar.sql` lo carga con pg_net.
