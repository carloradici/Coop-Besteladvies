/* ---------- 1.23: voorkooplijst ---------- */
function kwNrsSet(it) { return new Set((it.nrs || []).map(n => /^\d{1,7}$/.test(n) ? n.padStart(6, '0') : n)); }
function bewaarVoorkoop(vk, bron) {
  if (!vk || !vk.week || !vk.items.length) throw new Error('Geen voorkooplijst herkend');
  vk.versie = 3; const wk = weekSleutel(vk.van); const oud = S.kwplan[wk] || {}; const of = oud.folder;
  const plek = {}, notitie = {}, klaar = {};
  if (of && of.items) {
    const nieuw = vk.items.map(i => ({ i, s: kwNrsSet(i) }));
    for (const o of of.items) { const os = kwNrsSet(o); const hit = nieuw.find(n => [...os].some(x => n.s.has(x))); if (!hit) continue; const id = hit.i.id; if ((oud.plek || {})[o.id] && !plek[id]) plek[id] = oud.plek[o.id]; if ((oud.notitie || {})[o.id] && !notitie[id]) notitie[id] = oud.notitie[o.id]; if ((oud.klaar || {})[o.id]) klaar[id] = oud.klaar[o.id]; if (!hit.i.pag && o.pag) hit.i.pag = o.pag; }
    if (of.bron !== 'voorkoop' && of.thema) vk.thema = of.thema;
  }
  const plan = Object.assign({}, oud, { folder: vk, plek, notitie, klaar, soort: {}, bron: bron || '', geladen: new Date().toISOString() }); delete plan.week;
  write('kw_acties', [{ week: wk, data: plan }]); S.kwplan[wk] = Object.assign({ week: wk }, plan);
  if (of && of.items && of.items.length) for (const x of kwPlekken()) { if (!x.tafel) continue; const ind = indelingVan(wk, x.tafel); if (!(ind.items || []).some(y => y.kw)) continue; const map = {}; for (const o of of.items) { const os = kwNrsSet(o); const hit = vk.items.find(n => [...kwNrsSet(n)].some(z => os.has(z))); if (hit) map[o.id] = hit.id; } const ni = JSON.parse(JSON.stringify(ind)); ni.items = (ni.items || []).map(y => y.kw ? Object.assign(y, { kw: map[y.kw] || y.kw }) : y); slaIndelingOp(wk, x.tafel, ni, true); }
  rebuild(); return wk;
}
function folderBijVoorkoop(f) {
  const wk = folderWeek(f); const p = S.kwplan[wk]; if (!p || !p.folder || p.folder.bron !== 'voorkoop') return null;
  for (const it of p.folder.items) { if (it.pag) continue; const s = kwNrsSet(it); const o = f.items.find(x => [...kwNrsSet(x)].some(z => s.has(z))); if (o && o.pag) it.pag = o.pag; }
  if (f.thema) p.folder.thema = f.thema; kwPlanOpslaan(wk); return wk;
}
async function kwPdfLezen(buf, naam) {
  const kopie = buf.slice(0);
  const pages = await C.pdfPages(await pdfjs(), buf.slice(0)); const soort = C.detectPdf(pages);
  if (soort === 'voorkoop') { const vk = C.parseVoorkoop(pages); const wk = bewaarVoorkoop(vk, naam); pdfBewaar(wk, 'voorkoop', kopie); return { wk, tekst: `✓ Voorkooplijst week ${vk.week}: ${vk.items.filter(i => !i.instore).length} folder-acties, ${vk.items.filter(i => i.instore).length} instore` }; }
  const fp = C.parseFolder(await C.pdfVlakken(await pdfjs(), buf)); const al = folderBijVoorkoop(fp); if (al) pdfBewaar(al, 'folder', kopie); if (al) return { wk: al, tekst: `✓ Folder week ${fp.week} gebruikt voor paginanummers (de acties komen uit de voorkooplijst)` };
  const wk = bewaarFolder(fp, naam); pdfBewaar(wk, 'folder', kopie); return { wk, tekst: `✓ Week ${fp.week}: ${fp.items.filter(i => i.soort === 'kw').length} KW-acties` };
}
async function kwHaalOp(jaar, week, alleenVk) {
  if (DEMO) throw new Error('In de testversie kun je de pdf zelf kiezen');
  const haal = async soort => { const r = await fetch(`${SB_URL}/functions/v1/folder?jaar=${jaar}&week=${week}${soort ? '&soort=' + soort : ''}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + await token() } }); if (!r.ok) { let t = 'Ophalen mislukt (' + r.status + ')'; try { const j = await r.json(); if (j.fout) t = j.fout; } catch (e) { } if (r.status === 404 && !/staat nog niet/.test(t)) t = 'De functie "folder" staat nog niet in Supabase'; const e = new Error(t); e.status = r.status; throw e; } return r.arrayBuffer(); };
  let vkFout = null;
  try { const buf = await haal('voorkoop'); const pages = await C.pdfPages(await pdfjs(), buf.slice(0)); if (C.detectPdf(pages) === 'voorkoop') { const vk = C.parseVoorkoop(pages); if (!vk || weekSleutel(vk.van) !== weekSleutel(C.mondayOf(jaar, week))) throw new Error(`Voorkooplijst week ${week} staat nog niet online`); const wkv = bewaarVoorkoop(vk, 'opgehaald'); pdfBewaar(wkv, 'voorkoop', buf); return { wk: wkv, soort: 'voorkoop' }; } } catch (e) { vkFout = e; }
  if (alleenVk) throw vkFout || new Error('Geen voorkooplijst');
  const k = weekSleutel(C.mondayOf(jaar, week)); const p = S.kwplan[k]; if (p && p.folder && p.folder.bron === 'voorkoop') return { wk: k, soort: 'voorkoop' };
  const buf = await haal(''); const kop = buf.slice(0); const fp = C.parseFolder(await C.pdfVlakken(await pdfjs(), buf)); const wkf = bewaarFolder(fp, 'opgehaald'); pdfBewaar(wkf, 'folder', kop); return { wk: wkf, soort: 'folder' };
}
function kwSplits(wk, id) {
  const p = S.kwplan[wk]; const i = p.folder.items.findIndex(x => x.id === id); const it = p.folder.items[i]; if (!it || !(it.arts || []).length) return;
  const los = it.arts.map((a, j) => Object.assign({}, it, { id: it.id + '-' + (j + 1), naam: a.naam, variant: '', nrs: [a.nr, a.ean].filter(Boolean), prijs: a.cvoor ? [a.cvoor] : it.prijs, streep: a.cvan && a.cvan !== a.cvoor ? [a.cvan] : [], arts: [a] }));
  p.folder.items.splice(i, 1, ...los);
  for (const k of ['plek', 'notitie']) if ((p[k] || {})[id]) { p[k] = Object.assign({}, p[k]); los.forEach(l => p[k][l.id] = p[k][id]); delete p[k][id]; }
  for (const x of kwPlekken()) { if (!x.tafel) continue; const ind = indelingVan(wk, x.tafel); if ((ind.items || []).some(y => y.kw === id)) { const ni = JSON.parse(JSON.stringify(ind)); ni.items = ni.items.filter(y => y.kw !== id); slaIndelingOp(wk, x.tafel, ni, true); } }
  kwPlanOpslaan(wk); toast(`${los.length} soorten staan nu los`); render(true);
}
/* ---------- 1.24: actie planning vers + pdf's bewaren ---------- */
function koelTafels() { return tafelLijst().filter(t => !t.kw && !kwPlekken().some(x => x.tafel === t.id)); }
function versPlan(wk) { S.versplan = S.versplan || {}; return S.versplan[wk] || { plek: {}, notitie: {} }; }
function versPlanOpslaan(wk, plan) { S.versplan = S.versplan || {}; S.versplan[wk] = plan; write('kw_acties', [{ week: wk + '|vers', data: plan }], true); }
function versActies(wk) { const a = (S.acties || []).find(x => x.id === wk); return a ? (a.items || []).filter(i => i.nr) : []; }
function versStatus(wk) { const l = versActies(wk); const p = versPlan(wk); const n = l.filter(i => (p.plek || {})[i.nr] || (p.notitie || {})[i.nr]).length; return { totaal: l.length, gesorteerd: n }; }
function versTegel() { const wk = weekSleutel(C.today()); const vol = weekSleutel(C.add(C.today(), 7)); const w = versActies(vol).length && C.wd(C.today()) >= 3 ? vol : versActies(wk).length ? wk : vol; const s = versStatus(w); if (!s.totaal) return koelTafels().length ? 'Vers: nog geen actie-pdf' : ''; return `Vers week ${+w.split('-')[1]}: ${s.gesorteerd === s.totaal ? '✓ alles gesorteerd' : `${s.gesorteerd} van ${s.totaal} gesorteerd`}`; }
function versKey(nr) { const k = vindCode(nr); const key = k ? (k.key || k) : null; return key && M.art[key] ? key : null; }
function versOpTafel(wk, tid) { const ind = indelingVan(wk, tid); return new Set((ind.items || []).flatMap(it => [it.vers].concat(tafelArts(it).map(a => a.nr))).filter(Boolean)); }
function versItemKaart(wk, it, kan) {
  const p = versPlan(wk); const pl = (p.plek || {})[it.nr], nt = (p.notitie || {})[it.nr]; const t = pl && S.tafels[pl];
  const prijs = it.voor ? `€ ${C.fmt(it.voor)}${it.van && it.van > it.voor ? ` <s class="small">€ ${C.fmt(it.van)}</s>` : ''}` : '';
  return `<div class="card kwit ${pl || nt ? 'klaar' : ''}"><div class="nm">${esc(it.naam)}</div><div class="small">${esc([it.nr, it.eh].filter(Boolean).join(' · '))}</div><div class="kwprijs">${prijs}${it.cap ? ` · CAP ${C.fmt(it.cap)}` : ''}${it.opm ? ' · ' + esc(it.opm) : ''}</div>${(() => { const v = versVerwacht(wk, it); return v ? `<div class="small">Verwacht ±${C.fmt(Math.round(v))} deze actieweek</div>` : ''; })()}
  ${nt ? `<div class="small">📝 ${esc(nt)}</div>` : ''}${kan ? `<div class="chips2">${koelTafels().map(x => `<button type="button" class="${pl === x.id ? 'aan' : ''}" data-vz="${esc(it.nr)}" data-vzt="${x.id}">${esc(x.naam)}</button>`).join('')}<button type="button" class="${nt ? 'aan' : ''}" data-vnt="${esc(it.nr)}">📝</button></div>` : t ? `<div class="small">➜ ${esc(t.naam)}</div>` : ''}</div>`;
}
function versSorteren(wk) {
  const kan = mag('tafels'); const l = versActies(wk); const s = versStatus(wk); const p = versPlan(wk);
  const open = ui.versOpen ? l.filter(i => !(p.plek || {})[i.nr] && !(p.notitie || {})[i.nr]) : l;
  let h = `<div class="blk"><h2>Week ${+wk.split('-')[1]} · vers-acties</h2><p class="small">${s.totaal ? (s.gesorteerd === s.totaal ? '<b class="groen">✓ alles gesorteerd</b>' : `${s.gesorteerd} van ${s.totaal} gesorteerd`) : `Nog geen vers-bestellijst voor deze week.${DEMO ? '' : ` <button class="btn sm" id="vsHaal">+ Week ${+wk.split('-')[1]} ophalen</button>`}`}</p>
  ${s.totaal ? `<p class="small">Tik bij elke actie op de koeltafel waar hij komt, of op 📝 voor een notitie. Daarna ga je naar <b>2 · Indelen</b>.</p>` : ''}<div class="row" style="flex-wrap:wrap;gap:8px">${s.totaal ? `<button class="btn sm sec" id="vsOpen">${ui.versOpen ? 'Alles tonen' : 'Alleen nog te doen'}</button>` : ''}<button class="btn sm sec" id="pdfBk">📄 Bekijken</button></div></div>`;
  { const a = (S.acties || []).find(x => x.id === wk); if (a && a.van) h += terugblikHtml(a.van, a.tm || C.add(a.van, 6), l.filter(i => (p.plek || {})[i.nr]).map(i => [i.naam, [versKey(i.nr)].filter(Boolean)])); }
  if (s.totaal && !koelTafels().length) h += `<div class="empty">Maak eerst een koeltafel aan bij <b>2 · Indelen</b>.</div>`;
  h += open.map(it => versItemKaart(wk, it, kan)).join('') || (s.totaal ? '<div class="empty">✓ Alles gesorteerd. Ga naar 2 · Indelen.</div>' : '');
  return h;
}
function versSorteerEvents(v, wk) {
  const z = (nr, fn) => { const p = JSON.parse(JSON.stringify(versPlan(wk))); p.plek = p.plek || {}; p.notitie = p.notitie || {}; fn(p); versPlanOpslaan(wk, p); render(true); };
  v.querySelectorAll('[data-vz]').forEach(b => b.onclick = () => z(b.dataset.vz, p => { const nr = b.dataset.vz; if (p.plek[nr] === b.dataset.vzt) delete p.plek[nr]; else { p.plek[nr] = b.dataset.vzt; delete p.notitie[nr]; } }));
  v.querySelectorAll('[data-vnt]').forEach(b => b.onclick = () => { const nr = b.dataset.vnt; const it = versActies(wk).find(x => x.nr === nr) || {}; notitieKeuze(it.naam || nr, (versPlan(wk).notitie || {})[nr] || '', ['In het schap', 'Niet besteld'], t => z(nr, p => { if (t) { p.notitie[nr] = t; delete p.plek[nr]; } else delete p.notitie[nr]; })); });
  const o = $('#vsOpen'); if (o) o.onclick = () => { ui.versOpen = !ui.versOpen; render(true); };
  const hl = $('#vsHaal'); if (hl) hl.onclick = async () => { hl.disabled = true; hl.textContent = 'Ophalen…'; try { const [y, w] = wk.split('-').map(Number); const a = await versHaalOp(y, w); toast(`✓ Vers-acties week ${a.week}: ${a.items.length} acties`); render(); } catch (e) { toast(e.message, 5000); hl.disabled = false; hl.textContent = '+ Opnieuw proberen'; } };
}
function versNogPlaatsen(wk, t) { const p = versPlan(wk); const op = versOpTafel(wk, t.id); return versActies(wk).filter(i => (p.plek || {})[i.nr] === t.id && !op.has(i.nr)); }
function versPlaats(wk, t, nr) {
  const it = versActies(wk).find(i => i.nr === nr); if (!it) return;
  const ind = JSON.parse(JSON.stringify(indelingVan(wk, t.id))); ind.items = ind.items || [];
  const key = versKey(nr); ind.items.push({ naam: it.naam, artikelen: [{ key, naam: it.naam, nr }], vers: nr, cellen: [], aantal: '', opm: '', kleur: ind.items.length % TKLEUR.length, klaar: false });
  slaIndelingOp(wk, t.id, ind, true); tafelItemBewerk(t, wk, ind.items.length - 1);
}
function versPrint(wk) {
  const l = koelTafels().filter(t => (indelingVan(wk, t.id).items || []).length); if (!l.length) return toast('Nog niets ingedeeld deze week');
  $('#printArea').innerHTML = l.map(t => tafelPrintHtml(t, wk)).join(''); window.__laatstePrint = { tafels: l.map(t => t.naam) };
  toonPdf(`Actie planning vers week ${+wk.split('-')[1]}`, null, { staand: true });
}
/* pdf's: lokaal (IndexedDB) + Supabase Storage, 3 weken bewaren */
const PDF_SOORT = { folder: 'Folderplanning', voorkoop: 'Voorkooplijst', actie: 'Terminal bestellijst vers' };
let pdfDbP = null;
function pdfDb() { if (!pdfDbP) pdfDbP = new Promise((ok, nee) => { try { const r = indexedDB.open('cba-pdf', 1); r.onupgradeneeded = () => r.result.createObjectStore('p'); r.onsuccess = () => ok(r.result); r.onerror = () => nee(r.error); } catch (e) { nee(e); } }); return pdfDbP; }
async function pdfLokaal(op, pad, buf) { try { const db = await pdfDb(); return await new Promise((ok, nee) => { const tx = db.transaction('p', op === 'get' || op === 'keys' ? 'readonly' : 'readwrite'); const st = tx.objectStore('p'); const r = op === 'get' ? st.get(pad) : op === 'put' ? st.put(buf, pad) : op === 'del' ? st.delete(pad) : st.getAllKeys(); r.onsuccess = () => ok(r.result); r.onerror = () => nee(r.error); }); } catch (e) { return null; } }
function pdfPad(wk, soort) { return `${W || (WINKEL && WINKEL.id) || 'demo'}/${wk}/${soort}.pdf`; }
async function pdfBewaar(wk, soort, buf) {
  if (!wk || !buf) return; const b = buf.slice(0); await pdfLokaal('put', pdfPad(wk, soort), b);
  if (DEMO || OEFEN) return;
  try { await fetch(`${SB_URL}/storage/v1/object/pdfs/${pdfPad(wk, soort)}`, { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/pdf', 'x-upsert': 'true' }, body: b }); } catch (e) { console.warn('pdf opslaan', e); }
}
async function pdfOphalen(wk, soort) {
  const pad = pdfPad(wk, soort); const l = await pdfLokaal('get', pad); if (l) return l;
  if (!DEMO && navigator.onLine) {
    try { const r = await fetch(`${SB_URL}/storage/v1/object/authenticated/pdfs/${pad}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + await token() } }); if (r.ok) { const b = await r.arrayBuffer(); await pdfLokaal('put', pad, b.slice(0)); return b; } } catch (e) { }
    if ((soort === 'folder' || soort === 'voorkoop') && wk >= pdfGrens()) { try { const [y, w] = wk.split('-').map(Number); const r = await fetch(`${SB_URL}/functions/v1/folder?jaar=${y}&week=${w}${soort === 'voorkoop' ? '&soort=voorkoop' : ''}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + await token() } }); if (r.ok) { const b = await r.arrayBuffer(); pdfBewaar(wk, soort, b); return b; } } catch (e) { } }
  }
  return null;
}
function pdfGrens() { return weekSleutel(C.add(C.today(), -21)); }
async function pdfOpruimen() {
  const grens = pdfGrens(); const keys = await pdfLokaal('keys') || []; for (const k of keys) { const wk = String(k).split('/')[1]; if (wk && wk < grens) await pdfLokaal('del', k); }
  if (DEMO || OEFEN || !isBeheer() || !navigator.onLine || !W) return; const lk = 'cba-pdfop-' + W; if (ls.get(lk) === C.today()) return; ls.set(lk, C.today());
  try {
    const h = { apikey: SB_KEY, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' };
    const r = await fetch(`${SB_URL}/storage/v1/object/list/pdfs`, { method: 'POST', headers: h, body: JSON.stringify({ prefix: W + '/', limit: 1000 }) }); if (!r.ok) return;
    const weken = (await r.json()).map(x => x.name).filter(n => /^\d{4}-\d{2}$/.test(n) && n < grens); const weg = [];
    for (const wk of weken) { const r2 = await fetch(`${SB_URL}/storage/v1/object/list/pdfs`, { method: 'POST', headers: h, body: JSON.stringify({ prefix: `${W}/${wk}/`, limit: 100 }) }); if (r2.ok) (await r2.json()).forEach(f => weg.push(`${W}/${wk}/${f.name}`)); }
    if (weg.length) { await fetch(`${SB_URL}/storage/v1/object/pdfs`, { method: 'DELETE', headers: h, body: JSON.stringify({ prefixes: weg }) }); log('acties', `${weg.length} oude pdf's opgeruimd`); }
  } catch (e) { console.warn('pdf opruimen', e); }
}
function pdfBekijkKeuze(wk, soorten) {
  const ov = sheet(`<h2 style="margin:0 0 6px">📄 Week ${+wk.split('-')[1]} bekijken</h2>${soorten.map(s => `<button class="belrij" data-pbs="${s}"><span class="ic">📄</span><span><b>${PDF_SOORT[s]}</b><small>${s === 'actie' ? 'De actie-pdf van Versunie' : s === 'voorkoop' ? 'Van Tol, alleen KW' : 'Alle acties met pagina\'s'}</small></span><span class="pijl">›</span></button>`).join('')}<button class="btn sec" data-x style="width:100%;margin-top:10px">Sluiten</button>`, (e, o) => { const b = e.target.closest('[data-pbs]'); if (!b) return; o.remove(); pdfBekijk(wk, b.dataset.pbs); });
  return ov;
}
async function pdfBekijk(wk, soort, pag) {
  const view = document.createElement('div'); view.className = 'pdfview'; view.innerHTML = '<div class="pdfwacht">📄 Pdf ophalen…</div>'; document.body.appendChild(view);
  const buf = await pdfOphalen(wk, soort);
  if (!buf) { view.remove(); return toast(wk < pdfGrens() ? 'Deze pdf is opgeruimd (ouder dan 3 weken)' : `${PDF_SOORT[soort]} van week ${+wk.split('-')[1]} is niet bewaard. Upload hem opnieuw.`, 5000); }
  const naam = `${PDF_SOORT[soort]} week ${+wk.split('-')[1]}.pdf`; const file = new File([buf.slice(0)], naam, { type: 'application/pdf' });
  let doc; try { const lib = await pdfjs(); doc = await lib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise; } catch (e) { view.remove(); return toast('Pdf openen lukt niet', 4000); }
  let zoom = 1;
  view.innerHTML = `<div class="pdfkop"><b>${esc(naam)}</b><span>${doc.numPages} ${doc.numPages === 1 ? 'pagina' : "pagina's"}</span><span class="pdfzoom"><button data-z="-1">−</button><button data-z="1">+</button></span></div><div class="pdfpag">${Array.from({ length: doc.numPages }, (_, i) => `<div class="pdfblad" data-pn="${i + 1}"><span class="pdfnr">${i + 1}</span></div>`).join('')}</div><div class="pdfvoet"><button class="btn" id="pdfDeel">📤 Delen / Opslaan</button><button class="btn sec" id="pdfSluit">Sluiten</button></div>`;
  window.__laatstePdf = { naam, paginas: doc.numPages, grootte: file.size, bekijk: true };
  const pg = view.querySelector('.pdfpag');
  view.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { zoom = Math.max(1, Math.min(3, zoom + (+b.dataset.z) * 0.5)); pg.querySelectorAll('.pdfblad').forEach(i => i.style.width = (zoom * 100) + '%'); });
  view.querySelector('#pdfSluit').onclick = () => view.remove();
  view.querySelector('#pdfDeel').onclick = async () => { try { if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: naam }); else { const u = URL.createObjectURL(file); const a = document.createElement('a'); a.href = u; a.download = naam; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); } } catch (e) { if (e && e.name !== 'AbortError') toast('Delen lukt niet', 4000); } };
  const teken = async n => { const blad = pg.querySelector(`[data-pn="${n}"]`); if (!blad || blad.dataset.ok) return; blad.dataset.ok = 1; const p = await doc.getPage(n); const vp = p.getViewport({ scale: 2 }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; const img = document.createElement('img'); img.src = c.toDataURL('image/jpeg', 0.85); img.alt = 'Pagina ' + n; blad.appendChild(img); };
  const doel = Math.max(1, Math.min(doc.numPages, +pag || 1));
  await teken(doel); if (doel > 1) pg.querySelector(`[data-pn="${doel}"]`).scrollIntoView();
  for (let n = 1; n <= doc.numPages; n++) { if (!document.body.contains(view)) break; await teken(n); }
}
/* ---------- 1.27: voorkoop-advies, terugblik, weekoverzicht, back-up, controle ---------- */
function verkochtIn(keys, van, tm) { let n = 0; for (const k of keys) { const sr = M.keys[k]; if (!sr) continue; for (let d = van; d <= tm; d = C.add(d, 1)) { const i = C.idx(M, d); if (i >= 0 && i < M.N) n += sr.v[i]; } } return n; }
function besteldVoor(keys, van, tm) { let n = 0; const ks = new Set(keys); for (const k in S.bestel) { const b = S.bestel[k]; const key = k.slice(0, k.lastIndexOf('|')); if (!ks.has(key) || !b.besteld || !b.lever || b.lever < C.add(van, -4) || b.lever > tm) continue; const a = M.art[key] || {}; n += ((b.aantal ?? b.advies) || 0) * (a.perHE && a.he > 0 ? a.he : 1); } return n; }
function terugRegel(naam, besteld, verk) {
  const over = Math.max(0, besteld - verk); const tip = !besteld ? 'niet besteld via de app' : verk > besteld ? 'meer verkocht dan besteld: volgende keer meer' : besteld > verk * 1.3 ? `${Math.round((besteld / Math.max(verk, 1) - 1) * 100)}% te veel besteld` : '✓ goed ingeschat';
  return `<div class="it"><span style="flex:1"><b>${esc(naam)}</b><br><span class="small">besteld ${C.fmt(Math.round(besteld))} · verkocht ${C.fmt(Math.round(verk))}${over ? ` · over ${C.fmt(Math.round(over))}` : ''} · <span class="${/te veel|meer verkocht/.test(tip) ? 'rood' : /goed/.test(tip) ? 'groen' : ''}">${tip}</span></span></span></div>`;
}
function terugblikHtml(van, tm, rijen) { if (tm >= C.today()) return ''; if (M.dagLijst[M.dagLijst.length - 1] < tm) return `<div class="blk"><h2>↩ Terugblik</h2><p class="small">Komt zodra de verkoop t/m ${C.fmtDag(tm)} binnen is.</p></div>`; return `<div class="blk"><h2>↩ Terugblik</h2><p class="small">Per actie wat er besteld en verkocht is (in stuks).</p><div class="list">${rijen.map(r => terugRegel(r[0], besteldVoor(r[1], van, tm), verkochtIn(r[1], van, tm))).join('') || '<div class="small">Geen acties.</div>'}</div></div>`; }
function voorkoopAdvies(it, wk, ver, vg) {
  if (it.bron !== 'voorkoop' || it.instore || !ver || ver.uit) return '';
  let he = ver.geen ? 0 : Math.ceil(ver.he || 0); if (!he && vg && vg.verk) he = Math.ceil(vg.verk / Math.max(1, (M.art[kwKeys(it)[0]] || {}).he || 1));
  if (!he) return '';
  let tip = ''; if (vg && vg.verk !== null) { const p = S.kwplan[`${wk.slice(0, 4)}-${String(vg.week).padStart(2, '0')}`]; const f = p && p.folder; const x = f && f.items.find(y => (y.nrs || []).some(n => (it.nrs || []).includes(n))); if (x) { const b = besteldVoor(kwKeys(x), f.van, f.tm); if (b > vg.verk * 1.3) tip = ` · vorige keer ${Math.round((b / Math.max(vg.verk, 1) - 1) * 100)}% over`; } }
  return `<div class="small voorkoop">🛒 Voorkoop-advies: <b>${he} HE</b>${tip}</div>`;
}
function versVerwacht(wk, it) { const a = (S.acties || []).find(x => x.id === wk); const k = versKey(it.nr); if (!a || !k || !a.van) return null; let v = 0; for (let d = a.van; d <= (a.tm || C.add(a.van, 6)); d = C.add(d, 1)) v += C.verwacht(M, k, d); return v; }
/* weekoverzicht (in de app, op maandag t/m woensdag) */
function weekOverzichtHtml(altijd) {
  const ma = C.add(C.monday(C.today()), -7), zo = C.add(ma, 6), sl = 'cba-wo-' + ma; if (!altijd && (C.wd(C.today()) > 2 || ls.get(sl))) return '';
  let dagen = 0; for (let d = ma; d <= zo; d = C.add(d, 1)) if (S.dagen[d]) dagen++;
  let n = 0, zelf = 0; for (const k in S.bestel) { const b = S.bestel[k]; const bd = k.slice(k.lastIndexOf('|') + 1); if (bd < ma || bd > zo || !b.besteld) continue; n++; if (b.aantal !== null && b.aantal !== undefined && b.aantal !== b.advies) zelf++; }
  const open = openTaken(true).length;
  return `<div class="blk weekov"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">📊 Vorige week</h2>${altijd ? '' : '<button class="link" id="woWeg">Weg</button>'}</div><div class="kv"><span>Verkoopdagen binnen</span><b class="${dagen < 7 ? 'rood' : ''}">${dagen} van 7</b><span>Besteld</span><b>${n} artikelen</b><span>Advies overgenomen</span><b>${n ? Math.round((1 - zelf / n) * 100) + '%' : '–'}</b><span>Open taken</span><b>${open}</b></div><button class="btn sm sec" id="woHg" style="margin-top:8px">🎯 Hoe goed was het advies</button></div>`;
}
function weekOverzichtEvents(v) { const w = v.querySelector('#woWeg'); if (w) w.onclick = () => { ls.set('cba-wo-' + C.add(C.monday(C.today()), -7), 1); render(); }; const h = v.querySelector('#woHg'); if (h) h.onclick = () => ga('hoegoed'); }
/* push bij taak of bericht */
async function taakPush(voor, titel, tekst) { if (DEMO || OEFEN) return; try { await fetch(`${SB_URL}/functions/v1/stuur-push`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ soort: 'taak', winkel: W, voor, titel, tekst, endpoint: (ls.get('cba-push') || {}).endpoint }) }); } catch (e) { } }
/* back-up */
const BACKUP_T = { tafels: 'tafels', indeling: 'tafel_indeling', notities: 'notities', eigen: 'eigen_artikelen', overdracht: 'overdracht' };
function backupMaken() {
  const d = { app: 'Coop Besteladvies', versie: VERSIE, winkel: WINKEL && WINKEL.naam, gemaakt: new Date().toISOString(), inst: S.inst, medewerkers: mwLijst().map(m => ({ naam: m.naam, rol: m.rol, rechten: m.rechten, actief: m.actief })), tafels: S.tafels, indeling: S.indeling, kwplan: S.kwplan, versplan: S.versplan || {}, notities: S.notities, eigen: S.eigen, overdracht: S.overdracht };
  const naam = `Besteladvies back-up ${C.today()}.json`; const file = new File([JSON.stringify(d)], naam, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: naam }).catch(() => { }); else { const u = URL.createObjectURL(file); const a = document.createElement('a'); a.href = u; a.download = naam; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
  log('beheer', 'Back-up gemaakt'); window.__laatsteBackup = { naam, grootte: file.size };
}
function backupTerug() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = async () => {
    let d; try { d = JSON.parse(await i.files[0].text()); } catch (e) { return toast('Dit is geen back-up-bestand', 4000); } if (d.app !== 'Coop Besteladvies') return toast('Dit is geen back-up van Besteladvies', 4000);
    if (!await bevestig('Back-up terugzetten?', `Van ${esc(d.winkel || '')}, gemaakt ${C.fmtDag(String(d.gemaakt).slice(0, 10))}.<br>Instellingen, tafels, indelingen, actie planning, notities, eigen artikelen en taken worden teruggezet. Verkoop, bestellingen en medewerkers blijven zoals ze zijn.`, 'Terugzetten', 'Annuleren')) return;
    if (d.inst) await saveInst(d.inst);
    if (d.tafels) write('tafels', Object.values(d.tafels), true);
    if (d.indeling) write('tafel_indeling', Object.entries(d.indeling).map(([k, v]) => ({ week: k.split('|')[0], tafel_id: k.split('|')[1], data: v })), true);
    write('kw_acties', Object.entries(d.kwplan || {}).map(([w, v]) => { const x = Object.assign({}, v); delete x.week; return { week: w, data: x }; }).concat(Object.entries(d.versplan || {}).map(([w, v]) => ({ week: w + '|vers', data: v }))), true);
    for (const t of ['notities', 'eigen', 'overdracht']) if (d[t]) write(BACKUP_T[t], Object.values(d[t]), true);
    log('beheer', 'Back-up teruggezet'); toast('✓ Back-up teruggezet', 3000); rebuild(); render();
  };
  i.click();
}
/* controle met de terminal (vrijwillig) */
function controleSheet(od, cur) {
  const lijst = lijstArtikelen(od).filter(a => { const b = S.bestel[a.key + '|' + cur.besteldag]; return b && (b.besteld || (b.aantal || 0) > 0); });
  ui.ctl = ui.ctl || {}; const ok = ui.ctl[od + cur.besteldag] = ui.ctl[od + cur.besteldag] || new Set();
  const aantal = a => { const b = S.bestel[a.key + '|' + cur.besteldag]; return (b.aantal ?? b.advies) || 0; };
  const ov = sheet(`<h2 style="margin:0">🔍 Controle met terminal</h2><p class="small">Typ per regel uit je bestelgeschiedenis het artikelnummer (of de laatste cijfers).</p><input type="search" inputmode="numeric" id="ctlQ" placeholder="Artikelnummer" style="width:100%"><div id="ctlR"></div><h3 id="ctlT"></h3><div class="list" id="ctlO"></div><button class="btn sec" data-x style="width:100%;margin-top:10px">Klaar</button>`);
  const teken = () => {
    const q = ov.querySelector('#ctlQ').value.trim(); const hits = q.length >= 2 ? lijstArtikelen(od).filter(a => String(a.nr).endsWith(q) || String(a.nr) === q).slice(0, 5) : [];
    ov.querySelector('#ctlR').innerHTML = hits.map(a => { const b = S.bestel[a.key + '|' + cur.besteldag]; return `<div class="it"><span style="flex:1"><b>${esc(a.naam)}</b><br><span class="small">${a.nr} · in de app: <b>${b && (b.besteld || b.aantal) ? C.fmt(aantal(a)) + (a.perHE ? ' HE' : '') : 'niet besteld'}</b></span></span>${b ? `<button class="btn sm" data-cok="${a.key}">✓ klopt</button>` : ''}<button class="btn sm sec" data-cga="${a.key}">Aanpassen</button></div>`; }).join('') || (q.length >= 2 ? '<p class="small">Niet gevonden in deze lijst.</p>' : '');
    const rest = lijst.filter(a => !ok.has(a.key)); ov.querySelector('#ctlT').textContent = rest.length ? `Nog niet gecontroleerd (${rest.length})` : '✓ Alles gecontroleerd';
    ov.querySelector('#ctlO').innerHTML = rest.map(a => `<div class="it"><span style="flex:1">${esc(a.naam)} <span class="small">${a.nr} · ${C.fmt(aantal(a))}</span></span></div>`).join('');
  };
  ov.querySelector('#ctlQ').oninput = teken;
  ov.onclick = e => { const c = e.target.closest('[data-cok]'); if (c) { ok.add(c.dataset.cok); const q = ov.querySelector('#ctlQ'); q.value = ''; q.focus(); teken(); } const g = e.target.closest('[data-cga]'); if (g) { ov.remove(); naarArtikel(M.art[g.dataset.cga]); } };
  teken(); setTimeout(() => ov.querySelector('#ctlQ').focus(), 50);
}
/* ---------- 1.28: vers-bestellijst ophalen + volle collo ---------- */
async function bewaarActie(pages, naam, buf) {
  const a = C.parseActie(pages); if (!a.week || !a.items.length) throw new Error('Geen acties gevonden');
  let y = +a.van.slice(0, 4); if (a.week < 10 && a.van.slice(5, 7) === '12') y++;
  const row = { id: `${y}-${String(a.week).padStart(2, '0')}`, week: a.week, van: a.van, tm: a.tm, items: a.items, bestand: naam, geupload: new Date().toISOString() };
  if (!DEMO) await upW('acties', [row]); pdfBewaar(row.id, 'actie', buf);
  S.acties = S.acties.filter(x => x.id !== row.id).concat([row]).sort((p, q) => p.van < q.van ? -1 : 1); rebuild(); return Object.assign(a, { id: row.id });
}
async function versHaalOp(jaar, week) {
  if (DEMO) throw new Error('In de testversie kun je de pdf zelf kiezen');
  const r = await fetch(`${SB_URL}/functions/v1/folder?jaar=${jaar}&week=${week}&soort=vers`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + await token() } });
  if (!r.ok) { let t = 'Ophalen mislukt (' + r.status + ')'; try { const j = await r.json(); if (j.fout) t = j.fout; } catch (e) { } throw new Error(t); }
  const buf = await r.arrayBuffer(); const pages = await C.pdfPages(await pdfjs(), buf.slice(0)); if (C.detectPdf(pages) !== 'actie') throw new Error('Geen vers-bestellijst');
  const a = await bewaarActie(pages, 'opgehaald', buf); if (a.week !== +week) throw new Error(`Vers-bestellijst week ${week} staat nog niet online`); return a;
}
async function versAutoHaal() {
  if (DEMO || OEFEN || !navigator.onLine || !(mag('upload') || mag('tafels'))) return; const lk = 'cba-versauto-' + W; if (ls.get(lk) === C.today()) return; ls.set(lk, C.today());
  for (let n = 0; n <= 3; n++) { const d = C.add(C.monday(C.today()), 7 * n); const iw = C.isoWeek(d); const id = weekSleutel(d); if ((S.acties || []).some(x => x.id === id)) continue;
    try { await versHaalOp(iw.y, iw.w); toast(`📣 Vers-acties week ${iw.w} automatisch opgehaald`, 4000); log('acties', `Vers-bestellijst week ${iw.w} automatisch opgehaald`); render(true); } catch (e) { } }
}
const COLLO_STD = { datum: '2026-11-03', items: Object.fromEntries(Object.entries({"979536":[4,"500gr","Aardappelgratin"],"979543":[8,"500gr","Aardappelschijfjes naturel"],"979539":[10,"250gr","Aardbeien topseal"],"979834":[10,"400gr","Aardbeien topseal"],"979510":[8,"1st","Andijvie flowpack"],"979729":[10,"1st","BIO Fles pompoen"],"979002":[6,"1st","BIO Kobacha pompoen"],"979733":[10,"1st","BIO oranje pompoen"],"979885":[14,"500gr","BIO rode bieten vacuum"],"979891":[15,"500gr","BIO rode kool + appel pak"],"979001":[6,"1st","BIO Spaghetti pompoen"],"979906":[15,"500gr","BIO zuurkool naturel pak"],"979532":[8,"500gr","Bistro minikrieltjes"],"979429":[10,"300gr","Blauwe bes bak"],"979091":[10,"125gr","Blauwe bes bakje"],"979720":[6,"1st","Bospeen flowpack"],"979435":[12,"125gr","Bramen bakje"],"979480":[12,"500gr","Broccoli struik"],"979693":[5,"1st","Cantaloupe meloen"],"979630":[12,"250gr","Champignons bakje"],"979789":[9,"250gr","Cherry tomaten bakje"],"979075":[14,"1st","Courgette"],"979034":[24,"340gr","Cranberrie vers"],"979459":[10,"500gr","Druiven rood pitloos bak"],"979645":[10,"500gr","Druiven wit pitloos bak"],"979094":[4,"450gr","Echte verse friet"],"979591":[8,"1.5kg","Elstar appels tas"],"979432":[12,"125gr","Frambozen bakje"],"979894":[10,"1st","Frisee sla"],"979009":[1,"7kg","Goudreinet appels gelegd"],"979741":[12,"1.5kg","Handsinaasappels net"],"979426":[6,"180gr","Honingtomaten bakje"],"979756":[10,"1st","IJsbergsla krop"],"979498":[8,"1.5kg","Jonagold appels zak"],"979423":[9,"400gr","Joyn trostomaten bak"],"979019":[6,"1kg","Kakifruit verpakt"],"979405":[12,"250gr","Kastanjechampignons bakje"],"979113":[9,"750gr","Kiwi Sungold schaal"],"979770":[10,"1kg","Kleine zoete appels"],"979648":[20,"100gr","Knoflook net"],"979657":[36,"1st","Komkommer geseald"],"979004":[5,"1st","Koolraap"],"979545":[8,"500gr","Krieltjes naturel"],"979462":[4,"1kg","Kruimige aardappel"],"979486":[7,"3kg","Kruimige aardappel"],"979721":[12,"2st","Little gem sla"],"979897":[8,"1st","Lollo verte sla"],"979366":[12,"1kg","Mandarijn net"],"979696":[8,"1st","Mini watermeloen"],"979541":[8,"500gr","Minikrieltjes naturel"],"979833":[6,"1st","Oranje bloemkool"],"979835":[6,"1st","Paarse bloemkool"],"979711":[16,"3st","Paprika mix"],"979063":[12,"1st","Paprika rood"],"979744":[9,"2kg","Perssinaasappel net"],"979882":[10,"1kg","Prei bundel"],"979005":[10,"500gr","Pruimen verpakt"],"979012":[10,"1st","Radijs flowpack"],"979438":[12,"125gr","Rode bessen bakje"],"979816":[16,"3st","Rode uien net"],"979772":[10,"750gr","Roma tomaten"],"979852":[8,"1st","Romanesco bloemkool"],"979765":[6,"1st","Salanova sla trio krop"],"979420":[10,"500gr","Sjalotten net"],"979762":[12,"1st","Sla krop"],"979660":[6,"400gr","Snackkomkommer bak"],"979658":[6,"230gr","Snackkomkommer bakje"],"979114":[6,"175gr","Snackpaprika pitloos"],"979795":[12,"250gr","Snacktomaten bakje"],"979969":[6,"500gr","Snacktomaten mix bak"],"979116":[6,"250gr","Snacktomaten mix bakje"],"979801":[12,"500gr","Snacktomaten rood bak"],"979768":[10,"400gr","Snijbonen zak"],"979777":[10,"500gr","Sperziebonen zak"],"979769":[10,"500gr","Spruiten zak"],"979900":[9,"500gr","Trostomaten schaal"],"979807":[20,"1kg","Uien netje"],"979468":[4,"1kg","Vastkokende aardappel"],"979471":[7,"3kg","Vastkokende aardappel"],"979828":[8,"500gr","Witlof flowpack"],"979714":[8,"2st","Zoete puntpaprika"],"979718":[8,"4st","Zoete puntpaprika mix"],"979417":[10,"3st","Zoete uien net"],"979915":[15,"500gr","Zuurkool kruiden pak"],"979909":[15,"500gr","Zuurkool naturel pak"],"979912":[15,"500gr","Zuurkool wijn pak"]}).map(([k, [n, inh, naam]]) => [k, { n, inh, naam }])) };
function colloLijst() { const c = (S.inst || {}).collo; return c && c.items ? c : COLLO_STD; }
function colloVan(a) { const c = colloLijst(); const x = c && c.items && a && a.nr && c.items[a.nr]; if (!x) return null; const st = a.perHE && a.he > 0 ? a.he : 1; return Object.assign({ eenh: Math.max(1, Math.round(x.n / st)) }, x); }
function colloHtml(a, ad, rB) {
  const c = colloVan(a); if (!c) return ''; const u = a.perHE ? ' HE' : ''; const adv = ad.adv || 0;
  let t = `💰 Volle collo = ${c.n} × ${esc(c.inh)} → korting`;
  if (adv > 0 && adv < c.eenh) { const nd = Array.isArray(ad.days) ? ad.days.length : +ad.days || 0; const dpd = nd ? ad.need / nd : 0; const dg = dpd > 0 ? Math.floor((ad.stock || 0) / dpd) : 0; t += `<br><span class="small">Advies ${C.fmt(adv)}${u}. ${dg >= 2 ? `Er ligt nog voor ±${dg} dagen: liever wachten en in één keer ${c.eenh}${u} bestellen?` : `Nu nodig. Volle collo (${c.eenh}${u}) geeft korting, maar ${C.fmt(c.eenh - adv)}${u} meer over.`}</span>`; }
  else if (adv > c.eenh && adv % c.eenh) t += `<br><span class="small">Afronden naar ${Math.ceil(adv / c.eenh) * c.eenh}${u} = ${Math.ceil(adv / c.eenh)} volle collo.</span>`;
  return `<div class="collo">${t}${rB ? `<button class="btn sm" data-collo="${Math.max(1, Math.ceil(adv / c.eenh)) * c.eenh}">Volle collo</button>` : ''}</div>`;
}
/* ---------- 1.29: link plakken ---------- */
function linkPlakken() {
  if (OEFEN) return toast('Uploaden kan niet tijdens oefenen');
  const ov = sheet(`<h2 style="margin:0">🔗 Link plakken</h2><p class="small">Kopieer in Safari of je mail de link naar een pdf of Excel van Reto, bijvoorbeeld de collo-lijst of een folderplanning, en plak hem hieronder.</p><textarea id="lkU" rows="3" class="notitieveld" placeholder="https://static.reto.media/…"></textarea><button class="btn sec" id="lkP" style="width:100%;margin-top:8px">📋 Plakken uit klembord</button><button class="btn" id="lkG" style="width:100%;margin-top:8px">Ophalen en verwerken</button><button class="btn sec" data-x style="width:100%;margin-top:8px">Annuleren</button>`);
  const veld = ov.querySelector('#lkU');
  ov.querySelector('#lkP').onclick = async () => { try { veld.value = (await navigator.clipboard.readText()).trim(); } catch (e) { toast('Plakken lukt niet automatisch. Houd het veld ingedrukt en kies Plak.', 4000); veld.focus(); } };
  ov.querySelector('#lkG').onclick = async () => {
    const l = ((veld.value.match(/https:\/\/\S+/) || [])[0] || '').replace(/[)>\]"']+$/, ''); if (!l) return toast('Plak eerst een link die met https:// begint');
    const b = ov.querySelector('#lkG'); b.disabled = true; b.textContent = 'Ophalen…';
    try {
      if (DEMO) throw new Error('In de testversie kun je de pdf zelf kiezen');
      const r = await fetch(`${SB_URL}/functions/v1/folder?url=${encodeURIComponent(l)}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + await token() } });
      if (!r.ok) { let t = 'Ophalen mislukt (' + r.status + ')'; try { const j = await r.json(); if (j.fout) t = j.fout; } catch (e) { } throw new Error(t); }
      const naam = decodeURIComponent(l.split('?')[0].split('/').pop() || 'bestand.pdf'); const f = new File([await r.arrayBuffer()], naam, { type: r.headers.get('content-type') || 'application/pdf' });
      ov.remove(); log('upload', 'Via link: ' + naam); uploads([f]);
    } catch (e) { toast(e.message, 5000); b.disabled = false; b.textContent = 'Ophalen en verwerken'; }
  };
  setTimeout(() => veld.focus(), 50);
}
/* ---------- 1.14: bluetooth-scanner ---------- */
let telHook = null, scanHook = null, scannerGezien = false;
let piepCtx = null;
function piep() { try { piepCtx = piepCtx || new (window.AudioContext || window.webkitAudioContext)(); const o = piepCtx.createOscillator(), g = piepCtx.createGain(); o.frequency.value = 220; o.type = 'square'; g.gain.value = 0.08; o.connect(g); g.connect(piepCtx.destination); o.start(); o.stop(piepCtx.currentTime + 0.25); } catch (e) { } if (navigator.vibrate) navigator.vibrate([80, 60, 80]); }
function scannerCode(code) {
  scannerGezien = true;
  if (telHook) return telHook(code);
  if (scanHook) return scanHook(code);
  if (!M || !OPEN) return;
  const a = vindCode(code);
  if (!a) {
    piep(); document.querySelectorAll('.sheet').forEach(x => x.remove());
    const ov = sheet(`<h2 style="margin:0">Niet gevonden</h2><p class="small">Barcode <b>${esc(code)}</b> staat niet in het bestelboek en is nog niet via de kassa verkocht.</p>${mag('saneren') ? '<button class="btn" id="snE" style="width:100%">➕ Als eigen artikel toevoegen</button>' : ''}<button class="btn sec" data-x style="width:100%;margin-top:8px">Sluiten</button>`);
    const e = ov.querySelector('#snE'); if (e) e.onclick = () => { ov.remove(); eigenBewerk(null, BESTEL_OD.includes(ui.tab) ? ui.tab : 'vers', /^\d{8,14}$/.test(code) ? { ean: code } : { nr: code.replace(/\D/g, '').slice(0, 6) }); };
    return;
  }
  if (navigator.vibrate) navigator.vibrate(60);
  document.querySelectorAll('.sheet').forEach(x => x.remove());
  ui.open = ui.open || new Set(); naarArtikel(a);
}
(() => {
  let buf = '', t = 0, el = null, start = null;
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const nu = performance.now(); const snel = nu - t < 60;
    if (e.key === 'Enter' || e.key === 'Tab') {
      const c = buf; buf = '';
      if (c.length >= 4 && snel && /^[0-9A-Za-z]+$/.test(c)) { e.preventDefault(); e.stopPropagation(); if (el && start !== null && el.value !== start) { el.value = start; el.dispatchEvent(new Event('input', { bubbles: true })); } el = null; scannerCode(c); }
      return;
    }
    if (e.key.length !== 1) return;
    if (!snel) { buf = ''; el = e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName) ? e.target : null; start = el ? el.value : null; }
    else if (el) e.preventDefault();
    buf += e.key; t = nu;
  }, true);
})();
