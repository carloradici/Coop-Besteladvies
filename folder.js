// Coop Besteladvies – folderplanning ophalen (Supabase Edge Function "folder").
// De telefoon mag de pdf niet rechtstreeks laden (andere website); deze functie haalt hem op en geeft hem door.
export const FUNCTIE_VERSIE = '1.31';
const MAX = 20 * 1024 * 1024;
// 2.29: lezen met grens (max 20 MB) en time-out, zodat een groot of traag bestand de functie niet kan platleggen
export async function lees(r) { const rd = r.body && r.body.getReader ? r.body.getReader() : null; if (!rd) { const b = new Uint8Array(await r.arrayBuffer()); return b.length > MAX ? null : b; } const d = []; let n = 0; for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.length; if (n > MAX) { try { rd.cancel(); } catch (e) { } return null; } d.push(value); } const b = new Uint8Array(n); let o = 0; for (const x of d) { b.set(x, o); o += x.length; } return b; }
const opt = o => Object.assign({ signal: AbortSignal.timeout(20000) }, o);
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
export function urls(jaar, week, soort) {
  const w = String(week).padStart(2, '0'); const uit = [];
  if (soort === 'vers') { for (const map of [jaar, jaar - 1]) for (const ww of [String(+week), w]) uit.push(`https://static.reto.media/ordervantolversuniecom/upload-${map}/folder-coop-week-${ww}-vers-bestellijst.pdf`, `https://static.reto.media/ordervantolversuniecom/upload-${map}/folder-coop-week-${ww}.pdf`); return [...new Set(uit)]; }
  if (soort === 'voorkoop') { for (const map of [jaar, jaar - 1]) for (const ww of [String(+week), w]) uit.push(`https://static.reto.media/ordervantolversuniecom/upload-${map}/voorkoop-${ww}.pdf`); return [...new Set(uit)]; }
  for (const map of [jaar, jaar - 1, jaar + 1]) for (const ww of [w, String(+week)]) uit.push(`https://static.reto.media/ordervantolversuniecom/upload-${map}/folderplanning-${jaar}-coop-wk-${ww}.pdf`);
  return [...new Set(uit)];
}
export async function haal(jaar, week, f = fetch, soort = '') {
  jaar = +jaar; week = +week;
  if (!(jaar >= 2024 && jaar <= 2100) || !(week >= 1 && week <= 53)) return { status: 400, fout: 'Ongeldige week' };
  for (const u of urls(jaar, week, soort)) {
    try { const r = await f(u, opt()); if (r.ok) { const b = await lees(r); if (b && b.length > 1000 && b[0] === 0x25 && b[1] === 0x50) return { status: 200, pdf: b, url: u }; } } catch (e) { }
  }
  return { status: 404, fout: `${soort === 'voorkoop' ? 'Voorkooplijst' : soort === 'vers' ? 'Vers-bestellijst' : 'Folderplanning'} week ${week} staat nog niet online` };
}
export const magLink = l => { try { const u = new URL(l); return u.protocol === 'https:' && (u.hostname === 'static.reto.media' || (/\.cloudfront\.net$/.test(u.hostname) && /mailcenter_reto/i.test(u.pathname))); } catch (e) { return false; } };
export async function haalLink(l, f = fetch) {
  if (!magLink(l)) return { status: 400, fout: 'Deze link wordt niet ondersteund. Alleen links van Reto (static.reto.media of de Reto-mail).' };
  // 2.25: redirects zelf controleren (alleen naar Reto), en alleen echte pdf- of Excel-bestanden doorgeven met een vast type
  try { let r = await f(l, opt({ redirect: 'manual' })), n = 0; while (r.status >= 300 && r.status < 400 && n++ < 3) { const v = new URL(r.headers.get('location') || '', l).href; if (!magLink(v)) return { status: 400, fout: 'Deze link wordt niet ondersteund.' }; l = v; r = await f(l, opt({ redirect: 'manual' })); }
    if (!r.ok) return { status: 404, fout: 'Bestand niet gevonden (' + r.status + ')' }; const b = await lees(r); if (!b) return { status: 413, fout: 'Bestand is te groot' };
    const pdf = b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, zip = b[0] === 0x50 && b[1] === 0x4b;
    if (!pdf && !zip) return { status: 415, fout: 'Dit is geen pdf- of Excel-bestand' };
    return { status: 200, pdf: b, url: l, type: pdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }; } catch (e) { return { status: 502, fout: 'Ophalen mislukt' }; }
}
export function start(createClient, SB_URL, ANON) {
  const nee = () => new Response(JSON.stringify({ fout: 'Niet ingelogd' }), { status: 401, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS) });
  Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    const u = new URL(req.url), w = u.searchParams.get('w') || '', auth = req.headers.get('authorization') || '';
    // 2.29: alleen voor een ingelogde medewerker van de winkel (geen open doorgeefluik meer)
    if (!/^[0-9a-f-]{36}$/i.test(w) || !/^Bearer .+/.test(auth)) return nee();
    try { const sb = createClient(SB_URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } }); const { data, error } = await sb.rpc('is_lid', { w }); if (error || data !== true) return nee(); } catch (e) { return nee(); } const r = u.searchParams.get('url') ? await haalLink(u.searchParams.get('url')) : await haal(u.searchParams.get('jaar'), u.searchParams.get('week'), fetch, ['voorkoop', 'vers'].includes(u.searchParams.get('soort')) ? u.searchParams.get('soort') : '');
    if (r.pdf) return new Response(r.pdf, { headers: Object.assign({ 'Content-Type': r.type || 'application/pdf', 'X-Bron': r.url, 'X-Content-Type-Options': 'nosniff' }, CORS) });
    return new Response(JSON.stringify({ fout: r.fout }), { status: r.status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS) });
  });
}
