/* ---------- base de datos: Supabase (cada asesor solo recibe lo suyo; lo filtra el servidor) ---------- */
const SB_URL="https://uugzmmxucxrrmebfggrk.supabase.co",SB_KEY="sb_publishable_4fNBmWrSnvN2dIzZ4a1sfA_VcBvY9lw";
const sb=window.supabase?window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const TABLA={contactos:"contactos",captaciones:"captaciones",encargos:"encargos",operaciones:"operaciones",censo:"censo",censoEdits:"censo_edits",portales:"portales",borrados:"borrados"};
const DOCS={"ajustes/general":"general","zonas/indice":"zonas_indice"};
const nuevoId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
function fila(t,id,d){const r={id,d};if(t==="censo")r.zona=d.zona;if(t==="censo_edits"||t==="portales")r.zona=id.split("-")[0].toUpperCase();return r}
function fallo(error){const e=new Error(error.message||"error");e.code=error.code==="42501"?"sin_permiso":error.code;return e}
async function leerTabla(t,filtro){let out=[];for(let from=0;;from+=500){let q=sb.from(t).select("id,d").range(from,from+499);if(filtro)q=filtro(q);const {data,error}=await q;if(error)throw fallo(error);out=out.concat(data);if(data.length<500)break}return out}
const snapCol=rows=>({docs:rows.map(r=>({id:r.id,data:()=>r.d}))});
const snapDoc=r=>({exists:!!r,data:()=>r?r.d:undefined});
function enVivo(t,recargar){let tm=null;sb.channel("rt-"+t+"-"+nuevoId()).on("postgres_changes",{event:"*",schema:"public",table:t},()=>{clearTimeout(tm);tm=setTimeout(recargar,400)}).subscribe()}
function coleccion(nombre){
  const t=TABLA[nombre];
  const api={
    limit(){return api},
    async get(){return snapCol(await leerTabla(t))},
    onSnapshot(cb,err){const go=()=>leerTabla(t).then(r=>cb(snapCol(r))).catch(e=>err&&err(e));go();enVivo(t,go);return()=>{}},
    doc(id){id=id||nuevoId();return{id,
      async set(d){const {error}=await sb.from(t).upsert(fila(t,id,d));if(error)throw fallo(error)},
      async delete(){const {error}=await sb.from(t).delete().eq("id",id);if(error)throw fallo(error)}}}
  };return api}
function documento(ruta){
  const id=DOCS[ruta];
  const leer=async()=>{const {data,error}=await sb.from("ajustes").select("id,d").eq("id",id).maybeSingle();if(error)throw fallo(error);return data};
  return{onSnapshot(cb,err){const go=()=>leer().then(r=>cb(snapDoc(r))).catch(e=>err&&err(e));go();enVivo("ajustes",go);return()=>{}},
    async set(d){const {error}=await sb.from("ajustes").upsert({id,d});if(error)throw fallo(error)}}}
const dbSupabase={collection:coleccion,doc:documento};

/* ---------- quién soy ---------- */
const esResp=()=>S.yo&&S.yo.rol==="responsable";
function ajustarPorRol(){
  $("#yo-nombre").textContent=S.yo?S.yo.nombre:"";
  const eq=document.querySelector('#tabs [data-v="equipo"]');if(eq)eq.hidden=!esResp();
  if(!esResp()&&S.view==="equipo")S.view="hoy";
  if(!esResp())S.f.asesor="";
}
const _render=render;
render=function(){_render();if(!S.yo)return;
  if(!esResp()){const b=$("#btn-ajustes");if(b)b.closest("section").remove();$("#btn-new").hidden=S.view==="operaciones"}
  else if(S.view==="equipo"&&!$("#accesos")){$("#view").insertAdjacentHTML("beforeend",`<section id="accesos"><h2>Accesos</h2><div class="list" id="acc-list"><div class="empty">Cargando…</div></div></section>`);
    sb.rpc("accesos").then(({data,error})=>{const L=$("#acc-list");if(!L)return;if(error){L.innerHTML=`<div class="empty">No se han podido cargar los accesos</div>`;return}
      const hace=t=>{if(!t)return"Nunca ha entrado";const m=Math.round((Date.now()-new Date(t))/60000);return m<1?"Ahora mismo":m<60?`hace ${m} min`:m<1440?`hace ${Math.round(m/60)} h`:`hace ${Math.round(m/1440)} d`};
      L.innerHTML=data.map(a=>`<div class="row"><span class="t">${esc(a.nombre)}</span><span class="r"><span class="pill ${a.ultimo_acceso?(Date.now()-new Date(a.ultimo_acceso)>3*864e5?"warn":"ok"):"bad"}">${esc(hace(a.ultimo_acceso))}</span></span><span class="m"><span>${a.zona?zona(a.zona):"Responsable"}</span><span>${esc(a.email)}</span>${a.ultimo_acceso?`<span>Último acceso ${fmtFH(a.ultimo_acceso)}</span>`:""}</span></div>`).join("")})}
  if(esResp()&&S.view==="equipo"&&!$("#btn-importar")){$("#view").insertAdjacentHTML("beforeend",`<section><h2>Pasar datos al CRM del equipo</h2><p style="margin:0 0 8px;color:var(--muted);font-size:13px">Sube el archivo de datos que te ha preparado Claude. Si una ficha ya existe, se sustituye por la del archivo; no se duplica nada.</p><div class="tools"><input type="file" id="imp-file" accept=".json,application/json"><button class="btn" type="button" id="btn-importar">Importar</button></div><p id="imp-msg" style="color:var(--muted);font-size:13px"></p></section>`)}
};
const _abrir=abrir;
abrir=function(col,id){if(!esResp()&&col==="operaciones"&&!id){toast("Las operaciones las da de alta Stiwhar");return}
  _abrir(col,id);if(esResp())return;
  document.querySelectorAll('#frm [data-act="aOp"]').forEach(b=>b.remove());
  if(col==="operaciones"){document.querySelectorAll("#frm input,#frm select,#frm textarea").forEach(e=>e.disabled=true);
    const df=document.querySelector("#frm .df");if(df)df.innerHTML=`<span style="color:var(--muted);font-size:13px">Solo lectura: las operaciones las gestiona Stiwhar.</span><div class="right"><button class="btn" type="button" data-act="cerrar">Cerrar</button></div>`;
    const nn=$("#fld-nuevaNota");if(nn)nn.closest("label").remove();return}
  document.querySelectorAll('#frm [data-act="aprobarBorrar"],#frm [data-act="rechazarBorrar"]').forEach(b=>b.remove());
  const fa=$("#fld-asesor");if(fa&&fa.tagName==="SELECT"){if(![...fa.options].some(o=>o.value===S.yo.nombre))fa.add(new Option(S.yo.nombre,S.yo.nombre));fa.value=S.yo.nombre;fa.disabled=true}};

/* ---------- importar (solo responsable) ---------- */
async function importar(){
  const f=$("#imp-file").files[0],msg=$("#imp-msg");if(!f)return toast("Elige primero el archivo");
  let J;try{J=JSON.parse(await f.text())}catch(_){return toast("El archivo no es válido")}
  const trabajos=[];
  for(const [col,docs] of Object.entries(J)){
    if(col==="ajustes"||col==="zonas"){for(const [k,d] of Object.entries(docs))trabajos.push(["ajustes",{id:DOCS[col+"/"+k]||k,d}]);continue}
    const t=TABLA[col];if(!t)continue;for(const [id,d] of Object.entries(docs))trabajos.push([t,fila(t,id,d)]);
  }
  const porTabla={};trabajos.forEach(([t,r])=>(porTabla[t]=porTabla[t]||[]).push(r));
  let hechos=0;const total=trabajos.length;
  try{for(const [t,rows] of Object.entries(porTabla)){const lote=t==="censo"?4:200;
      for(let i=0;i<rows.length;i+=lote){const {error}=await sb.from(t).upsert(rows.slice(i,i+lote));if(error)throw fallo(error);hechos+=Math.min(lote,rows.length-i);msg.textContent=`Importando… ${hechos} de ${total}`}}
    msg.textContent=`Hecho: ${total} registros importados.`;S.censo=null;toast("Datos importados")}
  catch(e){msg.textContent=`Se ha parado en ${hechos} de ${total}: ${e.message}. Puedes volver a importar el mismo archivo sin duplicar nada.`}
}

/* ---------- acceso ---------- */
function verLogin(texto){$("#login").hidden=false;$("#l-msg").textContent=texto||""}
const tradErr=e=>{const m=(e&&e.message)||"";if(e&&(e.status===429||/rate limit|seconds/i.test(m)))return "Demasiados intentos seguidos. Espera un rato y prueba una sola vez.";
  if(/Invalid login credentials/i.test(m))return "Email o contraseña incorrectos. Si es tu primera vez, pulsa «Es mi primera vez».";
  if(/already registered|already exists/i.test(m))return "Ese email ya tiene cuenta. Entra con tu contraseña o, si nunca la pusiste, pide el enlace de «He olvidado la contraseña».";
  if(/Email not confirmed/i.test(m))return "Falta confirmar tu email: abre el correo que te ha llegado y vuelve a entrar.";
  if(/Password should be|at least/i.test(m))return "La contraseña debe tener al menos 8 caracteres.";
  return "No se ha podido: "+m};
let modoAlta=false;
$("#l-modo").addEventListener("click",()=>{modoAlta=!modoAlta;$("#l-pass2").hidden=!modoAlta;$("#l-pass").autocomplete=modoAlta?"new-password":"current-password";
  $("#l-entrar").textContent=modoAlta?"Crear mi contraseña y entrar":"Entrar";$("#l-modo").textContent=modoAlta?"Ya tengo contraseña: entrar":"Es mi primera vez: crear mi contraseña";
  $("#l-intro").textContent=modoAlta?"Pon tu email de trabajo y elige una contraseña (mínimo 8 caracteres).":"Entra con tu email y tu contraseña.";verLogin("")});
$("#l-entrar").addEventListener("click",async()=>{
  const email=$("#l-email").value.trim().toLowerCase(),pass=$("#l-pass").value;if(!/^\S+@\S+\.\S+$/.test(email))return verLogin("Escribe un email válido.");
  if(pass.length<8)return verLogin("La contraseña debe tener al menos 8 caracteres.");
  if(modoAlta&&pass!==$("#l-pass2").value)return verLogin("Las dos contraseñas no coinciden.");
  $("#l-entrar").disabled=true;
  const r=modoAlta?await sb.auth.signUp({email,password:pass,options:{emailRedirectTo:location.origin+location.pathname}}):await sb.auth.signInWithPassword({email,password:pass});
  $("#l-entrar").disabled=false;
  if(r.error)return verLogin(tradErr(r.error));
  if(modoAlta&&!r.data.session)return verLogin("Te hemos mandado un correo para confirmar tu email. Ábrelo y luego entra con tu contraseña.");
});
$("#l-pass").addEventListener("keydown",e=>{if(e.key==="Enter"&&!modoAlta)$("#l-entrar").click()});
$("#l-pass2").addEventListener("keydown",e=>{if(e.key==="Enter")$("#l-entrar").click()});
$("#l-enviar").addEventListener("click",async()=>{
  const email=$("#l-email").value.trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))return verLogin("Escribe primero tu email.");
  $("#l-enviar").disabled=true;
  const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname,shouldCreateUser:false}});
  $("#l-enviar").disabled=false;
  verLogin(error?tradErr(error):"Te hemos enviado un enlace a "+email+". Ábrelo en este dispositivo y, ya dentro, pon una contraseña nueva en «Contraseña».");
});
$("#btn-pass").addEventListener("click",()=>{cur={col:"__pass"};
  $("#frm").innerHTML=`<div class="dh">Cambiar mi contraseña</div><div class="db"><label class="full">Contraseña nueva (mínimo 8 caracteres)<input id="np1" type="password" autocomplete="new-password"></label><label class="full">Repítela<input id="np2" type="password" autocomplete="new-password"></label></div>
    <div class="df"><div class="right"><button class="btn" type="button" data-act="cerrar">Cancelar</button><button class="btn primary" type="button" id="np-ok">Guardar</button></div></div>`;
  $("#dlg").showModal();
  $("#np-ok").onclick=async()=>{const a=$("#np1").value,b=$("#np2").value;if(a.length<8)return toast("Mínimo 8 caracteres");if(a!==b)return toast("No coinciden");
    const {error}=await sb.auth.updateUser({password:a});if(error)return toast(tradErr(error));$("#dlg").close();toast("Contraseña guardada")}});
$("#btn-salir").addEventListener("click",async()=>{await sb.auth.signOut();location.reload()});
$("#view").addEventListener("click",e=>{if(e.target.id==="btn-importar")importar()});

let arrancado=false;
async function arrancar(sesion){
  if(arrancado)return;
  const {data:yo,error}=await sb.from("perfiles").select("nombre,rol,zona").eq("id",sesion.user.id).maybeSingle();
  if(error||!yo||yo.activo===false){verLogin("Tu email ("+sesion.user.email+") no está dado de alta en el CRM. Pídele a Stiwhar que te añada.");$("#l-paso1").hidden=true;
    if(!$("#l-otro")){$("#l-msg").insertAdjacentHTML("afterend",'<button class="btn" type="button" id="l-otro">Entrar con otro email</button>');$("#l-otro").onclick=async()=>{await sb.auth.signOut();location.reload()}}return}
  arrancado=true;$("#login").hidden=true;S.yo=yo;ajustarPorRol();
  const db=dbSupabase;S.dbIntentado=true;S.db=db;
  for(const col of ["contactos","encargos","operaciones","captaciones"]){
    db.collection(col).limit(1000).onSnapshot(s=>{S[col]=s.docs.map(d=>{const o={id:d.id,...d.data()};if(ETAPA_ANTIGUA[o.etapa])o.etapa=ETAPA_ANTIGUA[o.etapa];return o});if(!$("#dlg").open)render()},()=>{});
  }
  db.doc("zonas/indice").onSnapshot(s=>{if(!s.exists)return;const d=s.data(),I={};for(const [c,v] of Object.entries(d.calles||{})){const P={};for(const t of String(v).split(",")){const m=t.match(/^(\d+[A-Z]?)([A-Z])$/);if(m)P[m[1]]=(d.codigos||{})[m[2]]||""}I[c]=P}S.zidx=I},()=>{});
  db.doc("ajustes/general").onSnapshot(s=>{S.ajustes=s.exists?{...DEF_AJUSTES,...s.data()}:DEF_AJUSTES;render()},()=>{});
  render();
}
(async()=>{
  if(!sb){S.dbIntentado=true;return render()}
  sb.auth.onAuthStateChange((ev,sesion)=>{if(sesion)arrancar(sesion)});
  const {data:{session}}=await sb.auth.getSession();
  if(session)arrancar(session);else verLogin("");
})();