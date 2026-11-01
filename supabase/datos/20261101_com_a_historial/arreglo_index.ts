import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { colaC19, MANUAL, arreglaInterna } from "./arreglo.js";
// Arreglo de un solo uso tras pasar los contactos del censo al historial (01/11/2026).
const TOKEN = "(token de un solo uso, ya no vale)";
const orden = (h: any[]) => h.sort((a, c) => String(a.f).localeCompare(String(c.f)));
Deno.serve(async (req) => {
  const b = await req.json().catch(() => ({}));
  if (b.token !== TOKEN) return new Response("no", { status: 403 });
  const aplicar = b.aplicar === true, hoy = new Date(Date.UTC(2026, 10, 1, 23));
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const man = new Map(MANUAL.map((m) => [m[0], m]));
  const st = { cola: 0, manual: 0, manualFallo: [] as string[], internas: 0, ent: 0, cambios: [] as unknown[] };
  const { data: docs, error } = await db.from("censo").select("id,d");
  if (error) return Response.json({ error });
  for (const r of docs!) {
    if (!r.d?.edificios) continue; let cambia = false;
    r.d.edificios.forEach((e: any, bi: number) => e.u.forEach((u: any, ui: number) => {
      const uid = `${r.id}.${bi}.${ui}`, antes = u.com || "", hAntes = (u.historial || []).length;
      let com = antes, E: any[] = [];
      const [c2, e2] = colaC19(com, hoy); if (e2.length) { com = c2; E.push(...e2); st.cola++; }
      const m = man.get(uid);
      if (m) { if (com.includes(m[1])) { com = com.replace(m[1], m[1].startsWith(" ") && m[1].endsWith(" ") ? " " : "").trim(); E.push({ f: m[2] + "T12:00:00Z", d: 1, n: m[3], deCenso: true }); st.manual++; } else st.manualFallo.push(uid); }
      let h = [...(u.historial || [])];
      const h2 = arreglaInterna(h); if (h2.length !== h.length || JSON.stringify(h2) !== JSON.stringify(h)) { st.internas++; h = h2; }
      if (!E.length && h === u.historial) return;
      if (!E.length && JSON.stringify(h) === JSON.stringify(u.historial || [])) return;
      u.com = com; u.historial = orden([...h, ...E]); st.ent += u.historial.length - hAntes; cambia = true;
      st.cambios.push({ uid, antes, despues: com, nuevas: E.length });
    }));
    if (cambia && aplicar) { const { error: e2 } = await db.from("censo").update({ d: r.d }).eq("id", r.id); if (e2) return Response.json({ error: e2, st }); }
  }
  return Response.json({ aplicar, ...st });
});
