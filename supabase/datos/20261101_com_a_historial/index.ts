import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { parseCom } from "./parser.js";
// Función de un solo uso: pasa los contactos con fecha de «com» del censo al historial. Se borra al acabar.
const TOKEN = "(token de un solo uso, ya no vale)";
Deno.serve(async (req) => {
  const b = await req.json().catch(() => ({}));
  if (b.token !== TOKEN) return new Response("no", { status: 403 });
  const aplicar = b.aplicar === true, anios = b.anios !== false;
  const hoy = new Date(Date.UTC(2026, 10, 1, 23));
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const conv = (com: string) => {
    const [k, E] = parseCom(com || "", hoy, anios);
    return { k, E: E.map(([f, n]) => ({ f: f + "T12:00:00Z", d: 1, n: n || "(sin nota)", deCenso: true })) };
  };
  const st = { docs: 0, viv: 0, ent: 0, edits: 0, muestra: [] as unknown[] };
  const { data: docs, error } = await db.from("censo").select("id,d");
  if (error) return Response.json({ error });
  for (const r of docs!) {
    if (!r.d?.edificios) continue; let cambia = false;
    r.d.edificios.forEach((e: any, bi: number) => e.u.forEach((u: any, ui: number) => {
      const { k, E } = conv(u.com); if (!E.length) return;
      if (st.muestra.length < 5) st.muestra.push({ id: `${r.id}.${bi}.${ui}`, antes: u.com, queda: k, E });
      u.com = k; u.historial = [...E, ...(u.historial || [])].sort((a: any, c: any) => String(a.f).localeCompare(String(c.f)));
      st.viv++; st.ent += E.length; cambia = true;
    }));
    if (cambia) { st.docs++; if (aplicar) { const { error: e2 } = await db.from("censo").update({ d: r.d }).eq("id", r.id); if (e2) return Response.json({ error: e2, st }); } }
  }
  const { data: eds } = await db.from("censo_edits").select("id,d");
  for (const r of eds || []) {
    const { k, E } = conv(r.d?.com); if (!E.length) continue;
    r.d.com = k; r.d.historial = [...E, ...(r.d.historial || [])].sort((a: any, c: any) => String(a.f).localeCompare(String(c.f)));
    st.edits++; st.ent += E.length;
    if (aplicar) { const { error: e3 } = await db.from("censo_edits").update({ d: r.d }).eq("id", r.id); if (e3) return Response.json({ error: e3, st }); }
  }
  return Response.json({ aplicar, ...st });
});
