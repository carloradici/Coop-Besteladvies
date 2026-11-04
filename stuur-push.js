// Coop Besteladvies – pushmeldingen (Supabase Edge Function "stuur-push").
// Wordt door de korte stuur-push in Supabase opgehaald van GitHub. Bijwerken = dit bestand uploaden en in Supabase op Deploy tikken.
// Soorten: test (één toestel), boek (na upload bestelboek, alleen met geldige pincode-sessie: beheerder of recht upload), cron (elk kwartier, per winkel: besteldag per onderdeel, dag-export, in/out).
export const FUNCTIE_VERSIE = '1.17';
const STD_SCHEMA = { vers: [{ b: 0, l: 2 }, { b: 2, l: 4 }, { b: 4, l: 0 }], kw: [{ b: 0, l: 2 }, { b: 2, l: 4 }, { b: 3, l: 0 }] };
const ONDERDELEN = [['agf', 'AGF'], ['vers', 'Vers'], ['brood', 'Brood'], ['diep', 'Diepvries'], ['kw', 'KW']];
const STD_OPEN = [['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['', '']];
const DAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const add = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const wd = s => (new Date(s + 'T12:00:00Z').getUTCDay() + 6) % 7;
const isoWeek = s => { const d = new Date(s + 'T12:00:00Z'); const t = new Date(d); t.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)); const j4 = new Date(Date.UTC(t.getUTCFullYear(), 0, 4, 12)); return 1 + Math.round(((t - j4) / 864e5 - 3 + ((j4.getUTCDay() + 6) % 7)) / 7); };
const minuten = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + m; };
const mooiGroep = g => { g = String(g || ''); return g === g.toUpperCase() ? g.charAt(0) + g.slice(1).toLowerCase() : g; };
const regelNaam = r => { if (r.naam) return r.naam; const g = (r.groepen || []).map(mooiGroep); return g.length <= 2 ? g.join(' en ') : `${g[0]}, ${g[1]} +${g.length - 2}`; };
const fmtDag = s => { const d = new Date(s + 'T12:00:00Z'); return `${DAGEN[wd(s)]} ${d.getUTCDate()}-${d.getUTCMonth() + 1}`; };

export function lokaleTijd(nu) {
  const p = {}; for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(nu)) p[x.type] = x.value;
  return { dag: `${p.year}-${p.month}-${p.day}`, tijd: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}

export const folderUrls = (jaar, week) => { const w = String(week).padStart(2, '0'); return [...new Set([jaar, jaar - 1, jaar + 1].map(m => `https://static.reto.media/ordervantolversuniecom/upload-${m}/folderplanning-${jaar}-coop-wk-${w}.pdf`))]; };
export async function verwerk({ sb, webpush, body, token, nu = new Date(), haal = (u, o) => fetch(u, o) }) {
  const soort = body && body.soort;
  const { data: abos, error: dbFout } = await sb.from('push_abos').select('*');
  if (dbFout) return { status: 500, fout: 'Database: ' + (dbFout.message || dbFout.code || JSON.stringify(dbFout)) };
  const verstuurd = { n: 0, weg: 0 };
  const stuur = async (lijst, bericht) => {
    for (const a of lijst) {
      try { await webpush.sendNotification(a.sub, JSON.stringify(bericht)); verstuurd.n++; }
      catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) { await sb.from('push_abos').delete().eq('endpoint', a.endpoint); verstuurd.weg++; } }
    }
  };
  const wil = (a, s) => !(a.uit || []).includes(s);
  const eenmalig = async sleutel => { const { data } = await sb.from('push_log').select('sleutel').eq('sleutel', sleutel); if (data && data.length) return false; await sb.from('push_log').insert({ sleutel }); return true; };

  if (soort === 'test') {
    const a = (abos || []).filter(x => x.endpoint === body.endpoint);
    if (!a.length) return { status: 404, fout: 'Dit toestel is niet aangemeld voor meldingen' };
    await stuur(a, { titel: 'Besteladvies', tekst: 'Testmelding: meldingen werken op dit toestel.', tag: 'test' });
    return { status: 200, versie: FUNCTIE_VERSIE, ...verstuurd };
  }

  if (soort === 'boek') {
    if (!token || !body.winkel) return { status: 401, fout: 'Niet ingelogd' };
    const { data: u } = await sb.auth.getUser(token);
    const user = u && u.user; if (!user) return { status: 401, fout: 'Niet ingelogd' };
    let ok = false;
    const { data: se } = await sb.from('sessies').select('medewerker_id,tot').eq('uid', user.id).eq('winkel_id', body.winkel);
    const sessie = (se || []).find(x => new Date(x.tot) > nu);
    if (sessie) { const { data: m } = await sb.from('medewerkers').select('rol,rechten,actief').eq('id', sessie.medewerker_id); const mw = m && m[0]; ok = !!mw && mw.actief !== false && (mw.rol === 'beheerder' || !!(mw.rechten && mw.rechten.upload)); }
    if (!ok) return { status: 403, fout: 'Geen recht' };
    const naam = body.bron === 'kw' ? 'KW' : 'Vers';
    const tekst = `${body.nieuw || 0} nieuw, ${body.uit || 0} uit assortiment${body.uit ? ' – schap aanpassen' : ''}.`;
    await stuur((abos || []).filter(a => a.winkel_id === body.winkel && wil(a, 'boek')), { titel: `Nieuw bestelboek ${naam}`, tekst, tag: 'boek-' + body.bron });
    return { status: 200, ...verstuurd };
  }

  if (soort === 'cron') {
    const { dag, tijd } = lokaleTijd(nu);
    const { data: winkels } = await sb.from('winkels').select('id,naam');
    const gedaan = [];
    for (const w of winkels || []) {
      const W = w.id; const wa = (abos || []).filter(a => a.winkel_id === W);
      if (!wa.length) continue;
      const { data: ir } = await sb.from('instellingen').select('data').eq('winkel_id', W);
      const inst = (ir && ir[0] && ir[0].data) || {};
      const schema = Object.assign({}, STD_SCHEMA, inst.schema || {}); const open = inst.open || STD_OPEN; const t = Object.assign({ bestel: '08:30', export: '10:00', inout: '11:00' }, inst.push || {});
      const { data: agenda } = await sb.from('agenda').select('*').eq('winkel_id', W);
      const gesloten = d => { const a = (agenda || []).find(x => x.dag === d); if (a && a.soort === 'gesloten') return true; const o = open[wd(d)] || ['', '']; return !o[0] && !o[1]; };
      if (tijd >= t.bestel) for (const [o, naam] of ONDERDELEN) {
        const sch = schema[o] || schema.vers; const r = (sch || []).find(x => x.b === wd(dag)); if (!r) continue;
        if (!(await eenmalig(`bestel:${W}:${o}:${dag}`))) continue;
        let L = add(dag, 1); while (wd(L) !== r.l) L = add(L, 1);
        await stuur(wa.filter(a => wil(a, 'bestel_' + o)), { titel: `Vandaag bestellen ${naam}`, tekst: `Levering ${fmtDag(L)}. Open Besteladvies voor het advies.`, tag: 'bestel-' + o });
        gedaan.push(W.slice(0, 4) + ':bestel_' + o);
      }
      if (tijd >= t.export) {
        const gister = add(dag, -1);
        if (!gesloten(gister) && await eenmalig(`export:${W}:${dag}`)) {
          const { data: dv } = await sb.from('dagverkoop').select('dag').eq('winkel_id', W).gte('dag', add(dag, -14)).lte('dag', gister);
          const heb = new Set((dv || []).map(r => r.dag)); const mis = []; if (heb.size) { const eerste = [...heb].sort()[0]; for (let d = add(dag, -14); d <= gister; d = add(d, 1)) if (d >= eerste && !heb.has(d) && !gesloten(d)) mis.push(d); } else if (!gesloten(gister)) mis.push(gister);
          if (mis.includes(gister)) { await stuur(wa.filter(a => a.rol === 'beheer' && wil(a, 'export')), { titel: mis.length > 1 ? `${mis.length} dag-exports ontbreken` : 'Dag-export ontbreekt', tekst: mis.length > 1 ? `Nog niet geüpload: ${mis.slice(-5).map(fmtDag).join(', ')}${mis.length > 5 ? ' en meer' : ''}.` : `De verkoop van ${fmtDag(gister)} is nog niet geüpload.`, tag: 'export' }); gedaan.push(W.slice(0, 4) + ':export'); }
        }
      }
      if (tijd >= t.inout && await eenmalig(`inout:${W}:${dag}`)) {
        const { data: io } = await sb.from('inout').select('*').eq('winkel_id', W);
        const actief = (io || []).filter(x => x.ingekocht > 0 && (!x.eind || x.eind >= dag));
        if (actief.length) {
          const van = actief.reduce((m, x) => (x.start && x.start < m ? x.start : m), add(dag, -60));
          const { data: dv } = await sb.from('dagverkoop').select('dag,data').eq('winkel_id', W).gte('dag', van);
          const dagen = (dv || []).sort((a, b) => a.dag < b.dag ? -1 : 1);
          const namen = [];
          for (const x of actief) {
            const start = x.start || (dagen.find(d => d.data[x.ean]) || {}).dag || dag;
            let tot = 0; for (const d of dagen) if (d.dag >= start && d.data[x.ean]) tot += +d.data[x.ean][0] || 0;
            const laatste = dagen.slice(-7); const perDag = laatste.length ? laatste.reduce((s2, d) => s2 + (d.data[x.ean] ? +d.data[x.ean][0] || 0 : 0), 0) / laatste.length : 0;
            const rest = x.ingekocht - tot; const dagenOp = perDag > 0 ? rest / perDag : null;
            const totEind = x.eind ? Math.round((new Date(x.eind) - new Date(dag)) / 864e5) : null;
            if (rest <= 0 || (dagenOp !== null && (totEind !== null ? dagenOp < totEind : dagenOp < 3))) namen.push(x.ean);
          }
          if (namen.length) {
            const { data: k } = await sb.from('kassa').select('ean,n').eq('winkel_id', W).in('ean', namen);
            const nm = namen.map(e => ((k || []).find(r => r.ean === e) || {}).n || e);
            await stuur(wa.filter(a => a.rol === 'beheer' && wil(a, 'inout')), { titel: 'In/out bijna op', tekst: nm.slice(0, 4).join(', ') + (nm.length > 4 ? ` en ${nm.length - 4} meer` : '') + ' – telefonisch bijbestellen?', tag: 'inout' });
            gedaan.push(W.slice(0, 4) + ':inout');
          }
        }
      }
      const dl = inst.deadline || {}; const regels = (inst.dlRegels || []).filter(r => r && r.t && (r.groepen || []).length);
      let grp = null; const groepen = async () => { if (grp) return grp; grp = {}; const [{ data: bk }, { data: eg }] = await Promise.all([sb.from('boeken').select('bron,artikelen').eq('winkel_id', W), sb.from('eigen_artikelen').select('id,data').eq('winkel_id', W)]); for (const b of bk || []) for (const a of b.artikelen || []) grp[b.bron + ':' + a.nr] = a.groep || ''; for (const e of eg || []) grp['eigen:' + e.id] = (e.data && e.data.groep) || 'Eigen artikelen'; return grp; };
      for (const [lev, naamLev, ods, bronnen] of [['versunie', 'Versunie', ['agf', 'vers', 'brood', 'diep'], ['vers', 'eigen']], ['vantol', 'Van Tol', ['kw'], ['kw']]]) {
        const eigen = regels.filter(r => r.lev === lev); const inRegel = new Set(eigen.flatMap(r => r.groepen));
        const units = (dl[lev] ? [{ id: 's', naam: naamLev, d: 0, t: dl[lev], groepen: null }] : []).concat(eigen.map((r, i) => ({ id: 'r' + i, naam: naamLev + ' · ' + regelNaam(r), d: +r.d || 0, t: r.t, groepen: r.groepen })));
        for (const u of units) {
          const dmin = minuten(u.t), nmin = minuten(tijd); if (nmin < dmin - 30 || nmin >= dmin) continue;
          for (let k = 0; k <= 3; k++) {
            const bdag = add(dag, -k); const od = ods.find(o => (schema[o] || schema.vers || []).some(x => x.b === wd(bdag))); if (!od) continue;
            const r0 = (schema[od] || schema.vers).find(x => x.b === wd(bdag)); let L = add(bdag, 1); while (wd(L) !== r0.l) L = add(L, 1);
            let dd = add(bdag, u.d); if (dd >= L) dd = add(L, -1); if (dd !== dag) continue;
            if (!(await eenmalig(`deadline:${W}:${lev}:${u.id}:${bdag}`))) continue;
            let { data: be } = await sb.from('bestellingen').select('besteld,aantal,bron,nr').eq('winkel_id', W).eq('besteldag', bdag).in('bron', bronnen);
            if (eigen.length) { const g = await groepen(); be = (be || []).filter(x => { const gg = g[x.bron + ':' + x.nr] || ''; return u.groepen ? u.groepen.includes(gg) : !inRegel.has(gg); }); }
            const open = (be || []).filter(r => !r.besteld && +r.aantal > 0).length; const besteld = (be || []).filter(r => r.besteld).length;
            if (!open && besteld) continue;
            const voor = k ? ` (levering ${DAGEN[wd(L)]})` : '';
            await stuur(wa.filter(a => wil(a, 'deadline')), { titel: `Nog ${dmin - nmin} min: ${u.naam}${voor}`, tekst: open ? `${open} artikelen nog niet afgevinkt. Deadline ${u.t}.` : `Er is nog niets afgevinkt. Deadline ${u.t}.`, tag: 'deadline-' + lev + '-' + u.id });
            gedaan.push(W.slice(0, 4) + ':deadline_' + lev + '_' + u.id);
          }
        }
      }
      if (tijd >= t.export && abos.some(a => a.winkel_id === W && wil(a, 'folder')) && await eenmalig(`folderchk:${W}:${dag}`)) {
        const { data: kw } = await sb.from('kw_acties').select('week').eq('winkel_id', W); const heb = new Set((kw || []).map(r => r.week));
        for (let n = 1; n <= 4; n++) {
          const ma = add(dag, 7 * n - wd(dag)); const iw = isoWeek(ma); const x = typeof iw === "object" ? iw : { y: +ma.slice(0, 4) + (iw < 10 && ma.slice(5, 7) === "12" ? 1 : iw > 50 && ma.slice(5, 7) === "01" ? -1 : 0), w: iw }; const k = `${x.y}-${String(x.w).padStart(2, '0')}`; if (heb.has(k)) continue;
          let online = false; for (const u of folderUrls(x.y, x.w)) { try { const r = await haal(u, { headers: { Range: 'bytes=0-1023' } }); if (r.ok) { online = true; try { await r.body?.cancel?.(); } catch (e) { } break; } } catch (e) { } }
          if (online && await eenmalig(`folder:${W}:${k}`)) { await stuur(wa.filter(a => wil(a, 'folder')), { titel: `Folderplanning week ${x.w} staat online`, tekst: 'Open Acties KW om de acties in te delen. De app haalt hem vanzelf op.', tag: 'folder-' + k }); gedaan.push(W.slice(0, 4) + ':folder_' + x.w); }
        }
      }
      if (wd(dag) === 0 && tijd >= t.bestel && await eenmalig(`week:${W}:${dag}`)) {
        const van = add(dag, -7), tot = add(dag, -1);
        const [{ data: be }, { data: dv }, { data: as }] = await Promise.all([
          sb.from('bestellingen').select('besteld').eq('winkel_id', W).gte('besteldag', van).lte('besteldag', tot),
          sb.from('derving').select('aantal').eq('winkel_id', W).gte('dag', van).lte('dag', tot),
          sb.from('assortiment').select('status,opgenomen,sinds').eq('winkel_id', W).gte('sinds', van).lte('sinds', tot)]);
        const nb = (be || []).filter(r => r.besteld).length; const nd = (dv || []).reduce((x, r) => x + (+r.aantal || 0), 0);
        const ns = (as || []).filter(r => r.status === 'gesaneerd').length, no = (as || []).filter(r => r.status === 'in' && r.opgenomen).length;
        await stuur(wa.filter(a => wil(a, 'week')), { titel: `Weekoverzicht week ${isoWeek(van)}`, tekst: `${nb} artikelen besteld · derving ${Math.round(nd)} st · ${ns} gesaneerd · ${no} opgenomen. Bekijk "Hoe goed was het advies" in de app.`, tag: 'week' });
        gedaan.push(W.slice(0, 4) + ':week');
      }
    }
    return { status: 200, dag, tijd, gedaan, ...verstuurd };
  }
  return { status: 400, fout: 'Onbekende soort' };
}

export function geheimeSleutel() {
  const s = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (s) { try { const j = JSON.parse(s); const v = j.default || Object.values(j)[0]; if (v) return v; } catch (e) { if (/^sb_secret_/.test(s)) return s; } }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}
export function start(webpush, createClient) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    try {
      const sb = createClient(Deno.env.get('SUPABASE_URL'), geheimeSleutel(), { auth: { persistSession: false, autoRefreshToken: false } });
      const clean = s => String(s || '').replace(/[^A-Za-z0-9_-]/g, '');
      webpush.setVapidDetails('https://carloradici.github.io/Coop-Besteladvies/', clean(Deno.env.get('VAPID_PUBLIC')), clean(Deno.env.get('VAPID_PRIVATE')));
      const body = await req.json().catch(() => ({}));
      const auth = req.headers.get('authorization') || '';
      const token = auth.startsWith('Bearer ') && auth.split('.').length === 3 ? auth.slice(7) : null;
      const r = await verwerk({ sb, webpush, body, token });
      const { status, ...rest } = r;
      return new Response(JSON.stringify(rest), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ fout: String(e && e.message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  });
}
