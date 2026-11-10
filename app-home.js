/* ---------- weergave ---------- */
function render(soft) {
  if (!M) return; const sl = schermSleutel(), zelfde = sl === scrollSleutel, doelY = zelfde ? window.scrollY : (SCROLL[sl] || 0); scrollSleutel = ''; window.__doelY = doelY;
  renderScherm(soft);
  scrollSleutel = sl; if (!BESTEL_OD.includes(ui.tab)) window.scrollTo(0, Math.min(doelY, document.body.scrollHeight)); SCROLL[sl] = window.scrollY;
}
function renderScherm(soft) {
  const kan = { agf: mag('o_agf'), vers: mag('o_vers'), brood: mag('o_brood'), diep: mag('o_diep'), kw: mag('o_kw'), overig: mag('o_overig'), beheer: mag('upload') || mag('instellingen'), medewerkers: mag('team'), mwedit: mag('team'), winkel: mag('team'), vandaag: mag('team'), export: mag('upload') || mag('bestellen'), hoegoed: mag('bestellen'), leverancier: mag('bestellen') || mag('afvinken'), acties: mag('bestellen') };
  if (ui.tab in kan && !kan[ui.tab]) ui.tab = 'home';
  document.querySelectorAll('nav.tabs button').forEach(b => { b.classList.toggle('on', b.dataset.t === (ui.tab === 'home' ? 'home' : ui.tab === 'taken' ? 'taken' : ui.tab === 'meer' || MEER_SUB.includes(ui.tab) ? 'meer' : '')); if (b.dataset.t === 'tellen') b.classList.toggle('hide', !mag('tellen')); });
  const v = $('#view'); if (!v) return;
  v.onclick = null; v.onchange = null;
  kop(); oefenBalk();
  if (ui.tab === 'home') renderHome();
  else if (BESTEL_OD.includes(ui.tab)) renderLijst(ui.tab, soft);
  else if (ui.tab === 'overig') renderOverig(soft);
  else if (ui.tab === 'assort') renderAssort();
  else if (ui.tab === 'beheer') renderBeheer();
  else if (ui.tab === 'meer') renderMeer();
  else if (ui.tab === 'medewerkers') renderMedewerkers();
  else if (ui.tab === 'mwedit') renderMwEdit();
  else if (ui.tab === 'winkel') renderWinkel();
  else if (ui.tab === 'meldingen') renderMeldingen();
  else if (ui.tab === 'appinst') renderAppInst();
  else if (ui.tab === 'vandaag') renderVandaag();
  else if (ui.tab === 'export') renderExport();
  else if (ui.tab === 'uitleg') renderUitleg();
  else if (ui.tab === 'route') renderRoute();
  else if (ui.tab === 'hoegoed') renderHoeGoed();
  else if (ui.tab === 'leverancier') renderLeverancier();
  else if (ui.tab === 'levering') renderLevering();
  else if (ui.tab === 'acties') renderActies();
  else if (ui.tab === 'tafels') renderTafels();
  else if (ui.tab === 'kwacties') renderKwActies();
  else if (ui.tab === 'taken') renderTaken();
  if (ui.tab === 'tafels' || ui.tab === 'kwacties') plekSegment();
}
function groet() { const h = new Date().getHours(); return h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond'; }
function kop() {
  const bron = ui.tab === 'kw' ? 'kw' : 'vers'; const b = S.boeken[bron];
  const d = new Date(); const datum = `${C.DAGNAAM[C.wd(C.today())]} ${d.getDate()} ${['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'][d.getMonth()]}`;
  const boekTxt = ui.tab === 'kw' ? (b ? `Bestelboek Van Tol${b.datum ? ' · ' + C.fmtDag(b.datum) : ''}` : 'Bestelboek Van Tol') : (b ? `Bestelboek Versunie · week ${b.week || '?'}` : 'Bestelboek Versunie');
  let t = { taken: ['Taken', 'Wat er vandaag moet gebeuren'], tafels: ['Actie planning', 'Vers-acties op de koeltafels'], kwacties: ['Actie planning', 'KW-acties op de koppen'], home: [mijnNaam(), datum + (winkels.length > 1 && WINKEL ? ' · ' + WINKEL.naam : '')], agf: ['AGF', boekTxt], vers: ['Vers', boekTxt], brood: ['Brood', boekTxt], diep: ['Diepvries', boekTxt], kw: ['KW', boekTxt], overig: ['Overig', 'Andere leveranciers en in/out. Alleen verwachte verkoop.'], assort: ['Assortiment', 'Nieuw, uit, gesaneerd en opgenomen'], beheer: ['Beheer', ui.bsub ? (BEHEER_SEC.find(x => x[0] === ui.bsub) || [])[2] || '' : 'Kies wat je wilt doen'], meer: ['Meer', `${mijnNaam()} · ${isBeheer() ? 'beheerder' : 'medewerker'}`], medewerkers: ['Medewerkers', 'Namen, pincodes en rechten'], mwedit: ['Rechten', ''], winkel: ['Winkel', (WINKEL && WINKEL.naam) || ''], meldingen: ['Meldingen', 'Pushmeldingen op dit toestel'], appinst: ['App-instellingen', 'Alleen voor jou'], vandaag: ['Wie deed wat', 'Per dag wat er is gedaan'], export: ['Exporteren', 'Naar Excel'], uitleg: ['Uitleg', 'Hoe de app werkt'], hoegoed: ['Hoe goed was het advies', 'Advies, besteld en verkocht per week'], leverancier: ['Per leverancier', 'Wat er besteld moet worden'], levering: ['Leverdag-check', 'Afvinken bij het uitpakken'], acties: ['Actie planning', '3 · Bestellen voor de actieweek'], tafels: ['Actie planning', ui.tafel && S.tafels[ui.tafel] ? 'Vers · week ' + +tafelWeek().split('-')[1] : 'Vers-acties op de koeltafels'] }[ui.tab] || ['', ''];
  if (ui.tab === 'mwedit') { const m = mwLijst().find(x => x.id === ui.mwId); t[1] = m ? m.naam : ''; }
  if (ui.tab === 'meer' && ui.meerG) { const g = MEER_GROEPEN.find(x => x[0] === ui.meerG); if (g) t = [g[2], g[3]]; }
  $('#kopG').textContent = ui.tab === 'home' ? groet() : ''; $('#kopG').classList.toggle('hide', ui.tab !== 'home');
  $('#terugB').classList.toggle('hide', ui.tab === 'home' || ui.tab === 'taken' || (ui.tab === 'meer' && !ui.meerG)); { const hb = $('#hulpB'); if (hb) hb.classList.remove('hide'); }
  belTel();
  $('#terugB').textContent = ui.tab === 'acties' ? '‹ Actie planning' : ui.tab === 'meer' ? '‹ Meer' : ui.tab === 'mwedit' ? '‹ Medewerkers' : ui.tab === 'tafels' && ui.tafel ? '‹ Alle tafels' :  MEER_SUB.includes(ui.tab) ? '‹ Meer' : '‹ Home';
  $('#kopT').textContent = t[0]; if (BESTEL_OD.includes(ui.tab)) $('#kopS').innerHTML = lijstKopTekst(ui.tab, t[1]); else $('#kopS').textContent = t[1];
  const wb = $('#wieB'); wb.classList.toggle('hide', !mw); if (mw) wb.textContent = `👤 ${mw.naam} ⇄`;
  $('.koplogo').src = logoSrc();
}

/* ---------- home ---------- */
const TEGELS = ONDERDELEN.map(o => [o[0], o[1]]).concat([['plekken', 'Actie planning'], ['assort', 'Assortiment']]);
const ICOON = Object.assign(Object.fromEntries(ONDERDELEN.map(o => [o[0], o[2]])), { plekken: '📅', tafels: '🗂️', kwacties: '📣', assort: '🔄', beheer: '⚙️' });
function bronVan(od) { return od === 'kw' ? 'kw' : 'vers'; }
function bestelStatus(od) {
  if (!S.boeken[bronVan(od)]) return { titel: 'Nog geen bestelboek', sub: mag('upload') ? 'Upload via Beheer' : 'Beheerder uploadt het boek' };
  const cur = besteldag(od).cur; if (!cur) return { titel: 'Geen besteldag', sub: '' };
  const st = voortgang(od, cur);
  if (cur.besteldag < C.today()) { const sl = voortgang(od, cur, true); return { titel: `Nog open voor ${C.DAGEN[C.wd(cur.L)]}`, sub: `${sl.open ? `nog ${sl.open} te gaan` : 'alles besteld'} · bestelling ${C.DAGEN[C.wd(cur.besteldag)]}`, actief: sl.open > 0 }; }
  const dag = cur.besteldag === C.today() ? 'Vandaag bestellen' : `Bestellen ${C.fmtDag(cur.besteldag)}`;
  const dl = odDeadline(od, cur); return { titel: dag, sub: st.open ? `${st.open} te doen${dl ? ` · vóór ${dl.dag === C.today() ? '' : C.DAGEN[C.wd(dl.dag)] + ' '}${dl.t}` : ''}` : '✓ alles besteld', actief: cur.besteldag === C.today() && st.open > 0 };
}
function voortgang(od, bd, lopend) {
  let advies = 0, open = 0, nodigN = 0; const nu = nuTs();
  for (const a of lijstArtikelen(od)) {
    if (a.uit || assStatus(a) !== 'in') continue;
    if (lopend) { const dg = dlArt(a, bd); if (bd.besteldag < C.today() ? !(dg && dg.ts > nu) : dg && dg.ts < nu) continue; }
    const be = S.bestel[a.key + '|' + bd.besteldag];
    const ad = C.advies(M, a.key, bd, vrVan(a.key), bestellingenVan(a.key));
    if (ad.adv) advies++;
    const nodig = be && be.aantal !== null && be.aantal !== undefined ? be.aantal > 0 : ad.adv > 0;
    if (nodig) nodigN++;
    if (nodig && !(be && be.besteld)) open++;
  }
  return { advies, open, nodig: nodigN };
}
function homeIndeling() { const l = ls.get('cba-home'); const alle = TEGELS.map(t => t[0]); if (!l) return alle.map(k => ({ k, aan: true })); const out = l.filter(x => alle.includes(x.k)); alle.forEach(k => { if (!out.some(x => x.k === k)) out.push({ k, aan: true }); }); return out; }
function tegelZichtbaar(k) { if (beginner()) return BESTEL_OD.includes(k) && mag('o_' + k); if (k === 'plekken') return mag('tafels') || tafelLijst().length > 0 || (mag('o_kw') && (magKwPlan() || Object.keys(S.kwplan || {}).length > 0)); if (k === 'assort') { const t = assortTelling(); return mag('saneren') || ((mag('schap') || isBeheer()) && (t.nieuw + t.uit + t.san > 0)); } if (k === 'kwacties') return mag('o_kw'); return k === 'assort' || k === 'tafels' || (k === 'beheer' ? mag('upload') || mag('instellingen') : mag('o_' + k)); }
function feestdagVoorstel() {
  if (!M) return '';
  for (let i = 0; i <= 21; i++) {
    const d = C.add(C.today(), i); const b = M.bijz[d];
    if (!b || b.voor || b.eigen || ls.get('cba-fd-' + W + '-' + d)) continue;
    const kan = mag('instellingen');
    return `<div class="banner"><h3><span>${esc(b.naam)} · ${C.fmtDag(d)}</span></h3><div class="sub">${i === 0 ? 'Vandaag' : `Over ${i} dag${i === 1 ? '' : 'en'}`}. ${kan ? 'Hoe is de winkel open?' : 'Vraag de beheerder de openingstijden in te stellen.'}</div>
    ${kan ? `<div class="row" style="margin-top:8px"><button class="btn sm sec" data-fd="${d}" data-s="normaal">Normaal open</button><button class="btn sm sec" data-fd="${d}" data-s="aangepast">Aangepaste tijden</button><button class="btn sm sec" data-fd="${d}" data-s="gesloten">Gesloten</button></div>` : ''}<button class="link" data-fdx="${d}">Later</button></div>`;
  }
  return '';
}
function renderHome() {
  const v = $('#view'); const ind = homeIndeling().filter(t => tegelZichtbaar(t.k));
  const tegel = k => {
    let titel = TEGELS.find(t => t[0] === k)[1], sub = '', on = false, waarsch = false;
    if (BESTEL_OD.includes(k)) { const s = bestelStatus(k); sub = `<b class="${s.actief ? 'oranje' : ''}">${s.titel}</b><br>${s.sub}`; on = s.actief; }
    if (k === 'overig') { const io = Object.keys(M.keys).filter(x => x.startsWith('e:') && M.keys[x].info.kl.soort === 'inout'); const meld = io.filter(x => C.overig(M, x, S.inout[x.slice(2)]).melding).length; sub = meld ? `<b class="rood">${meld} in/out-melding${meld === 1 ? '' : 'en'}</b>` : `${Object.keys(M.keys).filter(x => x.startsWith('e:')).length} artikelen`; waarsch = meld > 0; }
    if (k === 'assort') { const t = assortTelling(); sub = t.nieuw || t.uit || t.san ? `<b class="${t.uit || t.san ? 'rood' : ''}">${t.nieuw} nieuw · ${t.uit + t.san} schap aanpassen</b>` : 'Geen wijzigingen'; waarsch = t.uit + t.san > 0; }
    if (k === 'tafels') { const t = tafelTelling(); sub = t.totaal ? `<b class="${t.open && t.ombouw ? 'rood' : ''}">${t.klaar} van ${t.totaal} klaar</b><br>week ${t.week}` : (Object.keys(S.tafels || {}).some(id => !S.tafels[id].weg) ? `Week ${t.week} nog niet ingedeeld` : 'Nog geen tafels'); waarsch = !!(t.open && t.ombouw); }
    if (k === 'kwacties') sub = kwTegel();
    if (k === 'plekken') { const t = tafelTelling(); const a = versTegel(); const b = mag('o_kw') && Object.keys(S.kwplan || {}).length ? 'KW: ' + kwTegel().replace(/<[^>]+>/g, '') : ''; sub = [a, b].filter(Boolean).join('<br>') || 'Nog niets ingedeeld'; waarsch = !!(t.open && t.ombouw); }
    if (k === 'beheer') { const last = M.dagLijst[M.dagLijst.length - 1]; const oud = last ? C.diff(last, C.today()) : 99; sub = last ? `Verkoop t/m ${C.fmtDag(last)}` : 'Nog geen verkoop'; if (oud > 1) { sub = `<b class="rood">${sub}</b>`; waarsch = true; } }
    return `<button class="tegel ${on ? 'actief' : ''} ${waarsch ? 'let' : ''}" data-ga="${k}"><span class="ic">${ICOON[k]}</span><span class="tt">${titel}</span><span class="ts">${sub}</span></button>`;
  };
  let h = takenHomeHtml() + weekOverzichtHtml() + homeZoekHtml() + homeUploadHtml() + overdrachtHtml() + deadlineHtml() + feestdagVoorstel() + `<div class="tegels">${ind.filter(t => t.aan).map(t => tegel(t.k)).join('')}</div>`;
  if (ui.indelen) h += `<div class="blk"><h2>Home indelen</h2><div class="list">${ind.map((t, i) => `<div class="it"><label style="flex:1"><input type="checkbox" data-hk="${t.k}" ${t.aan ? 'checked' : ''}> ${TEGELS.find(x => x[0] === t.k)[1]}</label><button class="btn sm sec" data-hu="${i}" ${i ? '' : 'disabled'}>↑</button><button class="btn sm sec" data-hd="${i}" ${i < ind.length - 1 ? '' : 'disabled'}>↓</button></div>`).join('')}</div><button class="btn" id="indK" style="width:100%;margin-top:10px">Klaar</button></div>`;
  else if (isBeheer()) h += `<div style="text-align:center;margin:18px 0"><button class="btn sm sec" id="indB">✏️ Home indelen</button></div>`;
  v.innerHTML = h;
  v.querySelectorAll('[data-ga]').forEach(b => b.onclick = () => ga(b.dataset.ga));
  homeEvents(v); homeUploadEvents(v); takenHomeEvents(v); weekOverzichtEvents(v);
  v.querySelectorAll('[data-fd]').forEach(b => b.onclick = () => { const d = b.dataset.fd, s = b.dataset.s, bz = M.bijz[d]; const row = { dag: d, naam: bz.naam, soort: s, open: s === 'aangepast' ? (M.st.open[C.wd(d)][0] || '08:00') : null, dicht: s === 'aangepast' ? '16:00' : null }; saveAgenda(row).then(() => { if (s === 'aangepast') toast('Pas de tijden aan onder Beheer → Feestdagen', 4000); }); });
  v.querySelectorAll('[data-fdx]').forEach(b => b.onclick = () => { ls.set('cba-fd-' + W + '-' + b.dataset.fdx, 1); render(); });
  const ib = $('#indB'); if (ib) ib.onclick = () => { ui.indelen = true; render(); };
  const ik = $('#indK'); if (ik) ik.onclick = () => { ui.indelen = false; render(); };
  const opsl = l => { ls.set('cba-home', l); render(); };
  v.querySelectorAll('[data-hk]').forEach(c => c.onchange = () => { const l = homeIndeling(); l.find(x => x.k === c.dataset.hk).aan = c.checked; opsl(l); });
  v.querySelectorAll('[data-hu],[data-hd]').forEach(b => b.onclick = () => { const l = homeIndeling().filter(t => tegelZichtbaar(t.k)); const i = +(b.dataset.hu ?? b.dataset.hd); const j = b.dataset.hu !== undefined ? i - 1 : i + 1; [l[i], l[j]] = [l[j], l[i]]; const rest = homeIndeling().filter(t => !l.some(x => x.k === t.k)); opsl(l.concat(rest)); });
}

/* ---------- onderdelen en assortiment ---------- */
let odCache = null;
function onderdeelVan(a) {
  if (a.eigen) return a.od;
  if (a.bron === 'kw') return 'kw';
  const b = S.boeken.vers; const ov = (S.inst && S.inst.onderdelen) || {};
  if (ov[a.groep]) return ov[a.groep];
  if (!odCache || odCache.b !== b) odCache = { b, m: C.standaardOnderdelen(b ? b.artikelen.map(x => x.groep) : []) };
  return odCache.m[a.groep] || 'vers';
}
let verkochtCache = null;
function recentVerkocht(key) {
  if (!verkochtCache || verkochtCache.M !== M) verkochtCache = { M, s: {} };
  if (key in verkochtCache.s) return verkochtCache.s[key];
  const k = M.keys[key]; let r = false;
  if (k) for (let i = Math.max(0, M.N - 56); i < M.N; i++) if (k.q[i] || k.g[i]) { r = true; break; }
  return (verkochtCache.s[key] = r);
}
function assStatus(a) {
  const r = S.assort[a.key];
  if (r && r.status === 'gesaneerd') return 'gesaneerd';
  if (r && r.status === 'in') return 'in';
  if (r && r.status === 'uit') return 'niet';
  if (a.eigen) return 'in';
  return recentVerkocht(a.key) || a.nieuw ? 'in' : 'niet';
}
function assortTelling() {
  let nieuw = 0, uit = 0, san = 0;
  for (const bron of ['vers', 'kw']) { const bk = S.boeken[bron]; if (!bk) continue; nieuw += (bk.nieuw || []).length; uit += (bk.uit || []).filter(a => !S.schapOk.has(bron + ':' + a.nr)).length; }
  for (const k in S.assort) { const r = S.assort[k]; if (r.status === 'gesaneerd' && !r.schap_ok && M.art[k]) san++; if (r.status === 'in' && r.opgenomen && !r.schap_ok && M.art[k]) nieuw++; }
  return { nieuw, uit, san };
}
function zetAssort(a, status, extra) {
  const oud = Object.assign({ status: null, schap_ok: false, opgenomen: false }, S.assort[a.key] || {});
  const row = Object.assign({ bron: a.bron, nr: a.nr, status, sinds: C.today(), door: mijnNaam(), opgenomen: status === 'in', schap_ok: false }, extra || {});
  write('assortiment', [row]);
  return () => write('assortiment', [{ bron: a.bron, nr: a.nr, status: oud.status, sinds: oud.sinds || null, door: oud.door || null, opgenomen: !!oud.opgenomen, schap_ok: !!oud.schap_ok }]);
}
function renderAssort() {
  const v = $('#view'); let h = '';
  const kanSchap = mag('schap'), kanSan = mag('saneren');
  for (const od of BESTEL_OD) {
    if (!mag('o_' + od)) continue; const bron = bronVan(od); const b = S.boeken[bron]; if (!b) continue;
    const inOd = a => a && onderdeelVan(a) === od;
    const nieuw = (b.nieuw || []).map(nr => M.art[bron + ':' + nr]).filter(inOd);
    const uit = (b.uit || []).filter(a => !S.schapOk.has(bron + ':' + a.nr)).map(a => M.art[bron + ':' + a.nr] || Object.assign({ key: bron + ':' + a.nr, bron }, a)).filter(inOd);
    const san = Object.values(S.assort).filter(r => r.bron === bron && r.status === 'gesaneerd' && !r.schap_ok).map(r => M.art[r.bron + ':' + r.nr]).filter(inOd);
    const opg = Object.values(S.assort).filter(r => r.bron === bron && r.status === 'in' && r.opgenomen && !r.schap_ok).map(r => M.art[r.bron + ':' + r.nr]).filter(inOd);
    if (!nieuw.length && !uit.length && !san.length && !opg.length) continue;
    h += `<div class="grp"><span>${odNaam(od)}</span><small>${nieuw.length + opg.length} nieuw · ${uit.length + san.length} eruit</small></div><div class="card laatste">`;
    const rij = (a, knop) => `<div class="it"><span>${esc(a.naam)} <span class="small">${a.nr}${a.groep ? ' · ' + esc(a.groep) : ''}</span></span>${knop}</div>`;
    if (nieuw.length) h += `<b style="color:var(--groen)">Nieuw in het bestelboek</b><div class="list">${nieuw.map(a => rij(a, `<button class="btn sm sec" data-open="${od}|${a.nr}">Bekijk</button>`)).join('')}</div>`;
    if (opg.length) h += `<b style="color:var(--groen);display:block;margin-top:10px">Opgenomen in assortiment – schapplek maken</b><div class="list">${opg.map(a => rij(a, kanSchap ? `<button class="btn sm" data-sok="${a.key}">Schap aangepast</button>` : '')).join('')}</div>`;
    if (uit.length) h += `<b style="color:var(--rood);display:block;margin-top:10px">Uit het bestelboek – schap opnieuw indelen</b><div class="list">${uit.map(a => rij(a, kanSchap ? `<button class="btn sm" data-ok="${bron}|${a.nr}">Schap aangepast</button>` : '')).join('')}</div>`;
    if (san.length) h += `<b style="color:var(--rood);display:block;margin-top:10px">Gesaneerd – schap opnieuw indelen</b><div class="list">${san.map(a => { const r = S.assort[a.key]; return rij(a, `<span class="small">${ini(r.door)} ${r.sinds ? C.fmtDag(r.sinds) : ''}</span>${kanSchap ? `<button class="btn sm" data-sok="${a.key}">Schap aangepast</button>` : ''}`); }).join('')}</div>`;
    h += '</div>';
  }
  h += prijsHtml();
  if (!h) h = '<div class="empty">Geen wijzigingen in het assortiment.</div>';
  h += nieuweProducten();
  v.innerHTML = h;
  v.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { const [od, nr] = b.dataset.open.split('|'); ui.tab = od; ui.q = nr; ui.fAlles = true; render(); window.scrollTo(0, 0); });
  v.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => { const [bron, nr] = b.dataset.ok.split('|'); write('schap_ok', [{ bron, nr, ok: true, door: mijnNaam() }]); log('schap', `Schap aangepast: ${(M.art[bron + ':' + nr] || {}).naam || nr}`); ongedaan('Schap aangepast', () => write('schap_ok', [{ bron, nr, ok: false }])); render(); });
  prijsEvents(v);
  v.querySelectorAll('[data-sok]').forEach(b => b.onclick = () => { const a = M.art[b.dataset.sok]; const r = S.assort[a.key]; const terug = zetAssort(a, r.status, { schap_ok: true, opgenomen: r.opgenomen, sinds: r.sinds, door: r.door }); log('schap', `Schap aangepast: ${a.naam}`); ongedaan('Schap aangepast', terug); render(); });
}
function nieuweProducten() {
  const lijst = Object.values(M.art).filter(a => mag('o_' + onderdeelVan(a)) && (a.nieuw || (S.assort[a.key] && S.assort[a.key].opgenomen && S.assort[a.key].status === 'in')) && M.keys[a.key]);
  if (!lijst.length) return '';
  const mon = C.monday(C.today()); const weken = [5, 4, 3, 2, 1, 0].map(w => C.add(mon, -7 * w));
  const rows = lijst.map(a => { const k = M.keys[a.key]; const tot = weken.map(m => { let s = 0, any = false; for (let d = 0; d < 7; d++) { const i = C.idx(M, C.add(m, d)); if (i >= 0 && i < M.N && M.heeftData[i]) { s += k.v[i]; any = true; } } return any ? s : null; }); return { a, tot }; });
  return `<div class="grp"><span>Nieuwe producten volgen</span><small>${rows.length}</small></div><div class="card laatste tabelscroll"><table class="wk"><tr><th style="text-align:left">Artikel</th>${weken.map(m => `<th>wk ${C.isoWeek(m).w}</th>`).join('')}</tr>${rows.map(r => `<tr><td class="l" style="width:auto;color:var(--tekst);font-size:12px">${esc(r.a.naam)}</td>${r.tot.map(t => `<td>${t === null ? '' : C.fmt(t)}</td>`).join('')}</tr>`).join('')}</table><div class="hint">Verkoop per week sinds het artikel nieuw is of is opgenomen.</div></div>`;
}

/* ---------- ongedaan maken en bevestigen ---------- */
function ongedaan(tekst, fn) {
  const oud = $('#undoBalk'); if (oud) oud.remove();
  const b = document.createElement('div'); b.id = 'undoBalk'; b.className = 'undobalk'; b.innerHTML = `<span>✓ ${esc(tekst)}</span><button>Ongedaan maken</button>`;
  b.querySelector('button').onclick = () => { b.remove(); fn(); toast('Teruggedraaid'); setTimeout(() => render(true), 50); };
  document.body.appendChild(b); clearTimeout(ongedaan._t); ongedaan._t = setTimeout(() => b.remove(), 6000);
}
function bevestig(titel, tekst, ja, nee) {
  return new Promise(res => { const ov = sheet(`<h2 style="margin:0">${titel}</h2><div class="hulptekst">${tekst}</div><div class="row"><button class="btn sec" data-nee style="flex:1">${nee || 'Annuleren'}</button><button class="btn" data-ja style="flex:1">${ja || 'Ja'}</button></div>`, (e, o) => { if (e.target.dataset.ja !== undefined) { o.remove(); res(true); } if (e.target.dataset.nee !== undefined) { o.remove(); res(false); } }); ov.addEventListener('click', e => { if (e.target === ov) res(false); }); });
}

/* ---------- meer ---------- */
function pinWijzigen() {
  sheet(`<h2 style="margin:0">Pincode wijzigen</h2><div class="form"><label>Huidige pincode</label><input type="password" id="pw0" inputmode="numeric" maxlength="4" class="codeveld"><label>Nieuwe pincode</label><input type="password" id="pw1" inputmode="numeric" maxlength="4" class="codeveld"><label>Herhaal nieuwe pincode</label><input type="password" id="pw2" inputmode="numeric" maxlength="4" class="codeveld"><div class="msg" id="pwM"></div><div class="row"><button class="btn sec" data-x style="flex:1">Annuleren</button><button class="btn" data-pw style="flex:1">Opslaan</button></div></div>${kanFace() ? `<h2 style="margin:18px 0 0">Face ID</h2><p class="small">${faceCfg(mw.id) ? 'Face ID staat aan op dit toestel. Je kunt ook altijd met je pincode inloggen.' : 'Log in met je gezicht in plaats van je pincode. Alleen voor jou, op dit toestel.'}</p><button class="btn ${faceCfg(mw.id) ? 'sec' : ''}" data-face>${faceCfg(mw.id) ? 'Face ID uitzetten' : 'Face ID aanzetten'}</button>` : ''}`, async (e, ov) => {
    if (e.target.closest && e.target.closest('[data-face]')) { if (faceCfg(mw.id) && !(await bevestig('Face ID uitzetten?', 'Daarna log je op dit toestel alleen nog in met je pincode.', 'Uitzetten', 'Annuleren'))) return; ov.remove(); return faceInstellen(); }
    if (e.target.dataset.pw === undefined) return;
    const o = $('#pw0').value.trim(), n = $('#pw1').value.trim(), msg = $('#pwM');
    if (!/^\d{4}$/.test(n)) return msg.textContent = 'Een pincode bestaat uit 4 cijfers.';
    if (n !== $('#pw2').value.trim()) return msg.textContent = 'De nieuwe pincodes zijn niet gelijk.';
    try { const ok = DEMO ? o === '1234' : await rpc('pin_wijzigen', { w: W, mid: mw.id, oud: o, nieuw: n }); if (!ok) return msg.textContent = 'De huidige pincode klopt niet.'; const lok = ls.get('cba-pin') || {}; lok[mw.id] = await pinHash(mw.id, n); ls.set('cba-pin', lok); ov.remove(); toast('Pincode gewijzigd'); }
    catch (x) { msg.textContent = 'Lukt nu niet: ' + x.message; }
  });
}
async function mwOpslaan(f) {
  await adminDo(async () => { await f(); if (!DEMO) { const r = await rest(wq('medewerkers?select=id,naam,rol,rechten,actief,heeft_pin,email&order=naam.asc')); S.medewerkers = r.filter(m => m.actief !== false); } });
}
function renderMedewerkers() {
  const v = $('#view'); const lijst = mwLijst();
  const samenvat = m => { if (m.rol === 'beheerder') return 'Beheerder · alles'; const R = Object.assign(presetRechten('medewerker'), m.rechten || {}); const od = ONDERDELEN.filter(o => R['o_' + o[0]]).map(o => o[1]); return `${m.rol === 'leider' ? 'Afdelingsleider' : 'Vakkenvuller'} · ${od.length === 6 ? 'alle onderdelen' : od.join(', ') || 'geen onderdelen'}`; };
  v.innerHTML = `<div class="blk lijstblok">${lijst.map(m => `<button class="rijknop" data-mwid="${m.id}"><span><b>${esc(m.naam)}</b><br><span class="small">${m.email ? 'Eigenaar · ' : ''}${samenvat(m)} · ${m.heeft_pin ? 'pincode ingesteld' : 'nog geen pincode'}</span></span><span class="pijl">›</span></button>`).join('') || '<div class="small" style="padding:14px 16px">Nog geen medewerkers.</div>'}</div>
  <div class="blk"><h2>Medewerker toevoegen</h2><div class="row"><input type="text" id="mwN" placeholder="Naam" style="flex:1"><button class="btn sm" id="mwAdd">Toevoegen</button></div><button class="btn sm sec" id="mwCk" style="width:100%;margin-top:10px">✅ Checklist nieuwe medewerker</button><p class="small">Nieuwe medewerkers krijgen de rechten van "Vakkenvuller". Tik daarna op de naam om ze aan te passen. Ze kiezen zelf hun pincode bij de eerste keer.</p></div>`;
  v.querySelectorAll('[data-mwid]').forEach(b => b.onclick = () => { ui.mwId = b.dataset.mwid; ga('mwedit'); });
  $('#mwAdd').onclick = () => { const n = $('#mwN').value.trim(); if (!n) return toast('Vul een naam in'); mwOpslaan(async () => { const row = { naam: n, rol: 'medewerker', rechten: presetRechten('medewerker') }; if (DEMO) DEMO_MW.push(Object.assign({ id: 'd' + Date.now(), heeft_pin: false }, row)); else await rest('medewerkers', { method: 'POST', body: metW([row]), headers: { Prefer: 'return=minimal' }, noBody: true }); log('team', `Medewerker toegevoegd: ${n}`); }).then(() => nieuwChecklist(n)); };
  const ck = $('#mwCk'); if (ck) ck.onclick = () => nieuwChecklist();
}
function renderMwEdit() {
  const v = $('#view'); const m = mwLijst().find(x => x.id === ui.mwId); if (!m) return ga('medewerkers');
  const R = Object.assign(presetRechten('medewerker'), m.rechten || {}); const beh = m.rol === 'beheerder';
  v.innerHTML = `<div class="blk"><h2>Snel kiezen</h2><div class="row"><button class="btn sm ${m.rol === 'medewerker' ? '' : 'sec'}" data-pre="medewerker">Vakkenvuller</button><button class="btn sm ${m.rol === 'leider' ? '' : 'sec'}" data-pre="leider">Afdelingsleider</button><button class="btn sm ${beh ? '' : 'sec'}" data-pre="beheerder">Beheerder</button></div><p class="small">${beh ? 'Een beheerder mag alles, ook op een gedeeld winkeltoestel.' : 'Pas hieronder per onderdeel aan wat deze medewerker mag.'}</p></div>
  <div class="blk"><h2>Wat de rollen mogen</h2>${[['medewerker', 'Vakkenvuller'], ['leider', 'Afdelingsleider']].map(([k, n]) => `<p class="small"><b>${n}:</b> ${RECHTEN.flatMap(g => g[1]).filter(r => PRESET[k].includes(r[0])).map(r => r[1]).join(', ')}.</p>`).join('')}<p class="small"><b>Beheerder:</b> alles.</p><p class="small">Kies een rol en zet daarna per vinkje aan of uit wat afwijkt.</p></div>
  ${RECHTEN.map(g => `<div class="blk"><h2>${g[0]} <span class="small">· ${g[1].filter(r => beh ? r[0] !== 'beginner' : R[r[0]]).length} van ${g[1].length} aan</span></h2><div class="list">${g[1].map(r => `<div class="it"><span>${r[1]}</span><input type="checkbox" class="schak" data-rt="${r[0]}" ${(beh && r[0] !== 'beginner') || (!beh && R[r[0]]) ? 'checked' : ''} ${beh ? 'disabled' : ''}></div>`).join('')}</div></div>`).join('')}
  <div class="blk"><h2>Pincode</h2><p class="small">${m.heeft_pin ? 'Pincode is ingesteld.' : 'Nog geen pincode: wordt gekozen bij de eerste keer.'}</p>${m.heeft_pin ? '<button class="btn sec" id="mwReset" style="width:100%">Pincode resetten</button>' : ''}<button class="btn red" id="mwWeg" style="width:100%;margin-top:10px">Medewerker verwijderen</button></div>`;
  const patch = body => mwOpslaan(async () => { if (DEMO) Object.assign(m, body); else await rest(wq('medewerkers?id=eq.' + m.id), { method: 'PATCH', body, headers: { Prefer: 'return=minimal' }, noBody: true }); });
  v.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => { const p = b.dataset.pre; patch({ rol: p, rechten: presetRechten(p) }); log('team', `Rechten ${m.naam}: ${p}`); });
  v.querySelectorAll('[data-rt]').forEach(c => c.onchange = () => { const r = Object.assign({}, R); r[c.dataset.rt] = c.checked; patch({ rechten: r }); });
  const rs = $('#mwReset'); if (rs) rs.onclick = () => { if (!ask('Pincode resetten? De medewerker kiest de volgende keer een nieuwe.')) return; mwOpslaan(async () => { if (DEMO) m.heeft_pin = false; else await rpc('reset_pin', { w: W, mid: m.id }); }); };
  $('#mwWeg').onclick = () => { if (!ask(`${m.naam} verwijderen?`)) return; mwOpslaan(async () => { if (DEMO) DEMO_MW.splice(DEMO_MW.indexOf(m), 1); else await rest(wq('medewerkers?id=eq.' + m.id), { method: 'PATCH', body: { actief: false }, headers: { Prefer: 'return=minimal' }, noBody: true }); }).then(() => ga('medewerkers')); };
}
function codeTekst(c) { return String(c || '–'); }
function renderWinkel() {
  const v = $('#view'); const w = S.winkel || {}; const tot = w.tot ? new Date(w.tot) : null; const verlopen = tot && tot < new Date();
  const datum = tot ? `${tot.getDate()}-${tot.getMonth() + 1}-${tot.getFullYear()}` : '';
  let h = `<div class="blk"><h2>📱 Toestellen koppelen</h2><p class="small">Medewerkerstelefoons en de winkeltelefoon koppel je met deze code. Open Besteladvies op het toestel, kies <b>Met koppelcode</b> en vul hem in.</p><div class="koppelcode">${esc(codeTekst(w.code))}</div>
  <p class="small" style="text-align:center">${verlopen ? '<b class="rood">Verlopen</b>' : `Geldig tot ${datum} · vaker te gebruiken`} · ${w.toestellen ?? '?'} toestel${w.toestellen === 1 ? '' : 'len'} gekoppeld</p>
  <div class="row"><button class="btn sm" id="wDeel" style="flex:1">Delen</button><button class="btn sm sec" id="wVerl" style="flex:1">30 dagen verlengen</button></div>
  <button class="btn sm red" id="wNieuw" style="width:100%;margin-top:10px">Nieuwe code maken</button><p class="small">Een nieuwe code ontkoppelt alle toestellen van deze winkel. Gebruik dit als een toestel kwijt is.</p></div>
  <div class="blk"><h2>Winkelgegevens</h2><div class="form"><div class="f"><label>Plaats (voor het weer)</label><input type="text" id="wPl" value="${esc(plaatsNu())}"></div><button class="btn" id="wSave">Opslaan</button></div></div>`;
  if (eigenaar) h += `<div class="blk"><h2>Winkels</h2><div class="list">${winkels.map(x => `<div class="it"><span><b>${esc(x.naam)}</b><br><span class="small">${esc(x.plaats || '')}</span></span>${x.id === W ? '<span class="small">huidig</span>' : `<button class="btn sm sec" data-ww="${x.id}">Wisselen</button>`}</div>`).join('')}</div>
  <h3>Nieuwe winkel</h3><div class="form"><input type="text" id="nwN" placeholder="Naam, bijv. Coop Lisse"><input type="text" id="nwP" placeholder="Plaats"><button class="btn sm" id="nwB">Winkel aanmaken</button></div>
  <h3>Beheerder toevoegen</h3><p class="small">Bijvoorbeeld een collega-ondernemer. Die logt in met e-mail en wachtwoord (account aanmaken in Supabase → Users).</p><div class="row"><input type="email" id="bhE" placeholder="E-mailadres" style="flex:1"><button class="btn sm" id="bhB">Toevoegen</button></div></div>`;
  v.innerHTML = h;
  const tekst = `Toestel koppelen voor ${(WINKEL && WINKEL.naam) || 'de winkel'}:\n1. Open ${location.origin + location.pathname} en zet de app op je beginscherm.\n2. Open de app en kies "Met koppelcode".\n3. Vul deze code in: ${w.code}\nDaarna kies je je naam en vul je je pincode in.`;
  $('#wDeel').onclick = async () => { try { if (navigator.share) await navigator.share({ text: tekst }); else { await navigator.clipboard.writeText(tekst); toast('Gekopieerd'); } } catch (e) { try { await navigator.clipboard.writeText(tekst); toast('Gekopieerd'); } catch (x) { toast(w.code); } } };
  const codeActie = (fn, args, txt) => adminDo(async () => { if (DEMO) { S.winkel = Object.assign({}, w, fn === 'nieuwe_koppelcode' ? { code: Math.random().toString(36).slice(2, 10).toUpperCase(), toestellen: 0 } : {}, { tot: new Date(Date.now() + 30 * 864e5).toISOString() }); return; } const r = await rpc(fn, args); S.winkel = Object.assign({}, w, { code: r.code, tot: r.tot }, fn === 'nieuwe_koppelcode' ? { toestellen: 0 } : {}); log('team', txt); });
  $('#wVerl').onclick = () => codeActie('verleng_code', { w: W, dagen: 30 }, 'Koppelcode verlengd');
  $('#wNieuw').onclick = () => { if (!ask('Nieuwe koppelcode maken? Alle gekoppelde toestellen moeten daarna opnieuw koppelen.')) return; codeActie('nieuwe_koppelcode', { w: W, dagen: 30 }, 'Nieuwe koppelcode gemaakt'); };
  $('#wSave').onclick = async () => { const pl = $('#wPl').value.trim(); const data = Object.assign({}, S.inst || {}, { plaats: pl }); if ($('#wNaam')) data.beheerNaam = $('#wNaam').value.trim(); if (pl && pl !== (S.inst || {}).plaats) { const g = await geocode(pl); if (g) { data.lat = g.lat; data.lon = g.lon; } } saveInst(data); };
  v.querySelectorAll('[data-ww]').forEach(b => b.onclick = async () => { await saveCache(); W = b.dataset.ww; ls.set('cba-w', W); S.dagen = {}; S.dagMeta = {}; S.boeken = {}; S.kassa = {}; M = null; start(); });
  const nb = $('#nwB'); if (nb) nb.onclick = () => { const n = $('#nwN').value.trim(), p = $('#nwP').value.trim(); if (!n) return toast('Vul een naam in'); if (DEMO) return toast('Niet in de testversie'); adminDo(async () => { const id = await rpc('nieuwe_winkel', { naam: n, plaats: p }); winkels = await rpc('mijn_winkels'); toast(`${n} aangemaakt. Wissel ernaartoe om hem in te richten.`, 4000); }); };
  const bb = $('#bhB'); if (bb) bb.onclick = () => { const e = $('#bhE').value.trim(); if (!/@/.test(e)) return toast('Vul een e-mailadres in'); if (DEMO) return toast('Niet in de testversie'); adminDo(async () => { await rpc('beheerder_toevoegen', { w: W, email: e }); }); };
}

/* ---------- app-instellingen ---------- */
function pasPrefToe() {
  const p = S.pref || {}; const r = document.documentElement;
  if (p.thema === 'licht') r.dataset.theme = 'light'; else if (p.thema === 'donker') r.dataset.theme = 'dark'; else delete r.dataset.theme;
  r.classList.toggle('tekst-groot', p.tekst === 'groot'); r.classList.toggle('tekst-xl', p.tekst === 'xl');
  document.body.classList.toggle('compact', !!p.compact); document.body.classList.toggle('eenvoudig', !!p.eenvoudig); document.body.classList.toggle('detailsaan', !!p.details); document.body.classList.toggle('kort', !!p.kort);
}
function zetPref(k, val) { S.pref = Object.assign({}, S.pref || {}, { [k]: val }); ls.set('cba-pref-' + wieSleutel(), S.pref); pasPrefToe(); write('voorkeuren', [{ wie: wieSleutel(), data: S.pref }]); render(); }
function renderAppInst() {
  const p = S.pref || {}; const v = $('#view');
  const seg = (k, opts) => `<div class="segment licht">${opts.map(o => `<button class="${(p[k] || opts[0][0]) === o[0] ? 'aan' : ''}" data-pk="${k}" data-pv="${o[0]}">${o[1]}</button>`).join('')}</div>`;
  const starts = [['home', 'Home']].concat(ONDERDELEN.filter(o => mag('o_' + o[0])).map(o => [o[0], o[1]]));
  v.innerHTML = `<div class="blk"><h2>Weergave</h2><label class="small">Licht of donker</label>${seg('thema', [['auto', 'Automatisch'], ['licht', 'Licht'], ['donker', 'Donker']])}
  <label class="small">Tekstgrootte</label>${seg('tekst', [['normaal', 'Normaal'], ['groot', 'Groot'], ['xl', 'Extra groot']])}
  <div class="list"><div class="it"><span><b>Compacte lijst</b><br><span class="small">Alleen vorige week en het gemiddelde per dag</span></span><input type="checkbox" class="schak" data-pb="compact" ${p.compact ? 'checked' : ''}></div>
  <div class="it"><span><b>Korte lijst</b><br><span class="small">Eén regel per artikel: naam, advies en invullen</span></span><input type="checkbox" class="schak" data-pb="kort" ${p.kort ? 'checked' : ''}></div>
  <div class="it"><span><b>Verkooptabel altijd tonen</b><br><span class="small">Anders zie je die pas na een tik op "▾ Meer" bij een artikel</span></span><input type="checkbox" class="schak" data-pb="details" ${p.details ? 'checked' : ''}></div>
  <div class="it"><span><b>Eenvoudige modus</b><br><span class="small">Minder informatie en grotere knoppen</span></span><input type="checkbox" class="schak" data-pb="eenvoudig" ${p.eenvoudig ? 'checked' : ''}></div></div></div>
  <div class="blk"><h2>Startpagina</h2><select id="pStart" style="width:100%">${starts.map(s => `<option value="${s[0]}" ${(p.start || 'home') === s[0] ? 'selected' : ''}>${s[1]}</option>`).join('')}</select><p class="small">Deze instellingen gelden alleen voor jou (${esc(mijnNaam())}) en werken op elk toestel waar je inlogt.</p></div>`;
  v.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => zetPref(b.dataset.pk, b.dataset.pv));
  v.querySelectorAll('[data-pb]').forEach(c => c.onchange = () => zetPref(c.dataset.pb, c.checked));
  $('#pStart').onchange = e => zetPref('start', e.target.value);
}

/* ---------- oefenmodus ---------- */
let oefenKopie = null;
function startOefenen() {
  oefenKopie = JSON.stringify({ voorraad: S.voorraad, bestel: S.bestel, schapOk: [...S.schapOk], assort: S.assort, notities: S.notities, inout: S.inout, act: S.act });
  OEFEN = true; toast('Oefenmodus aan: niets wordt echt opgeslagen', 3500); ga('home');
}
function stopOefenen() {
  const k = JSON.parse(oefenKopie || '{}'); Object.assign(S, k, { schapOk: new Set(k.schapOk || []) });
  OEFEN = false; oefenKopie = null; toast('Oefenmodus uit'); rebuild(); ga('home');
}
function oefenBalk() {
  const b = $('#oefenBalk');
  if (!OEFEN) { if (b) b.remove(); return; }
  if (b) return;
  const n = document.createElement('div'); n.id = 'oefenBalk'; n.className = 'oefenbalk'; n.innerHTML = '🎓 Oefenmodus – niets wordt echt opgeslagen <button>Stoppen</button>'; n.querySelector('button').onclick = stopOefenen; $('#kop').after(n);
}

/* ---------- vandaag gedaan ---------- */
async function renderVandaag() {
  const v = $('#view'); const d = ui.vDag || C.today();
  v.innerHTML = `<div class="bar"><div class="row" style="justify-content:space-between"><button class="btn sm sec" id="vTer">‹</button><b>${C.DAGNAAM[C.wd(d)]} ${C.fmtDag(d).split(' ')[1]}</b><button class="btn sm sec" id="vVol" ${d >= C.today() ? 'disabled' : ''}>›</button></div></div><div id="vLijst"><div class="empty">Laden…</div></div>`;
  $('#vTer').onclick = () => { ui.vDag = C.add(d, -1); render(); }; $('#vVol').onclick = () => { ui.vDag = C.add(d, 1); render(); };
  let rows = S.act.filter(r => r.dag === d);
  if (!DEMO && !OEFEN) { try { const srv = await rest(wq(`activiteit?dag=eq.${d}&order=ts.asc&select=wie,wat,tekst,ts,dag`)); const lok = rows.filter(r => !srv.some(s => s.ts === r.ts && s.tekst === r.tekst)); rows = srv.concat(lok); } catch (e) { } }
  if (ui.tab !== 'vandaag') return;
  const per = {}; rows.sort((a, b) => a.ts < b.ts ? -1 : 1).forEach(r => (per[r.wie] = per[r.wie] || []).push(r));
  $('#vLijst').innerHTML = Object.keys(per).length ? Object.keys(per).sort().map(w => `<div class="grp"><span>${esc(w)}</span><small>${per[w].length}</small></div><div class="card laatste"><div class="list">${per[w].map(r => `<div class="it"><span class="small" style="width:44px">${hhmm(r.ts)}</span><span style="flex:1">${esc(r.tekst)}</span></div>`).join('')}</div></div>`).join('') : '<div class="empty">Op deze dag is nog niets gedaan.</div>';
}

/* ---------- exporteren ---------- */
function renderExport() {
  const v = $('#view'); const ods = BESTEL_OD.filter(o => mag('o_' + o));
  v.innerHTML = `<div class="blk"><h2>Bestellijst</h2><p class="small">Advies, bestelling en wie het heeft afgevinkt, voor de gekozen besteldag.</p><div class="row"><select id="xOd" style="flex:1">${ods.map(o => `<option value="${o}">${odNaam(o)}</option>`).join('')}</select><button class="btn sm" data-x="bestel">Excel</button></div></div>
  <div class="blk"><h2>Verkoop per artikel</h2><p class="small">Verkoop per week over de laatste 8 weken, met het gemiddelde.</p><button class="btn sm" data-x="verkoop">Excel</button></div>
  <div class="blk"><h2>Actieresultaat</h2><p class="small">Per actie: normale verkoop, verkoop in de actieweek en de factor.</p><button class="btn sm" data-x="actie">Excel</button></div>`;
  v.querySelectorAll('[data-x]').forEach(b => b.onclick = () => exporteer(b.dataset.x, $('#xOd').value));
}
async function exporteer(soort, od) {
  try {
    await loadScript(LIB.xlsx); let rows = [], naam = '';
    if (soort === 'bestel') {
      const cur = besteldag(od).cur; naam = `Bestellijst ${odNaam(od)} ${cur.besteldag}`;
      rows.push(['Nummer', 'Omschrijving', 'Groep', 'Eenheid', 'Advies', 'Bestelling', 'Besteld', 'Door']);
      for (const a of lijstArtikelen(od)) { if (assStatus(a) !== 'in' || a.uit) continue; const ad = C.advies(M, a.key, cur, vrVan(a.key), bestellingenVan(a.key)); const be = S.bestel[a.key + '|' + cur.besteldag]; if (!ad.adv && !(be && be.aantal)) continue; rows.push([a.nr, a.naam, a.groep || '', a.perHE ? `${a.eh} ${C.fmt(a.he)}` : a.eh, ad.adv, be && be.aantal !== null && be.aantal !== undefined ? be.aantal : '', be && be.besteld ? 'ja' : '', be && be.besteld_door || '']); }
    } else if (soort === 'verkoop') {
      naam = `Verkoop ${C.today()}`; const mon = C.monday(C.today()); const weken = [8, 7, 6, 5, 4, 3, 2, 1].map(w => C.add(mon, -7 * w));
      rows.push(['Nummer', 'Omschrijving', 'Onderdeel'].concat(weken.map(m => 'wk ' + C.isoWeek(m).w), ['Gem./week']));
      for (const a of Object.values(M.art)) { const k = M.keys[a.key]; if (!k || !mag('o_' + onderdeelVan(a))) continue; const t = weken.map(m => { let s = 0; for (let d = 0; d < 7; d++) { const i = C.idx(M, C.add(m, d)); if (i >= 0 && i < M.N) s += k.v[i]; } return C.r(s, 2); }); rows.push([a.nr, a.naam, odNaam(onderdeelVan(a))].concat(t, [C.r(t.reduce((x, y) => x + y, 0) / t.length, 2)])); }
    } else {
      naam = `Actieresultaat ${C.today()}`; rows.push(['Actieweek', 'Nummer', 'Omschrijving', 'Folder/Instore', 'Korting %', 'Normaal per week', 'Verkocht in actie', 'Factor']);
      for (const key in M.actieArt) { const a = M.art[key]; if (!a || !M.keys[key]) continue; for (const p of M.actieArt[key]) { if (p.zon >= C.today()) continue; let act = 0, base = 0; for (let d = p.mon; d <= p.zon; d = C.add(d, 1)) { if (p.dag !== null && p.dag !== undefined && C.wd(d) !== p.dag) continue; const i = C.idx(M, d); if (i < 0 || i >= M.N || !M.heeftData[i]) continue; act += M.keys[key].v[i]; base += C.basis(M, key, C.wd(d), d) || 0; } rows.push([p.week, a.nr, a.naam, p.folder ? 'Folder' : 'Instore', Math.round(p.disc * 100), C.r(base, 1), C.r(act, 1), base ? C.r(act / base, 2) : '']); } }
    }
    const ws = XLSX.utils.aoa_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Blad1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }); const file = new File([buf], naam.replace(/[^\w\- ]/g, '') + '.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: naam });
    else { const u = URL.createObjectURL(file); const l = document.createElement('a'); l.href = u; l.download = file.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); }
    window.__laatsteExport = { naam, rijen: rows.length };
    toast(`${naam}: ${rows.length - 1} regels`);
  } catch (e) { if (e && e.name === 'AbortError') return; toast('Exporteren mislukt: ' + e.message, 5000); }
}

/* ---------- weer ---------- */
async function geocode(pl) { try { const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(pl)}&count=1&language=nl&countryCode=NL`); const j = await r.json(); const x = j.results && j.results[0]; return x ? { lat: x.latitude, lon: x.longitude } : null; } catch (e) { return null; } }
async function weer() {
  const lat = (S.inst && S.inst.lat) || 52.325, lon = (S.inst && S.inst.lon) || 4.578; const k = 'cba-weer';
  const c = ls.get(k); if (c && c.dag === C.today() && c.lat === lat && Date.now() - c.t < 3 * 3600e3) return c.data;
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum,weathercode&timezone=Europe%2FAmsterdam&forecast_days=10`);
  const j = await r.json(); const data = {}; (j.daily.time || []).forEach((d, i) => data[d] = { t: j.daily.temperature_2m_max[i], r: j.daily.precipitation_sum[i], c: j.daily.weathercode[i] });
  ls.set(k, { dag: C.today(), lat, t: Date.now(), data }); return data;
}
const WEER_IC = c => c >= 95 ? '⛈' : c >= 71 && c <= 77 ? '🌨' : c >= 51 ? '🌧' : c >= 45 ? '🌫' : c >= 2 ? '⛅' : '☀️';
const HINT = { agf: ['meer fruit, watermeloen, salades en BBQ-groenten', 'regen: minder BBQ-groenten'], vers: ['meer BBQ-vlees, salades, frisdrank en ijskoffie', 'regen: rustiger, minder BBQ'], brood: ['meer stokbrood en BBQ-broodjes', 'regen: minder stokbrood'], diep: ['meer ijs en ijsblokjes', 'regen: minder ijs'], kw: ['meer frisdrank, water, bier en chips', 'regen: minder BBQ-sauzen'] };
async function toonWeer(od, lv) {
  const el = $('#weer'); if (!el || !lv) return;
  try {
    const data = await weer(); const dagen = C.dekking(M, '', lv).filter(d => data[d]); if (!dagen.length || !$('#weer')) return;
    const max = Math.max(...dagen.map(d => data[d].t)), regen = dagen.reduce((s, d) => s + data[d].r, 0);
    let hint = ''; if (max >= 25) hint = `${max >= 30 ? 'Heet' : 'Warm'}: ${HINT[od][0]}.`; else if (regen >= 8) hint = `Veel ${HINT[od][1]}.`;
    el.innerHTML = `<div class="weer klein">${dagen.map(d => `<span>${C.DAGEN[C.wd(d)]} ${WEER_IC(data[d].c)} ${Math.round(data[d].t)}°</span>`).join('')}${hint ? `<b>${hint}</b>` : ''}</div>`;
  } catch (e) { }
}

/* ---------- notities ---------- */
function notitieBewerk(sleutel, titel) {
  const n = S.notities[sleutel];
  sheet(`<h2 style="margin:0">📝 ${esc(titel)}</h2><textarea id="ntT" rows="4" class="notitieveld" placeholder="Bijv. leverancier heeft tekort, volgende week weer leverbaar">${esc(n ? n.tekst : '')}</textarea>${n ? `<div class="small">${esc(n.wie || '')} · ${n.ts ? C.fmtDag(n.ts.slice(0, 10)) + ' ' + hhmm(n.ts) : ''}</div>` : ''}<div class="row">${n ? '<button class="btn sec red-t" data-ntw style="flex:1">Verwijderen</button>' : '<button class="btn sec" data-x style="flex:1">Annuleren</button>'}<button class="btn" data-nts style="flex:1">Opslaan</button></div>`, (e, ov) => {
    if (e.target.dataset.nts !== undefined) { const t = $('#ntT').value.trim(); write('notities', [{ sleutel, tekst: t, wie: mijnNaam(), ts: new Date().toISOString() }]); if (t) log('notitie', `Notitie ${titel}: ${t}`); ov.remove(); render(true); }
    if (e.target.dataset.ntw !== undefined) { write('notities', [{ sleutel, tekst: '', wie: mijnNaam(), ts: new Date().toISOString() }]); ov.remove(); render(true); }
  });
  setTimeout(() => { const t = $('#ntT'); if (t) t.focus(); }, 50);
}
const notitieHtml = sleutel => { const n = S.notities[sleutel]; return n ? `<div class="notitie">📝 ${esc(n.tekst)} <span class="small">· ${esc(ini(n.wie))} ${n.ts ? C.fmtDag(n.ts.slice(0, 10)) : ''}</span></div>` : ''; };

/* ---------- uitleg en rondleiding ---------- */
function sheet(html, onclick) { const ov = document.createElement('div'); ov.className = 'sheet'; ov.innerHTML = `<div class="sheetIn">${html}</div>`; ov.onclick = e => { if (e.target === ov || e.target.dataset.x !== undefined) ov.remove(); else if (onclick) onclick(e, ov); }; document.body.appendChild(ov); return ov; }
const HULP = {
  home: ['Home', 'Bovenaan staat <b>Jouw taken vandaag</b>: tik op een afdeling bij Bestellen of op Tellen. Daaronder zoek je een artikel (een spelfout mag) en staan de tegels per onderdeel. De bel toont meldingen en berichten.'],
  lijst: ['Bestellen', 'Bovenaan staat tot wanneer je kunt bestellen. Per artikel zie je het <b>Advies</b>. Tel wat er ligt (mag leeg) en tik op <b>Neem advies over</b> of vul zelf in; wat je zelf invult wordt oranje. Bij AGF zie je bij sommige artikelen 💰 <b>Volle collo</b>: een hele collo bestellen geeft korting. Vink af met ☐ Besteld, of onderaan met <b>Klaar, alles besteld</b>. Onder ⋯ Meer opties vind je pdf, Controle met terminal en Bericht.<br><br><b>🚶 Looproute:</b> staat de route aan, dan staat de lijst per pad in de volgorde waarin je loopt; de app leert mee bij elke bestelling.<br><br><b>🥐 Bake-off:</b> gekoppeld aan Brood Opzet rekent het advies met wat er echt is klaargezet en weg is gegaan; is een soort vaak over of vaak op, dan gaat het advies omlaag of omhoog. De voorraad uit Brood Opzet telt mee. Kom je met wat je bestelt niet uit tot de volgende levering, dan zie je ⚠️ met hoeveel je minstens moet bestellen.'],
  overig: ['Overig', 'Artikelen die je niet via de terminal bestelt. Je ziet hoeveel er verkocht is en wat de app verwacht.'],
  assort: ['Assortiment', 'Wat er nieuw is in het bestelboek, wat eruit gaat en wat gesaneerd is. Tik op <b>Schap aangepast</b> zodra het schap klopt.'],
  taken: ['Taken', 'Bovenaan wat de app vandaag van je vraagt (bestellen, tellen). Daaronder taken en berichten voor jou: tik op ✓ Gedaan of Gelezen. De beheerder maakt taken met <b>+ Nieuwe taak</b>; iedereen kan een ✉️ bericht sturen.'],
  meer: ['Meer', 'Alles staat in groepen: tik op een groep. Of zoek bovenaan, bijvoorbeeld "pincode" of "deadline". Een spelfout of ander woord (zoals "personeel") mag.'],
  'meer:mij': ['Mijn instellingen', 'Weergave (licht/donker, tekstgrootte, korte lijst), meldingen op dit toestel, je pincode of Face ID, en wisselen naar een andere medewerker.'],
  'meer:bestellen': ['Bestellen', 'Lijst per leverancier om over te typen, de leverdag-check, het weekoverzicht, hoe goed het advies was en exporteren. Beheerders stellen hier ook besteldagen, deadlines en waarschuwingen in.'],
  'meer:team': ['Medewerkers', 'Medewerkers toevoegen, pincodes resetten, rechten en beginnersmodus, de checklist voor een nieuwe medewerker, wie deed wat, en taken.'],
  'meer:plekken': ['Actie planning', 'Vers-acties op de koeltafels en KW-acties op de koppen, en de koppen instellen (naam, verkoopfactor, tekening, keuzelijst).'],
  'meer:data': ['Gegevens uploaden', 'Bestanden uploaden of een link plakken, automatisch uploaden vanaf de pc, controleren wat niet gekoppeld is, en verkeerde uploads verwijderen.'],
  'meer:winkel': ['Winkel en app', 'Koppelcode voor toestellen, openingstijden en feestdagen, onderdelen, back-up maken of terugzetten, gegevens opnieuw laden en updates.'],
  'meer:hulp': ['Hulp', 'Uitleg per scherm met woordenlijst, de rondleiding, en Oefenen: alles uitproberen zonder dat er echt iets verandert.'],
  'beheer:upload': ['Bestanden uploaden', 'Kies dag-exports uit CasPos, bestelboeken, actie-pdf\'s, de voorkooplijst of de collo-lijst; de app herkent zelf wat het is. Met <b>🔗 Link plakken</b> haal je een bestand van Reto op via een gekopieerde link. Onderaan zie je welke dagen er zijn en of bestelboeken ontbreken.'],
  'beheer:brood': ['Brood Opzet koppelen', 'Besteladvies haalt elk uur uit Brood Opzet op wat er per bake-off-soort is klaargezet, wat er over was en de voorraad in de vriezer. Vul één keer het <b>adres</b> en de <b>koppelcode</b> in en tik op <b>Opslaan en ophalen</b>. Tik daarna op elke soort om het artikel uit het bestelboek te kiezen; bij precies dezelfde naam gaat dat vanzelf. Kies "Niet koppelen" voor soorten die je niet bestelt.'],
  'beheer:auto': ['Automatisch uploaden', 'Een pc in de winkel stuurt de dag-exports vanzelf door, onzichtbaar, elke 5 minuten. Tik op <b>Nieuw script</b>, pak de zip uit in C:\\Besteladvies en dubbelklik 2-installeren.cmd. Onderaan zie je wat er binnenkwam en wat niet gelukt is.'],
  'beheer:controle': ['Controleren', '<b>Niet gekoppeld:</b> verkochte artikelen die niet in het bestelboek staan; tik om te koppelen, als eigen artikel toe te voegen of te negeren (meest verkocht bovenaan, zoeken kan). <b>Besteleenheid:</b> tik Klopt of pas aan.'],
  'beheer:verwijderen': ['Uploads verwijderen', 'Heb je een verkeerd bestand geüpload? Verwijder hier een dag-export, bestelboek of actiebestand. Daarna kun je het goede bestand opnieuw uploaden.'],
  'beheer:dagen': ['Besteldagen en deadlines', 'Per leverancier op welke dagen je bestelt en wanneer het geleverd wordt, en per productgroep tot hoe laat je kunt bestellen.'],
  'beheer:advies': ['Advies en waarschuwingen', 'Hoe het advies rekent: buffer, telvragen per besteldag, houdbaarheid per groep, weer, en vanaf wanneer de app waarschuwt als iemand veel meer bestelt dan het advies.'],
  'beheer:open': ['Openingstijden', 'Openingstijden per dag en afwijkende dagen zoals feestdagen. Op gesloten dagen rekent de app geen verkoop.'],
  'beheer:onderdelen': ['Onderdelen', 'Welke productgroep bij welk onderdeel hoort (AGF, Vers, Brood, Diepvries, KW) en in welke volgorde de groepen staan.'],
  'tafels:sort': ['Actie planning · Vers · 1 Sorteren', 'Alle vers-acties van de week met verwachte verkoop. Tik per actie op de koeltafel waar hij komt, of op 📝 voor een notitie. Met 📄 Bekijken zie je de folderplanning en de terminal bestellijst vers. Bij een voorbije week staat bovenaan de terugblik.'],
  'tafels:in': ['Actie planning · Vers · 2 Indelen', 'De koeltafels met hoeveel acties er nog geplaatst moeten worden. Tik op een tafel om hem in te delen. Met 👁️ Pdf bekijken krijg je per tafel een staande A4.'],
  'tafels:tafel': ['Koeltafel indelen', 'Bij <b>Nog plaatsen</b> tik je een actie aan en daarna de vakken. Tik op een vak om te wijzigen, vink af wat klaar staat, en maak een pdf om te printen.'],
  'kwacties:sort': ['Actie planning · KW · 1 Sorteren', 'Alle folder-acties met verwachting en 🛒 voorkoop-advies. Tik per actie op de kop waar hij komt of op 📝 voor een notitie. Onder Instore staan de overige acties; sorteren mag maar hoeft niet. pag. X opent de folder op die pagina.'],
  'kwacties:in': ['Actie planning · KW · 2 Indelen', 'Per kop hoeveel acties er nog geplaatst moeten worden. Tik op een kop om de planken in te delen. Met 👁️ Pdf bekijken krijg je elke kop op een staande A4 en een lijst met wat in het vak moet.'],
  'kwacties:kop': ['Kop indelen', 'Tik bij <b>Nog plaatsen</b> een actie aan en daarna de vakken op de plank. Tik op een geplaatste actie om te wijzigen of te verwijderen.'],
  acties: ['Actie planning · 3 Bestellen', 'De acties van de komende week met per artikel het advies, zodat je op tijd genoeg bestelt.'],
  leverancier: ['Per leverancier', 'Alles wat je deze besteldag bestelt, per leverancier, om over te typen in de terminal of door te bellen. "Volle collo" staat erbij als je een hele collo bestelt.'],
  levering: ['Leverdag-check', 'Vink bij het uitpakken af wat er is geleverd. Wat ontbreekt geef je met één tik door; "Rest klopt" vinkt de rest in één keer af.'],
  hoegoed: ['Hoe goed was het advies', 'Per week het advies, wat er besteld en verkocht is, en de geschatte derving. Zo zie je waar het advies te hoog of te laag zat.'],
  vandaag: ['Wie deed wat', 'Per persoon wat er op een dag is gedaan, met tijden. Blader met ‹ › naar andere dagen.'],
  export: ['Exporteren', 'Maak een Excel-bestand van de bestellijst, de verkoop per artikel of de actieresultaten en deel het.'],
  medewerkers: ['Medewerkers', 'Voeg medewerkers toe met hun naam; zij kiezen zelf een pincode. Tik op een naam voor rol, rechten, beginnersmodus of pincode resetten. Na toevoegen krijg je de checklist.'],
  mwedit: ['Rechten', 'Kies bovenaan Vakkenvuller, Afdelingsleider of Beheerder en pas daarna per vinkje aan wat iemand mag. Bij Weergave zet je de beginnersmodus aan: dan ziet iemand alleen bestellen en tellen.'],
  winkel: ['Winkel', 'Met de koppelcode koppel je een toestel van de winkel. De code is 30 dagen geldig; met Delen stuur je hem door. Een nieuwe code ontkoppelt alle toestellen.'],
  meldingen: ['Meldingen', 'Kies welke pushmeldingen dit toestel krijgt: deadlines, taken en berichten, uploads en meer. Op de iPhone werkt dit alleen als de app op je beginscherm staat.'],
  appinst: ['App-instellingen', 'Licht of donker, tekstgrootte, korte lijst (één regel per artikel), verkooptabel altijd tonen en met welke pagina de app opent.'],
  route: ['Looproute', 'De bestellijst staat in de volgorde waarin je door de winkel loopt, per pad. Zet per onderdeel de groepen in het juiste pad (▲ om te verschuiven, ✕ om weg te halen, + Groep toevoegen). Bij elke bestelling kijkt de app tussen welke artikelen je iets invult of afvinkt en leert zo per artikel waar het staat; na twee keer hetzelfde pad verhuist het. Onder <b>Nog geen pad</b> staan artikelen waarvan de app het pad nog niet weet; je kunt een hele groep in één keer toewijzen. In de lijst tik je bij een artikel (open het met de naam) op 🚶 Pad om het pad zelf te kiezen; dat gaat voor op wat de app leert. <b>Terug naar volgorde bestelboek</b> zet de route uit en wist wat geleerd is.'],
  uitleg: ['Uitleg', 'Bovenaan de woordenlijst, daaronder uitleg per scherm. Tik op een onderwerp om het te openen.'],
  eigen: ['Eigen artikelen', 'Artikelen die niet in het bestelboek staan voeg je zelf toe met "+ Artikel toevoegen" onderaan de lijst. Vul de EAN of PLU in, dan koppelt de app de verkoop uit de dag-export en krijg je een advies zoals bij de rest. Tik op de naam om het aan te passen of te verwijderen. Komt het artikel later in het bestelboek, dan meldt de app dat en neem je het boekartikel over.'],
  scannen: ['Barcode scannen', 'Tik in de lijst op "📷 Scannen" en richt de camera op de barcode van het product of het schapkaartje. De app springt naar het artikel. Lukt scannen niet, typ dan het nummer.'],
  tellen: ['Tellen', 'Met "Tellen" loop je het schap af: je ziet één artikel tegelijk, tikt de voorraad in en gaat met Opslaan naar het volgende. Het advies past zich meteen aan. Met 📷 spring je naar een gescand artikel.'],
  printen: ['Printen', 'Tik in de lijst op Printen. Kies alles, alleen met advies of alleen wat ingevuld is, en of elke groep op een nieuwe pagina moet. De barcodes zijn dezelfde als in het bestelboek, zodat je ze direct kunt scannen. In de kolom Besteld vul je met de hand in.']
};
const HULP_ZIJ = new Set(['meer:mij', 'meer:bestellen', 'meer:team', 'meer:plekken', 'meer:data', 'meer:winkel', 'meer:hulp']);
function hulpSleutel() { const t = ui.tab; if (BESTEL_OD.includes(t)) return 'lijst'; if (t === 'beheer') return 'beheer:' + (ui.bsub || 'upload'); if (t === 'meer') return ui.meerG ? 'meer:' + ui.meerG : 'meer'; if (t === 'tafels') return ui.tafel ? 'tafels:tafel' : 'tafels:' + (ui.versStap === 'in' ? 'in' : 'sort'); if (t === 'kwacties') return ui.kwKop ? 'kwacties:kop' : 'kwacties:' + (ui.kwStap === 'in' ? 'in' : 'sort'); return t; }
function hulp() { const t = HULP[hulpSleutel()] || ['Hulp', 'Nog geen uitleg voor dit scherm.']; sheet(`<h2 style="margin:0">${t[0]}</h2><div class="hulptekst">${t[1]}</div><button class="btn" data-x>Begrepen</button>`); }
const TOUR = [
  ['Welkom bij Besteladvies', 'De app vertelt je per artikel hoeveel je moet bestellen. Bovenaan Home staat <b>Jouw taken vandaag</b>: daar begin je.'],
  ['Zo bestel je', '1. Tik op je afdeling, bijvoorbeeld AGF.<br>2. Tel wat er ligt en vul het in (mag leeg).<br>3. Kijk naar het <b>Advies</b> en tik op <b>Neem advies over</b> of vul zelf in.<br>4. Klaar? Tik onderaan op <b>Klaar, alles besteld</b>.'],
  ['Hulp nodig?', 'Op elk scherm staat bovenaan <b>❓ Hulp</b>. Onder Meer kun je <b>Oefenen</b> zonder dat er iets echt verandert. Vergissing? Tik op <b>Ongedaan</b> onderin.']
];
function tourAlsNodig() { if (OEFEN) return; const k = 'cba-tour-' + wieSleutel(); if (ls.get(k)) return; ls.set(k, 1); tour(); }
function tour(i = 0) {
  const t = TOUR[i];
  sheet(`<div class="small">Stap ${i + 1} van ${TOUR.length}</div><h2 style="margin:0">${t[0]}</h2><div class="hulptekst">${t[1]}</div><div class="row"><button class="btn sec" data-x style="flex:1">Overslaan</button><button class="btn" data-volg style="flex:1">${i < TOUR.length - 1 ? 'Volgende' : 'Aan de slag'}</button></div>`,
    (e, ov) => { if (e.target.dataset.volg !== undefined) { ov.remove(); if (i < TOUR.length - 1) tour(i + 1); } });
}

/* ---------- updates ---------- */
let nieuweVersie = null;
async function zoekUpdate(stil) {
  if (DEMO) { if (!stil) toast(`✓ Je hebt de nieuwste versie (${VERSIE})`); return; }
  if (!navigator.onLine) { if (!stil) toast('Geen internet – probeer het straks nog eens'); return; }
  if (!stil) toast('Controleren…');
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); const j = await r.json();
    if (j.versie && j.versie !== VERSIE) { nieuweVersie = j.versie; toonUpdateBalk(); if (!stil && ask(`Versie ${j.versie} staat klaar. Nu bijwerken?`)) werkBij(); }
    else if (!stil) toast(`✓ Je hebt de nieuwste versie (${VERSIE})`);
  } catch (e) { if (!stil) toast('Controleren lukt nu niet'); }
}
function toonUpdateBalk() {
  if (!nieuweVersie || $('#updBalk') || document.body.classList.contains('inlog')) return;
  const b = document.createElement('button'); b.id = 'updBalk'; b.className = 'updbalk'; b.innerHTML = `Versie ${esc(nieuweVersie)} staat klaar – <u>Bijwerken</u>`; b.onclick = werkBij;
  $('#kop').after(b);
}
async function werkBij() {
  toast('Bijwerken…');
  try { const reg = await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) { }
  location.reload();
}
if (!DEMO) { setInterval(() => { if (!document.hidden) zoekUpdate(true); }, 30 * 60000); setTimeout(() => zoekUpdate(true), 8000); }

/* ---------- pushmeldingen ---------- */
const SOORTEN = BESTEL_OD.map(o => ['bestel_' + o, 'Besteldag ' + odNaam(o), `Op de besteldag een herinnering om ${odNaam(o)} te bestellen`, 'o_' + o]).concat([['boek', 'Nieuw bestelboek', 'Wat er nieuw is en wat uit het assortiment gaat'], ['export', 'Dag-export ontbreekt', 'Als de verkoop van gisteren nog niet is geüpload', 'upload'], ['inout', 'In/out bijna op', 'Als een in/out-artikel te vroeg op dreigt te raken', 'inout'], ['deadline', 'Besteldeadline', 'Een half uur voor de deadline als er nog iets open staat', 'afvinken'], ['week', 'Weekoverzicht', 'Elke maandag een samenvatting van vorige week'], ['taak', 'Taken en berichten', 'Als iemand je een taak of bericht stuurt'], ['pcstil', 'Pc stuurt niets', 'Als er 24 uur geen dag-export binnenkomt', 'upload'], ['auto', 'Automatische upload', 'Als de dag-export vanzelf is binnengekomen (alleen beheerders)', 'x_beheer'], ['folder', 'Nieuwe folderplanning', 'Als de folderplanning van een nieuwe week online staat', 'o_kw']]);
function pushStatus() {
  if (DEMO) return 'demo';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'niet';
  return Notification.permission;
}
async function pushAbo() {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) { const b64 = VAPID_PUB.replace(/-/g, '+').replace(/_/g, '/'); const raw = atob(b64 + '='.repeat((4 - b64.length % 4) % 4)); sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, c => c.charCodeAt(0)) }); }
  return sub.toJSON();
}
async function pushOpslaan(uit) {
  const sub = await pushAbo(); const cur = ls.get('cba-push') || {};
  const row = { winkel_id: W, endpoint: sub.endpoint, sub, wie: wieSleutel(), rol: mag('upload') ? 'beheer' : 'medewerker', uit: uit || cur.uit || [] };
  await upsert('push_abos', [row], 'endpoint'); ls.set('cba-push', { endpoint: sub.endpoint, uit: row.uit }); return row;
}
function renderMeldingen() {
  const v = $('#view'); const st = pushStatus(); const cur = ls.get('cba-push');
  const uit = (cur && cur.uit) || [];
  let h = '<div class="blk"><h2>Pushmeldingen</h2>';
  if (st === 'demo') h += '<p class="small">In de testversie werken meldingen niet. In de echte app zet je ze hier aan.</p>';
  else if (st === 'niet') h += '<p>Zet de app eerst op je beginscherm: Safari → Deel → <b>Zet op beginscherm</b>. Open de app daarna vanaf het beginscherm en kom hier terug.</p>';
  else if (st === 'denied') h += '<p>Meldingen zijn geblokkeerd. Zet ze aan via Instellingen → Meldingen → Besteladvies.</p>';
  else if (!cur || st !== 'granted') h += '<p class="small">Krijg op de besteldag een herinnering, en een melding bij een nieuw bestelboek.</p><button class="btn" id="pAan" style="width:100%">Meldingen aanzetten</button>';
  else h += `<p class="small">Meldingen staan aan op dit toestel. Kies welke je wilt krijgen:</p><div class="list">${SOORTEN.filter(s => !s[3] || mag(s[3])).map(s => `<div class="it"><span><b>${s[1]}</b><br><span class="small">${s[2]}</span></span><input type="checkbox" class="schak" data-ps="${s[0]}" ${uit.includes(s[0]) ? '' : 'checked'}></div>`).join('')}</div><button class="btn sec" id="pTest" style="width:100%;margin-top:12px">Testmelding sturen</button>`;
  h += '</div>';
  if (mag('instellingen')) { const p = (S.inst && S.inst.push) || {}; h += `<div class="blk"><h2>Tijden</h2><div class="form"><div class="f"><label>Herinnering besteldag</label><input type="time" id="tB" value="${p.bestel || '08:30'}"></div><div class="f"><label>Controle dag-export</label><input type="time" id="tE" value="${p.export || '10:00'}"></div><div class="f"><label>Controle in/out</label><input type="time" id="tI" value="${p.inout || '11:00'}"></div><button class="btn" id="tSave">Tijden opslaan</button></div></div>`; }
  v.innerHTML = h;
  const aan = $('#pAan'); if (aan) aan.onclick = async () => { try { const p = await Notification.requestPermission(); if (p !== 'granted') { toast('Meldingen zijn niet toegestaan'); return render(); } await pushOpslaan([]); toast('Meldingen staan aan'); render(); } catch (e) { toast('Aanzetten mislukt: ' + e.message, 5000); } };
  const huidigUit = () => { const u = new Set((ls.get('cba-push') || {}).uit || []); v.querySelectorAll('[data-ps]').forEach(x => x.checked ? u.delete(x.dataset.ps) : u.add(x.dataset.ps)); return [...u]; };
  v.querySelectorAll('[data-ps]').forEach(c => c.onchange = async () => { try { await pushOpslaan(huidigUit()); toast('Opgeslagen'); } catch (e) { toast('Opslaan mislukt: ' + e.message, 5000); } });
  const t = $('#pTest'); if (t) t.onclick = async () => { try { t.disabled = true; const row = await pushOpslaan(huidigUit()); const r = await fetch(`${SB_URL}/functions/v1/stuur-push`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY }, body: JSON.stringify({ soort: 'test', endpoint: row.endpoint }) }); const j = await r.json().catch(() => ({})); toast(r.ok ? 'Testmelding verstuurd' + (j.versie ? ' (functie ' + j.versie + ')' : '') : 'Mislukt: ' + (j.fout || j.message || j.msg || r.status), 6000); } catch (e) { toast('Mislukt: ' + e.message, 6000); } finally { t.disabled = false; } };
  const ts = $('#tSave'); if (ts) ts.onclick = () => saveInst(Object.assign({}, S.inst || {}, { push: { bestel: $('#tB').value || '08:30', export: $('#tE').value || '10:00', inout: $('#tI').value || '11:00' } }));
}
async function pushBoek(bron, nieuw, uit) {
  if (DEMO) return;
  try { await fetch(`${SB_URL}/functions/v1/stuur-push`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ soort: 'boek', winkel: W, bron, nieuw, uit }) }); } catch (e) { }
}

function besteldag(od) {
  const lijst = bdLijst(od, 4); const vandaag = C.today();
  const cur = lijst.find(l => l.besteldag === ui.bd[od]) || lijst.find(l => l.besteldag >= vandaag || voortgang(od, l, true).open > 0) || lijst[0];
  return { lijst, cur };
}
