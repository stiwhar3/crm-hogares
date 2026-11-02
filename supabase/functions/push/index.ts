// Notificaciones push del CRM. La llaman la base de datos (al crear un aviso o una visita)
// y un cron cada media hora (desarrollos 12:00, visitas de mañana 17:00, seguimientos 18:30, hora de Madrid).
// Solo acepta llamadas con la cabecera x-secreto guardada en push_config.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

let cfg: Record<string, string> | null = null;
async function config() {
  if (cfg) return cfg;
  const { data, error } = await db.from("push_config").select("k,v");
  if (error) throw error;
  cfg = Object.fromEntries((data || []).map((r: { k: string; v: string }) => [r.k, r.v]));
  webpush.setVapidDetails("mailto:stiwhar3@gmail.com", cfg.vapid_publica, cfg.vapid_privada);
  return cfg;
}

type Msg = { title: string; body: string; tag?: string; url?: string };
async function enviar(nombres: string[], m: Msg) {
  const L = [...new Set(nombres.filter(Boolean))];
  if (!L.length) return 0;
  const { data } = await db.from("push_subs").select("id,d").in("nombre", L);
  let n = 0;
  for (const s of data || []) {
    try {
      await webpush.sendNotification(s.d.sub, JSON.stringify(m), { TTL: 6 * 3600, urgency: "high" });
      n++;
    } catch (e) {
      const st = (e as { statusCode?: number }).statusCode;
      if (st === 404 || st === 410) await db.from("push_subs").delete().eq("id", s.id); // móvil que ya no existe
      else console.error("push", s.id, st, String(e).slice(0, 200));
    }
  }
  return n;
}

const madrid = () => {
  const now = new Date();
  const dia = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(now);
  const [h, mi] = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now).split(":").map(Number);
  return { dia, hm: h * 60 + mi };
};
const masDias = (iso: string, n: number) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmt = (iso: string) => { const [y, m, d] = iso.split("-"); return `${+d}/${+m}`; };
const plural = (n: number, s: string) => `${n} ${s}${n > 1 ? "s" : ""}`;

async function asesorEncargo(id: string) {
  const { data } = await db.from("encargos").select("d").eq("id", id).maybeSingle();
  return (data?.d?.asesor as string) || "Stiwhar";
}

async function horario() {
  const { dia, hm } = madrid();
  const out: Record<string, number> = {};
  const franja = (h: number) => hm >= h && hm < h + 30;
  if (franja(12 * 60) || franja(18 * 60 + 30)) {
    const etapa = franja(12 * 60) ? "Desarrollo" : "Seguimiento";
    const { data } = await db.from("contactos").select("d").eq("d->>etapa", etapa).lte("d->>proxFecha", dia).neq("d->>proxFecha", "");
    const por: Record<string, string[]> = {};
    for (const r of data || []) { const a = r.d.asesor || "Stiwhar"; (por[a] ||= []).push(r.d.direccion || ""); }
    for (const [a, L] of Object.entries(por)) {
      const t = etapa === "Desarrollo" ? `Tienes ${plural(L.length, "desarrollo")} pendiente${L.length > 1 ? "s" : ""}` : `Tienes ${plural(L.length, "seguimiento")} por hacer`;
      out[a + ":" + etapa] = await enviar([a], { title: t, body: L.slice(0, 3).join(" · "), tag: etapa + ":" + dia });
    }
  }
  if (franja(17 * 60)) {
    const man = masDias(dia, 1);
    const { data } = await db.from("visitas").select("id,d").eq("d->>fecha", man);
    const encs = new Map<string, string>();
    for (const v of data || []) {
      if (!v.d.encargoId) continue;
      if (!encs.has(v.d.encargoId)) encs.set(v.d.encargoId, await asesorEncargo(v.d.encargoId));
      const a = encs.get(v.d.encargoId)!;
      out[v.id] = await enviar([a], { title: "Mañana tienes visita", body: [v.d.hora, v.d.direccion, v.d.compradorNombre].filter(Boolean).join(" · "), tag: "vm:" + v.id });
    }
  }
  return { dia, hm, out };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  try {
    const c = await config();
    if (req.headers.get("x-secreto") !== c.secreto) return json({ error: "No autorizado" }, 401);
    const b = await req.json().catch(() => ({}));
    if (b.tabla === "avisos") {
      const { data } = await db.from("avisos").select("d").eq("id", b.id).maybeSingle();
      const a = data?.d; if (!a || a.hecho) return json({ ok: true, n: 0 });
      const para = [a.para, ...(Array.isArray(a.cc) ? a.cc : [])].filter((x: string) => x && x !== a.de);
      const body = [a.direccion, a.nombre, a.telefono, a.texto].filter(Boolean).join(" · ").slice(0, 240);
      return json({ ok: true, n: await enviar(para, { title: `${a.tipo || "Aviso"} de ${a.de || "la oficina"}`, body, tag: "aviso-" + b.id }) });
    }
    if (b.tabla === "visitas") {
      const { data } = await db.from("visitas").select("d").eq("id", b.id).maybeSingle();
      const v = data?.d; if (!v || !v.encargoId) return json({ ok: true, n: 0 });
      if (v.fecha && v.fecha < madrid().dia) return json({ ok: true, n: 0 }); // visita ya pasada: no avisa
      const a = await asesorEncargo(v.encargoId);
      let fin = "";
      if (v.compradorId) { const { data: c } = await db.from("compradores").select("d").eq("id", v.compradorId).maybeSingle(); if (/Finanhogar/.test(c?.d?.finanhogar || "")) fin = " · Finanhogar, prioridad 1"; }
      return json({ ok: true, n: await enviar([a], { title: "Visita nueva en tu casa" + fin, body: [v.direccion, v.fecha ? fmt(v.fecha) : "", v.hora, v.compradorNombre].filter(Boolean).join(" · "), tag: "vis:" + b.id }) });
    }
    if (b.tabla === "horario") return json({ ok: true, ...(await horario()) });
    if (b.tabla === "prueba") return json({ ok: true, n: await enviar([b.para], { title: b.title || "Prueba del CRM", body: b.body || "Las notificaciones funcionan en este dispositivo." }) });
    if (b.tabla === "prueba-cifrado") { // comprueba que el cifrado funciona enviando a una suscripción dada
      await webpush.sendNotification(b.sub, JSON.stringify({ title: "x", body: "y" }), { TTL: 60 }).catch((e: unknown) => { throw new Error("envío: " + ((e as { statusCode?: number }).statusCode ?? String(e))); });
      return json({ ok: true });
    }
    return json({ error: "¿Qué tabla?" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String(e).slice(0, 300) }, 500);
  }
});
