# CRM Hogares Fuenlabrada

Web del equipo (noticias, captaciones, encargos, operaciones y censo). Se instala en el móvil desde el navegador ("Añadir a pantalla de inicio").

Los datos no están en este repositorio: viven en Supabase y cada usuario solo recibe lo que le corresponde (row-level security). Aquí solo hay la página y la clave pública del proyecto.

## Instalar como app

- **Android (Chrome):** al abrir la web sale un aviso «Instalar». También desde el menú ⋮ → «Instalar aplicación».
- **Android (APK):** descargar https://stiwhar3.github.io/crm-hogares/app/CRM-Hogares.apk y abrirlo (la primera vez el móvil pide permitir «instalar apps desconocidas»). El APK abre la misma web, así que las mejoras llegan sin reinstalarlo. El proyecto está en `android/` y se compila con GitHub Actions; la firma se hace fuera del repositorio.
- **iPhone/iPad (Safari):** Compartir → «Añadir a pantalla de inicio». La web muestra un aviso con estos pasos.

`sw.js` guarda la última versión de la página para que abra sin cobertura (los datos siguen viniendo de Supabase) y `instalar.js` lo registra y muestra el aviso. Al publicar una versión nueva no hay que tocar nada: la app se actualiza sola con la red.

`asset-links/.well-known/assetlinks.json` es una copia del archivo que tiene que estar en https://stiwhar3.github.io/.well-known/assetlinks.json (repositorio `stiwhar3.github.io`) para que el APK se abra sin la barra de dirección.
