// Coop Besteladvies – folderplanning ophalen (Supabase Edge Function "folder").
// De telefoon mag de pdf niet rechtstreeks laden (andere website); deze functie haalt hem op en geeft hem door.
export const FUNCTIE_VERSIE = '1.15';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
export function urls(jaar, week) {
  const w = String(week).padStart(2, '0'); const uit = [];
  for (const map of [jaar, jaar - 1, jaar + 1]) for (const ww of [w, String(+week)]) uit.push(`https://static.reto.media/ordervantolversuniecom/upload-${map}/folderplanning-${jaar}-coop-wk-${ww}.pdf`);
  return [...new Set(uit)];
}
export async function haal(jaar, week, f = fetch) {
  jaar = +jaar; week = +week;
  if (!(jaar >= 2024 && jaar <= 2100) || !(week >= 1 && week <= 53)) return { status: 400, fout: 'Ongeldige week' };
  for (const u of urls(jaar, week)) {
    try { const r = await f(u); if (r.ok) { const b = new Uint8Array(await r.arrayBuffer()); if (b.length > 1000 && b[0] === 0x25 && b[1] === 0x50) return { status: 200, pdf: b, url: u }; } } catch (e) { }
  }
  return { status: 404, fout: `Folderplanning week ${week} staat nog niet online` };
}
export function start() {
  Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    const u = new URL(req.url); const r = await haal(u.searchParams.get('jaar'), u.searchParams.get('week'));
    if (r.pdf) return new Response(r.pdf, { headers: Object.assign({ 'Content-Type': 'application/pdf', 'X-Bron': r.url }, CORS) });
    return new Response(JSON.stringify({ fout: r.fout }), { status: r.status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS) });
  });
}
