/* ---------- hoe goed was het advies ---------- */
async function renderHoeGoed() {
  const v = $('#view'); v.innerHTML = '<div class="empty">Laden…</div>';
  const vandaag = C.today(); const van = C.add(vandaag, -56);
  let rows = [];
  if (DEMO || OEFEN) rows = Object.entries(S.bestel).map(([k, b]) => { const [bn, rest] = k.split('|')[0].split(/:(.+)/); return Object.assign({ bron: bn, nr: rest }, b); });
  else { try { rows = await getAll(wq(`bestellingen?besteldag=gte.${van}&besteldag=lt.${vandaag}&select=bron,nr,besteldag,lever,aantal,besteld,advies`)); } catch (e) { v.innerHTML = '<div class="empty">Laden lukt niet. Probeer het opnieuw met internet.</div>'; return; } }
  if (ui.tab !== 'hoegoed') return;
  const wk = {}; const art = {};
  for (const r of rows) {
    const key = r.bron + ':' + r.nr; const a = M.art[key]; if (!a) continue; const od = onderdeelVan(a); if (!mag('o_' + od)) continue;
    const besteld = r.aantal !== null && r.aantal !== undefined ? +r.aantal : r.besteld ? (+r.advies || 0) : null; if (besteld === null) continue;
    const lv = C.levering(M, od, r.besteldag); if (!lv || lv.L2 > vandaag) continue;
    const s = M.keys[key]; let verk = 0; for (let d = lv.L; d < lv.L2; d = C.add(d, 1)) { const i = C.idx(M, d); if (s && i >= 0 && i < M.N) verk += s.v[i]; }
    const he = a.perHE ? a.he : 1; const w = C.isoWeek(r.besteldag).w;
    const k2 = w + '|' + od; const t = wk[k2] || (wk[k2] = { w, od, adv: 0, best: 0, verk: 0, n: 0, derv: 0 }); t.adv += (+r.advies || 0) * he; t.best += besteld * he; t.verk += verk; t.n++;
    const ta = art[key] || (art[key] = { a, best: 0, verk: 0 }); ta.best += besteld * he; ta.verk += verk;
  }
  for (const r of Object.values(S.derving || {})) { const a = M.art[r.bron + ':' + r.nr]; if (!a || r.dag < van) continue; const od = onderdeelVan(a); const w = C.isoWeek(r.dag).w; const t = wk[w + '|' + od] || (wk[w + '|' + od] = { w, od, adv: 0, best: 0, verk: 0, n: 0, derv: 0 }); t.derv += +r.aantal || 0; }
  const pct = (b, v2) => v2 > 0 ? Math.round((b - v2) / v2 * 100) : null;
  const cel = p => p === null ? '–' : `<span class="${Math.abs(p) > 25 ? 'rood' : Math.abs(p) <= 10 ? 'groen' : ''}">${p > 0 ? '+' : ''}${p}%</span>`;
  const weken = [...new Set(Object.values(wk).map(x => x.w))].sort((a, b) => b - a);
  let h = `<div class="blk"><p class="small">Per week en onderdeel: wat de app adviseerde, wat er besteld is en wat er in de periode tot de volgende levering echt verkocht is (in stuks of kg). Groen = binnen 10%, rood = meer dan 25% verschil.</p></div>`;
  if (!weken.length) h += '<div class="empty">Komt vanzelf: na 2 weken met dag-exports en bestellingen zie je hier hoe goed het advies was.</div>';
  for (const w of weken) {
    const r = Object.values(wk).filter(x => x.w === w).sort((a, b) => BESTEL_OD.indexOf(a.od) - BESTEL_OD.indexOf(b.od));
    h += `<div class="blk"><h2>Week ${w}</h2><table class="hg"><tr><th>Onderdeel</th><th>Advies</th><th>Besteld</th><th>Verkocht</th><th>Derving</th><th>Verschil</th></tr>${r.map(x => `<tr><td>${odNaam(x.od)}</td><td>${C.fmt(x.adv, 0)}</td><td>${C.fmt(x.best, 0)}</td><td>${C.fmt(x.verk, 0)}</td><td>${x.derv ? C.fmt(x.derv, 0) : ''}</td><td>${x.best ? cel(pct(x.best, x.verk)) : ''}</td></tr>`).join('')}</table></div>`;
  }
  const top = Object.values(art).filter(x => x.verk > 0 || x.best > 0).map(x => Object.assign(x, { d: x.best - x.verk })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 10);
  if (top.length) h += `<div class="blk"><h2>Grootste verschillen</h2><p class="small">Over de afgelopen 8 weken. Plus = meer besteld dan verkocht.</p><table class="hg"><tr><th>Artikel</th><th>Besteld</th><th>Verkocht</th><th>Verschil</th></tr>${top.map(x => `<tr><td>${esc(x.a.naam)}</td><td>${C.fmt(x.best, 0)}</td><td>${C.fmt(x.verk, 0)}</td><td class="${x.d > 0 ? 'rood' : ''}">${x.d > 0 ? '+' : ''}${C.fmt(x.d, 0)}</td></tr>`).join('')}</table></div>`;
  v.innerHTML = h;
}
/* ---------- bestellijst per leverancier ---------- */
function renderLeverancier() {
  const v = $('#view'); const vandaag = C.today();
  const dagen = []; for (let k = 0; k < 7 && dagen.length < 4; k++) { const d = C.add(vandaag, k); if (BESTEL_OD.some(od => mag('o_' + od) && C.levering(M, od, d))) dagen.push(d); }
  if (!ui.levDag || !dagen.includes(ui.levDag)) ui.levDag = dagen[0];
  const dag = ui.levDag; const groep = { versunie: [], vantol: [], anders: [] };
  if (dag) for (const od of BESTEL_OD) {
    if (!mag('o_' + od)) continue; const lv = C.levering(M, od, dag); if (!lv) continue;
    for (const a of lijstArtikelen(od)) {
      if (a.uit || assStatus(a) !== 'in') continue; const be = S.bestel[a.key + '|' + dag];
      const n = be && be.aantal !== null && be.aantal !== undefined ? +be.aantal : C.advies(M, a.key, lv, vrVan(a.key), bestellingenVan(a.key)).adv;
      if (!(n > 0)) continue; groep[levVan(a)].push({ a, n, lv, od, besteld: !!(be && be.besteld), ingevuld: !!(be && be.aantal !== null && be.aantal !== undefined) });
    }
  }
  let h = `<div class="bar"><div class="chips">${dagen.map(d => `<button class="chip ${d === dag ? 'on' : ''}" data-ld="${d}"><b>Bestellen ${C.fmtDag(d)}</b></button>`).join('')}</div></div>`;
  if (!dag) h += '<div class="empty">Geen besteldagen in de komende week.</div>';
  for (const lev of Object.keys(groep)) {
    const l = groep[lev]; if (!l.length) continue;
    h += `<div class="blk"><h2>${LEV_NAAM[lev]} <span class="small">· ${l.length} artikelen</span></h2><div class="list">${l.map(x => `<div class="it"><span style="flex:1"><b>${esc(x.a.eigen ? x.a.artNr || '–' : x.a.nr)}</b> ${esc(x.a.naam)}<br><span class="small">${odNaam(x.od)} · levering ${C.fmtDag(x.lv.L)}${x.ingevuld ? '' : ' · advies'}${(() => { const c = colloVan(x.a); return c && x.n % c.eenh === 0 ? ' · <b class="oranje">volle collo</b>' : ''; })()}</span></span><b style="font-size:18px">${C.fmt(x.n)} ${x.a.perHE ? ehMv(x.a, x.n) : ''}</b>${x.besteld ? ' <span title="besteld">✓</span>' : ''}</div>`).join('')}</div>
    <div class="row" style="margin-top:10px"><button class="btn sm sec" data-ldeel="${lev}" style="flex:1">Delen</button><button class="btn sm sec" data-lprint="${lev}" style="flex:1">👁️ Pdf</button></div></div>`;
  }
  if (dag && !Object.values(groep).some(l => l.length)) h += '<div class="empty">Niets te bestellen op deze dag.</div>';
  const ctl = BESTEL_OD.filter(od => mag('o_' + od) && besteldag(od).cur && lijstArtikelen(od).length);
  v.innerHTML = (ctl.length ? `<div class="lijstchips"><span class="small">🔍 Controle met terminal:</span>${ctl.map(od => `<button class="chipknop" data-ctl="${od}">${esc(odNaam(od))}</button>`).join('')}</div>` : '') + h;
  v.querySelectorAll('[data-ctl]').forEach(b => b.onclick = () => controleSheet(b.dataset.ctl, besteldag(b.dataset.ctl).cur));
  v.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => { ui.levDag = b.dataset.ld; render(); });
  const tekst = lev => `Bestelling ${LEV_NAAM[lev]} – ${C.DAGNAAM[C.wd(dag)]} ${C.fmtDag(dag).split(' ')[1]}\n${(WINKEL && WINKEL.naam) || ''}\n\n` + groep[lev].map(x => `${x.a.eigen ? x.a.artNr || '' : x.a.nr}\t${x.a.naam}\t${C.fmt(x.n)}${x.a.perHE ? ' ' + ehMv(x.a, x.n) : ''}`).join('\n');
  v.querySelectorAll('[data-ldeel]').forEach(b => b.onclick = async () => { const t = tekst(b.dataset.ldeel); try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); toast('Gekopieerd'); } } catch (e) { } window.__laatsteDeel = t; });
  v.querySelectorAll('[data-lprint]').forEach(b => b.onclick = () => { const lev = b.dataset.lprint; $('#printArea').innerHTML = `<table><thead><tr class="pkop"><th colspan="4">Bestelling ${LEV_NAAM[lev]} · ${esc((WINKEL && WINKEL.naam) || '')} · bestellen ${C.DAGNAAM[C.wd(dag)]} ${C.fmtDag(dag).split(' ')[1]}</th></tr><tr><th>Artikel</th><th>Barcode</th><th>Aantal</th><th>Besteld</th></tr></thead><tbody>${groep[lev].map(x => { const nr = x.a.eigen ? x.a.artNr : x.a.nr; return `<tr><td class="n"><b>${esc(nr || '')}</b> ${esc(x.a.naam)}</td><td>${/^\d{4,}$/.test(nr || '') ? C.msi(nr, 40, true) : ''}</td><td class="g pad">${C.fmt(x.n)}${x.a.perHE ? ' ' + ehMv(x.a, x.n) : ''}</td><td class="bst"></td></tr>`; }).join('')}</tbody></table>`; toonPdf(`Bestellijst ${LEV_NAAM[lev] || lev}`); });
}
/* ---------- groepvolgorde ---------- */
function volgordeHtml() {
  const od = ui.volgOd && BESTEL_OD.includes(ui.volgOd) ? ui.volgOd : 'agf'; ui.volgOd = od;
  const g = [...new Set(lijstArtikelen(od).map(groepVan))];
  return `<div class="blk" data-sec="onderdelen"><h2>Volgorde van de groepen</h2><p class="small">Zet de groepen in de volgorde van je winkel. De lijst, het tellen en de print volgen deze volgorde.</p><div class="chips2" id="volgOd">${BESTEL_OD.map(o => `<button class="${o === od ? 'aan' : ''}" data-vo="${o}">${odNaam(o)}</button>`).join('')}</div><div id="volgL" style="margin-top:8px">${g.map((x, i) => `<div class="volgrij"><span>${esc(x)}</span><button data-vu="${i}" ${i ? '' : 'disabled'}>▲</button><button data-vd="${i}" ${i < g.length - 1 ? '' : 'disabled'}>▼</button></div>`).join('') || '<div class="small">Nog geen groepen.</div>'}</div>${(S.inst && S.inst.groepVolgorde && S.inst.groepVolgorde[od]) ? '<button class="btn sm sec" id="volgR" style="margin-top:8px">Terug naar de volgorde van het bestelboek</button>' : ''}</div>`;
}
function volgordeEvents(v) {
  const od = ui.volgOd; const g = [...new Set(lijstArtikelen(od).map(groepVan))];
  const zet = l => { const data = JSON.parse(JSON.stringify(S.inst || {})); data.groepVolgorde = Object.assign({}, data.groepVolgorde || {}); if (l) data.groepVolgorde[od] = l; else delete data.groepVolgorde[od]; saveInst(data); };
  v.querySelectorAll('[data-vo]').forEach(b => b.onclick = () => { ui.volgOd = b.dataset.vo; render(); });
  v.querySelectorAll('[data-vu]').forEach(b => b.onclick = () => { const i = +b.dataset.vu; [g[i - 1], g[i]] = [g[i], g[i - 1]]; zet(g); });
  v.querySelectorAll('[data-vd]').forEach(b => b.onclick = () => { const i = +b.dataset.vd; [g[i + 1], g[i]] = [g[i], g[i + 1]]; zet(g); });
  const r = $('#volgR'); if (r) r.onclick = () => zet(null);
}

/* ---------- 1.9 ---------- */
const weekSleutel = d => { const w = C.isoWeek(d); return `${w.y}-${String(w.w).padStart(2, '0')}`; };
const weekMaandag = k => { const [y, w] = k.split('-').map(Number); return C.mondayOf(y, w); };
const nuHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const minuten = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + m; };
let buitenApp = 0;
try { if (navigator.share) { const o = navigator.share.bind(navigator); navigator.share = async d => { buitenApp++; try { return await o(d); } finally { setTimeout(() => { buitenApp = Math.max(0, buitenApp - 1); }, 2000); } }; } } catch (e) { }
try { const pr = window.print.bind(window); window.print = () => { buitenApp++; try { pr(); } finally { setTimeout(() => { buitenApp = Math.max(0, buitenApp - 1); }, 2000); } }; } catch (e) { }
document.addEventListener('touchmove', e => { if (document.body.classList.contains('vast') && !(e.target.closest && e.target.closest('select'))) e.preventDefault(); }, { passive: false });

/* ---------- home: zoeken, overdracht, deadline ---------- */
function homeZoekHtml() { return `<div class="bar homezoek"><div class="zoekveld"><input type="search" id="hq" placeholder="🔍 Zoek een artikel" value="${esc(ui.hq || '')}"><button id="hScan" aria-label="${ui.hq ? 'Wissen' : 'Scannen'}">${ui.hq ? '✕' : '📷'}</button></div><div id="hRes"></div></div>`; }
function zoekAlles(q) {
  q = q.toLowerCase().trim(); if (q.length < 2) return [];
  const out = [];
  for (const a of Object.values(M.art)) {
    if (a.uit) continue; const od = onderdeelVan(a); if (!mag('o_' + od)) continue;
    const nr = a.eigen ? a.artNr || '' : a.nr;
    let sc = nr.includes(q) || (a.bst || '') === q || (a.eigen && String(a.ean || '').includes(q)) ? 120 : zoekScore(q, a.naam + ' ' + (a.merk || ''));
    if (sc > 0) out.push([sc, a]);
  }
  out.sort((x, y) => y[0] - x[0]); out.splice(25); for (let i = 0; i < out.length; i++) out[i] = out[i][1];
  if (/^\d{8,14}$/.test(q)) { const a = vindCode(q); if (a && !out.includes(a)) out.unshift(a); }
  return out;
}
function homeZoekRes() {
  const el = $('#hRes'); if (!el) return; const l = zoekAlles(ui.hq || '');
  el.innerHTML = !ui.hq || ui.hq.length < 2 ? '' : l.length ? `<div class="list zoekres">${l.map(a => `<button class="it" data-hz="${a.key}"><span style="flex:1;text-align:left"><b>${esc(a.naam)}</b><br><span class="small">${esc(a.eigen ? a.artNr || 'eigen artikel' : a.nr)} · ${odNaam(onderdeelVan(a))} · ${esc(groepVan(a))}</span></span><span class="pijl">›</span></button>`).join('')}</div>` : '<div class="small" style="padding:8px 4px">Niets gevonden.</div>';
  el.querySelectorAll('[data-hz]').forEach(b => b.onclick = () => { ui.hq = ''; naarArtikel(M.art[b.dataset.hz]); });
}
function overdrachtHtml() {
  const l = Object.values(S.overdracht || {}).filter(r => !r.klaar && !r.soort).sort((a, b) => (a.ts || '') < (b.ts || '') ? -1 : 1);
  if (!l.length) return '<div class="ovklein"><button class="btn sec" id="ovAdd">Bericht voor collega\'s</button></div>';
  return `<div class="blk overdracht"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Voor collega's</h2><button class="btn sm sec" id="ovAdd">+ Toevoegen</button></div>${l.length ? `<div class="list">${l.map(r => `<div class="it"><span style="flex:1">${esc(r.tekst)}<br><span class="small">${esc(r.wie || '')} · ${C.fmtDag((r.ts || C.today()).slice(0, 10))} ${hhmm(r.ts)}</span></span><button class="btn sm" data-ovok="${esc(r.id)}">✓ Gedaan</button></div>`).join('')}</div>` : '<p class="small" style="margin:6px 0 0">Geen openstaande punten voor de volgende dienst.</p>'}</div>`;
}
function homeEvents(v) {
  const q = $('#hq'), hs = $('#hScan'), knop = () => { hs.textContent = ui.hq ? '✕' : '📷'; hs.setAttribute('aria-label', ui.hq ? 'Wissen' : 'Scannen'); };
  if (q) { q.oninput = () => { const was = ui.hq; ui.hq = q.value; homeZoekRes(); knop(); if (!was && ui.hq) q.closest('.homezoek').scrollIntoView({ block: 'start', behavior: 'smooth' }); }; homeZoekRes(); }
  if (hs) hs.onclick = () => { if (ui.hq) { ui.hq = ''; q.value = ''; homeZoekRes(); knop(); q.focus(); } else scanStart(null); };
  const oa = $('#ovAdd'); if (oa) oa.onclick = () => {
    const ov = sheet(`<h2 style="margin:0">Bericht voor collega's</h2><p class="small">Voor de volgende dienst. Het blijft bij Taken staan tot iemand het afvinkt.</p><div class="form"><textarea id="ovT" rows="3" placeholder="Bijv. KW nog niet besteld, leverancier belt terug" style="width:100%;border:1px solid var(--lijn);border-radius:12px;padding:10px;font:inherit;background:var(--kaart);color:var(--tekst)"></textarea><div class="row"><button class="btn sec" data-x style="flex:1">Annuleren</button><button class="btn" id="ovS" style="flex:1">Opslaan</button></div></div>`);
    $('#ovS').onclick = () => { const t = $('#ovT').value.trim(); if (!t) return; const id = 'O' + Date.now().toString(36); write('overdracht', [{ id, tekst: t, wie: mijnNaam(), ts: new Date().toISOString(), klaar: false }]); log('overdracht', `Overdracht: ${t}`); ov.remove(); render(); };
  };
  v.querySelectorAll('[data-ovok]').forEach(b => b.onclick = () => { const r = S.overdracht[b.dataset.ovok]; if (!r) return; write('overdracht', [{ id: r.id, tekst: r.tekst, wie: r.wie, ts: r.ts, klaar: true, klaar_door: mijnNaam(), klaar_om: new Date().toISOString() }]); log('overdracht', `Overdracht gedaan: ${r.tekst}`); ongedaan('Overdracht afgevinkt', () => write('overdracht', [{ id: r.id, tekst: r.tekst, wie: r.wie, ts: r.ts, klaar: false, klaar_door: null, klaar_om: null }])); render(); });
}
setInterval(() => { if (OPEN && ui.tab === 'home' && !document.hidden && !$('.sheet') && document.activeElement && document.activeElement.id !== 'hq' && $('.deadlines')) render(); }, 60000);

/* ---------- alles volgens advies, groep besteld ---------- */
async function groepBesteld(od, cur, g) {
  const rows = [];
  for (const a of lijstArtikelen(od)) {
    if (groepVan(a) !== g || a.uit || assStatus(a) !== 'in') continue; const be = S.bestel[a.key + '|' + cur.besteldag];
    if (be && be.besteld) continue; const ad = C.advies(M, a.key, cur, vrVan(a.key), bestellingenVan(a.key));
    const n = be && be.aantal !== null && be.aantal !== undefined ? be.aantal : ad.adv; if (!(n > 0)) continue;
    rows.push({ bron: a.bron, nr: a.nr, besteldag: cur.besteldag, lever: cur.L, besteld: true, besteld_door: mijnNaam(), besteld_om: new Date().toISOString(), advies: ad.adv });
  }
  if (!rows.length) return toast('In deze groep staat niets meer open');
  if (!await bevestig('Groep besteld?', `<b>${esc(g)}</b>: ${rows.length} artikelen worden afgevinkt als besteld.`, 'Afvinken', 'Annuleren')) return;
  write('bestellingen', rows); log('besteld', `Groep besteld: ${g} (${rows.length})`);
  ongedaan('Groep afgevinkt', () => write('bestellingen', rows.map(r => Object.assign({}, r, { besteld: false, besteld_door: null, besteld_om: null })))); render(true);
}

/* ---------- derving ---------- */
function dervingInvoer(a) {
  let soort = 'weg'; const u = eenheid(a);
  const recent = Object.values(S.derving).filter(r => r.bron === a.bron && r.nr === a.nr).sort((x, y) => x.dag < y.dag ? 1 : -1).slice(0, 5);
  const ov = sheet(`<h2 style="margin:0">Derving</h2><p class="small">${esc(a.naam)}</p><div class="form"><div class="chips2" id="dvS"><button class="aan" data-k="weg">🗑️ Weggegooid</button><button data-k="af">🏷️ Afgeprijsd</button></div><label>Aantal (${u})</label><input type="number" id="dvA" inputmode="decimal" placeholder="Bijv. 3"><div class="row"><button class="btn sec" data-x style="flex:1">Annuleren</button><button class="btn" id="dvO" style="flex:1">Opslaan</button></div>${recent.length ? `<p class="small">Laatst: ${recent.map(r => `${C.fmtDag(r.dag)} ${C.fmt(+r.aantal)} ${r.soort === 'af' ? 'afgeprijsd' : 'weg'}`).join(' · ')}</p>` : ''}</div>`);
  $('#dvS').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; soort = b.dataset.k; $('#dvS').querySelectorAll('[data-k]').forEach(x => x.classList.toggle('aan', x === b)); };
  $('#dvO').onclick = () => { const n = C.num($('#dvA').value); if (!(n > 0)) return toast('Vul een aantal in'); const id = 'D' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); write('derving', [{ id, dag: C.today(), bron: a.bron, nr: a.nr, aantal: n, soort, door: mijnNaam() }]); log('derving', `${soort === 'af' ? 'Afgeprijsd' : 'Derving'} ${a.naam}: ${n}`); ov.remove(); rebuild(); render(true); toast('Opgeslagen'); };
}

/* ---------- prijswijzigingen ---------- */
function prijsLijst() {
  const out = [];
  for (const bron of ['vers', 'kw']) { const b = S.boeken[bron]; if (!b || !b.prijs) continue; for (const p of b.prijs) { const a = M.art[bron + ':' + p.nr]; if (!a || a.uit || assStatus(a) !== 'in') continue; if (Math.abs((S.prijsOk[a.key] || 0) - p.nieuw) < 0.004) continue; if (!mag('o_' + onderdeelVan(a))) continue; out.push({ a, oud: p.oud, nieuw: p.nieuw }); } }
  return out;
}
function prijsHtml() {
  const l = prijsLijst(); if (!l.length) return '';
  return `<div class="grp"><span>🏷️ Prijs gewijzigd</span><small>${l.length} schapkaartje${l.length === 1 ? '' : 's'} vervangen</small></div><div class="card laatste"><div class="list">${l.map(x => `<div class="it"><span style="flex:1">${esc(x.a.naam)} <span class="small">${x.a.nr} · ${odNaam(onderdeelVan(x.a))}</span><br><span class="small">${C.eur(x.oud)} → <b class="${x.nieuw > x.oud ? 'rood' : ''}">${C.eur(x.nieuw)}</b></span></span>${mag('schap') ? `<button class="btn sm" data-pok="${x.a.key}|${x.nieuw}">Kaartje vervangen</button>` : ''}</div>`).join('')}</div></div>`;
}
function prijsEvents(v) { v.querySelectorAll('[data-pok]').forEach(b => b.onclick = () => { const [key, p] = b.dataset.pok.split('|'); const a = M.art[key]; const oud = S.prijsOk[key]; write('prijs_ok', [{ bron: a.bron, nr: a.nr, prijs: +p, door: mijnNaam() }]); log('schap', `Schapkaartje vervangen: ${a.naam}`); ongedaan('Kaartje vervangen', () => write('prijs_ok', [{ bron: a.bron, nr: a.nr, prijs: oud || 0, door: mijnNaam() }])); render(); }); }

/* ---------- leverdag-check ---------- */
function leverRegels(dag) {
  const out = [];
  for (const k in S.bestel) {
    const b = S.bestel[k]; if (b.lever !== dag) continue; const key = k.split('|')[0]; const a = M.art[key]; if (!a) continue;
    if (!mag('o_' + onderdeelVan(a))) continue;
    const n = b.aantal !== null && b.aantal !== undefined ? +b.aantal : b.besteld ? +b.advies || 0 : 0; if (!(n > 0)) continue;
    out.push({ a, n, chk: S.lever[key + '|' + dag] || null });
  }
  return out.sort((x, y) => (levVan(x.a) + groepVan(x.a) + x.a.naam).localeCompare(levVan(y.a) + groepVan(y.a) + y.a.naam));
}
function leverDagen() { const s = new Set(); for (const k in S.bestel) { const b = S.bestel[k]; if (b.lever && b.lever >= C.add(C.today(), -3) && b.lever <= C.add(C.today(), 4)) s.add(b.lever); } return [...s].sort(); }
function renderLevering() {
  const v = $('#view'); const dagen = leverDagen();
  if (!ui.levCheck || !dagen.includes(ui.levCheck)) ui.levCheck = dagen.includes(C.today()) ? C.today() : dagen.filter(d => d <= C.today()).pop() || dagen[0];
  const dag = ui.levCheck; const l = dag ? leverRegels(dag) : [];
  const ok = l.filter(x => x.chk && x.chk.ok).length, mist = l.filter(x => x.chk && x.chk.ok === false);
  let h = `<div class="bar"><div class="chips">${dagen.map(d => `<button class="chip ${d === dag ? 'on' : ''}" data-lc="${d}"><b>Levering ${C.fmtDag(d)}</b></button>`).join('')}</div>${l.length ? `<div class="voortgang"><span>${ok} binnen · ${mist.length} mist</span><b>${l.length - ok - mist.length ? `nog ${l.length - ok - mist.length} te controleren` : '✓ alles gecontroleerd'}</b></div>` : ''}</div>`;
  if (!dag) h += '<div class="empty">Geen leveringen rond vandaag.</div>';
  let lev = null;
  for (const x of l) {
    const lv = levVan(x.a); if (lv !== lev) { const open = l.filter(y => levVan(y.a) === lv && !y.chk).length; h += `${lev ? '</div></div>' : ''}<div class="blk"><h2 style="display:flex;justify-content:space-between;align-items:center">${LEV_NAAM[lv]}${open ? `<button class="btn sm" data-lalle="${lv}">✓ Rest klopt (${open})</button>` : ''}</h2><div class="list">`; lev = lv; }
    const st = x.chk ? (x.chk.ok ? '<b class="groen">✓ binnen</b>' : `<b class="rood">mist ${C.fmt(+x.chk.mist || x.n)}</b>`) : '';
    h += `<div class="it"><span style="flex:1"><b>${esc(x.a.naam)}</b><br><span class="small">${esc(x.a.eigen ? x.a.artNr || '' : x.a.nr)} · besteld ${C.fmt(x.n)}${x.a.perHE ? ' ' + ehMv(x.a, x.n) : ''}</span> ${st}</span><button class="btn sm" data-lok="${x.a.key}">✓</button><button class="btn sm sec" data-lmis="${x.a.key}">Mist</button></div>`;
  }
  if (lev) h += '</div></div>';
  if (mist.length) h += `<div class="blk"><button class="btn" id="lcDeel" style="width:100%">Ontbrekende artikelen delen</button><p class="small">Handig voor het correctieformulier.</p></div>`;
  v.innerHTML = h;
  v.querySelectorAll('[data-lc]').forEach(b => b.onclick = () => { ui.levCheck = b.dataset.lc; render(); });
  const zet = (key, ok, mistN) => { const a = M.art[key]; write('levercheck', [{ bron: a.bron, nr: a.nr, lever: dag, ok, mist: ok ? null : mistN, door: mijnNaam(), om: new Date().toISOString() }]); render(true); };
  v.querySelectorAll('[data-lok]').forEach(b => b.onclick = () => zet(b.dataset.lok, true));
  v.querySelectorAll('[data-lalle]').forEach(b => b.onclick = () => { const rows = l.filter(y => levVan(y.a) === b.dataset.lalle && !y.chk).map(y => ({ bron: y.a.bron, nr: y.a.nr, lever: dag, ok: true, mist: null, door: mijnNaam(), om: new Date().toISOString() })); if (rows.length) { write('levercheck', rows); log('levering', `${rows.length} artikelen ${LEV_NAAM[b.dataset.lalle]} klopt`); } render(true); });
  v.querySelectorAll('[data-lmis]').forEach(b => b.onclick = () => { const x = l.find(y => y.a.key === b.dataset.lmis); const ov = sheet(`<h2 style="margin:0">Wat mist er?</h2><p class="small">${esc(x.a.naam)} · besteld ${C.fmt(x.n)}${x.a.perHE ? ' ' + ehMv(x.a, x.n) : ''}</p><div class="form"><label>Aantal dat mist${x.a.perHE ? ' (' + ehMv(x.a) + ')' : ''}</label><input type="number" id="lmA" inputmode="decimal" value="${x.n}"><div class="row"><button class="btn sec" data-x style="flex:1">Annuleren</button><button class="btn" id="lmO" style="flex:1">Opslaan</button></div></div>`); $('#lmO').onclick = () => { zet(x.a.key, false, C.num($('#lmA').value) || x.n); log('levering', `Mist bij levering: ${x.a.naam}`); ov.remove(); }; });
  const ld = $('#lcDeel'); if (ld) ld.onclick = async () => { const t = `Ontbreekt bij levering ${C.fmtDag(dag)} – ${(WINKEL && WINKEL.naam) || ''}\n\n` + mist.map(x => `${x.a.eigen ? x.a.artNr || '' : x.a.nr}\t${x.a.naam}\tmist ${C.fmt(+x.chk.mist || x.n)}${x.a.perHE ? ' ' + ehMv(x.a, +x.chk.mist || x.n) : ''} (${LEV_NAAM[levVan(x.a)]})`).join('\n'); window.__laatsteDeel = t; try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); toast('Gekopieerd'); } } catch (e) { } };
}

/* ---------- actieweek voorbereiden ---------- */
function renderActies() {
  const v = $('#view'); const vandaag = C.today();
  const per = M.acties.filter(p => p.zon >= vandaag).sort((a, b) => a.mon < b.mon ? -1 : 1).slice(0, 2);
  let h = '';
  if (!per.length) h = '<div class="empty">Nog geen komende actieweek. Upload de actie-pdf via Kantoor.</div>';
  for (const p of per) {
    h += `<div class="grp"><span>Actieweek ${p.week}</span><small>${C.fmtDag(p.mon)} t/m ${C.fmtDag(p.zon)}</small></div>`;
    for (const od of BESTEL_OD) {
      if (!mag('o_' + od)) continue;
      const keys = Object.keys(M.actieArt).filter(k => M.art[k] && onderdeelVan(M.art[k]) === od && M.actieArt[k].some(x => x.id === p.id));
      if (!keys.length) continue;
      const bds = C.besteldagen(M, od, 6);
      h += `<div class="card laatste"><b>${odNaam(od)} · ${keys.length} acties</b><div class="list">${keys.map(k => { const a = M.art[k]; const ap = M.actieArt[k].find(x => x.id === p.id); const lv = bds.find(l => C.dekking(M, k, l).includes(p.mon) || (l.L <= p.mon && p.mon < l.L2)); const ad = lv ? C.advies(M, k, lv, vrVan(k), bestellingenVan(k)) : null; return `<button class="it" data-ak="${k}"><span style="flex:1;text-align:left"><b>${esc(a.naam)}</b><br><span class="small">${a.nr} · ${ap.folder ? 'Folder' : 'Instore'}${ap.disc ? ' · −' + Math.round(ap.disc * 100) + '%' : ''}${ap.dag !== null && ap.dag !== undefined ? ' · alleen ' + C.DAGNAAM[ap.dag] : ''}</span></span><span style="text-align:right"><b>${ad ? ad.adv + (a.perHE ? ' ' + ehMv(a, ad.adv) : '') : '–'}</b><br><span class="small">${lv ? 'bestellen ' + C.fmtDag(lv.besteldag) : ''}</span></span></button>`; }).join('')}</div></div>`;
    }
  }
  v.innerHTML = `<div class="blk"><p class="small">Alle folder- en instore-acties van de komende actieweek per onderdeel, met het advies voor de besteldag die de actie dekt. Tik op een artikel om ernaartoe te gaan.</p></div>` + h;
  v.querySelectorAll('[data-ak]').forEach(b => b.onclick = () => naarArtikel(M.art[b.dataset.ak]));
}

/* ---------- actietafels ---------- */
const TKLEUR = ['#f17d04', '#2e6fb7', '#2e9d4f', '#c0392b', '#8e44ad', '#d4a017', '#16a085', '#e84393', '#6d4c41', '#546e7a'];
function tafelWeek() { if (!ui.tafelWeek) ui.tafelWeek = weekSleutel(C.today()); return ui.tafelWeek; }
function tafelLijst() { return Object.values(S.tafels || {}).filter(t => !t.weg).sort((a, b) => (a.volg || 0) - (b.volg || 0) || (a.naam || '').localeCompare(b.naam || '')); }
function indelingVan(week, id) { return S.indeling[week + '|' + id] || { items: [] }; }
function tafelTelling(week) {
  week = week || weekSleutel(C.today()); let totaal = 0, klaar = 0;
  for (const t of koelTafels()) for (const it of indelingVan(week, t.id).items || []) { totaal++; if (it.klaar) klaar++; }
  return { week: week.split('-')[1].replace(/^0/, ''), totaal, klaar, open: totaal - klaar, ombouw: C.wd(C.today()) === 0 };
}
function tafelTekening(t, ind, klein) {
  const R = Math.max(1, +t.rijen || 2), K = Math.max(1, +t.kol || 3); const N = R * K; const bezet = new Array(N).fill(-1);
  (ind.items || []).forEach((it, i) => (it.cellen || []).forEach(c => { if (c < N) bezet[c] = i; }));
  let h = `<div class="tafel ${klein ? 'klein' : ''}" style="grid-template-columns:repeat(${K},1fr);grid-template-rows:repeat(${R},${klein ? '22px' : 'minmax(64px,auto)'})">`;
  const gedaan = new Set();
  (ind.items || []).forEach((it, i) => {
    const cel = (it.cellen || []).filter(c => c < N); if (!cel.length) return;
    const rs = cel.map(c => Math.floor(c / K)), ks = cel.map(c => c % K); const r1 = Math.min(...rs), r2 = Math.max(...rs), k1 = Math.min(...ks), k2 = Math.max(...ks);
    const kleur = TKLEUR[(it.kleur ?? i) % TKLEUR.length];
    const label = klein ? '' : `<b>${esc(it.naam)}</b>${it.aantal ? `<span>${C.fmt(+it.aantal)}×</span>` : ''}${it.klaar ? '<i>✓</i>' : ''}`;
    if ((r2 - r1 + 1) * (k2 - k1 + 1) === cel.length) { const smal = !klein && ((k2 - k1 + 1) / K <= 0.25 || (K >= 4 && k2 === k1)); h += `<div class="vak bezet ${it.klaar ? 'klaar' : ''} ${smal ? 'smal' : ''}" data-ti="${i}" style="grid-area:${r1 + 1}/${k1 + 1}/${r2 + 2}/${k2 + 2};background:${kleur}">${label}</div>`; cel.forEach(c => gedaan.add(c)); }
    else { const eerste = Math.min(...cel); cel.forEach(c => { gedaan.add(c); h += `<div class="vak bezet ${it.klaar ? 'klaar' : ''}" data-ti="${i}" style="grid-area:${Math.floor(c / K) + 1}/${c % K + 1};background:${kleur}">${c === eerste ? label : ''}</div>`; }); }
  });
  const vast = new Set((t.vast || []).filter(c => c < N && !gedaan.has(c))); const eersteVast = vast.size ? Math.min(...vast) : -1;
  for (let c = 0; c < N; c++) if (!gedaan.has(c)) h += vast.has(c) ? `<div class="vak vast" style="grid-area:${Math.floor(c / K) + 1}/${c % K + 1}">${klein ? '' : `<span>🔒</span>${c === eersteVast && t.vastTekst ? `<b>${esc(t.vastTekst)}</b>` : ''}`}</div>` : `<div class="vak leeg" data-vc="${c}" style="grid-area:${Math.floor(c / K) + 1}/${c % K + 1}"></div>`;
  return h + '</div>';
}
function tafelPas(root) {
  root.querySelectorAll('.tafel:not(.klein) .vak.bezet b').forEach(b => {
    const pa = b.parentElement, cs = getComputedStyle(pa); const breed = pa.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    let fs = parseFloat(getComputedStyle(b).fontSize) || 13;
    const m = document.createElement('span'); m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-weight:inherit'; b.appendChild(m);
    const woorden = b.firstChild && b.firstChild.nodeType === 3 ? b.firstChild.textContent.split(/\s+/).filter(Boolean) : [];
    const langste = () => Math.max(0, ...woorden.map(w => { m.textContent = w; return m.getBoundingClientRect().width; }));
    const past = () => langste() <= breed - 0.5 && b.offsetTop + b.offsetHeight <= pa.clientHeight + 1;
    while (!past() && fs > 10) { fs -= 0.5; b.style.fontSize = fs + 'px'; }
    m.remove();
  });
}
function tafelWeken() { const s = new Set([weekSleutel(C.add(C.today(), -7)), weekSleutel(C.today()), weekSleutel(C.add(C.today(), 7))]); for (const a of S.acties || []) if (a.id >= weekSleutel(C.today())) s.add(a.id); for (const w of Object.keys(S.kwplan || {})) if (w >= weekSleutel(C.today())) s.add(w); return [...s].sort(); }
function slaIndelingOp(week, id, data, stil) { write('tafel_indeling', [{ week, tafel_id: id, data }], stil); }
function renderTafels() {
  const v = $('#view'); const week = tafelWeek(); const kanIn = mag('tafels'); const kanAf = mag('schap') || kanIn;
  const t = ui.tafel && S.tafels[ui.tafel] && !S.tafels[ui.tafel].weg ? S.tafels[ui.tafel] : null;
  const wk = tafelWeken(); const ap = (S.acties || []).find(a => a.id === week);
  let h = `<div class="bar"><div class="chips">${wk.map(w => `<button class="chip ${w === week ? 'on' : ''}" data-tw="${w}"><b>Week ${+w.split('-')[1]}</b><span>${C.fmtDag(weekMaandag(w))}${(S.acties || []).some(a => a.id === w) ? ' · acties' : ''}</span></button>`).join('')}</div></div>`;
  if (!t) { if (!ui.versStap) ui.versStap = versActies(week).length ? 'sort' : 'in'; h += `<div class="seg kwseg"><button class="${ui.versStap === 'sort' ? 'on' : ''}" data-vst="sort">1 · Sorteren</button><button class="${ui.versStap === 'in' ? 'on' : ''}" data-vst="in">2 · Indelen</button><button data-vst="best">3 · Bestellen</button></div>`; }
  if (!t && ui.versStap === 'sort') h += versSorteren(week);
  else if (!t) {
    const l = koelTafels(); const vp = versPlan(week); h += `<div class="row" style="gap:8px;margin:10px 16px 0;flex-wrap:wrap">${l.some(x => (indelingVan(week, x.id).items || []).length) ? '<button class="btn sm sec" id="vsPdf">👁️ Pdf bekijken</button>' : ''}<button class="btn sm sec" id="pdfBk">📄 Bekijken</button></div>`;
    if (!l.length) h += `<div class="empty">Nog geen actietafels.${kanIn ? '<br>Maak eerst je tafels aan.' : '<br>De beheerder maakt de tafels aan.'}</div>`;
    h += `<div class="tafelgrid">${l.map(x => { const ind = indelingVan(week, x.id); const n = (ind.items || []).length, k = (ind.items || []).filter(i => i.klaar).length; const na = versActies(week).filter(i => (vp.plek || {})[i.nr] === x.id).length, np = versNogPlaatsen(week, x).length; return `<button class="tafelkaart" data-tt="${x.id}">${x.foto ? `<img src="${x.foto}" alt="">` : ''}<b>${esc(x.naam)}</b>${tafelTekening(x, ind, true)}<span class="small">${na ? `${na} acties${np ? ` · <b class="oranje">${np} nog plaatsen</b>` : ''} · ` : ''}${n ? `${k} van ${n} klaar` : 'Nog niet ingedeeld'}</span></button>`; }).join('')}</div>`;
    if (kanIn) h += `<div class="blk"><button class="btn sec" id="tbAdd" style="width:100%">+ Tafel toevoegen</button>${ap ? '' : `<p class="small">Voor week ${+week.split('-')[1]} is nog geen actie-pdf geüpload. Je kunt wel al indelen.</p>`}</div>`;
  } else {
    const ind = indelingVan(week, t.id); const items = ind.items || [];
    const vorig = weekSleutel(C.add(weekMaandag(week), -7)); const vi = indelingVan(vorig, t.id);
    h += `<div class="blk"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">${esc(t.naam)}</h2>${kanIn ? '<button class="btn sm sec" id="tbEdit">Tafel ✎</button>' : ''}</div>${t.foto ? `<img class="tafelfoto" src="${t.foto}" alt="">` : ''}
    <p class="small">${kanIn ? 'Tik op een blok om het aan te passen, of voeg een artikel toe.' : 'Tik op een blok of in de lijst als het op de tafel staat.'}</p>${tafelTekening(t, ind)}
    <div class="row" style="margin-top:10px;flex-wrap:wrap">${kanIn ? '<button class="btn sm" id="tiAdd">+ Artikel op tafel</button>' : ''}${kanIn && !items.length && (vi.items || []).length ? `<button class="btn sm sec" id="tiCopy">Indeling week ${+vorig.split('-')[1]} overnemen</button>` : ''}${items.length ? '<button class="btn sm sec" id="tiPrint">👁️ Pdf bekijken</button>' : ''}</div></div>
    ${(() => { const np = versNogPlaatsen(week, t); return np.length && kanIn ? `<div class="blk"><h2>Nog plaatsen (${np.length})</h2><p class="small">Tik op een actie en kies daarna de vakken.</p>${np.map(i => `<button class="belrij" data-vpl="${esc(i.nr)}"><span class="ic">➕</span><span><b>${esc(i.naam)}</b><small>${esc([i.nr, i.eh, i.voor ? '€ ' + C.fmt(i.voor) : ''].filter(Boolean).join(' · '))}</small></span><span class="pijl">›</span></button>`).join('')}</div>` : ''; })()}
    <div class="blk"><h2>Wat moet erop</h2>${(t.vast || []).length ? `<p class="small">🔒 Vast assortiment${t.vastTekst ? ': ' + esc(t.vastTekst) : ''} · ${plekTekst(t, t.vast)} – hier komt geen actie.</p>` : ''}${items.length ? `<div class="list">${items.map((it, i) => `<div class="it"><span class="kleurstip" style="background:${TKLEUR[(it.kleur ?? i) % TKLEUR.length]}"></span><span style="flex:1"><b>${esc(it.naam)}</b><br><span class="small">${tafelArts(it).length ? esc(tafelArts(it).map(a => a.nr ? a.nr : a.naam).join(', ')) + ' · ' : ''}${plekTekst(t, it.cellen)}${it.aantal ? ' · ' + C.fmt(+it.aantal) + ' stuks' : ''}${it.opm ? ' · ' + esc(it.opm) : ''}${it.klaar ? ` · ✓ ${esc(ini(it.door))} ${hhmm(it.om)}` : ''}</span></span>${kanAf ? `<button class="btn sm ${it.klaar ? 'sec' : ''}" data-tk="${i}">${it.klaar ? 'Terug' : 'Staat erop'}</button>` : ''}</div>`).join('')}</div>` : '<p class="small">Nog niets ingedeeld voor deze week.</p>'}</div>`;
  }
  v.innerHTML = h; tafelPas(v);
  v.querySelectorAll('[data-tw]').forEach(b => b.onclick = () => { ui.tafelWeek = b.dataset.tw; ui.versStap = null; render(); });
  v.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => { ui.tafel = b.dataset.tt; render(); window.scrollTo(0, 0); });
  const ta = $('#tbAdd'); if (ta) ta.onclick = () => tafelBewerk(null);
  v.querySelectorAll('[data-vst]').forEach(b => b.onclick = () => { if (b.dataset.vst === 'best') return ga('acties'); ui.versStap = b.dataset.vst; render(); });
  const bk = $('#pdfBk'); if (bk) bk.onclick = () => pdfBekijkKeuze(week, ['folder', 'actie']);
  const vpd = $('#vsPdf'); if (vpd) vpd.onclick = () => versPrint(week);
  if (!t && ui.versStap === 'sort') versSorteerEvents(v, week);
  if (!t) return;
  v.querySelectorAll('[data-vpl]').forEach(b => b.onclick = () => versPlaats(week, t, b.dataset.vpl));
  const te = $('#tbEdit'); if (te) te.onclick = () => tafelBewerk(t);
  const add = $('#tiAdd'); if (add) add.onclick = () => tafelItemBewerk(t, week, null);
  const cp = $('#tiCopy'); if (cp) cp.onclick = () => { const vi = indelingVan(weekSleutel(C.add(weekMaandag(week), -7)), t.id); slaIndelingOp(week, t.id, { items: (vi.items || []).map(it => Object.assign({}, it, { klaar: false, door: null, om: null })) }); log('tafels', `Indeling ${t.naam} overgenomen`); render(); };
  const pr = $('#tiPrint'); if (pr) pr.onclick = () => tafelPrint(t, week);
  const wissel = i => { if (!kanAf) return; const ind = JSON.parse(JSON.stringify(indelingVan(week, t.id))); const it = ind.items[i]; it.klaar = !it.klaar; it.door = it.klaar ? mijnNaam() : null; it.om = it.klaar ? new Date().toISOString() : null; slaIndelingOp(week, t.id, ind); if (it.klaar) log('tafels', `${t.naam}: ${it.naam} staat erop`); render(true); };
  v.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => wissel(+b.dataset.tk));
  v.querySelectorAll('.tafel [data-ti]').forEach(b => b.onclick = () => kanIn ? tafelItemBewerk(t, week, +b.dataset.ti) : wissel(+b.dataset.ti));
}
function plekTekst(t, cellen) {
  const R = +t.rijen || 2, K = +t.kol || 3; if (!cellen || !cellen.length) return '';
  const rs = [...new Set(cellen.map(c => Math.floor(c / K)))], ks = [...new Set(cellen.map(c => c % K))];
  const rij = r => R === 1 ? '' : r === 0 ? 'boven' : r === R - 1 ? 'onder' : R === 3 ? 'midden' : 'rij ' + (r + 1);
  const kol = k => K === 1 ? '' : k === 0 ? 'links' : k === K - 1 ? 'rechts' : K === 3 ? 'midden' : 'vak ' + (k + 1);
  if (cellen.length === R * K) return 'hele tafel';
  if (rs.length === 1 && ks.length === K) return 'strook ' + (rij(rs[0]) || 'hele breedte');
  if (ks.length === 1 && rs.length === R) return 'strook ' + (kol(ks[0]) || 'hele hoogte');
  if (cellen.length === 1) return [kol(ks[0]), rij(rs[0])].filter(Boolean).join(' ') || 'vak';
  return `${cellen.length} vakken`;
}
function tafelBewerk(t, opt) {
  opt = opt || {}; const nieuw = !t; const d = Object.assign({ naam: '', rijen: 2, kol: 3, foto: '', volg: tafelLijst().length }, opt.voor || {}, t || {});
  const ov = sheet(`<h2 style="margin:0">${opt.kop ? 'Tekening van de plek' : nieuw ? 'Tafel toevoegen' : 'Tafel aanpassen'}</h2><div class="form"><label>Naam</label><input type="text" id="tbN" value="${esc(d.naam)}" placeholder="Bijv. Tafel 1 bij de ingang">
  <div class="row"><div style="flex:1"><label>${opt.kop ? 'Planken (van boven naar onder)' : 'Rijen (vakken van voor naar achter)'}</label><input type="number" id="tbR" min="1" max="8" value="${d.rijen}"></div><div style="flex:1"><label>${opt.kop ? 'Vakken per plank (van links naar rechts)' : 'Kolommen (van links naar rechts)'}</label><input type="number" id="tbK" min="1" max="10" value="${d.kol}"></div></div>
  <label>Vast assortiment – tik de vakken aan die geblokkeerd zijn</label><div id="tbVast"></div>
  <label for="tbVt">Wat ligt er vast (optioneel)</label><input type="text" id="tbVt" value="${esc(d.vastTekst || '')}" placeholder="Bijv. koffie en thee">
  <label>Foto (optioneel)</label><div style="display:flex;gap:12px;align-items:center"><div class="fotovak" id="tbFv">${d.foto ? `<img src="${d.foto}" alt="">` : 'Geen foto'}</div><label class="btn sm sec" style="margin:0">Foto kiezen<input type="file" accept="image/*" id="tbF" class="hide"></label></div>
  <div class="row"><button class="btn sec" data-x style="flex:1">Annuleren</button><button class="btn" id="tbO" style="flex:1">Opslaan</button></div>${nieuw ? '' : '<button class="btn sec" id="tbW" style="margin-top:6px;color:#d32f2f;border-color:#d32f2f">Tafel verwijderen</button>'}</div>`);
  $('#tbF').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { d.foto = await fotoVerklein(f); $('#tbFv').innerHTML = `<img src="${d.foto}" alt="">`; } catch (x) { toast('Foto lukt niet'); } };
  const vast = new Set(d.vast || []);
  const rasterR = () => Math.max(1, Math.min(8, +$('#tbR').value || 2)), rasterK = () => Math.max(1, Math.min(10, +$('#tbK').value || 3));
  const tekenVast = () => { const R = rasterR(), K = rasterK(); [...vast].forEach(c => { if (c >= R * K) vast.delete(c); }); $('#tbVast').innerHTML = `<div class="tafel kies" style="grid-template-columns:repeat(${K},1fr);grid-template-rows:repeat(${R},40px)">${Array.from({ length: R * K }, (_, c) => `<button type="button" class="vak ${vast.has(c) ? 'vastaan' : 'leeg'}" data-v="${c}">${vast.has(c) ? '🔒' : ''}</button>`).join('')}</div>`; $('#tbVast').querySelectorAll('[data-v]').forEach(b => b.onclick = () => { const c = +b.dataset.v; vast.has(c) ? vast.delete(c) : vast.add(c); tekenVast(); }); };
  tekenVast(); $('#tbR').oninput = tekenVast; $('#tbK').oninput = tekenVast;
  $('#tbO').onclick = () => { d.naam = $('#tbN').value.trim(); if (!d.naam) return toast('Vul een naam in'); d.rijen = rasterR(); d.kol = rasterK(); d.vast = [...vast].sort((a, b) => a - b); d.vastTekst = $('#tbVt').value.trim(); const id = d.id || 'T' + Date.now().toString(36); const data = Object.assign({}, d); delete data.id; write('tafels', [{ id, data }]); ov.remove(); if (opt.klaar) opt.klaar(id); render(); };
  const w = $('#tbW'); if (w) w.onclick = async () => { if (!await bevestig('Tafel verwijderen?', `<b>${esc(d.naam)}</b> en de indeling verdwijnen.`, 'Verwijderen')) return; const data = Object.assign({}, d, { weg: true }); delete data.id; write('tafels', [{ id: d.id, data }]); ui.tafel = null; ov.remove(); render(); };
}
function tafelArts(it) { return it.artikelen || (it.key ? [{ key: it.key, naam: it.naam, nr: it.nr }] : []); }
function tafelItemBewerk(t, week, idx) {
  const ind = JSON.parse(JSON.stringify(indelingVan(week, t.id))); ind.items = ind.items || [];
  const nieuw = idx === null; const it = nieuw ? { naam: '', artikelen: [], cellen: [], aantal: '', opm: '', kleur: (ind.items.length) % TKLEUR.length, klaar: false } : ind.items[idx];
  it.artikelen = tafelArts(it); delete it.key;
  const R = +t.rijen || 2, K = +t.kol || 3; const sel = new Set(it.cellen || []);
  const bezet = {}; (t.vast || []).forEach(c => bezet[c] = { naam: '🔒', vast: true }); ind.items.forEach((x, i) => { if (i !== idx) (x.cellen || []).forEach(c => bezet[c] = x); });
  [...sel].forEach(c => { if (bezet[c] && bezet[c].vast) sel.delete(c); });
  const actieKeys = Object.keys(M.actieArt).filter(k => M.art[k] && M.actieArt[k].some(p => p.id === week));
  const ov = sheet(`<h2 style="margin:0">${nieuw ? 'Op de tafel' : 'Aanpassen'} · ${esc(t.naam)}</h2><div class="form">
  <label for="tiN">Wat komt erop</label><input type="text" id="tiN" value="${esc(it.naam)}" placeholder="Bijv. Meesterhand pakken, alle soorten">
  <label>Artikelen erbij (optioneel, voor barcodes op de print)</label><div id="tiArt" class="chips2"></div>
  <div class="row"><input type="search" id="tiQ" placeholder="Zoek naam of nummer" style="flex:1"><button class="btn sm sec" id="tiScan">📷</button></div><div id="tiRes" class="list zoekres"></div>
  <label>Vakken – tik aan waar het komt</label><div class="tafel kies" style="grid-template-columns:repeat(${K},1fr);grid-template-rows:repeat(${R},44px)">${Array.from({ length: R * K }, (_, c) => `<button type="button" class="vak ${sel.has(c) ? 'aan' : ''} ${bezet[c] ? 'bezet' : 'leeg'}" data-c="${c}" ${bezet[c] ? 'disabled' : ''}>${bezet[c] ? (bezet[c].vast ? '🔒' : esc(ini(bezet[c].naam))) : ''}</button>`).join('')}</div>${(t.vast || []).length ? `<p class="small" style="margin:0">🔒 = vast assortiment${t.vastTekst ? ' (' + esc(t.vastTekst) + ')' : ''}, kun je niet gebruiken.</p>` : ''}
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:2px">${R > 1 ? Array.from({ length: R }, (_, r) => `<button type="button" class="btn sm sec" data-rij="${r}">Rij ${r === 0 ? 'boven' : r === R - 1 ? 'onder' : r + 1}</button>`).join('') : ''}${K > 1 ? Array.from({ length: K }, (_, k) => `<button type="button" class="btn sm sec" data-kol="${k}">${k === 0 ? 'Links' : k === K - 1 ? 'Rechts' : 'Kolom ' + (k + 1)}</button>`).join('') : ''}</div>
  <label for="tiA">Aantal stuks (optioneel)</label><input type="number" id="tiA" inputmode="numeric" value="${esc(it.aantal)}" placeholder="Bijv. 24">
  <label for="tiO">Opmerking (optioneel)</label><input type="text" id="tiO" value="${esc(it.opm || '')}" placeholder="Bijv. met prijsbord A4">
  <div class="row"><button class="btn sec" data-x style="flex:1">Annuleren</button><button class="btn" id="tiS" style="flex:1">Opslaan</button></div>${nieuw ? '' : '<button class="btn sec" id="tiW" style="margin-top:6px;color:#d32f2f;border-color:#d32f2f">Van de tafel halen</button>'}</div>`);
  const tekenArts = () => { const el = $('#tiArt'); el.innerHTML = it.artikelen.length ? it.artikelen.map((a, i) => `<button type="button" class="aan" data-xa="${i}">${esc(a.naam)}${a.nr ? ' · ' + esc(a.nr) : ''} ✕</button>`).join('') : '<span class="small">Geen – alleen de tekst is ook goed.</span>'; el.querySelectorAll('[data-xa]').forEach(b => b.onclick = () => { it.artikelen.splice(+b.dataset.xa, 1); tekenArts(); }); };
  tekenArts();
  const kies = a => { if (!it.artikelen.some(x => x.key === a.key)) it.artikelen.push({ key: a.key, naam: a.naam, nr: a.eigen ? a.artNr || '' : a.nr }); if (!$('#tiN').value.trim()) $('#tiN').value = a.naam; tekenArts(); $('#tiRes').innerHTML = ''; $('#tiQ').value = ''; };
  const toon = q => {
    const l = q && q.length >= 2 ? zoekAlles(q) : actieKeys.map(k => M.art[k]);
    let h = (!q && actieKeys.length ? '<div class="small" style="padding:4px 2px">Acties van deze week:</div>' : '') + l.slice(0, 30).map(a => `<button type="button" class="it" data-tk2="${a.key}"><span style="flex:1;text-align:left">${esc(a.naam)} <span class="small">${esc(a.eigen ? a.artNr || '' : a.nr)}</span></span><span class="pijl">+</span></button>`).join('');
    if (q && q.length >= 2) h += `<button type="button" class="it" id="tiTekst"><span style="flex:1;text-align:left">${l.length ? '' : 'Niets gevonden. '}<b>"${esc(q)}" als tekst gebruiken</b></span></button>`;
    $('#tiRes').innerHTML = h;
    $('#tiRes').querySelectorAll('[data-tk2]').forEach(b => b.onclick = () => kies(M.art[b.dataset.tk2]));
    const tt = $('#tiTekst'); if (tt) tt.onclick = () => { $('#tiN').value = q; $('#tiRes').innerHTML = ''; $('#tiQ').value = ''; };
  };
  if (nieuw) toon('');
  $('#tiQ').oninput = e => toon(e.target.value.trim());
  $('#tiScan').onclick = () => scanStart(null, a => kies(a));
  const teken = () => ov.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('aan', sel.has(+b.dataset.c)));
  ov.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const c = +b.dataset.c; sel.has(c) ? sel.delete(c) : sel.add(c); teken(); });
  ov.querySelectorAll('[data-rij]').forEach(b => b.onclick = () => { const r = +b.dataset.rij; const cs = Array.from({ length: K }, (_, k) => r * K + k).filter(c => !bezet[c]); const alle = cs.every(c => sel.has(c)); cs.forEach(c => alle ? sel.delete(c) : sel.add(c)); teken(); });
  ov.querySelectorAll('[data-kol]').forEach(b => b.onclick = () => { const k = +b.dataset.kol; const cs = Array.from({ length: R }, (_, r) => r * K + k).filter(c => !bezet[c]); const alle = cs.every(c => sel.has(c)); cs.forEach(c => alle ? sel.delete(c) : sel.add(c)); teken(); });
  $('#tiS').onclick = () => {
    it.naam = $('#tiN').value.trim() || (it.artikelen[0] && it.artikelen[0].naam) || '';
    if (!it.naam) return toast('Typ wat er op komt, of kies een artikel');
    if (!sel.size) return toast('Tik minstens één vak aan');
    it.cellen = [...sel].sort((a, b) => a - b); it.aantal = C.num($('#tiA').value) || ''; it.opm = $('#tiO').value.trim(); it.nr = it.artikelen.map(a => a.nr).filter(Boolean).join(', ');
    if (nieuw) ind.items.push(it); slaIndelingOp(week, t.id, ind); log('tafels', `${t.naam}: ${it.naam} ${nieuw ? 'ingedeeld' : 'aangepast'}`); ov.remove(); render(true);
  };
  const w = $('#tiW'); if (w) w.onclick = () => { ind.items.splice(idx, 1); slaIndelingOp(week, t.id, ind); ov.remove(); render(true); };
}
function tafelPrintHtml(t, week) {
  const ind = indelingVan(week, t.id);
  return `<div class="tafelprint pdfpagina"><h1>${esc(t.naam)} · actieweek ${+week.split('-')[1]} · ${esc((WINKEL && WINKEL.naam) || '')}</h1>${tafelTekening(t, ind)}${(t.vast || []).length ? `<p>🔒 Vast assortiment${t.vastTekst ? ': ' + esc(t.vastTekst) : ''} (${plekTekst(t, t.vast)})</p>` : ''}<table><thead><tr><th>Kleur</th><th>Artikel</th><th>Barcode</th><th>Plek</th><th>Aantal</th><th>Opmerking</th><th>Staat erop</th></tr></thead><tbody>${(ind.items || []).map((it, i) => `<tr><td><span class="kleurstip" style="background:${TKLEUR[(it.kleur ?? i) % TKLEUR.length]}"></span></td><td class="n"><b>${esc(it.naam)}</b>${tafelArts(it).length > 1 || (tafelArts(it)[0] && tafelArts(it)[0].naam !== it.naam) ? '<br>' + tafelArts(it).map(a => esc(a.naam)).join('<br>') : ''}</td><td>${tafelArts(it).filter(a => /^\d{4,}$/.test(a.nr || '')).map(a => C.msi(a.nr, 40, true)).join('')}</td><td>${plekTekst(t, it.cellen)}</td><td>${it.aantal ? C.fmt(+it.aantal) : ''}</td><td>${esc(it.opm || '')}</td><td class="bst"></td></tr>`).join('')}</tbody></table></div>`;
}
function tafelPrint(t, week) {
  const ind = indelingVan(week, t.id); $('#printArea').innerHTML = tafelPrintHtml(t, week);
  window.__laatstePrint = { tafel: t.naam, n: (ind.items || []).length };
  toonPdf(`${t.naam} week ${+week.split('-')[1]}`, null, { staand: true });
}
