// Coop Besteladvies – pushmeldingen (Supabase Edge Function "stuur-push").
// Wordt door de korte stuur-push in Supabase opgehaald van GitHub. Bijwerken = dit bestand uploaden en in Supabase op Deploy tikken.
// Soorten: test (één toestel), boek (na upload bestelboek, alleen met geldige pincode-sessie: beheerder of recht upload), cron (elk kwartier, per winkel: besteldag per onderdeel, dag-export, in/out).
const STD_SCHEMA = { vers: [{ b: 0, l: 2 }, { b: 2, l: 4 }, { b: 4, l: 0 }], kw: [{ b: 0, l: 2 }, { b: 2, l: 4 }, { b: 3, l: 0 }] };
const ONDERDELEN = [['agf', 'AGF'], ['vers', 'Vers'], ['brood', 'Brood'], ['diep', 'Diepvries'], ['kw', 'KW']];
const STD_OPEN = [['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['', '']];
const DAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const add = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const wd = s => (new Date(s + 'T12:00:00Z').getUTCDay() + 6) % 7;
const fmtDag = s => { const d = new Date(s + 'T12:00:00Z'); return `${DAGEN[wd(s)]} ${d.getUTCDate()}-${d.getUTCMonth() + 1}`; };

export function lokaleTijd(nu) {
  const p = {}; for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(nu)) p[x.type] = x.value;
  return { dag: `${p.year}-${p.month}-${p.day}`, tijd: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}

export async function verwerk({ sb, webpush, body, token, nu = new Date() }) {
  const soort = body && body.soort;
  const { data: abos } = await sb.from('push_abos').select('*');
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
    return { status: 200, ...verstuurd };
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
          const { data: dv } = await sb.from('dagverkoop').select('dag').eq('winkel_id', W).eq('dag', gister);
          if (!dv || !dv.length) { await stuur(wa.filter(a => a.rol === 'beheer' && wil(a, 'export')), { titel: 'Dag-export ontbreekt', tekst: `De verkoop van ${fmtDag(gister)} is nog niet geüpload.`, tag: 'export' }); gedaan.push(W.slice(0, 4) + ':export'); }
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
    }
    return { status: 200, dag, tijd, gedaan, ...verstuurd };
  }
  return { status: 400, fout: 'Onbekende soort' };
}

export function start(webpush, createClient) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    try {
      const sb = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
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
