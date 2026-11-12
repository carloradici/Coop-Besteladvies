/* ---------- laden / synchroniseren ---------- */
async function loadCache() {
  outbox = (await iget('outbox')) || [];
  if (!W) return false;
  const c = await iget('cache:' + W); if (!c) return false;
  Object.assign(S, c, { schapOk: new Set(c.schapOk || []) });
  S.dagen = {}; for (const d of Object.keys(S.dagMeta || {})) { const v = await iget('d:' + W + ':' + d); if (v) S.dagen[d] = v; }
  rol = c.rol || rol; WINKEL = c.WINKEL || WINKEL; winkels = c.winkels || winkels;
  applyOutboxLocal();
  return true;
}
async function saveCache() {
  if (!W || OEFEN) return;
  const c = { kassa: S.kassa, boeken: S.boeken, acties: S.acties, agenda: S.agenda, inst: S.inst, voorraad: S.voorraad, bestel: S.bestel, schapOk: [...S.schapOk], inout: S.inout, dagMeta: S.dagMeta, medewerkers: S.medewerkers, winkel: S.winkel, assort: S.assort, notities: S.notities, pref: S.pref, eigen: S.eigen, min: S.min, overdracht: S.overdracht, lever: S.lever, derving: S.derving, prijsOk: S.prijsOk, tafels: S.tafels, indeling: S.indeling, rol, eigenaar, WINKEL, winkels };
  await iset('cache:' + W, c);
}
async function sync(full) {
  if (DEMO || OEFEN) return;
  if (!OPEN) return;
  try {
    setSync('Bijwerken…');
    winkels = await rpc('mijn_winkels');
    if (!winkels.length) { if (sess && sess.kind === 'anon') ontkoppeld(); else geenWinkel(); return; }
    if (!W || !winkels.some(x => x.id === W)) {
      if (winkels.length === 1) { W = winkels[0].id; ls.set('cba-w', W); }
      else { kiesWinkel(); return; }
    }
    WINKEL = winkels.find(x => x.id === W); eigenaar = berekenEigenaar();
    if (WINKEL.open === false) { setSync(); inlogScherm(); return; }
    await flush();
    const [inst, agenda, boekMeta, acties, dagMeta, vr, be, so, io, mws, ass, nts, wr, eig, mins, ovd, lvc, drv, pok, tfl, tfi, lg, kwa] = await Promise.all([
      rest(wq('instellingen?select=data')), rest(wq('agenda?select=*')), rest(wq('boeken?select=bron,geupload')), rest(wq('acties?select=*&order=van.asc')),
      getAll(wq(`dagverkoop?select=dag,geupload&dag=gte.${C.add(C.today(), -460)}&order=dag.asc`)),
      getAll(wq(`voorraad?dag=gte.${C.add(C.today(), -35)}`)), rest(wq(`bestellingen?besteldag=gte.${C.add(C.today(), -21)}`)), rest(wq('schap_ok?select=bron,nr,ok')), rest(wq('inout?select=*')),
      rest(wq('medewerkers?select=id,naam,rol,rechten,actief,heeft_pin,email&order=naam.asc')), getAll(wq('assortiment?select=*')), rest(wq('notities?select=*')), rest(`winkels?id=eq.${W}&select=koppelcode,code_tot,naam,plaats`),
      rest(wq('eigen_artikelen?select=id,data')).catch(() => []), rest(wq('schap_min?select=bron,nr,min')).catch(() => []),
      rest(wq('overdracht?klaar=eq.false&select=*')).catch(() => []), rest(wq(`levercheck?lever=gte.${C.add(C.today(), -35)}&select=*`)).catch(() => []), getAll(wq(`derving?dag=gte.${C.add(C.today(), -60)}&select=*`)).catch(() => []),
      rest(wq('prijs_ok?select=bron,nr,prijs')).catch(() => []), rest(wq('tafels?select=id,data')).catch(() => []), rest(wq(`tafel_indeling?week=gte.${weekSleutel(C.add(C.today(), -63))}&select=week,tafel_id,data`)).catch(() => []),
      rest(wq(`leeg?dag=gte.${C.add(C.today(), -35)}&select=bron,nr,dag,door`)).catch(() => []), rest(wq('kw_acties?select=week,data&order=week.asc')).catch(() => [])
    ]);
    S.overdracht = {}; ovd.forEach(r => S.overdracht[r.id] = r);
    S.leeg = {}; lg.forEach(r => S.leeg[r.bron + ':' + r.nr + '|' + r.dag] = r);
    S.kwplan = {}; S.versplan = {}; kwa.forEach(r => { if (/\|vers$/.test(r.week)) S.versplan[r.week.slice(0, -5)] = Object.assign({}, r.data || {}); else S.kwplan[r.week] = Object.assign({ week: r.week }, r.data || {}); });
    S.lever = {}; lvc.forEach(r => S.lever[r.bron + ':' + r.nr + '|' + r.lever] = r);
    S.derving = {}; drv.forEach(r => S.derving[r.id] = r);
    S.prijsOk = {}; pok.forEach(r => S.prijsOk[r.bron + ':' + r.nr] = +r.prijs);
    S.tafels = {}; tfl.forEach(r => S.tafels[r.id] = Object.assign({ id: r.id }, r.data || {}));
    S.indeling = {}; tfi.forEach(r => S.indeling[r.week + '|' + r.tafel_id] = r.data || { items: [] });
    S.eigen = {}; eig.forEach(r => S.eigen[r.id] = Object.assign({ id: r.id }, r.data || {}));
    S.min = {}; mins.forEach(r => { if (+r.min > 0) S.min[r.bron + ':' + r.nr] = +r.min; });
    rol = eigenaar ? 'admin' : 'winkel'; S.medewerkers = mws.filter(m => m.actief !== false);
    S.winkel = Object.assign({}, S.winkel || {}, wr[0] ? { code: wr[0].koppelcode, tot: wr[0].code_tot, naam: wr[0].naam, plaats: wr[0].plaats } : {});
    if (eigenaar) { try { const t = await rest(wq('toestellen?select=uid')); S.winkel.toestellen = t.length; } catch (e) { } }
    S.inst = inst[0] ? inst[0].data : null; S.agenda = agenda; S.acties = acties;
    for (const b of boekMeta) { const cur = S.boeken[b.bron]; if (full || !cur || cur.geupload !== b.geupload) { const r = await rest(wq(`boeken?bron=eq.${b.bron}`)); if (r[0]) S.boeken[b.bron] = r[0]; } }
    for (const k of Object.keys(S.boeken)) if (!boekMeta.some(b => b.bron === k)) delete S.boeken[k];
    const want = {}; dagMeta.forEach(d => want[d.dag] = d.geupload);
    const need = Object.keys(want).filter(d => full || S.dagMeta[d] !== want[d] || !S.dagen[d]);
    for (let i = 0; i < need.length; i += 15) {
      const part = need.slice(i, i + 15); setSync(`Verkoop laden ${Math.min(i + 15, need.length)}/${need.length}`);
      const rows = await rest(wq(`dagverkoop?dag=in.(${part.join(',')})&select=dag,data,geupload`));
      for (const r of rows) { S.dagen[r.dag] = r.data; S.dagMeta[r.dag] = r.geupload; await iset('d:' + W + ':' + r.dag, r.data); }
    }
    for (const d of Object.keys(S.dagMeta)) if (!(d in want)) { delete S.dagMeta[d]; delete S.dagen[d]; await idel('d:' + W + ':' + d); }
    if (need.length || full || !Object.keys(S.kassa).length) { const k = await getAll(wq('kassa?select=*')); S.kassa = {}; k.forEach(r => S.kassa[r.ean] = r); }
    S.voorraad = {}; vr.forEach(r => S.voorraad[r.bron + ':' + r.nr] = { aantal: +r.aantal, dag: r.dag, door: r.door });
    S.bestel = {}; be.forEach(r => S.bestel[r.bron + ':' + r.nr + '|' + r.besteldag] = { aantal: r.aantal === null ? null : +r.aantal, lever: r.lever, besteldag: r.besteldag, besteld: !!r.besteld, besteld_door: r.besteld_door, besteld_om: r.besteld_om, advies: r.advies === null || r.advies === undefined ? null : +r.advies, reden: r.reden || null });
    S.schapOk = new Set(so.filter(r => r.ok !== false).map(r => r.bron + ':' + r.nr)); S.inout = {}; io.forEach(r => S.inout[r.ean] = r);
    S.assort = {}; ass.forEach(r => S.assort[r.bron + ':' + r.nr] = r);
    S.notities = {}; nts.forEach(r => { if (r.tekst) S.notities[r.sleutel] = r; });
    try { const ro = await rest(wq('voorkeuren?wie=eq.route')); if (ro[0] && ro[0].data) { S.route = ro[0].data; ls.set('cba-route', S.route); } } catch (e) { }
    try { const pr = await rest(wq(`voorkeuren?wie=eq.${encodeURIComponent(wieSleutel())}`)); if (pr[0] && pr[0].data) { S.pref = pr[0].data; ls.set('cba-pref', S.pref); pasPrefToe(); } } catch (e) { }
    applyOutboxLocal();
    await saveCache(); online = true; setSync();
    rebuild();
    if (!mw || !mwLijst().some(m => m.id === mw.id)) { inlogScherm(); return; }
    if (!document.body.classList.contains('inlog')) render();
  } catch (e) {
    console.warn(e); online = false; setSync();
    if (/niet ingelogd|refresh|Invalid Refresh|401|JWT/i.test(e.message) && navigator.onLine) { sess = null; ls.del('cba-sess'); showLogin('Je sessie is verlopen. Log opnieuw in of koppel het toestel opnieuw.'); }
  }
}
function applyOutboxLocal() { for (const o of outbox) applyLocal(o); }
function applyLocal(o) {
  for (const r of o.rows || []) {
    if (o.t === 'voorraad') S.voorraad[r.bron + ':' + r.nr] = { aantal: +r.aantal, dag: r.dag, door: r.door };
    if (o.t === 'bestellingen') { const k = r.bron + ':' + r.nr + '|' + r.besteldag; const o2 = Object.assign({}, S.bestel[k] || {}); if ('aantal' in r) o2.aantal = r.aantal === null ? null : +r.aantal; if ('besteld' in r) { o2.besteld = !!r.besteld; o2.besteld_door = r.besteld_door; o2.besteld_om = r.besteld_om; } o2.lever = r.lever || o2.lever; o2.besteldag = r.besteldag; if ('advies' in r) o2.advies = r.advies; if ('reden' in r) o2.reden = r.reden; S.bestel[k] = o2; }
    if (o.t === 'schap_ok') { if (r.ok === false) S.schapOk.delete(r.bron + ':' + r.nr); else S.schapOk.add(r.bron + ':' + r.nr); }
    if (o.t === 'assortiment') S.assort[r.bron + ':' + r.nr] = Object.assign({}, S.assort[r.bron + ':' + r.nr] || {}, r);
    if (o.t === 'notities') { if (r.tekst) S.notities[r.sleutel] = r; else delete S.notities[r.sleutel]; }
    if (o.t === 'activiteit') S.act.push(r);
    if (o.t === 'inout') S.inout[r.ean] = r;
    if (o.t === 'overdracht') { if (r.klaar) delete S.overdracht[r.id]; else S.overdracht[r.id] = Object.assign({}, S.overdracht[r.id] || {}, r); }
    if (o.t === 'levercheck') S.lever[r.bron + ':' + r.nr + '|' + r.lever] = r;
    if (o.t === 'derving') S.derving[r.id] = r;
    if (o.t === 'leeg') { S.leeg = S.leeg || {}; S.leeg[r.bron + ':' + r.nr + '|' + r.dag] = r; }
    if (o.t === 'kw_acties') { S.kwplan = S.kwplan || {}; S.versplan = S.versplan || {}; if (/\|vers$/.test(r.week)) S.versplan[r.week.slice(0, -5)] = Object.assign({}, r.data || {}); else S.kwplan[r.week] = Object.assign({ week: r.week }, r.data || {}); }
    if (o.t === 'prijs_ok') S.prijsOk[r.bron + ':' + r.nr] = +r.prijs;
    if (o.t === 'tafels') S.tafels[r.id] = Object.assign({ id: r.id }, r.data || {});
    if (o.t === 'tafel_indeling') S.indeling[r.week + '|' + r.tafel_id] = r.data || { items: [] };
    if (o.t === 'eigen_artikelen') S.eigen[r.id] = Object.assign({ id: r.id }, r.data || {});
    if (o.t === 'schap_min') { if (+r.min > 0) S.min[r.bron + ':' + r.nr] = +r.min; else delete S.min[r.bron + ':' + r.nr]; }
  }
}
async function write(t, rows, stil) {
  rows = rows.map(r => Object.assign({ winkel_id: W }, r));
  const o = { t, rows }; applyLocal(o);
  if (t !== 'activiteit' && t !== 'voorkeuren') opgeslagenFlits();
  if (DEMO || OEFEN) { if (t !== 'activiteit' && t !== 'voorkeuren' && !stil) render(true); return; }
  if (PK[t] && rows.length === 1) { const pk = PK[t].split(','); const old = outbox.find(x => x.t === t && x.rows.length === 1 && pk.every(k => String(x.rows[0][k]) === String(rows[0][k]))); if (old) { o.rows = [Object.assign({}, old.rows[0], rows[0])]; outbox = outbox.filter(x => x !== old); } }
  outbox.push(o); await iset('outbox', outbox); await saveCache(); setSync();
  flush().then(() => setSync());
}
let flushing = false;
async function flush() {
  if (DEMO || OEFEN || flushing || !outbox.length) return; flushing = true;
  try {
    while (outbox.length) {
      const o = outbox[0];
      try { if (PK[o.t]) await upsert(o.t, o.rows, PK[o.t]); else await rest(o.t, { method: 'POST', body: o.rows, headers: { Prefer: 'return=minimal' }, noBody: true }); }
      catch (e) { if (/^(400|403|409):/.test(e.message)) { console.warn('geweigerd', o, e.message); toast('Niet opgeslagen: geen recht of ongeldige gegevens', 4000); } else throw e; }
      outbox.shift(); await iset('outbox', outbox);
    }
    online = true;
  }
  catch (e) { online = false; }
  finally { flushing = false; }
}
function setSync(t) {
  const el = $('#sync'); if (!el) return;
  if (DEMO) { el.textContent = 'Testversie – voorbeelddata'; el.className = 'sync'; return; }
  if (OEFEN) { el.textContent = 'Oefenen – er wordt niets opgeslagen'; el.className = 'sync'; return; }
  if (t) { el.textContent = t; el.className = 'sync'; return; }
  const w = outbox.length;
  el.textContent = !online ? (w ? `Offline – ${w} ${w === 1 ? 'wijziging wacht' : 'wijzigingen wachten'}` : 'Offline – je ziet de laatst opgehaalde gegevens') : (w ? `Opslaan… ${w} wacht` : 'Online – alle toestellen gelijk');
  el.className = 'sync' + (online ? '' : ' off');
}
window.addEventListener('online', () => { online = true; sync(); });
window.addEventListener('offline', () => { online = false; setSync(); });

function rebuild() {
  M = C.buildModel({ dagen: S.dagen, kassa: S.kassa, boeken: S.boeken, acties: alleActies(), agenda: S.agenda, inst: S.inst, vandaag: C.today(), eigen: Object.values(S.eigen || {}) });
  M.min = S.min || {};
  M.derv = {}; const grens = C.add(C.today(), -28); for (const r of Object.values(S.derving || {})) if (r.dag >= grens && r.soort === 'weg') M.derv[r.bron + ':' + r.nr] = (M.derv[r.bron + ':' + r.nr] || 0) + (+r.aantal || 0);
  M.dervSchat = schatDerving();
  naModel(); boModel();
}
function schatDerving() {
  const out = {}; const sg = new Set(((S.inst || {}).dervSchat) || []); if (!sg.size || !M.dagLijst.length) return out;
  const d1 = M.dagLijst[M.dagLijst.length - 1]; if (C.diff(d1, C.today()) > 7) return out;
  const d0 = C.add(d1, -27); let dek = 0; for (let d = d0; d <= d1; d = C.add(d, 1)) { const i = C.idx(M, d); if (i >= 0 && i < M.N && M.heeftData[i]) dek++; }
  if (dek < 22) return out;
  const ont = {}, nLev = {};
  for (const k in S.bestel) { const b = S.bestel[k]; if (!b || !b.lever || b.lever < d0 || b.lever > d1) continue; const key = k.split('|')[0]; const n = b.aantal !== null && b.aantal !== undefined ? +b.aantal : b.besteld ? +(b.advies || 0) : 0; if (!(n > 0)) continue; ont[key] = (ont[key] || 0) + n; nLev[key] = (nLev[key] || 0) + 1; }
  for (const key in ont) {
    if (M.derv[key] || nLev[key] < 3) continue; const a = M.art[key]; if (!a || !sg.has(groepVan(a))) continue; const sr = M.keys[key]; if (!sr || sr.kg) continue;
    const he = a.perHE && a.he > 0 ? a.he : 1; let verk = 0; for (let d = d0; d <= d1; d = C.add(d, 1)) { const i = C.idx(M, d); if (i >= 0 && i < M.N) verk += sr.v[i]; }
    const est = Math.round(ont[key] * he - verk); if (est > 0) { M.derv[key] = est; out[key] = { besteld: C.r(ont[key] * he, 1), verkocht: C.r(verk, 1) }; }
  }
  return out;
}
