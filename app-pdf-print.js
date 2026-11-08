/* ---------- 1.20: pdf maken en bekijken ---------- */
let pdfCssKlaar = false;
function pdfCss() {
  if (pdfCssKlaar) return; pdfCssKlaar = true; let css = '';
  for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } const neem = x => { if (x.selectorText && x.selectorText.includes('#printArea') && x.selectorText.trim() !== '#printArea') css += x.cssText.replace(/#printArea/g, '.pdfrender') + '\n'; }; for (const r of rules) { if (r.media && /print/.test(r.media.mediaText || '')) [...r.cssRules].forEach(neem); else if (!r.media) neem(r); } }
  const st = document.createElement('style'); st.textContent = '.pdfrender{position:fixed;left:-20000px;top:0;width:1123px;background:#fff;color:#000;font-size:9px;padding:30px;box-sizing:border-box;display:block!important}.pdfrender *{-webkit-print-color-adjust:exact;print-color-adjust:exact;color:#000}.pdfrender td.a{color:#d02a1e}.pdfrender .tafel .vak:not(.leeg){color:#fff}.pdfrender.staand{width:794px;padding:0}.pdfrender .pdfpagina{width:718px;padding:0;margin:0 0 40px;background:#fff}.pdfrender .kpsub{margin:0 0 3mm;font-size:11px;color:#555}' + css; document.head.appendChild(st);
}
async function maakPdf(titel, opt = {}) {
  await Promise.all([loadScript(LIB.h2c), loadScript(LIB.jspdf)]); pdfCss();
  const el = document.createElement('div'); el.className = 'pdfrender' + (opt.staand ? ' staand' : ''); el.innerHTML = $('#printArea').innerHTML; document.body.appendChild(el);
  await new Promise(r => setTimeout(r, 60));
  try {
    if (el.querySelector('.pdfpagina')) return await pdfPerPagina(el, titel, opt);
    const W = el.offsetWidth, H = el.scrollHeight, pageH = Math.floor(W * 210 / 297); const top0 = el.getBoundingClientRect().top;
    const breuk = new Set([0]); const kand = [...el.querySelectorAll('tr, .kpb, h1, h2, .tafel, p')].map(x => { const r = x.getBoundingClientRect(); return { t: r.top - top0, b: r.bottom - top0, nieuw: x.closest('tbody.nieuwepagina') && x === x.closest('tbody').firstElementChild }; });
    let start = 0; const pag = [];
    while (start < H - 2) {
      let eind = Math.min(H, start + pageH);
      const nieuw = kand.filter(k => k.nieuw && k.t > start + 20 && k.t < eind).map(k => k.t)[0];
      if (nieuw) eind = nieuw; else if (eind < H) { const ok = kand.filter(k => k.b <= eind && k.b > start + pageH * 0.5).map(k => k.b); if (ok.length) eind = Math.max(...ok); }
      pag.push([start, eind]); start = eind;
    }
    const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false, windowWidth: W });
    const s = canvas.width / W; const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' }); const beelden = [];
    pag.forEach(([a, b], i) => {
      const c = document.createElement('canvas'); c.width = canvas.width; c.height = Math.round(pageH * s); const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);
      cx.drawImage(canvas, 0, Math.round(a * s), canvas.width, Math.round((b - a) * s), 0, 0, canvas.width, Math.round((b - a) * s));
      const url = c.toDataURL('image/jpeg', 0.9); beelden.push(url); if (i) doc.addPage(); doc.addImage(url, 'JPEG', 0, 0, 297, 210);
    });
    const blob = doc.output('blob'); const naam = (titel || 'Besteladvies').replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
    return { file: new File([blob], naam, { type: 'application/pdf' }), beelden, naam };
  } finally { el.remove(); }
}
async function pdfPerPagina(el, titel, opt) {
  const { jsPDF } = window.jspdf; const st = !!opt.staand; const PW = st ? 210 : 297, PH = st ? 297 : 210, M = 8;
  const doc = new jsPDF({ orientation: st ? 'p' : 'l', unit: 'mm', format: 'a4' }); const beelden = [];
  const pags = [...el.querySelectorAll('.pdfpagina')];
  for (let i = 0; i < pags.length; i++) {
    const pg = pags[i]; const cv = await window.html2canvas(pg, { scale: 2, backgroundColor: '#ffffff', logging: false });
    const bw = PW - 2 * M, bh = PH - 2 * M; let w = bw, h = cv.height / cv.width * bw; if (h > bh) { w = w * bh / h; h = bh; }
    const k = 4; const c = document.createElement('canvas'); c.width = Math.round(PW * k * 2.5); c.height = Math.round(PH * k * 2.5); const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);
    const sc = c.width / PW; cx.drawImage(cv, Math.round(M * sc), Math.round(M * sc), Math.round(w * sc), Math.round(h * sc));
    const url = c.toDataURL('image/jpeg', 0.9); beelden.push(url); if (i) doc.addPage(); doc.addImage(url, 'JPEG', 0, 0, PW, PH);
  }
  const blob = doc.output('blob'); const naam = (titel || 'Besteladvies').replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
  return { file: new File([blob], naam, { type: 'application/pdf' }), beelden, naam };
}
async function toonPdf(titel, aanpassen, opt = {}) {
  const wacht = document.createElement('div'); wacht.className = 'pdfview'; wacht.innerHTML = '<div class="pdfwacht">📄 Pdf maken…</div>'; document.body.appendChild(wacht);
  let r; try { r = await maakPdf(titel, opt); } catch (e) { wacht.remove(); return toast('Pdf maken lukt niet: ' + e.message, 5000); }
  window.__laatstePdf = { naam: r.naam, paginas: r.beelden.length, grootte: r.file.size };
  let zoom = 1;
  wacht.innerHTML = `<div class="pdfkop"><b>${esc(r.naam)}</b><span>${r.beelden.length} ${r.beelden.length === 1 ? 'pagina' : "pagina's"}</span><span class="pdfzoom"><button data-z="-1">−</button><button data-z="1">+</button></span></div><div class="pdfpag">${r.beelden.map(u => `<img src="${u}" alt="">`).join('')}</div>
  <div class="pdfvoet"><button class="btn" id="pdfDeel">🖨️ Afdrukken / Delen</button>${aanpassen ? '<button class="btn sec" id="pdfAanp">⚙️ Aanpassen</button>' : ''}<button class="btn sec" id="pdfSluit">Sluiten</button></div>`;
  const pg = wacht.querySelector('.pdfpag');
  wacht.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { zoom = Math.max(1, Math.min(3, zoom + (+b.dataset.z) * 0.5)); pg.querySelectorAll('img').forEach(i => i.style.width = (zoom * 100) + '%'); });
  wacht.querySelector('#pdfSluit').onclick = () => wacht.remove();
  const ap = wacht.querySelector('#pdfAanp'); if (ap) ap.onclick = () => { wacht.remove(); aanpassen(); };
  wacht.querySelector('#pdfDeel').onclick = async () => {
    try { if (navigator.canShare && navigator.canShare({ files: [r.file] })) await navigator.share({ files: [r.file], title: r.naam }); else { const u = URL.createObjectURL(r.file); const a = document.createElement('a'); a.href = u; a.download = r.naam; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 10000); } }
    catch (e) { if (e && e.name !== 'AbortError') toast('Delen lukt niet: ' + e.message, 5000); }
  };
}
/* ---------- 1.22: gebruiksvriendelijk ---------- */
const normZ = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
function levD(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1; const d = []; for (let i = 0; i <= a.length; i++) { d[i] = [i]; } for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) { let rmin = 1e9; for (let j = 1; j <= b.length; j++) { const c = a[i - 1] === b[j - 1] ? 0 : 1; let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c); if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1); d[i][j] = v; if (v < rmin) rmin = v; } if (rmin > max) return max + 1; }
  return d[a.length][b.length];
}
function zoekScore(q, tekst) {
  const Q = normZ(q), T = normZ(tekst); if (!Q || !T) return 0; const at = T.indexOf(Q); if (at >= 0) return 100 - Math.min(40, at);
  const ws = T.split(' '); let tot = 0;
  for (const qw of Q.split(' ')) {
    const max = qw.length >= 8 ? 2 : qw.length >= 4 ? 1 : 0; let best = 99;
    for (const w of ws) { if (w.includes(qw)) { best = 0; break; } if (!max) continue; let dd = levD(qw, w, max); if (w.length > qw.length + 1) dd = Math.min(dd, levD(qw, w.slice(0, qw.length), max)); if (dd < best) best = dd; }
    if (best > max) return 0; tot += best;
  }
  return 60 - tot * 10;
}
function waarschuwF() { const n = (S.inst || {}).waarschuw; return n === undefined || n === null ? 3 : +n; }
function odDeadline(od, cur) {
  if (!cur) return null; const lev = od === 'kw' ? 'vantol' : 'versunie'; const nu = nuTs();
  const l = odGroepen(od).map(g => dlVoor(lev, g, cur)).filter(Boolean).sort((a, b) => a.ts < b.ts ? -1 : 1); if (!l.length) return null;
  return l.find(x => x.ts > nu) || l[l.length - 1];
}
function lijstKopTekst(od, boekTxt) {
  const cur = besteldag(od).cur; if (!cur) return esc(boekTxt);
  const dl = odDeadline(od, cur); const dag = x => `${C.DAGEN[C.wd(x)]} ${C.fmtDag(x).split(' ')[1]}`;
  let t = dl ? `Bestellen vóór ${dag(dl.dag)} ${dl.t}` : `Bestellen ${dag(cur.besteldag)}`; t += ` · levering ${C.DAGEN[C.wd(cur.L)]}`;
  if (dl && dl.dag === C.today()) { const rest = minuten(dl.t) - minuten(nuHHMM()); t += rest < 0 ? ' <span class="aftel rood">⏰ deadline voorbij</span>' : ` <span class="aftel ${rest < 60 ? 'rood' : ''}">⏰ nog ${rest >= 60 ? Math.floor(rest / 60) + ' u ' : ''}${rest % 60} min</span>`; }
  const bw = +((String(boekTxt).match(/week (\d+)/) || [])[1] || 0); const oud = bw && ((C.isoWeek(C.today()).w - bw + 53) % 53) >= 2;
  return t + `<br><small class="boekregel">${esc(boekTxt)}${oud ? ' · ⚠️ oud, upload een nieuw bestelboek' : ''}</small>`;
}
let flitsT = null;
function opgeslagenFlits() {
  let el = $('#flits'); if (!el) { el = document.createElement('div'); el.id = 'flits'; el.className = 'flits'; document.body.appendChild(el); }
  const off = !DEMO && !OEFEN && !online; el.textContent = OEFEN ? '🎓 Oefenen · niet echt opgeslagen' : off ? '📴 Offline · wordt later verstuurd' : '✓ Opgeslagen'; el.className = 'flits aan' + (off ? ' off' : '');
  clearTimeout(flitsT); flitsT = setTimeout(() => { el.className = 'flits'; }, off ? 2600 : 1200);
}
/* navigatie */
function navKlik(t) {
  if (t === 'tellen') return tellenSheet();
  if (t === 'meer') ui.meerG = null; ga(t);
}
function tellenSheet() {
  if (!mag('tellen')) return toast('Je mag niet tellen');
  const ods = BESTEL_OD.filter(od => mag('o_' + od) && lijstArtikelen(od).length);
  const rij = od => { const cur = besteldag(od).cur; const t = cur ? telKeuze(od, cur) : { open: [] }; return `<button class="belrij" data-tod="${od}"><span class="ic">${(ONDERDELEN.find(o => o[0] === od) || [])[2]}</span><span><b>${odNaam(od)}</b><small>${t.open.length ? `Telvragen: nog ${t.open.length}` : 'Alles van deze afdeling, één voor één'}</small></span><span class="pijl">›</span></button>`; };
  const ov = sheet(`<h2 style="margin:0 0 4px">🔢 Tellen</h2><p class="small">Tel wat er op het schap ligt. Dan wordt het advies beter.</p>${ods.map(rij).join('')}<button class="belrij" data-tvrij="1"><span class="ic">📟</span><span><b>Vrij tellen met scanner</b><small>Scan schapkaartjes, producten of het bestelboek</small></span><span class="pijl">›</span></button><button class="btn sec" data-x style="width:100%;margin-top:10px">Sluiten</button>`, (e, o) => {
    const b = e.target.closest('[data-tod]'); if (b) { o.remove(); const od = b.dataset.tod; const cur = besteldag(od).cur; const t = cur ? telKeuze(od, cur) : { open: [] }; const arts = t.open.length ? t.open.map(k => M.art[k]).filter(Boolean) : lijstArtikelen(od).filter(a => !a.uit && assStatus(a) === 'in'); return telModus(od, arts); }
    if (e.target.closest('[data-tvrij]')) { o.remove(); telModus(ods[0] || 'vers', [], true); }
  });
  return ov;
}
/* taken en berichten */
function beheerNamen() { const l = [...new Set(mwLijst().filter(m => m.rol === 'beheerder').map(m => m.naam).concat(S.inst && S.inst.beheerNaam ? [S.inst.beheerNaam] : []))].filter(Boolean); return l.length ? l : ['Beheerder']; }
function voorMij(r) { const v = String(r.voor || ''); if (r.soort === 'bericht') return v.split(',').includes(mijnNaam()) || (isBeheer() && (v === 'beheer' || !beheerNamen().some(n => v.split(',').includes(n)))); return !v || v === 'iedereen' || v === mijnNaam(); }
function openTaken(alle) { return Object.values(S.overdracht || {}).filter(r => !r.klaar && (r.soort === 'taak' || r.soort === 'bericht') && (alle || voorMij(r))).sort((a, b) => (a.tot || 'z') < (b.tot || 'z') ? -1 : (a.tot || 'z') > (b.tot || 'z') ? 1 : (a.ts || '') < (b.ts || '') ? -1 : 1); }
function totTekst(r) { if (!r.tot) return ''; const d = new Date(r.tot); if (isNaN(d)) return ''; const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const t = hhmm(r.tot); const laat = d.getTime() < Date.now(); return `<span class="${laat ? 'rood' : ''}">vóór ${ds === C.today() ? 'vandaag' : C.fmtDag(ds)}${t !== '23:59' ? ' ' + t : ''}</span>`; }
function taakRij(r, metVoor) { return `<div class="it taakrij"><span style="flex:1">${r.soort === 'bericht' ? '✉️ ' : ''}<b>${esc(r.tekst)}</b><br><span class="small">${r.soort === 'bericht' ? `van ${esc(r.wie || '')} aan ${esc(String(r.voor || '').split(',').join(' en '))}` : `${metVoor ? `voor ${esc(!r.voor || r.voor === 'iedereen' ? 'iedereen' : r.voor)} · ` : ''}van ${esc(r.wie || '')}`}${r.tot ? ' · ' + totTekst(r) : ''}</span></span><button class="btn sm" data-tkok="${esc(r.id)}">${r.soort === 'bericht' ? 'Gelezen' : '✓ Gedaan'}</button></div>`; }
function taakKlaar(id) { const r = S.overdracht[id]; if (!r) return; const rij = Object.assign({}, r, { klaar: true, klaar_door: mijnNaam(), klaar_om: new Date().toISOString() }); write('overdracht', [rij]); log('taak', `${r.soort === 'bericht' ? 'Bericht gelezen' : 'Taak gedaan'}: ${r.tekst}`); ongedaan(r.soort === 'bericht' ? 'Gelezen' : 'Taak afgevinkt', () => write('overdracht', [Object.assign({}, r, { klaar: false, klaar_door: null, klaar_om: null })])); render(); }
function autoTaken() { try { return belItems().filter(x => x.jij && !x.taak); } catch (e) { return []; } }
function takenRijen(auto) {
  const best = auto.filter(x => BESTEL_OD.includes(x.ga) && x.ic !== '🔢'), tel = auto.filter(x => x.ic === '🔢'), rest = auto.filter(x => !best.includes(x) && !tel.includes(x));
  const rij = (ic, t, sub, attr) => `<button class="belrij" ${attr}><span class="ic">${ic}</span><span><b>${esc(t)}</b><small>${sub}</small></span><span class="pijl">›</span></button>`;
  return (best.length ? `<div class="belrij takenbest"><span class="ic">🛒</span><span><b>Bestellen</b><small>${best.map(x => `<button class="chipknop" data-tka="${auto.indexOf(x)}">${esc(odNaam(x.ga))}</button>`).join('')}</small></span></div>` : '')
    + (tel.length ? rij('🔢', 'Tellen', esc(tel.map(x => x.t.replace(/: tel (\d+) artikelen/, ' $1')).join(' · ')), 'data-tktel="1"') : '')
    + rest.map(x => rij(x.ic, x.t, esc(x.sub), `data-tka="${auto.indexOf(x)}"`)).join('');
}
function takenHomeHtml() {
  const auto = autoTaken(); const hand = openTaken(); if (!auto.length && !hand.length) return mag('o_agf') || mag('o_vers') || mag('o_kw') ? `<div class="takenblok leeg"><b>👍 Jouw taken vandaag</b><span class="small">Alles is gedaan. Goed bezig!</span></div>` : '';
  return `<div class="blk takenblok"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Jouw taken vandaag</h2><button class="link" id="tkAlle">Alle taken ›</button></div>${takenRijen(auto)}${hand.slice(0, 3).map(r => taakRij(r)).join('')}${hand.length > 3 ? `<p class="small">+${hand.length - 3} meer bij Taken</p>` : ''}</div>`;
}
function takenHomeEvents(v) {
  const auto = autoTaken();
  v.querySelectorAll('[data-tka]').forEach(b => b.onclick = () => { const x = auto[+b.dataset.tka]; if (!x) return; if (x.bsub) ui.bsub = x.bsub; ga(x.ga); if (x.bsub) { ui.bsub = x.bsub; render(); } });
  v.querySelectorAll('[data-tkok]').forEach(b => b.onclick = () => taakKlaar(b.dataset.tkok));
  v.querySelectorAll('[data-tktel]').forEach(b => b.onclick = tellenSheet);
  const a = $('#tkAlle'); if (a) a.onclick = () => ga('taken');
}
function renderTaken() {
  const v = $('#view'); const auto = autoTaken(); const mijn = openTaken(); const anderen = isBeheer() || mag('team') ? openTaken(true).filter(r => !mijn.includes(r)) : [];
  v.innerHTML = `${auto.length ? `<div class="blk"><h2>Vandaag in de app</h2>${takenRijen(auto)}</div>` : ''}
  <div class="blk"><h2>Voor jou</h2>${mijn.length ? `<div class="list">${mijn.map(r => taakRij(r)).join('')}</div>` : '<p class="small">Geen taken of berichten voor jou. 👍</p>'}</div>
  ${anderen.length ? `<div class="blk"><h2>Taken van anderen</h2><div class="list">${anderen.map(r => taakRij(r, true)).join('')}</div></div>` : ''}
  <div class="blk">${isBeheer() || mag('team') ? '<button class="btn" id="tkNieuw" style="width:100%">+ Nieuwe taak</button>' : ''}<button class="btn sec" id="tkBericht" style="width:100%;margin-top:10px">✉️ Bericht voor ${esc(beheerNamen().join(' of '))}</button></div>`;
  takenHomeEvents(v);
  const n = $('#tkNieuw'); if (n) n.onclick = taakMaken; $('#tkBericht').onclick = () => berichtMaken('');
}
function taakMaken() {
  const mws = mwLijst().filter(m => m.actief !== false).map(m => m.naam);
  const ov = sheet(`<h2 style="margin:0">Nieuwe taak</h2><div class="form"><label class="small">Wat moet er gebeuren?</label><textarea id="tkT" rows="3" class="notitieveld" placeholder="Bijv. AGF bestellen en de kop bij de kassa opbouwen"></textarea>
  <label class="small">Voor wie</label><select id="tkV"><option value="iedereen">Iedereen</option>${mws.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select>
  <label class="small">Klaar vóór</label><div class="row"><input type="date" id="tkD" value="${C.today()}" style="flex:1"><input type="time" id="tkU" value="" style="flex:1"></div>
  <button class="btn" id="tkS">Taak opslaan</button><button class="btn sec" data-x>Annuleren</button></div>`);
  ov.querySelector('#tkS').onclick = () => {
    const t = ov.querySelector('#tkT').value.trim(); if (!t) return toast('Schrijf wat er moet gebeuren'); const d = ov.querySelector('#tkD').value || C.today(); const u = ov.querySelector('#tkU').value || '23:59';
    const tot = new Date(`${d}T${u}:00`); const voor = ov.querySelector('#tkV').value;
    write('overdracht', [{ id: 'T' + Date.now().toString(36), tekst: t, wie: mijnNaam(), ts: new Date().toISOString(), klaar: false, soort: 'taak', voor, tot: isNaN(tot) ? null : tot.toISOString() }]); log('taak', `Taak voor ${voor}: ${t}`); taakPush(voor, 'Nieuwe taak van ' + mijnNaam(), t); ov.remove(); toast('Taak gemaakt'); render();
  };
}
function berichtMaken(begin) {
  const namen = beheerNamen(); let kies = namen.slice(0, 1);
  const ov = sheet(`<h2 style="margin:0">✉️ Bericht</h2><label class="small">Voor</label><div class="chips2" id="brV">${namen.map(n => `<button type="button" data-bn="${esc(n)}" class="${kies.includes(n) ? 'aan' : ''}">${esc(n)}</button>`).join('')}${namen.length > 1 ? '<button type="button" data-bn="*">Allebei</button>' : ''}</div><textarea id="brT" rows="4" class="notitieveld" placeholder="Bijv. paprika rood niet geleverd">${esc(begin || '')}</textarea><button class="btn" id="brS" style="width:100%;margin-top:8px">Versturen</button><button class="btn sec" data-x style="width:100%;margin-top:8px">Annuleren</button>`);
  const teken = () => ov.querySelectorAll('[data-bn]').forEach(b => b.classList.toggle('aan', b.dataset.bn === '*' ? kies.length === namen.length && namen.length > 1 : kies.includes(b.dataset.bn)));
  ov.querySelector('#brV').onclick = e => { const b = e.target.closest('[data-bn]'); if (!b) return; const n = b.dataset.bn; if (n === '*') kies = namen.slice(); else kies = kies.includes(n) && kies.length > 1 ? kies.filter(x => x !== n) : kies.includes(n) ? kies : kies.concat([n]); teken(); };
  ov.querySelector('#brS').onclick = () => { const t = ov.querySelector('#brT').value.trim(); if (!t || t === (begin || '').trim()) return toast('Schrijf eerst je bericht'); write('overdracht', [{ id: 'B' + Date.now().toString(36), tekst: t, wie: mijnNaam(), ts: new Date().toISOString(), klaar: false, soort: 'bericht', voor: kies.join(',') }]); log('bericht', `Bericht aan ${kies.join(' en ')}: ${t}`); taakPush(kies.join(','), 'Bericht van ' + mijnNaam(), t); ov.remove(); toast('Verstuurd naar ' + kies.join(' en ')); };
  setTimeout(() => { const t = ov.querySelector('#brT'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 50);
}
/* bel: voor jou en info */
const BEL_JIJ = new Set(BESTEL_OD.concat(['levering', 'tafels', 'taken']));
function belItems() {
  const out = belItemsBasis().map(x => Object.assign({ jij: BEL_JIJ.has(x.ga) }, x));
  for (const od of BESTEL_OD) { if (!mag('o_' + od) || !mag('tellen')) continue; const cur = besteldag(od).cur; if (!cur || cur.besteldag !== C.today()) continue; const t = telKeuze(od, cur); if (t.open.length) out.push({ ic: '🔢', t: `${odNaam(od)}: tel ${t.open.length} artikelen`, sub: 'Dan wordt het advies beter', ga: od, jij: true }); }
  for (const r of openTaken()) out.unshift({ ic: r.soort === 'bericht' ? '✉️' : '☑️', t: r.tekst, sub: r.soort === 'bericht' ? `Bericht van ${r.wie || ''}` : `Taak van ${r.wie || ''}`, ga: 'taken', jij: true, taak: true });
  return out;
}
function belInfo(x) { return !x.jij || (x.taak && x.ic === '✉️'); }
function belSheet() {
  const l = belItems(); const info = l.filter(belInfo);
  sheet(`<h2 style="margin:0 0 6px">Meldingen</h2>${info.length ? info.map(x => `<button class="belrij" data-bi="${l.indexOf(x)}"><span class="ic">${x.ic}</span><span><b>${esc(x.t)}</b><small>${esc(x.sub)}</small></span><span class="pijl">›</span></button>`).join('') : '<p class="small">Geen meldingen. Wat je moet doen staat bij Taken.</p>'}<button class="btn sec" data-x style="margin-top:12px;width:100%">Sluiten</button>`, (e, ov) => {
    const b = e.target.closest('[data-bi]'); if (!b) return; const x = l[+b.dataset.bi]; ov.remove(); ga(x.ga); if (x.bsub) { ui.bsub = x.bsub; render(); }
  });
}
/* klaar, alles besteld */
async function allesBesteld(od, cur) {
  const rows = []; const nu = new Date().toISOString(); let stuks = 0;
  for (const a of lijstArtikelen(od)) {
    if (a.uit || assStatus(a) !== 'in') continue; const be = S.bestel[a.key + '|' + cur.besteldag]; if (be && be.besteld) continue;
    const ad = C.advies(M, a.key, cur, vrVan(a.key), bestellingenVan(a.key)); const n = be && be.aantal !== null && be.aantal !== undefined ? be.aantal : ad.adv; if (!(n > 0)) continue;
    rows.push({ bron: a.bron, nr: a.nr, besteldag: cur.besteldag, lever: cur.L, besteld: true, besteld_door: mijnNaam(), besteld_om: nu, advies: ad.adv }); stuks += n;
  }
  if (!rows.length) return toast('✓ Alles is al besteld. Goed bezig 👍', 3000);
  if (!await bevestig('Klaar met bestellen?', `<b>${odNaam(od)}</b> · bestellen ${C.fmtDag(cur.besteldag)}<br>${rows.length} artikelen worden afgevinkt als besteld (${C.fmt(stuks)} in totaal).<br><br>Heb je alles in de terminal ingevoerd?`, 'Ja, alles besteld', 'Nog niet')) return;
  write('bestellingen', rows); log('besteld', `${odNaam(od)} klaar: ${rows.length} artikelen besteld`);
  ongedaan('Alles afgevinkt', () => write('bestellingen', rows.map(r => Object.assign({}, r, { besteld: false, besteld_door: null, besteld_om: null }))));
  toast(`👍 ${odNaam(od)} is besteld. Goed bezig!`, 3000); render(true);
}
/* plekken: koeltafels en koppen */
function plekSegment() {
  const v = $('#view'); if (!v || v.querySelector('.plekseg')) return; ui.plekSoort = ui.tab === 'kwacties' ? 'kop' : 'tafel';
  const d = document.createElement('div'); d.className = 'plekseg';
  d.innerHTML = `<div class="segment licht">${[['tafel', '🥬 Vers'], ['kop', '🥫 KW']].filter(x => x[0] === 'tafel' || mag('o_kw')).map(([k, n]) => `<button class="${ui.plekSoort === k ? 'aan' : ''}" data-pls="${k}">${n}</button>`).join('')}</div>`;
  v.prepend(d);
  d.querySelectorAll('[data-pls]').forEach(b => b.onclick = () => { ui.plekSoort = b.dataset.pls; ga(b.dataset.pls === 'kop' ? 'kwacties' : 'tafels'); });
}
/* meer: groepen + slim zoeken */
const MEER_GROEPEN = [['mij', '👤', 'Mijn instellingen', 'Weergave, meldingen, pincode'], ['bestellen', '🛒', 'Bestellen', 'Leveranciers, levering, deadlines, waarschuwingen'], ['team', '👥', 'Medewerkers', 'Pincodes, rechten, nieuwe medewerker, wie deed wat'], ['plekken', '📅', 'Actie planning', 'Vers op de koeltafels, KW op de koppen'], ['data', '📤', 'Gegevens uploaden', 'Bestanden, automatisch uploaden, controleren'], ['winkel', '🏪', 'Winkel en app', 'Koppelcode, openingstijden, onderdelen, updates'], ['hulp', '❓', 'Hulp', 'Uitleg, woordenlijst, rondleiding, oefenen']];
function naarBeheer(sec) { ui.bsub = sec; ga('beheer'); }
function meerItems() {
  const kU = mag('upload'), kI = mag('instellingen'), kT = mag('team');
  const L = [
    ['mij', 'mApp', '⚙️', 'App-instellingen', 'Licht of donker, tekstgrootte, korte lijst', 'weergave thema donker licht donkere modus lettergrootte tekst groot scherm', true, () => ga('appinst')],
    ['mij', 'mMeld', '🔔', 'Meldingen', 'Pushmeldingen aan of uit zetten', 'notificatie notificaties push bel herinnering melding', true, () => ga('meldingen')],
    ['mij', 'mPin', '🔑', kanFace() ? 'Pincode en Face ID' : 'Pincode wijzigen', 'Je eigen pincode', 'pincode wachtwoord code inloggen face id', !!mw, pinWijzigen],
    ['mij', 'mWis', '👤', 'Wisselen of vergrendelen', `Nu: ${esc(mijnNaam())}`, 'wisselen andere medewerker uitloggen vergrendelen naam', !!mw, () => { if (OEFEN) return toast('Stop eerst met oefenen'); inlogScherm(); }],
    ['bestellen', 'mLev', '🚚', 'Bestellijst per leverancier', 'Om over te typen in de terminal of door te bellen', 'leverancier terminal versunie van tol lijst bellen pdf printen', mag('bestellen') || mag('afvinken'), () => ga('leverancier')],
    ['bestellen', 'mLc', '📦', 'Leverdag-check', 'Afvinken bij het uitpakken, ontbrekende artikelen doorgeven', 'levering controle uitpakken ontbreekt niet geleverd', true, () => ga('levering')],
    ['bestellen', 'mWo', '📊', 'Weekoverzicht', 'Vorige week in het kort', 'week overzicht samenvatting vorige week', true, () => { const ov = sheet(weekOverzichtHtml(true) + '<button class="btn sec" data-x style="width:100%">Sluiten</button>'); weekOverzichtEvents(ov); }],
    ['bestellen', 'mHg', '🎯', 'Hoe goed was het advies', 'Advies, besteld, verkocht en derving per week', 'derving weggooien resultaat hoe goed advies controle', mag('bestellen'), () => ga('hoegoed')],
    ['bestellen', 'mExp', '📤', 'Exporteren', 'Bestellijst, verkoop of acties naar Excel', 'excel export exporteren delen bestand', kU || mag('bestellen'), () => ga('export')],
    ['bestellen', 'bDagen', '🗓️', 'Besteldagen en deadlines', 'Wanneer je bestelt en tot hoe laat', 'deadline sluitingstijd besteltijd uiterlijk besteldag schema tijd', kI, () => naarBeheer('dagen')],
    ['bestellen', 'bAdv', '⚠️', 'Advies, waarschuwingen en telvragen', 'Waarschuwing bij veel bestellen, telvragen, buffer', 'waarschuwing hoog advies telvragen tellen buffer instellingen houdbaarheid weer', kI, () => naarBeheer('advies')],
    ['team', 'mMw', '👥', 'Medewerkers en rechten', 'Namen, pincode resetten, rechten, beginnersmodus', 'medewerker personeel collega team rechten pincode reset resetten beginner', kT, () => ga('medewerkers')],
    ['team', 'mCk', '✅', 'Checklist nieuwe medewerker', 'Stap voor stap klaarzetten', 'nieuw nieuwe medewerker checklist aanmaken toevoegen', kT, () => nieuwChecklist()],
    ['team', 'mVan', '🕘', 'Wie deed wat', 'Per persoon wat er is gedaan, met tijden', 'vandaag gedaan activiteit log wie wat overzicht', kT, () => ga('vandaag')],
    ['team', 'mTk', '☑️', 'Taken en berichten', 'Taken geven en afvinken', 'taak taken bericht berichten opdracht', kT, () => ga('taken')],
    ['plekken', 'pTaf', '🥬', 'Vers', 'Vers-acties op de koeltafels', 'tafel koeltafel actietafel vers indelen plek', tegelZichtbaar('plekken'), () => { ui.plekSoort = 'tafel'; ga('tafels'); }],
    ['plekken', 'pKop', '🥫', 'KW', 'KW-acties op de koppen', 'kop koppen stelling meter kw folder actie plek', mag('o_kw') && tegelZichtbaar('plekken'), () => { ui.plekSoort = 'kop'; ga('kwacties'); }],
    ['plekken', 'pBeh', '📐', 'Koppen instellen', 'Naam, verkoopfactor, tekening en keuzelijst (Euro-Coopjes)', 'plekken instellen euro coopjes keuzelijst tekening factor', magKwPlan() && mag('o_kw'), () => { ui.plekSoort = 'kop'; ga('kwacties'); kwPlekkenBeheer(); }],
    ['data', 'bUp', '📤', 'Bestanden uploaden', 'Dag-exports, bestelboeken en acties', 'upload uploaden bestand export kassa caspos excel pdf bestelboek dag-export', kU, () => naarBeheer('upload')],
    ['data', 'bAuto', '📡', 'Automatisch uploaden', 'Dag-export elke dag vanzelf vanaf een computer', 'automatisch computer script sleutel elke dag', kU, () => naarBeheer('auto')],
    ['data', 'bCtl', '🔍', 'Controleren', 'Niet gekoppelde artikelen en besteleenheden', 'controleren niet gekoppeld koppelen eenheid', kU || kI, () => naarBeheer('controle')],
    ['data', 'bWeg', '🗑️', 'Uploads verwijderen', 'Als je een verkeerd bestand hebt geüpload', 'verwijderen fout verkeerd bestand', kU, () => naarBeheer('verwijderen')],
    ['winkel', 'mSync', '☁️', 'Gegevens opnieuw laden', '', 'verversen opnieuw laden sync synchroniseren', true, () => { if (DEMO || OEFEN) toast(OEFEN ? 'Niet tijdens oefenen' : 'Testversie: geen server'); else sync(true); }],
    ['winkel', 'mWi', '🏪', 'Winkel en koppelcode', 'Toestellen koppelen, winkelgegevens', 'koppelcode toestel telefoon koppelen winkel plaats', kT, () => ga('winkel')],
    ['winkel', 'bOpen', '🕘', 'Openingstijden en feestdagen', 'Ook aangepaste tijden en gesloten dagen', 'openingstijden feestdag gesloten open tijden kerst pasen', kI, () => naarBeheer('open')],
    ['winkel', 'bOd', '🗂️', 'Onderdelen en volgorde', 'Welke groep bij welk onderdeel', 'onderdelen groep volgorde afdeling', kI, () => naarBeheer('onderdelen')],
    ['winkel', 'mWw', '🔀', 'Winkel wisselen', esc(WINKEL ? WINKEL.naam : ''), 'winkel wisselen andere winkel', winkels.length > 1, () => { if (OEFEN) return toast('Stop eerst met oefenen'); kiesWinkel(); }],
    ['winkel', 'mBk', '💾', 'Back-up maken', 'Instellingen, tafels, indelingen en planning als bestand', 'backup back-up opslaan bewaren reservekopie', isBeheer() || mag('instellingen'), backupMaken],
    ['winkel', 'mBt', '♻️', 'Back-up terugzetten', 'Een eerder gemaakte back-up terugzetten', 'backup terugzetten herstellen restore', isBeheer(), backupTerug],
    ['winkel', 'mUpd', '🔄', 'Controleren op updates', `Je hebt versie ${VERSIE}`, 'update versie nieuw bijwerken', true, () => zoekUpdate(false)],
    ['winkel', 'mUit', '🚪', DEMO ? 'Terug naar startscherm' : sess && sess.kind === 'anon' ? 'Toestel ontkoppelen' : 'Uitloggen', '', 'uitloggen afmelden ontkoppelen', !(isMail() && !eigenaar && !DEMO), () => { if (DEMO) showLogin(); else logout(); }],
    ['hulp', 'mUitl', '📖', 'Uitleg en woordenlijst', 'Hoe alles werkt en wat de woorden betekenen', 'uitleg hulp help woordenlijst woorden betekenis handleiding', true, () => ga('uitleg')],
    ['hulp', 'mTour', '🧭', 'Rondleiding', 'De uitleg van het begin nog eens zien', 'rondleiding tour start uitleg', true, () => tour()],
    ['hulp', 'mOef', '🎓', OEFEN ? 'Stoppen met oefenen' : 'Oefenen', 'Alles uitproberen zonder dat er iets echt verandert', 'oefenen oefenronde proberen test leren', true, () => OEFEN ? stopOefenen() : startOefenen()]
  ];
  return L.filter(x => x[6]).map(x => ({ g: x[0], id: x[1], ic: x[2], t: x[3], s: x[4], syn: x[5], go: x[7] }));
}
function renderMeer() {
  const v = $('#view'); const items = meerItems(); const q = ui.meerQ || '';
  const knop = x => `<button class="rijknop" data-mi="${x.id}"><span class="meeric">${x.ic}</span><span style="flex:1"><b>${x.t}</b>${x.s ? `<br><span class="small">${x.s}</span>` : ''}</span><span class="pijl">›</span></button>`;
  let h = `<div class="bar"><input type="search" id="meerQ" placeholder="🔍 Zoek een functie, bijv. pincode" value="${esc(q)}" autocomplete="off"></div><div id="meerRes">`;
  const res = () => {
    if (q.trim().length >= 2) {
      const sc = items.map(x => [Math.max((zoekScore(q, x.t) || -5) + 5, zoekScore(q, x.s), zoekScore(q, x.syn), zoekScore(q, (MEER_GROEPEN.find(g => g[0] === x.g) || [])[2])), x]).filter(z => z[0] > 0).sort((a, b) => b[0] - a[0]);
      return sc.length ? `<div class="blk lijstblok">${sc.slice(0, 12).map(([, x]) => knop(Object.assign({}, x, { s: `${(MEER_GROEPEN.find(g => g[0] === x.g) || [])[2] || ''}${x.s ? ' · ' + x.s : ''}` }))).join('')}</div>` : '<div class="empty">Niets gevonden. Probeer een ander woord.</div>';
    }
    if (ui.meerG) return `<div class="blk lijstblok">${items.filter(x => x.g === ui.meerG).map(knop).join('')}</div>`;
    const gs = MEER_GROEPEN.filter(g => items.some(x => x.g === g[0]));
    return `<div class="blk lijstblok">${gs.map(g => { const n = items.filter(x => x.g === g[0]); return `<button class="rijknop" data-mg="${g[0]}"><span class="meeric">${g[1]}</span><span style="flex:1"><b>${g[2]}</b><br><span class="small">${n.length === 1 ? n[0].s || g[3] : n.map(x => x.t).slice(0, 4).join(', ')}</span></span><span class="pijl">›</span></button>`; }).join('')}</div><p class="small" style="text-align:center">Coop Besteladvies · versie ${VERSIE}</p>`;
  };
  v.innerHTML = h + res() + '</div>';
  const bind = () => {
    v.querySelectorAll('[data-mi]').forEach(b => b.onclick = () => { const x = items.find(y => y.id === b.dataset.mi); ui.meerQ = ''; if (x) x.go(); });
    v.querySelectorAll('[data-mg]').forEach(b => b.onclick = () => { const n = items.filter(x => x.g === b.dataset.mg); if (n.length === 1) return n[0].go(); ui.meerG = b.dataset.mg; render(); });
  };
  bind();
  const qi = $('#meerQ'); qi.oninput = () => { ui.meerQ = qi.value; clearTimeout(qi._t); qi._t = setTimeout(() => { renderMeer(); const n = $('#meerQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 150); };
}
/* checklist nieuwe medewerker */
function nieuwChecklist(naam) {
  const m = naam ? mwLijst().find(x => x.naam === naam) : null;
  sheet(`<h2 style="margin:0">✅ Nieuwe medewerker${m ? ': ' + esc(m.naam) : ''}</h2><div class="checklist">
  <div class="ckrij ${m ? 'ok' : ''}"><b>1. Naam toevoegen</b><span class="small">${m ? 'Gedaan.' : 'Meer → Medewerkers → Medewerker toevoegen.'}</span></div>
  <div class="ckrij"><b>2. Rol en rechten kiezen</b><span class="small">Vakkenvuller, Afdelingsleider of Beheerder. Daarna per vinkje aanpassen.</span>${m ? `<button class="btn sm sec" data-ckr="${m.id}">Rechten openen</button>` : ''}</div>
  <div class="ckrij"><b>3. Beginnersmodus aan (aangeraden)</b><span class="small">De eerste weken alleen bestellen en tellen. Staat bij de rechten onder Weergave.</span></div>
  <div class="ckrij"><b>4. Toestel koppelen</b><span class="small">Stuur de koppelcode via Meer → Winkel en app → Winkel en koppelcode → Delen.</span>${mag('team') ? '<button class="btn sm sec" data-ckw="1">Koppelcode delen</button>' : ''}</div>
  <div class="ckrij"><b>5. Eerste keer inloggen</b><span class="small">De medewerker kiest zijn naam en zelf een pincode. Daarna krijgt hij de rondleiding.</span></div>
  <div class="ckrij"><b>6. Oefenen</b><span class="small">Laat hem via Meer → Hulp → Oefenen alles uitproberen. Er verandert dan niets echt.</span></div></div><button class="btn" data-x style="width:100%;margin-top:10px">Klaar</button>`, (e, ov) => {
    const r = e.target.closest('[data-ckr]'); if (r) { ov.remove(); ui.mwId = r.dataset.ckr; ga('mwedit'); }
    if (e.target.closest('[data-ckw]')) { ov.remove(); ga('winkel'); }
  });
}
/* hulp */
const WOORDEN = [['Advies', 'hoeveel de app voorstelt om te bestellen, op basis van de verkoop in eerdere weken, acties, feestdagen en het weer.'], ['Besteldag', 'de dag waarop je bestelt. De levering komt een of meer dagen later.'], ['Deadline', 'de laatste tijd waarop je bij de leverancier kunt bestellen.'], ['Tellen', 'invullen wat er nu op het schap ligt. Mag leeg blijven.'], ['Telvragen', 'een paar artikelen die de app per besteldag extra wil laten tellen.'], ['Besteld afvinken', 'aangeven dat je het in de terminal hebt ingevoerd.'], ['Saneren', 'een artikel uit jullie assortiment halen.'], ['Schap aangepast', 'het schap is omgebouwd na een wijziging in het assortiment.'], ['Derving', 'wat er weggegooid wordt, bijvoorbeeld door de houdbaarheidsdatum.'], ['Schap leeg', 'melden dat een artikel op is. Dan bestelt de app de volgende keer wat meer.'], ['Dag-export', 'het bestand met de verkoop van een dag uit de kassa (CasPos).'], ['Bestelboek', 'de lijst met alle artikelen die je bij een leverancier kunt bestellen.'], ['Koeltafel', 'een actietafel voor verse producten.'], ['Kop', 'een meter stelling op de kop van een gang voor KW-acties.'], ['Keuzelijst', 'een vaste lijst artikelen voor een plek, zoals de Euro-Coopjes.'], ['Overdracht', 'een korte notitie voor de volgende dienst op Home.'], ['Oefenen', 'alles uitproberen zonder dat er iets echt verandert.']];

/* ---------- printen ---------- */
function printOpties(od, arts) {
  const p = Object.assign({ keuze: 'alles', pagina: false }, ls.get('cba-print') || {});
  const ch = (k, l) => `<button class="${p.keuze === k ? 'aan' : ''}" data-pk="${k}">${l}</button>`;
  sheet(`<h2 style="margin:0">Printen</h2><p class="small">Bestellijst ${odNaam(od)} met barcodes zoals in het bestelboek.</p><label class="small"><b>Welke artikelen</b></label><div class="chips2" id="pKeuze">${ch('alles', 'Alles')}${ch('advies', 'Alleen met advies')}${ch('ingevuld', 'Alleen ingevuld')}</div>
  <div class="it" style="display:flex;align-items:center;justify-content:space-between;margin:14px 0"><span>Elke groep op een nieuwe pagina</span><input type="checkbox" class="schak" id="pPag" ${p.pagina ? 'checked' : ''}></div>
  <div class="row"><button class="btn sec" data-x style="flex:1">Annuleren</button><button class="btn" data-pr style="flex:1">👁️ Pdf bekijken</button></div>`, (e, ov) => {
    const k = e.target.closest('[data-pk]'); if (k) { p.keuze = k.dataset.pk; ov.querySelectorAll('[data-pk]').forEach(x => x.classList.toggle('aan', x === k)); return; }
    if (e.target.dataset.pr !== undefined) { p.pagina = $('#pPag').checked; ls.set('cba-print', p); ov.remove(); printLijst(od, arts, p); }
  });
}
function printLijst(od, arts, opt) {
  opt = opt || { keuze: 'alles', pagina: false };
  const { cur } = besteldag(od);
  const mon = C.monday(C.today()); const wkn = [3, 2, 1].map(w => C.isoWeek(C.add(mon, -7 * w)).w);
  const kolommen = 3 + 28 + 3;
  const titel = `Bestellijst ${odNaam(od)} · ${esc((WINKEL && WINKEL.naam) || 'Coop')}${cur ? ` · bestellen ${C.DAGNAAM[C.wd(cur.besteldag)]} ${C.fmtDag(cur.besteldag).split(' ')[1]} · levering ${C.DAGNAAM[C.wd(cur.L)]} ${C.fmtDag(cur.L).split(' ')[1]} t/m ${C.DAGEN[C.wd(C.add(cur.L2, -1))]}` : ''} · verkoop week ${wkn.join(', ')} + Gd · rood = actie · geprint ${C.fmtDag(C.today())}`;
  let h = `<table class="vast"><colgroup><col style="width:54mm"><col style="width:9mm"><col style="width:8mm">${'<col>'.repeat(28)}<col style="width:10mm"><col style="width:10mm"><col style="width:14mm"></colgroup><thead><tr class="pkop"><th colspan="${kolommen}">${titel}</th></tr><tr><th rowspan="2">Artikel</th><th rowspan="2">Eh</th><th rowspan="2">Gwt</th>${C.DAGEN.map(d => `<th colspan="4">${d}</th>`).join('')}<th rowspan="2">Advies</th><th rowspan="2">Ingev.</th><th rowspan="2">Besteld</th></tr><tr>${C.DAGEN.map(() => wkn.map(w => `<th>${w}</th>`).join('') + '<th>Gd</th>').join('')}</tr></thead>`;
  let lastG = null, n = 0, eerste = true;
  for (const a of arts) {
    if (a.uit || assStatus(a) !== 'in') continue;
    const ad = cur ? C.advies(M, a.key, cur, vrVan(a.key), bestellingenVan(a.key)) : { adv: 0 };
    const be = cur ? S.bestel[a.key + '|' + cur.besteldag] : null; const ing = be && be.aantal !== null && be.aantal !== undefined ? be.aantal : null;
    if (opt.keuze === 'advies' && !ad.adv) continue;
    if (opt.keuze === 'ingevuld' && !(ing > 0)) continue;
    const g = groepVan(a);
    if (g !== lastG) { h += `${eerste ? '' : '</tbody>'}<tbody class="${opt.pagina && !eerste ? 'nieuwepagina' : ''}"><tr class="grpr"><td colspan="${kolommen}">${esc(g)}</td></tr>`; lastG = g; eerste = false; }
    const wt = C.weekTabel(M, a.key); const lbl = C.actieLabel(M, a.key);
    const nt = S.notities['a:' + a.key]; const nr = a.eigen ? a.artNr : a.nr;
    h += `<tr><td class="n"><b>${esc(nr || '')}</b> ${esc(a.naam)}${a.eigen ? ' <i>(eigen)</i>' : ''}${nt ? ` <i>📝 ${esc(nt.tekst)}</i>` : ''}${lbl ? ` <i>(actie ${lbl[0].t} wk, ${lbl[0].folder ? 'folder' : 'instore'})</i>` : ''}${/^\d{4,}$/.test(nr || '') ? C.msi(nr, 40, true) : ''}</td><td>${a.eh}${a.perHE ? ' ' + C.fmt(a.he) : ''}</td><td class="g">${C.fmt(wt.gwt)}</td>`;
    for (let d = 0; d < 7; d++) { for (let w = 0; w < 3; w++) { const c = wt.rows[w].cells[d]; h += `<td class="${c.actie ? 'a' : ''}">${c.v === null || c.v === 0 ? '' : C.fmt(c.v)}</td>`; } h += `<td class="g">${C.fmt(wt.gd[d]) === '0' ? '' : C.fmt(wt.gd[d])}</td>`; }
    h += `<td class="g pad">${ad.adv || ''}</td><td>${ing === null ? '' : C.fmt(ing)}</td><td class="bst"></td></tr>`; n++;
  }
  h += (eerste ? '' : '</tbody>') + '</table>';
  if (!n) return toast('Geen artikelen voor deze keuze');
  $('#printArea').innerHTML = h;
  window.__laatstePrint = { n, msi: (h.match(/class="msi"/g) || []).length, titel };
  toonPdf(`Bestellijst ${odNaam(od)}${cur ? ' ' + cur.besteldag : ''}`, () => printOpties(od, arts));
}
