// Service worker del CRM: deja abrir la app sin cobertura (con la última versión guardada)
// y la actualiza sola en cuanto hay red. Los datos siempre vienen de Supabase, nunca de aquí.
const CACHE='crm-hogares-v2';
const BASICOS=['./','manifest.json','instalar.js','icono-180.png','icono-192.png','icono-512.png','logo-casa.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(BASICOS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request, u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin) return; // Supabase, Google, etc.: directo a la red
  if(u.pathname.endsWith('.mp4')) return; // vídeos de tutoriales: directos a la red, sin guardar
  if(u.pathname.endsWith('alta.html')) return; // formulario público de compradores: no se guarda en lugar de la app
  // Primero la red (para tener siempre la versión nueva); si no hay, lo guardado.
  e.respondWith(fetch(r).then(resp=>{
    if(resp.ok){const copia=resp.clone();caches.open(CACHE).then(c=>c.put(r.mode==='navigate'?'./':r,copia))}
    return resp;
  }).catch(()=>caches.match(r.mode==='navigate'?'./':r,{ignoreSearch:r.mode==='navigate'})));
});

// Notificaciones push: llegan del servidor aunque el CRM esté cerrado.
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(_){d={title:'CRM Hogares',body:e.data?e.data.text():''}}
  e.waitUntil(self.registration.showNotification(d.title||'CRM Hogares',{body:d.body||'',tag:d.tag||undefined,icon:'icono-192.png',badge:'icono-192.png',data:{url:d.url||'./'}}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=new URL((e.notification.data&&e.notification.data.url)||'./',self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{
    for(const w of ws){if(w.url.startsWith(self.registration.scope)&&'focus' in w){w.navigate&&w.url!==url&&w.navigate(url).catch(()=>{});return w.focus()}}
    return self.clients.openWindow(url);
  }));
});
