/* ---------- Varios propietarios / compradores por ficha (Stiwhar 05/11) ---------- */
/* Separa «ANA / LUIS» o «ISAAC Y SUSANA» en titulares y reparte los teléfonos que llevan nombre o inicial
   («E: 646… / G: 682…», «669…-PILAR», «2. 916…»). Lo que no se sabe de quién es se queda en el teléfono principal. */
const TIT_REL=/^(PADRES?|MADRE|HIJ[OA]S?|ESPOSA|ESPOSO|MARIDO|MUJER|NUERA|YERNO|PRIMO|PRIMA|HERMAN[OA]S?|INQU?ILIN[OA]|EX|PROP|SOBRIN[OA])$/i;
const TIT_NOTIT=/^(INMOBILIARIA|AGENCIA)$/i;
function titLimpia(s){return String(s||"").replace(/\[DNI\]/gi,"").replace(/\bDNI\s*:?\s*[A-Z0-9\[\].-]*/gi,"").replace(/\bCIF\s*:?\s*[A-Z0-9.-]+/gi,"")
  .replace(/\b[XYZ]-[\d.]*/g,"").replace(/\d[\d. ]{5,}-?[A-Z]?\b/g,m=>m).replace(/["“”]/g,"").replace(/\s+/g," ").trim()}
function titPartes(s){const P=[];let d=0,b="";for(const ch of s){if(ch==="(")d++;if(ch===")")d=Math.max(0,d-1);if(ch==="/"&&!d){P.push(b);b=""}else b+=ch}P.push(b);return P}
function titUno(p){let s=p.trim(),nota=[],tel="";
  s=s.replace(/^\d+\.\s*/,"");
  const m=s.match(/^(PADRES?|MADRE|HIJ[OA]S?|NTS(?: nuevo prop)?)\s*:\s*/i);if(m){if(!/^NTS/i.test(m[1]))nota.push(m[1].toLowerCase());s=s.slice(m[0].length)}
  s=s.replace(/\(([^)]*)\)/g,(_,x)=>{nota.push(x.trim());return " "});
  s=s.replace(/(?:\+?34)?[6789](?:[\s.]?\d){8}/g,x=>{tel=x.trim();return " "});
  s=s.replace(/\b\d[\d. ]{5,}-?[A-Z]?\b/g," ");
  let w=s.replace(/[:;,.\s-]+$/,"").replace(/^[:;,.\s-]+/,"").replace(/\s+/g," ").trim().split(" ");
  while(w.length>1&&TIT_REL.test(w[w.length-1].replace(/INQULINO/i,"INQUILINO"))){nota.unshift(w.pop().toLowerCase().replace("inqulino","inquilino"))}
  let nombre=w.join(" ").trim();
  if(TIT_REL.test(nombre)&&nota.length>1||TIT_REL.test(nombre)&&nota.length===1&&/[a-záéíóúñ]{3,}\s+[a-záéíóúñ]{3,}/i.test(nota[0])){const n0=nota.pop();nota.unshift(nombre);nombre=n0}
  return {nombre,telefono:tel,nota:nota.filter(Boolean).map(x=>x.toLowerCase()).join(", ")}}
function separarTitulares(nombre,tel){
  let s=titLimpia(nombre);if(!s)return null;
  s=s.replace(/^NTS(?: nuevo prop)?\s*:\s*/i,"");
  let P=titPartes(s).map(x=>x.trim()).filter(Boolean);
  /* «HIJOS (Melisa / Aarón)» */
  P=P.flatMap(p=>{const m=p.match(/^(HIJ[OA]S?|PADRES)\s*\(([^)]*\/[^)]*)\)\s*$/i);return m?m[2].split("/").map(x=>x.trim()+" ("+m[1].toLowerCase()+")"):[p]});
  P=P.flatMap(p=>/[A-ZÁÉÍÓÚÑa-z]{2,}\s+-\s+[A-ZÁÉÍÓÚÑa-z]{2,}/.test(p)&&!/\d/.test(p)?p.split(/\s+-\s+/):[p]);
  if(P.length===1&&!/\d/.test(P[0])&&!/\b(S\.?L\.?U?|S\.?A\.?)\b/i.test(P[0])){const y=P[0].split(/\s+[YE]\s+/i);if(y.length===2&&P[0].split(/\s+/).length<=7&&y.every(x=>/^[A-ZÁÉÍÓÚÑÜa-záéíóúñüª. ]{2,}$/.test(x.trim())))P=y}
  let T=P.map(titUno).filter(t=>(t.nombre.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/g)||[]).length>=2);
  T=T.filter((t,i)=>{if(i&&TIT_NOTIT.test(t.nombre)){T[i-1].nota=[T[i-1].nota,t.nombre.toLowerCase()].filter(Boolean).join(", ");return false}return true});
  if(T.length<2)return null;
  /* Teléfonos */
  const numerados=/^\s*1\.\s/.test(String(nombre||""));
  const norm=x=>String(x||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase();
  const RTEL=/(?:\+?34)?[6789](?:[\s.]?\d){8}/g;
  const trozos=String(tel||"").replace(/\b([nN])\/([cCeE])\b/g,"$1\u2044$2").split("/").map(x=>x.trim().replace(/\u2044/g,"/")).filter(Boolean);
  const sinAsignar=[],asig=T.map(()=>[]);
  const quien=lab=>{const L=norm(lab).replace(/[^A-Z0-9 ]/g," ").replace(/\b(TLF|TEL|TELEFONO|NC|NE|N|E|C|NO|DA|TONO)\b(?=.*[A-Z]{2})/g," ").trim();if(!L)return -1;
    if(numerados&&/^\d$/.test(L))return +L-1<T.length?+L-1:-1;
    const pal=L.split(/\s+/).filter(Boolean);
    let H=pal.length&&pal.join("").length>=3?T.map((t,i)=>{const nw=norm(t.nombre).split(/\s+/);return pal.every(p=>nw.includes(p))?i:-1}).filter(i=>i>=0):[];
    if(H.length===1)return H[0];
    if(/^[A-Z]{1,2}$/.test(L)){H=T.map((t,i)=>{const ini=norm(t.nombre).split(/\s+/).map(x=>x[0]).join("");return (L.length===1?ini[0]===L:ini.startsWith(L))?i:-1}).filter(i=>i>=0);if(H.length===1)return H[0]}
    return -1};
  for(const tz of trozos){const nums=tz.match(RTEL)||[];const lab=tz.replace(RTEL," ").replace(/\(([^)]*)\)/g," $1 ").replace(/[-:.]/g," ").replace(/\s+/g," ").trim();
    const q=nums.length&&lab?quien(lab.replace(/\bnc\b.*$/i,"").trim()):-1;
    if(q>=0&&!/\b(nc|n\/c|n\/e|no da)\b/i.test(tz)){asig[q].push(nums.map(n=>n.trim()).join(" - "))}else sinAsignar.push(tz)}
  let porOrden=false;
  if(asig.every(a=>!a.length)&&trozos.length===T.length&&trozos.every(tz=>(tz.match(RTEL)||[]).length===1&&tz.replace(RTEL,"").replace(/[\s.-]/g,"")==="")&&T.slice(1).every(t=>!t.telefono)){
    trozos.forEach((tz,i)=>asig[i].push(tz));sinAsignar.length=0;porOrden=true}
  const pr=T[0],otros=T.slice(1).map((t,i)=>({nombre:t.nombre,telefono:[t.telefono,...asig[i+1]].filter(Boolean).join(" / "),nota:t.nota}));
  return {nombre:pr.nombre+(pr.nota?" ("+pr.nota+")":""),telefono:[pr.telefono,...asig[0],...sinAsignar].filter(Boolean).join(" / "),otros,porOrden}}
if(typeof module!=="undefined")module.exports={separarTitulares};
