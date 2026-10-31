// Service worker del CRM: deja abrir la app sin cobertura (con la última versión guardada)
// y la actualiza sola en cuanto hay red. Los datos siempre vienen de Supabase, nunca de aquí.
const CACHE='crm-hogares-v1';
const BASICOS=['./','manifest.json','instalar.js','icono-180.png','icono-192.png','icono-512.png','logo-casa.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(BASICOS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request, u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin) return; // Supabase, Google, etc.: directo a la red
  // Primero la red (para tener siempre la versión nueva); si no hay, lo guardado.
  e.respondWith(fetch(r).then(resp=>{
    if(resp.ok){const copia=resp.clone();caches.open(CACHE).then(c=>c.put(r.mode==='navigate'?'./':r,copia))}
    return resp;
  }).catch(()=>caches.match(r.mode==='navigate'?'./':r,{ignoreSearch:r.mode==='navigate'})));
});
