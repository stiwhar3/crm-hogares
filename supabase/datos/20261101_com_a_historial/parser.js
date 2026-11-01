// Separa los contactos con fecha del campo «com» del censo. Igual que parse.py.
export const REF=/^\[(Censo 2019|Bittools|Buz)/;
const DATE=/(ZT\s+)?(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(\s+ZT)?\)?(\s*:(?!\d)|\s+(?=[A-Za-zÁÉÍÓÚÑáéíóúñ.•]))/g;
const YEAR=/^[ \t]*((?:19|20)\d{2})(?:\s*-\s*((?:19|20)\d{2}))?\s*:/gm;
const NODATE=/^[ \t]*—\s*:/gm;
const rstripST=s=>s.replace(/[ \t]+$/,"");
const soloTag=p=>/^\[[^\]]*\]$/.test(p);
function okprev(s,i){const p=rstripST(s.slice(0,i));return p===""||".;]/\n-[".includes(p[p.length-1])||soloTag(p)}
function fuerte(s,i){const p=rstripST(s.slice(0,i));return p===""||p.endsWith("-/-")||p.endsWith("\n")||p.endsWith("/")||soloTag(p)}
function fecha(d,m,y,hoy){y=+y;if(y<100)y+=2000;d=+d;m=+m;const f=new Date(Date.UTC(y,m-1,d));
  if(f.getUTCFullYear()!==y||f.getUTCMonth()!==m-1||f.getUTCDate()!==d)return null;
  return y>=2000&&f<=hoy?f:null}
const iso=f=>f.toISOString().slice(0,10);
const limpiaFin=t=>t.replace(/(\s*(-\/-|[;,+]))+\s*$/,"").trim();
export function parseSeg(s,hoy,anios=true){const st=[];let m;
  DATE.lastIndex=0;while((m=DATE.exec(s))){const i=m.index;if(m[0].length===0){DATE.lastIndex++;continue}
    if(!okprev(s,i))continue;if(!m[6].includes(":")&&!fuerte(s,i))continue;
    const f=fecha(m[2],m[3],m[4],hoy);if(!f)continue;st.push([i,i+m[0].length,iso(f),"",!!(m[1]||m[5])])}
  YEAR.lastIndex=0;while(anios&&(m=YEAR.exec(s))){const y=+(m[2]||m[1]);if(y>hoy.getUTCFullYear())continue;
    const lab=m[1]+(m[2]?"-"+m[2]:"");st.push([m.index+m[0].indexOf(m[1]),m.index+m[0].length,y+"-01-01",lab,false])}
  NODATE.lastIndex=0;while((m=NODATE.exec(s)))st.push([m.index,m.index,null,"",false]);
  st.sort((a,b)=>a[0]-b[0]);
  if(!st.some(x=>x[2]))return [s,[]];
  let keep=s.slice(0,st[0][0]);const E=[];
  st.forEach(([a,b,f,lab,zt],k)=>{const end=k+1<st.length?st[k+1][0]:s.length;
    if(f===null){keep+=(keep.trim()?" ":"")+s.slice(a,end).trim();return}
    let t=limpiaFin(s.slice(b,end).trim());if(lab)t=`(Año ${lab}) `+t;if(zt)t="ZT: "+t;E.push([f,t])});
  keep=keep.replace(/(\s*(-\/-|[;,+]|\[[^\]]*\]))+\s*$/,"").trim();
  return [keep,E]}
export function parseCom(com,hoy,anios=true){const out=[],E=[];
  for(const s of com.split(" | ")){if(REF.test(s.trim())){out.push(s);continue}
    const [k,e]=parseSeg(s,hoy,anios);E.push(...e);
    if(e.length){if(!/^\s*(\[[^\]]*\]\s*)*$/.test(k))out.push(k)}else out.push(s)}
  return [out.join(" | "),E]}
