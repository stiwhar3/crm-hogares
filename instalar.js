// Instalar el CRM como app: registra el service worker y ofrece un aviso para instalarla
// (botón en Android/Chrome; instrucciones en iPhone/iPad, donde Safari no tiene botón).
(function(){
  if('serviceWorker' in navigator) addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
  var instalada=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  if(instalada||localStorage.getItem('crm-instalar-no')) return;
  var ua=navigator.userAgent, ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
  var aviso=null, prompt=null;
  function mostrar(html,boton){
    if(aviso) aviso.remove();
    aviso=document.createElement('div');
    aviso.setAttribute('role','dialog');aviso.setAttribute('aria-label','Instalar la app');
    aviso.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:50;max-width:440px;margin:0 auto;background:#333130;color:#fff;padding:12px 14px;display:flex;gap:10px;align-items:center;font:14px/1.4 Roboto,system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)';
    aviso.innerHTML='<img src="icono-192.png" alt="" width="40" height="40"><div style="flex:1">'+html+'</div>'+(boton?'<button type="button" data-i style="background:#ac9465;color:#fff;border:0;padding:8px 12px;font:inherit;font-weight:500;cursor:pointer">Instalar</button>':'')+'<button type="button" data-x aria-label="Cerrar" style="background:none;border:0;color:#d6d2ca;font-size:20px;cursor:pointer;padding:4px">×</button>';
    aviso.querySelector('[data-x]').onclick=function(){localStorage.setItem('crm-instalar-no','1');aviso.remove()};
    var b=aviso.querySelector('[data-i]');
    if(b) b.onclick=function(){prompt.prompt();prompt.userChoice.finally(function(){aviso.remove();prompt=null})};
    document.body.appendChild(aviso);
  }
  addEventListener('beforeinstallprompt',function(e){e.preventDefault();prompt=e;mostrar('<b>Instala el CRM</b><br>Ábrelo como una app, con su icono.',true)});
  addEventListener('appinstalled',function(){if(aviso)aviso.remove()});
  if(ios) addEventListener('load',function(){mostrar('<b>Instala el CRM en tu iPhone</b><br>Pulsa <b>Compartir</b> y luego <b>«Añadir a pantalla de inicio»</b>.',false)});
})();
