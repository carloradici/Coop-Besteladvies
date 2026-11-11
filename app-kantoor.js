/* ---------- 1.36: werkvloer en kantoor, start hier, rapporten, testpakket, gebruik ---------- */
function kantoorMag() { return isBeheer() || mag('instellingen') || mag('upload') || mag('team'); }
const KANTOOR_G = ['bestellen', 'team', 'plekken', 'data', 'winkel'];
function startPunten() {
  const i = S.inst || {}, st = i.start || {}, dl = Object.values(i.deadline || {}), last = M.dagLijst[M.dagLijst.length - 1];
  return [
    ['dl', 'Deadlines invullen', dl.length > 0 && dl.every(Boolean), () => naarBeheer('dagen')],
    ['dagen', 'Besteldagen controleren', !!st.dagen, () => naarBeheer('dagen'), 1],
    ['boek', 'Bestelboeken uploaden', !!(S.boeken.vers && S.boeken.kw), () => naarBeheer('upload')],
    ['auto', 'Verkoop komt elke dag vanzelf binnen', !!last && C.diff(last, C.today()) <= 1, () => naarBeheer('auto')],
    ['route', 'Looproute nalopen', !!st.route, () => ga('route'), 1],
    ['bo', 'Brood Opzet koppelen', !!(i.bo && i.bo.url && S.bo), () => naarBeheer('brood')],
    ['mw', 'Eerste medewerker toevoegen', mwLijst().some(m => m.rol !== 'beheerder' && !/^test$/i.test(m.naam || '')), () => ga('medewerkers')]];
}
function startHtml() {
  const p = startPunten(), klaar = p.filter(x => x[2]).length; if (klaar === p.length) return '';
  return `<div class="blk starthier"><h2>🚀 Start hier <small class="small">${klaar} van ${p.length} klaar</small></h2><div class="list">${p.map(([k, t, ok, , bev]) => `<div class="it"><span style="flex:1">${ok ? '✅' : '⬜'} ${ok ? `<s>${t}</s>` : `<b>${t}</b>`}</span>${ok ? '' : `${bev && mag('instellingen') ? `<button class="btn sm sec" data-spk="${k}">✓ Klopt</button>` : ''}<button class="btn sm" data-sp="${k}">Open</button>`}</div>`).join('')}</div></div>`;
}
function startEvents(v) {
  v.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { const x = startPunten().find(y => y[0] === b.dataset.sp); if (x) x[3](); });
  v.querySelectorAll('[data-spk]').forEach(b => b.onclick = () => { const w = Object.assign({}, S.inst, { start: Object.assign({}, (S.inst || {}).start, { [b.dataset.spk]: true }) }); if (DEMO) { S.inst = w; render(); } else saveInst(w); });
}
function kantoorKaart() {
  const r = [], open = startPunten().filter(p => !p[2]).length, last = M.dagLijst[M.dagLijst.length - 1], t = assortTelling(), tt = tafelTelling();
  if (open) r.push(`🚀 Start hier: nog ${open} ${open === 1 ? 'punt' : 'punten'}`);
  if (!last || C.diff(last, C.today()) > 1) r.push(`<b class="rood">Verkoop ${last ? 't/m ' + C.fmtDag(last) : 'nog niet binnen'}</b>`);
  if (t.nieuw || t.uit || t.san) r.push(`Assortiment: ${t.nieuw} nieuw · ${t.uit + t.san} schap aanpassen`);
  if (tt.ombouw && tt.open) r.push(`<b class="rood">Actietafels ombouwen: ${tt.klaar} van ${tt.totaal} klaar</b>`);
  if (C.wd(C.today()) <= 2) r.push('📊 Rapport van vorige week staat klaar');
  return `<button class="blk kantoorkaart" id="naarKantoor"><span class="meeric">🗂</span><span style="flex:1"><b>Kantoor</b><br><span class="small">${r.join('<br>') || 'Alles bijgewerkt 👍'}</span></span><span class="pijl">›</span></button>`;
}
function naarKantoor() { ui.meerG = 'kantoor'; ga('meer'); }
/* rapporten: vorige week, advies, acties */
function vorigeWeek() { const w = C.isoWeek(C.add(C.today(), -7)); return `${w.y}-${String(w.w).padStart(2, '0')}`; }
async function renderRapport() {
  const t = ui.rapT || 'week', v = $('#view');
  if (t === 'advies') await renderHoeGoed();
  else if (t === 'acties') {
    const wk = vorigeWeek(), p = (S.kwplan || {})[wk], f = p && p.folder, a = (S.acties || []).find(x => x.id === wk);
    let h = f && f.van ? terugblikHtml(f.van, f.tm, f.items.filter(i => i.soort === 'kw' && !i.instore && kwStatus(p, i.id)).map(i => [i.naam, kwKeys(i)])).replace('↩ Terugblik', '↩ KW-acties') : '';
    if (a && a.van) { const vp = versPlan(wk); h += terugblikHtml(a.van, a.tm || C.add(a.van, 6), versActies(wk).filter(i => (vp.plek || {})[i.nr]).map(i => [i.naam, [versKey(i.nr)].filter(Boolean)])).replace('↩ Terugblik', '↩ Vers-acties'); }
    v.innerHTML = h || `<div class="empty">Geen acties ingedeeld in week ${+wk.split('-')[1]}.</div>`;
  } else { v.innerHTML = weekOverzichtHtml(true); weekOverzichtEvents(v); }
  if (ui.tab !== 'rapport' || v.querySelector('.rapseg')) return;
  const d = document.createElement('div'); d.className = 'rapseg'; d.innerHTML = `<div class="segment licht">${[['week', 'Vorige week'], ['advies', 'Advies'], ['acties', 'Acties']].map(([k, n]) => `<button class="${t === k ? 'aan' : ''}" data-rt="${k}">${n}</button>`).join('')}</div>`;
  v.prepend(d); d.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => { ui.rapT = b.dataset.rt; render(); });
}
/* bestand delen (back-up, testpakket) */
function deelJson(naam, d) {
  const file = new File([JSON.stringify(d)], naam, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: naam }).catch(() => { }); else { const u = URL.createObjectURL(file); const a = document.createElement('a'); a.href = u; a.download = naam; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
  return file.size;
}
function testPakket() {
  const van = C.add(C.today(), -120), dagen = {}; for (const d in S.dagen) if (d >= van) dagen[d] = S.dagen[d];
  const n = deelJson(`Besteladvies testpakket ${C.today()}.json`, { app: 'Coop Besteladvies testpakket', versie: VERSIE, gemaakt: new Date().toISOString(), dagen, kassa: S.kassa, boeken: S.boeken, acties: S.acties, agenda: S.agenda, inst: Object.assign({}, S.inst, { bo: S.inst && S.inst.bo ? Object.assign({}, S.inst.bo, { code: '' }) : undefined }), assort: S.assort, eigen: S.eigen, bo: S.bo, route: S.route, kwplan: S.kwplan, versplan: S.versplan, tafels: S.tafels, indeling: S.indeling });
  log('beheer', 'Testpakket gemaakt'); toast(`Testpakket klaar (${Math.round(n / 1024)} KB). Stuur het naar Claude.`, 4000);
}
/* wat wordt gebruikt */
let GEBRUIK = ls.get('cba-gebruik') || {}, gebruikLaatst = '';
function telGebruik() {
  const k = hulpSleutel(); if (k === gebruikLaatst || OEFEN) return; gebruikLaatst = k;
  const g = GEBRUIK[k] || (GEBRUIK[k] = { n: 0, sinds: C.today() }); g.n++; g.l = C.today(); ls.set('cba-gebruik', GEBRUIK);
  clearTimeout(telGebruik.t); if (!DEMO) telGebruik.t = setTimeout(() => write('voorkeuren', [{ wie: 'gebruik:' + wieSleutel(), data: GEBRUIK }], true), 10000);
}
async function renderGebruik() {
  const v = $('#view'); let rows = [{ data: GEBRUIK }];
  if (!DEMO) try { rows = await rest(wq('voorkeuren?wie=like.gebruik:*&select=wie,data')); } catch (e) { }
  const tot = {}; let sinds = C.today();
  for (const r of rows) for (const [k, g] of Object.entries(r.data || {})) { const t = tot[k] || (tot[k] = { n: 0, l: '', wie: 0 }); t.n += g.n || 0; t.wie++; if ((g.l || '') > t.l) t.l = g.l; if (g.sinds && g.sinds < sinds) sinds = g.sinds; }
  const l = Object.keys(HULP).filter(k => !['eigen', 'scannen', 'tellen', 'printen', 'gebruik'].includes(k)).map(k => [k, (k.startsWith('meer:') ? 'Meer › ' : k.startsWith('beheer:') ? 'Kantoor › ' : '') + HULP[k][0], tot[k] || { n: 0, l: '', wie: 0 }]).sort((a, b) => a[2].n - b[2].n);
  const dgn = C.diff(sinds, C.today());
  v.innerHTML = `<div class="blk"><p class="small">Gemeten sinds ${C.fmtDag(sinds)} (${dgn} ${dgn === 1 ? 'dag' : 'dagen'}), op alle toestellen samen. ${dgn < 28 ? 'Na 4 weken zie je goed wat niemand gebruikt.' : ''}</p></div>
  <div class="blk lijstblok"><table class="wk"><tr><th style="text-align:left">Scherm</th><th>Keer</th><th>Laatst</th></tr>${l.map(([, t, x]) => `<tr${x.n ? '' : ' class="rood"'}><td class="l" style="width:auto">${esc(t)}</td><td>${x.n || '–'}</td><td>${x.l ? C.fmtDag(x.l) : 'nooit'}</td></tr>`).join('')}</table></div>`;
}
