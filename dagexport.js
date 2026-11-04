// Coop Besteladvies – automatisch dagexports ontvangen (Supabase Edge Function "dagexport").
// Wordt door de korte code in Supabase opgehaald van GitHub. Bijwerken = dit bestand uploaden en in Supabase op Deploy tikken.
export const FUNCTIE_VERSIE = '1.12';
const num = v => { if (v === null || v === undefined || v === '') return 0; if (typeof v === 'number') return isFinite(v) ? v : 0; let s = String(v).trim().replace(/[€\s]/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const n = parseFloat(s); return isFinite(n) ? n : 0; };
const rnd = (n, d = 1) => { const f = 10 ** d; return Math.round(n * f) / f; };
const nr6 = s => { s = String(s ?? '').trim(); if (/^\d+$/.test(s) && s.length < 6) s = s.padStart(6, '0'); return s; };
const DAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const fmtDag = s => { const d = new Date(s + 'T12:00:00Z'); return `${DAGEN[(d.getUTCDay() + 6) % 7]} ${d.getUTCDate()}-${d.getUTCMonth() + 1}`; };

export function parseCaspos(rows, filename) {
  const m = (filename || '').match(/van_(\d{8})_tm_(\d{8})/i);
  if (!m) throw new Error('Geen datum in de bestandsnaam (verwacht ..._van_jjjjmmdd_tm_jjjjmmdd)');
  if (m[1] !== m[2]) throw new Error('Dit bestand bevat meerdere dagen. Exporteer één dag per bestand.');
  const dag = `${m[2].slice(0, 4)}-${m[2].slice(4, 6)}-${m[2].slice(6)}`;
  const h = (rows[0] || []).map(x => String(x || '').trim().toLowerCase());
  const col = (...names) => h.findIndex(x => names.includes(x));
  const ix = { afd: col('afd'), lev: col('leverancier'), art: col('artikel'), bnr: col('bestelnr.', 'bestelnr', 'bestelnummer'), sg: col('subgr.', 'subgr'), sgo: col('subgroep omschrijving'), o1: col('omschrijving1'), o2: col('omschrijving2'), omzet: col('omzet incl'), aant: col('aantallen', 'aantal'), gew: col('gewicht') };
  if (ix.art < 0 || ix.aant < 0) throw new Error('Kolommen Artikel/Aantallen niet gevonden – is dit een CasPos artikelen-export?');
  const data = {}, meta = {}; let n = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]; if (!row) continue;
    const ean = String(row[ix.art] ?? '').trim(); if (!ean || ean === '0' || /^totaal/i.test(String(row[0] || ''))) continue;
    const q = num(row[ix.aant]), g = ix.gew >= 0 ? num(row[ix.gew]) : 0, o = ix.omzet >= 0 ? num(row[ix.omzet]) : 0;
    const p = data[ean] || [0, 0, 0]; data[ean] = [rnd(p[0] + q, 3), rnd(p[1] + g, 3), rnd(p[2] + o, 2)];
    let bnr = String(row[ix.bnr] ?? '').trim(); if (/^8{6,}$/.test(bnr)) bnr = '888888'; else bnr = nr6(bnr);
    meta[ean] = { b: bnr, l: String(row[ix.lev] ?? '').trim(), a: String(row[ix.afd] ?? '').trim(), s: String(row[ix.sg] ?? '').trim(), so: String(row[ix.sgo] ?? '').trim(), n: String(row[ix.o1] ?? '').trim(), m: String(row[ix.o2] ?? '').trim() };
    n++;
  }
  return { dag, data, meta, n };
}

export async function verwerk({ sb, XLSX, webpush, sleutel, bestand, body, test, nu = new Date() }) {
  const deel = String(sleutel || '').trim().split('.');
  if (deel.length !== 2 || !/^[0-9a-f-]{36}$/i.test(deel[0]) || deel[1].length < 32) return { status: 401, fout: 'Geen geldige uploadsleutel' };
  const W = deel[0];
  const { data: ok, error } = await sb.rpc('check_uploadsleutel', { w: W, sleutel: String(sleutel).trim() });
  if (error) return { status: 500, fout: 'Database: ' + error.message };
  if (!ok) return { status: 401, fout: 'Uploadsleutel klopt niet of is ingetrokken' };
  const { data: wk } = await sb.from('winkels').select('naam').eq('id', W);
  const winkel = (wk && wk[0] && wk[0].naam) || '';
  if (test) return { status: 200, ok: true, winkel, versie: FUNCTIE_VERSIE, tekst: `Koppeling met ${winkel} werkt.` };
  const log = async (ok2, melding, dag) => { try { await sb.from('upload_log').insert({ winkel_id: W, bestand: bestand || '', dag: dag || null, ok: ok2, melding }); } catch (e) { } };
  if (!bestand || !/\.xlsx?$/i.test(bestand)) { await log(false, 'Geen .xls-bestand'); return { status: 400, fout: 'Alleen .xls of .xlsx-bestanden' }; }
  if (!body || !body.byteLength) { await log(false, 'Leeg bestand'); return { status: 400, fout: 'Leeg bestand' }; }
  if (body.byteLength > 15 * 1024 * 1024) { await log(false, 'Bestand te groot'); return { status: 413, fout: 'Bestand is te groot (max 15 MB)' }; }
  let r;
  try { const wb = XLSX.read(new Uint8Array(body), { type: 'array' }); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null }); r = parseCaspos(rows, bestand); }
  catch (e) { await log(false, String(e.message || e)); return { status: 422, fout: String(e.message || e) }; }
  const vandaag = nu.toISOString().slice(0, 10); const grens = new Date(nu.getTime() - 400 * 864e5).toISOString().slice(0, 10);
  if (r.dag > vandaag || r.dag < grens) { await log(false, 'Datum klopt niet: ' + r.dag, null); return { status: 422, fout: 'De datum in de bestandsnaam klopt niet: ' + r.dag }; }
  if (!r.n) { await log(false, 'Geen artikelen gevonden', r.dag); return { status: 422, fout: 'Geen artikelen gevonden in het bestand' }; }
  const geupload = new Date().toISOString();
  const e1 = (await sb.from('dagverkoop').upsert({ winkel_id: W, dag: r.dag, data: r.data, bestand, geupload }, { onConflict: 'winkel_id,dag' })).error;
  if (e1) { await log(false, 'Opslaan mislukt: ' + e1.message, r.dag); return { status: 500, fout: 'Opslaan mislukt: ' + e1.message }; }
  const krows = Object.entries(r.meta).map(([ean, m]) => Object.assign({ winkel_id: W, ean, gezien: r.dag }, m));
  for (let i = 0; i < krows.length; i += 500) { const e2 = (await sb.from('kassa').upsert(krows.slice(i, i + 500), { onConflict: 'winkel_id,ean' })).error; if (e2) { await log(false, 'Artikelgegevens: ' + e2.message, r.dag); return { status: 500, fout: 'Artikelgegevens opslaan mislukt: ' + e2.message }; } }
  await sb.from('upload_sleutels').update({ laatst: geupload }).eq('winkel_id', W);
  await log(true, `${r.n} artikelen`, r.dag);
  let gemeld = 0;
  if (webpush) {
    const { data: abos } = await sb.from('push_abos').select('*').eq('winkel_id', W);
    for (const a of (abos || []).filter(x => x.rol === 'beheer' && !(x.uit || []).includes('auto'))) {
      try { await webpush.sendNotification(a.sub, JSON.stringify({ titel: 'Dagexport binnen', tekst: `De verkoop van ${fmtDag(r.dag)} is automatisch geüpload (${r.n} artikelen).`, tag: 'auto-' + r.dag })); gemeld++; }
      catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await sb.from('push_abos').delete().eq('endpoint', a.endpoint); }
    }
  }
  return { status: 200, ok: true, dag: r.dag, artikelen: r.n, winkel, gemeld };
}

export function geheimeSleutel() {
  const s = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (s) { try { const j = JSON.parse(s); const v = j.default || Object.values(j)[0]; if (v) return v; } catch (e) { if (/^sb_secret_/.test(s)) return s; } }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}
export function start(XLSX, webpush, createClient) {
  Deno.serve(async req => {
    const json = (o, status) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    try {
      const sb = createClient(Deno.env.get('SUPABASE_URL'), geheimeSleutel(), { auth: { persistSession: false, autoRefreshToken: false } });
      const clean = s => String(s || '').replace(/[^A-Za-z0-9_-]/g, '');
      let wp = null; try { webpush.setVapidDetails('https://carloradici.github.io/Coop-Besteladvies/', clean(Deno.env.get('VAPID_PUBLIC')), clean(Deno.env.get('VAPID_PRIVATE'))); wp = webpush; } catch (e) { }
      const url = new URL(req.url);
      const sleutel = req.headers.get('x-sleutel') || '';
      const test = req.method === 'GET' || url.searchParams.get('test') === '1';
      let bestand = req.headers.get('x-bestand') || ''; try { bestand = decodeURIComponent(bestand); } catch (e) { }
      bestand = bestand.replace(/[\\/]/g, '_').slice(0, 200);
      const body = test ? null : await req.arrayBuffer();
      const r = await verwerk({ sb, XLSX, webpush: wp, sleutel, bestand, body, test });
      const { status, ...rest } = r; return json(rest, status);
    } catch (e) { return json({ fout: String(e && e.message || e) }, 500); }
  });
}
