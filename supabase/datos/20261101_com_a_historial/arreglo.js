import { parseSeg } from "./parser.js";
const C19 = /^\[Censo 2019\]/;
const ent = (f, n) => ({ f: f + "T12:00:00Z", d: 1, n: String(n || "").replace(/^-\s*/, "") || "(sin nota)", deCenso: true });
// Contactos escritos detrás de los empadronados del censo 2019 (tras salto de línea o -/-)
export function colaC19(com, hoy) {
  const out = [], E = [];
  for (const s of com.split(" | ")) {
    if (!C19.test(s.trim())) { out.push(s); continue; }
    const m = s.match(/\n|-\/-/);
    if (!m) { out.push(s); continue; }
    const ref = s.slice(0, m.index).replace(/[\s.]+$/, "").replace(/\)\s*$/, ")") ;
    const [k, e] = parseSeg(s.slice(m.index), hoy);
    if (!e.length) { out.push(s); continue; }
    out.push(ref.endsWith(".") ? ref : ref + ".");
    const kk = k.replace(/^[\s.\-\/]+|[\s.\-\/]+$/g, "");
    if (kk) out.push(kk);
    E.push(...e.map(([f, n]) => ent(f, n)));
  }
  return [out.join(" | "), E];
}
// Casos sueltos revisados a mano: [vivienda, texto exacto que sale de Comentarios, fecha, nota]
export const MANUAL = [
  ["amarilla-00.10.5", " Llamada 05/08/22: dice que me equivoco y cuelga.", "2022-08-05", "Llamada: dice que me equivoco y cuelga."],
  ["amarilla-00.16.16", "En zona 04/08/22: abre la prop. y dice que vive allí. ", "2022-08-04", "En zona: abre la prop. y dice que vive allí."],
  ["amarilla-03.14.19", "Vino a la oficina el 8/11/22: busca piso para el hijo (+150.000€). ", "2022-11-08", "Vino a la oficina: busca piso para el hijo (+150.000€)."],
  ["verde-01.8.5", " Hablo con Sergio 18-04-25: NI.", "2025-04-18", "Hablo con Sergio: NI."],
  ["verde-01.14.23", " 29/09/26: nap", "2026-09-29", "nap"],
  ["naranja-03.2.20", "[Buzón] Taratura 20/06/25: señor muy mayor, propietario. | ", "2025-06-20", "Taratura: señor muy mayor, propietario."],
];
// Entradas mal partidas (formato «10/10/2025: 10/10/25 - …»)
export function arreglaInterna(h) {
  const out = [];
  for (const e of h) {
    const m = e.deCenso && String(e.n).match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{2})\s*[–-]\s*/);
    if (!m) { out.push(e); continue; }
    const partes = String(e.n).split(/\n\s*(?=\d{1,2}\/\d{1,2}\/\d{2}\s*[–-])/);
    for (const p of partes) {
      const q = p.match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{2})\s*[–-]\s*([\s\S]*)$/);
      if (!q) { out.push({ ...e, n: p.trim() }); continue; }
      const f = `20${q[3]}-${q[2].padStart(2, "0")}-${q[1].padStart(2, "0")}`;
      out.push(ent(f, q[4].trim()));
    }
  }
  return out;
}
