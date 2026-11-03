// Visitas del CRM → Google Calendar «FUENLABRADA LA AVANZADA».
// La llama la base de datos (trigger cal_visita) al crear una visita o al cambiarle la fecha o la hora.
// Solo acepta llamadas con la cabecera x-secreto guardada en push_config.
// Necesita el secreto GOOGLE_SA_JSON (clave JSON de una cuenta de servicio de Google con permiso
// «Hacer cambios en eventos» en ese calendario). Sin él no hace nada: la revisión programada de las
// 7:50, 14:50 y 19:50 pasa al calendario las visitas que se queden sin evento.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CAL = "5d21e141966709e5d2d9efabc7cfb74ca740840ec805fcf199f5fd77a59504f8@group.calendar.google.com";
const COLOR: Record<string, string> = { "Iván": "7", "Ivan": "7", "Sergio": "5", "Mery": "2", "Carlos": "4", "Stiwhar": "11", "Adrián": "6", "Adrian": "6", "Brian": "6" };
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const b64u = (b: ArrayBuffer | Uint8Array | string) => {
  const u = typeof b === "string" ? new TextEncoder().encode(b) : new Uint8Array(b);
  let s = ""; for (const c of u) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
let tok: { t: string; exp: number } | null = null;
async function token(): Promise<string> {
  if (tok && tok.exp > Date.now() / 1000 + 60) return tok.t;
  const sa = JSON.parse(Deno.env.get("GOOGLE_SA_JSON") || "null");
  if (!sa?.client_email || !sa?.private_key) throw new Error("falta GOOGLE_SA_JSON");
  const now = Math.floor(Date.now() / 1000);
  const msg = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64u(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(msg));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: msg + "." + b64u(sig) }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("token google: " + JSON.stringify(j).slice(0, 200));
  tok = { t: j.access_token, exp: now + (j.expires_in || 3600) };
  return tok.t;
}

const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const mas30 = (f: string, h: string) => {
  const d = new Date(`${f}T${h}:00Z`); d.setUTCMinutes(d.getUTCMinutes() + 30);
  return d.toISOString().slice(0, 19);
};

async function gcal(method: string, path: string, body?: unknown) {
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CAL)}/events${path}`, {
    method, headers: { Authorization: "Bearer " + await token(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`calendar ${r.status}: ` + JSON.stringify(j).slice(0, 200));
  return j;
}

Deno.serve(async (req) => {
  try {
    const { data: c } = await db.from("push_config").select("v").eq("k", "secreto").single();
    if (!c || req.headers.get("x-secreto") !== c.v) return json({ error: "no autorizado" }, 401);
    const { id } = await req.json();
    const { data: v } = await db.from("visitas").select("id,d").eq("id", id).single();
    if (!v) return json({ ok: false, motivo: "no existe" });
    const d = v.d || {};
    if (!d.fecha || !d.hora || d.borrarSolicitado || String(d.opinion || "").startsWith("Cancelada")) return json({ ok: false, motivo: "sin fecha/hora o cancelada" });
    if (d.fecha < hoyMadrid()) return json({ ok: false, motivo: "pasada" });
    const start = { dateTime: `${d.fecha}T${d.hora}:00`, timeZone: "Europe/Madrid" };
    const end = { dateTime: mas30(d.fecha, d.hora), timeZone: "Europe/Madrid" };
    const ahora = new Date().toISOString();
    const hist = Array.isArray(d.historial) ? d.historial : [];

    if (d.calEventId) { // ya está en el calendario: solo se mueve si cambió la fecha o la hora
      if (d.calFecha === d.fecha && d.calHora === d.hora) return json({ ok: true, igual: true });
      const ev = await gcal("GET", "/" + encodeURIComponent(d.calEventId));
      const ini = String(ev.start?.dateTime || "");
      const misma = ini.startsWith(`${d.fecha}T${d.hora}`);
      if (!misma) await gcal("PATCH", "/" + encodeURIComponent(d.calEventId), { start, end });
      await db.from("visitas").update({ d: { ...d, calFecha: d.fecha, calHora: d.hora, historial: misma ? hist : [...hist, { f: ahora, n: `Calendario: movida al ${d.fecha} a las ${d.hora}` }] } }).eq("id", id);
      return json({ ok: true, movida: !misma });
    }

    const { data: e } = await db.from("encargos").select("d").eq("id", d.encargoId || "").maybeSingle();
    const dir = String((e?.d?.direccion) || d.direccion || "").split(",")[0].trim();
    const quien = [d.compradorNombre, d.telComprador].filter(Boolean).join(" ");
    const ev = await gcal("POST", "?sendUpdates=none", {
      summary: "CV " + [dir, quien].filter(Boolean).join(" - "),
      description: `Creada desde el CRM (visita ${id})`,
      start, end, ...(COLOR[d.asesor] ? { colorId: COLOR[d.asesor] } : {}),
    });
    // Se vuelve a leer por si alguien la cambió mientras tanto
    const { data: v2 } = await db.from("visitas").select("d").eq("id", id).single();
    const d2 = v2?.d || d, h2 = Array.isArray(d2.historial) ? d2.historial : [];
    await db.from("visitas").update({ d: { ...d2, calEventId: ev.id, calFecha: d.fecha, calHora: d.hora, historial: [...h2, { f: ahora, n: "Añadida al calendario" }] } }).eq("id", id);
    return json({ ok: true, evento: ev.id });
  } catch (err) {
    console.error("calendario", String(err).slice(0, 300));
    return json({ error: String(err).slice(0, 300) }, 500);
  }
});
