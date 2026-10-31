import re,sys
src=open('/mnt/project-files/crm/crm.html',encoding='utf-8').read()
def rep(old,new,count=1):
    global src
    n=src.count(old)
    assert n>=1, ("no encontrado", old[:80])
    if count==1: assert n==1, ("repetido",n,old[:80])
    src=src.replace(old,new)

# 1) supabase + pantalla de acceso
rep('<header>', '''<div id="login" class="login" hidden>
  <div class="lbox">
    <h1>Hogares Fuenlabrada <small>CRM</small></h1>
    <div id="l-paso1">
      <p id="l-intro">Entra con tu email y tu contraseña.</p>
      <input id="l-email" type="email" autocomplete="email" placeholder="tu@email.com">
      <input id="l-pass" type="password" autocomplete="current-password" placeholder="Contraseña">
      <input id="l-pass2" type="password" autocomplete="new-password" placeholder="Repite la contraseña" hidden>
      <button class="btn primary" type="button" id="l-entrar">Entrar</button>
      <button class="lnk" type="button" id="l-modo">Es mi primera vez: crear mi contraseña</button>
      <button class="lnk" type="button" id="l-enviar">He olvidado la contraseña: mandarme un enlace</button>
    </div>
    <p id="l-msg" class="lmsg"></p>
  </div>
</div>
<header>''')
rep('<button class="btn primary small" id="btn-new" type="button">+ Nuevo</button>',
    '<span class="yo"><span id="yo-nombre"></span><button class="btn small" id="btn-pass" type="button">Contraseña</button><button class="btn small" id="btn-salir" type="button">Salir</button></span><button class="btn primary small" id="btn-new" type="button">+ Nuevo</button>')
rep('</head>' if '</head>' in src else '<style>', ('<link rel="manifest" href="manifest.json"><link rel="apple-touch-icon" href="icono-180.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="theme-color" content="#333130">'+('</head>' if '</head>' in src else '<style>')))
rep('</style>', '''/* Estilo de hogaresgroup.es: cabecera antracita, dorado #ac9465, titulares con serifa, botones y cajas rectos */
:root{--bg:#f7f6f4;--surface:#ffffff;--fg:#333130;--muted:#706e6a;--line:#e4e1dd;--accent:#8a7346;--accent-soft:#f3eee4;--on-accent:#ffffff;--oro:#ac9465;--antracita:#333130;
  --display:"Playfair Display",Georgia,"Times New Roman",serif;--body:"Roboto",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1b1a19;--surface:#242321;--fg:#ebe8e3;--muted:#a6a29b;--line:#3a3835;--accent:#c9b282;--accent-soft:#332d22;--on-accent:#1b1a19;--oro:#ac9465;--antracita:#2a2826}}
:root[data-theme="dark"]{--bg:#1b1a19;--surface:#242321;--fg:#ebe8e3;--muted:#a6a29b;--line:#3a3835;--accent:#c9b282;--accent-soft:#332d22;--on-accent:#1b1a19;--oro:#ac9465;--antracita:#2a2826}
body{margin:0}
body::before{background:var(--antracita)}
header{background:var(--antracita);border-bottom:0;color:#fff}
h1{font-family:var(--body);font-weight:700;text-transform:uppercase;letter-spacing:.02em;color:var(--oro);font-size:22px;display:flex;align-items:center;gap:10px}
h1 small{color:#bdb8af;text-transform:none;letter-spacing:0;font-weight:400;margin-left:0}
h1::before{content:"";width:57px;height:22px;background:url(logo-casa.png) center/contain no-repeat}
#login .lbox h1{flex-direction:column;align-items:flex-start;font-size:30px;gap:6px}
#login .lbox h1::before{width:88px;height:34px}
.yo{color:#bdb8af}
header .btn{border-radius:0;background:transparent;border-color:#5a5651;color:#fff}
header .btn.primary,.btn.primary{background:var(--oro);border-color:var(--oro);color:#fff}
nav button{color:#d6d2ca;border-radius:0;border-bottom:2px solid transparent}
nav button[aria-current="true"]{background:none;color:var(--oro);border-bottom-color:var(--oro)}
nav button:hover{color:#fff}
h2,.dh,.kpi .v{font-family:var(--display);font-weight:600}
h2{font-size:21px;letter-spacing:0}
.lbox h1{color:var(--oro)} #login.login{background:var(--antracita)} .lbox p,.lmsg{color:#d6d2ca}
#login .lbox input{border-radius:0;border-color:#5a5651;background:#fff;color:#333130} #login .lbox p,#login .lmsg{color:#d6d2ca}
.btn,.chip,.kpi,.list,.tbl-wrap,.banner,.modal form,.tools input,.tools select,.db input,.db select,.db textarea,.lbox input,.bar,.bar i{border-radius:0}
.pill{border-radius:2px}
.tools input,.tools select,.db input,.db select,.db textarea{border-color:#cccccc}
.db input,.db select,.db textarea{background:var(--surface)}
.chip[aria-pressed="true"]{background:var(--oro);border-color:var(--oro);color:#fff}
.chip[aria-pressed="true"] span{color:#fff}
.bar i{background:var(--oro)}
.btn{font-weight:500}
.login{position:fixed;inset:0;background:var(--bg);z-index:30;display:flex;align-items:center;justify-content:center;padding:16px}
.login[hidden]{display:none}
.lbox{max-width:360px;width:100%;display:flex;flex-direction:column;gap:12px}
#l-paso1{display:flex;flex-direction:column;gap:12px}
.lnk{background:none;border:0;padding:2px 0;color:#d6d2ca;text-decoration:underline;font:inherit;font-size:14px;text-align:left;cursor:pointer}
.lbox h1{margin:0 0 4px}.lbox p{margin:0;color:var(--muted)}
.lbox input{font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)}
.lmsg{min-height:1.4em}
.yo{display:flex;gap:8px;align-items:center;margin-left:auto;margin-right:8px;font-size:13px;color:var(--muted)}
</style>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>''')

rep('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Instrument+Sans:wght@400;500;600&display=swap','https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Roboto:wght@400;500;700&display=swap')
rep('<h1>Hogares Fuenlabrada <small>CRM</small></h1>\n      <span class="yo">','<h1>Hogares <small>Fuenlabrada · CRM</small></h1>\n      <span class="yo">')
rep('<h1>Hogares Fuenlabrada <small>CRM</small></h1>\n    <div id="l-paso1">','<h1>Hogares <small>Fuenlabrada · CRM</small></h1>\n    <div id="l-paso1">')
# 2) textos que mencionaban claude.ai
rep('Esta vista no tiene acceso a la base de datos, así que no se puede guardar ni cargar nada. Ábrela en el navegador en claude.ai con tu sesión iniciada.',
    'No hay conexión con la base de datos. Revisa tu conexión a internet y recarga la página.')
rep('No se puede guardar fuera de claude.ai','Sin conexión: no se ha guardado',count=2)
rep('El censo se carga al abrir la página en claude.ai.','Sin conexión con la base de datos.',count=2)

# 3) arranque: Supabase en lugar de la base de datos de claude.ai
i=src.index('(async()=>{\n  const db=window.claude')
j=src.index('})();',i)+len('})();')
src=src[:i]+open('/mnt/project-files/crm/fuente/arranque.js',encoding='utf-8').read()+src[j:]
src='<!doctype html>\n<html lang="es">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+src.replace('<meta name="claude:viewport-fit-sides" content="cover">\n','')
open('/mnt/project-files/crm/equipo/index.html','w',encoding='utf-8').write(src)
print("ok",len(src))
