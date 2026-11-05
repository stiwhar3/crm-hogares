const {separarTitulares}=require("./titulares.js");const fs=require("fs");
const NOW="2026-11-05T13:10:00.000Z";const q=s=>"'"+String(s).replace(/'/g,"''")+"'";
const out=[],rev=[];let n=0;
for(const l of fs.readFileSync("cand.tsv","utf8").split("\n").filter(Boolean)){const [t,id,nom,tel]=l.split("\t");if(!["contactos","captaciones","compradores"].includes(t))continue;
 let r=separarTitulares(nom,tel);
 if(id==="vsf_c963226fd67")r={nombre:"NOELIA",telefono:tel,otros:[{nombre:"RAUL",telefono:"",nota:""}],porOrden:false};
 if(!r)continue;
 if(id==="ama-seg-0241")r.otros[0].nota="padres";
 if(id==="nar-seg-0042"){const i=r.otros.findIndex(o=>/VANESA/.test(o.nombre));r.otros.splice(i,1,...["PEDRO J AGUADO MARTINEZ","VANESA AGUADO MARTINEZ","NAIARA AGUADO MARTINEZ"].map(x=>({nombre:x,telefono:"",nota:"hijo/a"})))}
 const nk=t==="captaciones"?"propietario":"nombre",que=t==="compradores"?"compradores":"propietarios",chkL=t==="compradores"?"Hay más de un comprador (pareja, familia…)":"Hay más de un propietario";
 const otxt=r.otros.map(o=>[o.nombre,o.telefono,o.nota&&"("+o.nota+")"].filter(Boolean).join(" ")).join(", ");
 const c=[{campo:t==="compradores"?"Nombre":"Propietario",antes:nom,despues:r.nombre}];if((tel||"")!==r.telefono)c.push({campo:"Teléfono",antes:tel||"",despues:r.telefono});c.push({campo:chkL,antes:"No",despues:"Sí"},{campo:"Otros: "+que,antes:"",despues:otxt});
 const h={f:NOW,n:`Separados los ${que} de la ficha (revisión de fichas con varios nombres).${r.porOrden?" Teléfonos repartidos por orden.":""}`,c};
 const set={[nk]:r.nombre,telefono:r.telefono,variosTitulares:true,titulares:r.otros,actualizado:NOW};
 out.push(`update ${t} set d = d || ${q(JSON.stringify(set))}::jsonb || jsonb_build_object('historial', coalesce(d->'historial','[]'::jsonb) || ${q(JSON.stringify([h]))}::jsonb) where id=${q(id)} and d->>'${nk}' = ${q(nom)} and coalesce(d->>'variosTitulares','') <> 'true';`);
 rev.push({t,id,antes:nom,antesTel:tel||"",nombre:r.nombre,telefono:r.telefono,otros:r.otros,porOrden:r.porOrden});n++}
fs.writeFileSync("migracion_titulares.sql","-- Varios propietarios/compradores por ficha (05/11/2026)\n"+out.join("\n")+"\n");fs.writeFileSync("revision.json",JSON.stringify(rev,null,1));console.log(n,"fichas")
