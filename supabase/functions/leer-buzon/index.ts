// Lee los nombres de una foto de buzones y los devuelve por planta y puerta.
// La foto no se guarda en ningún sitio. Necesita el secreto ANTHROPIC_API_KEY.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  properties: {
    buzones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          escalera: { type: "string", description: "Escalera o portal si aparece; si no, cadena vacía" },
          planta: { type: "string", description: "Número de planta; 'BAJO' para bajos, 'AT' para áticos" },
          puerta: { type: "string", description: "Letra o número de la puerta, en mayúsculas" },
          nombres: { type: "string", description: "Nombres y apellidos tal como aparecen, separados por ' / ' si hay varios" },
        },
        required: ["escalera", "planta", "puerta", "nombres"],
        additionalProperties: false,
      },
    },
  },
  required: ["buzones"],
  additionalProperties: false,
};

const PROMPT = `Es una foto de los buzones de un portal de viviendas en España. Para cada buzón que tenga un nombre legible, devuelve su planta, su puerta y los nombres escritos en la etiqueta. Si la etiqueta solo indica el piso (por ejemplo «4º B»), sepáralo en planta «4» y puerta «B». Omite los buzones sin nombre o ilegibles, y no inventes nombres que no se lean con claridad. Ignora publicidad y avisos.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  // Solo usuarios del CRM con sesión iniciada
  const auth = req.headers.get("Authorization") ?? "";
  const u = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
  });
  if (!u.ok) return json({ error: "Inicia sesión en el CRM" }, 401);

  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "Falta la clave ANTHROPIC_API_KEY en Supabase" }, 503);

  let imagen = "";
  try { ({ imagen } = await req.json()); } catch { /* cuerpo vacío */ }
  if (!imagen || typeof imagen !== "string" || imagen.length > 6_000_000) return json({ error: "Foto no válida" }, 400);

  const client = new Anthropic();
  try {
    const r = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imagen } },
          { type: "text", text: PROMPT },
        ],
      }],
    } as any);
    if (r.stop_reason === "refusal") return json({ error: "No se ha podido leer esta foto" }, 422);
    const txt = r.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    return json(JSON.parse(txt));
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "La clave de Anthropic no es válida" }, 503);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Demasiadas fotos seguidas, espera un momento" }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `Error de Anthropic (${e.status})` }, 502);
    console.error(e);
    return json({ error: "No se ha podido leer la foto" }, 500);
  }
});
