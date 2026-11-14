/* ---------- 1.16: plekken tekenen ---------- */
function kwPlekVanTafel(tid) { return kwPlekken().find(p => p.tafel === tid); }
function kwTekenItem(wk, it, plekNaam, tid, cel) {
  const ind = JSON.parse(JSON.stringify(indelingVan(wk, tid))); ind.items = ind.items || [];
  ind.items.forEach(x => { x.cellen = (x.cellen || []).filter(c => c !== cel); });
  let i = ind.items.findIndex(x => x.kw === it.id);
  if (i < 0) { ind.items.push({ naam: it.naam, artikelen: kwKeys(it).map(k => ({ key: k, naam: M.art[k].naam, nr: M.art[k].nr })), cellen: [], aantal: '', opm: [it.mech, it.variant].filter(Boolean).join(' · '), kleur: ind.items.length % TKLEUR.length, klaar: false, kw: it.id }); i = ind.items.length - 1; }
  ind.items[i].cellen.push(cel); ind.items = ind.items.filter((x, j) => j === i || x.kw || (x.cellen || []).length);
  slaIndelingOp(wk, tid, ind);
  const p = S.kwplan[wk]; const oud = (p.plek || {})[it.id] || '';
  if (oud !== plekNaam) { const ot = kwPlekken().find(x => x.naam === oud); if (ot && ot.tafel && ot.tafel !== tid) { const oi = JSON.parse(JSON.stringify(indelingVan(wk, ot.tafel))); oi.items = (oi.items || []).filter(x => x.kw !== it.id); slaIndelingOp(wk, ot.tafel, oi); } p.plek = Object.assign({}, p.plek || {}, { [it.id]: plekNaam }); kwPlanOpslaan(wk); }
  return ind.items.findIndex(x => x.kw === it.id);
}
function kwVakKies(wk, tid, cel) {
  const p = kwPas(S.kwplan[wk]); const f = p.folder; const pl = kwPlekVanTafel(tid); const ind = indelingVan(wk, tid);
  const getekend = new Set((ind.items || []).filter(x => x.kw && (x.cellen || []).length).map(x => x.kw));
  const hier = f.items.filter(i => (p.plek || {})[i.id] === pl.naam), rest = f.items.filter(i => i.soort === 'kw' && (p.plek || {})[i.id] !== pl.naam);
  const rij = i => `<button class="it rijtik" data-vk="${i.id}"><span style="flex:1;text-align:left"><b>${esc(i.naam)}</b>${getekend.has(i.id) ? ' <span class="small">· al getekend</span>' : ''}<br><span class="small">${esc([i.variant, i.mech].filter(Boolean).join(' · '))}${(p.plek || {})[i.id] && (p.plek || {})[i.id] !== pl.naam ? ' · nu: ' + esc(p.plek[i.id]) : ''}</span></span></button>`;
  const ov = sheet(`<h2 style="margin:0">Wat komt hier?</h2><p class="small">${esc(pl.naam)} · ${plekTekst(S.tafels[tid], [cel])}</p>
  ${(pl.lijst || []).length ? `<h3>Keuzelijst</h3><input type="search" id="vlQ" placeholder="🔍 Zoek in de keuzelijst" style="width:100%"><div class="list" id="vlL">${pl.lijst.map((a, i) => `<button class="it rijtik" data-vl="${i}"><span style="flex:1;text-align:left"><b>${esc(a.naam)}</b><br><span class="small">${esc(a.nr || '')}</span></span></button>`).join('')}</div>` : ''}
  ${hier.length ? `<h3>Op deze plek</h3><div class="list">${hier.map(rij).join('')}</div>` : ''}<h3>${hier.length ? 'Andere KW-acties' : 'KW-acties van week ' + f.week}</h3><input type="search" id="vkQ" placeholder="🔍 Zoek" style="width:100%"><div class="list" id="vkL">${rest.map(rij).join('')}</div>
  <button class="btn sec" id="vkT" style="width:100%;margin-top:10px">✏️ Vrije tekst</button><button class="btn sec" data-x style="width:100%;margin-top:8px">Annuleren</button>`, (e, o) => {
    const vl = e.target.closest('[data-vl]'); if (vl) { o.remove(); const a = pl.lijst[+vl.dataset.vl]; const key = a.nr && M.art['kw:' + a.nr] ? 'kw:' + a.nr : null; const ind2 = JSON.parse(JSON.stringify(indelingVan(wk, tid))); ind2.items = ind2.items || []; ind2.items.forEach(x => { x.cellen = (x.cellen || []).filter(c => c !== cel); }); let j = ind2.items.findIndex(x => x.lijst && x.naam === a.naam); if (j < 0) { ind2.items.push({ naam: a.naam, artikelen: key ? [{ key, naam: M.art[key].naam, nr: M.art[key].nr }] : a.nr ? [{ naam: a.naam, nr: a.nr }] : [], cellen: [], aantal: '', opm: '', kleur: ind2.items.length % TKLEUR.length, klaar: false, lijst: true }); j = ind2.items.length - 1; } ind2.items[j].cellen.push(cel); slaIndelingOp(wk, tid, ind2); ui.kwSel = { tafel: tid, idx: j }; return render(true); }
    const b = e.target.closest('[data-vk]'); if (!b) return; o.remove(); const it = f.items.find(i => i.id === b.dataset.vk);
    const idx = kwTekenItem(wk, it, pl.naam, tid, cel); ui.kwSel = { tafel: tid, idx }; log('acties', `${pl.naam}: ${it.naam} getekend`); render(true);
  });
  const vq = ov.querySelector('#vlQ'); if (vq) vq.oninput = e => { const q = e.target.value.toLowerCase(); ov.querySelectorAll('#vlL [data-vl]').forEach(x => x.style.display = !q || x.textContent.toLowerCase().includes(q) ? '' : 'none'); };
  ov.querySelector('#vkQ').oninput = e => { const q = e.target.value.toLowerCase(); ov.querySelectorAll('#vkL [data-vk]').forEach(x => x.style.display = !q || x.textContent.toLowerCase().includes(q) ? '' : 'none'); };
  ov.querySelector('#vkT').onclick = () => {
    ov.querySelector('.sheetIn').innerHTML = `<h2 style="margin:0">Vrije tekst</h2><input type="text" id="vkN" placeholder="Bijv. Kerstpakketten" style="width:100%;margin:10px 0"><div class="row"><button class="btn sec" data-x style="flex:1">Annuleren</button><button class="btn" id="vkS" style="flex:1">Opslaan</button></div>`;
    ov.querySelector('#vkS').onclick = () => { const n = ov.querySelector('#vkN').value.trim(); if (!n) return; const ind2 = JSON.parse(JSON.stringify(indelingVan(wk, tid))); ind2.items = ind2.items || []; ind2.items.forEach(x => { x.cellen = (x.cellen || []).filter(c => c !== cel); }); ind2.items.push({ naam: n, artikelen: [], cellen: [cel], aantal: '', opm: '', kleur: ind2.items.length % TKLEUR.length, klaar: false }); slaIndelingOp(wk, tid, ind2); ov.remove(); ui.kwSel = { tafel: tid, idx: ind2.items.length - 1 }; render(true); };
  };
}
function kwBlokMenu(wk, tid, idx) {
  const ind = JSON.parse(JSON.stringify(indelingVan(wk, tid))); const it = ind.items[idx]; if (!it) return; const t = S.tafels[tid];
  const ov = sheet(`<h2 style="margin:0">${esc(it.naam)}</h2><p class="small">${plekTekst(t, it.cellen)}${it.opm ? ' · ' + esc(it.opm) : ''}</p>
  <button class="belrij" data-bm="vak"><span class="ic">✏️</span><span><b>Vakjes aanpassen</b><small>Tik vakjes aan of uit</small></span></button>
  <button class="belrij" data-bm="klaar"><span class="ic">${it.klaar ? '↩️' : '✅'}</span><span><b>${it.klaar ? 'Staat er nog niet' : 'Staat erin'}</b><small>${it.klaar && it.door ? 'Afgevinkt door ' + esc(it.door) : 'Afvinken als het is opgebouwd'}</small></span></button>
  <button class="belrij" data-bm="opm"><span class="ic">💬</span><span><b>Opmerking</b><small>${it.nota ? esc(it.nota) : 'Bijv. vullen vanuit restanten, 1 hoog, breed presenteren'}</small></span></button>
  <button class="belrij" data-bm="weg"><span class="ic">🗑️</span><span><b>Weghalen van deze plek</b><small>De actie gaat terug naar "Nog geen plek"</small></span></button>
  <button class="btn sec" data-x style="width:100%;margin-top:10px">Sluiten</button>`, (e, o) => {
    const b = e.target.closest('[data-bm]'); if (!b) return; o.remove(); const k = b.dataset.bm; const p = S.kwplan[wk];
    if (k === 'opm') return notitieKeuze(it.naam, it.nota || '', ['Vullen vanuit restanten', '1 hoog', 'Breed presenteren'], t => { it.nota = t; slaIndelingOp(wk, tid, ind); render(true); }, '💬 Opmerking');
    if (k === 'vak') { ui.kwSel = { tafel: tid, idx }; }
    if (k === 'klaar') { it.klaar = !it.klaar; it.door = it.klaar ? mijnNaam() : null; it.om = it.klaar ? new Date().toISOString() : null; slaIndelingOp(wk, tid, ind); if (it.kw) { p.klaar = Object.assign({}, p.klaar || {}); if (it.klaar) p.klaar[it.kw] = mijnNaam(); else delete p.klaar[it.kw]; kwPlanOpslaan(wk); } }
    if (k === 'weg') { ind.items.splice(idx, 1); slaIndelingOp(wk, tid, ind); if (it.kw && p.plek) { p.plek = Object.assign({}, p.plek); delete p.plek[it.kw]; kwPlanOpslaan(wk); } }
    render(true);
  });
}
function kwSelTekening(t, ind, idx) {
  const R = Math.max(1, +t.rijen || 2), K = Math.max(1, +t.kol || 3); const eig = new Array(R * K).fill(-1); (ind.items || []).forEach((it, i) => (it.cellen || []).forEach(c => { if (c < R * K) eig[c] = i; })); const vast = new Set(t.vast || []);
  return `<div class="tafel kies" style="grid-template-columns:repeat(${K},1fr);grid-template-rows:repeat(${R},48px)">${eig.map((o, c) => vast.has(c) && o < 0 ? `<div class="vak vast"><span>🔒</span></div>` : `<button type="button" class="vak ${o === idx ? 'selaan' : o >= 0 ? 'bezetander' : 'leeg'}" data-sc="${c}" style="${o >= 0 ? 'background:' + TKLEUR[(ind.items[o].kleur ?? o) % TKLEUR.length] : ''}">${o === idx ? '✓' : ''}</button>`).join('')}</div>`;
}
function kwTekeningen(wk, kan, enkel) {
  const p = S.kwplan[wk]; const pls = kwPlekken().filter(x => x.tafel && S.tafels[x.tafel] && !S.tafels[x.tafel].weg && (!enkel || x.naam === enkel)); if (!pls.length) return kan && mag('instellingen') ? '<div class="blk"><p class="small">Tip: geef een kop een tekening (⚙️ Plekken instellen onderaan). Dan kun je per vakje invullen wat erin komt.</p></div>' : '';
  return pls.map(x => {
    const t = S.tafels[x.tafel]; const ind = indelingVan(wk, x.tafel); const sel = ui.kwSel && ui.kwSel.tafel === x.tafel ? ui.kwSel : null;
    const open = (p.folder.items || []).filter(i => (p.plek || {})[i.id] === x.naam && !(ind.items || []).some(y => y.kw === i.id && (y.cellen || []).length));
    const leeg = !(ind.items || []).some(y => (y.cellen || []).length); const vorige = kan && leeg && kwVorigeIndeling(wk, x.tafel, true);
    return `<div class="blk kwteken" data-kt="${x.tafel}"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">${esc(x.naam)}</h2>${vorige ? `<button class="btn sm sec" data-kvo="${x.tafel}">Indeling van vorige keer</button>` : ''}</div>
    ${sel ? `<div class="kwselbalk"><span>Tik de vakjes voor <b>${esc((ind.items[sel.idx] || {}).naam || '')}</b></span><button class="btn sm" data-kwklaar="1">Klaar</button></div>${kwSelTekening(t, ind, sel.idx)}` : tafelTekening(t, ind)}
    ${!sel && kan ? `<p class="small">${leeg ? 'Tik op een vakje en kies wat erin komt.' : 'Tik op een leeg vakje om iets toe te voegen, of op een blok om het aan te passen.'}</p>` : ''}
    ${open.length && !enkel ? `<p class="small">Nog tekenen: ${open.map(i => esc(i.naam)).join(', ')}</p>` : ''}</div>`;
  }).join('');
}
function kwVorigeIndeling(wk, tid, alleenCheck) {
  const p = kwPas(S.kwplan[wk]); const f = p.folder; const R = +S.tafels[tid].rijen || 2, K = +S.tafels[tid].kol || 3; const vast = new Set(S.tafels[tid].vast || []);
  const vorig = Object.keys(S.indeling || {}).filter(k => k.endsWith('|' + tid) && k.split('|')[0] < wk).map(k => k.split('|')[0]).sort().reverse();
  const nieuw = []; const bezet = new Set();
  for (const it of f.items.filter(i => i.soort === 'kw')) {
    const nrs = new Set(it.nrs || []);
    for (const w of vorig) {
      const pp = S.kwplan[w]; const oi = indelingVan(w, tid); const x = (oi.items || []).find(y => { if (!(y.cellen || []).length) return false; if (y.kw && pp && pp.folder) { const fi = pp.folder.items.find(z => z.id === y.kw); if (fi && (fi.nrs || []).some(n => nrs.has(n))) return true; } return y.naam && y.naam.toLowerCase() === it.naam.toLowerCase(); });
      if (x) { const cel = x.cellen.filter(c => c < R * K && !vast.has(c) && !bezet.has(c)); if (cel.length) { cel.forEach(c => bezet.add(c)); nieuw.push([it, cel]); } break; }
    }
  }
  if (alleenCheck) return nieuw.length > 0;
  const pl = kwPlekVanTafel(tid); const ind = { items: nieuw.map(([it, cel], i) => ({ naam: it.naam, artikelen: kwKeys(it).map(k => ({ key: k, naam: M.art[k].naam, nr: M.art[k].nr })), cellen: cel, aantal: '', opm: [it.mech, it.variant].filter(Boolean).join(' · '), kleur: i % TKLEUR.length, klaar: false, kw: it.id })) };
  slaIndelingOp(wk, tid, ind); p.plek = Object.assign({}, p.plek || {}); nieuw.forEach(([it]) => p.plek[it.id] = pl.naam); kwPlanOpslaan(wk); return nieuw.length;
}
function kwTekenEvents(v, wk, kan) {
  v.querySelectorAll('[data-kt]').forEach(bl => bl.onclick = e => {
    if (!kan) return; const tid = bl.dataset.kt;
    if (e.target.closest('[data-kwklaar]')) { ui.kwSel = null; return render(true); }
    const vo = e.target.closest('[data-kvo]'); if (vo) { const n = kwVorigeIndeling(wk, tid); toast(`✓ ${n} acties op dezelfde plek gezet`); return render(true); }
    const sc = e.target.closest('[data-sc]'); if (sc && ui.kwSel && ui.kwSel.tafel === tid) {
      const c = +sc.dataset.sc; const ind = JSON.parse(JSON.stringify(indelingVan(wk, tid))); const it = ind.items[ui.kwSel.idx]; if (!it) return;
      const aan = !(it.cellen || []).includes(c);
      if (!aan) it.cellen = it.cellen.filter(x => x !== c); else { ind.items.forEach(x => { x.cellen = (x.cellen || []).filter(y => y !== c); }); it.cellen.push(c); }
      slaIndelingOp(wk, tid, ind, true);
      sc.className = 'vak ' + (aan ? 'selaan' : 'leeg'); sc.style.background = aan ? TKLEUR[(it.kleur ?? ui.kwSel.idx) % TKLEUR.length] : ''; sc.textContent = aan ? '✓' : '';
      if (navigator.vibrate) navigator.vibrate(15); return;
    }
    const lc = e.target.closest('[data-vc]'); if (lc) return kwVakKies(wk, tid, +lc.dataset.vc);
    const ti = e.target.closest('[data-ti]'); if (ti) return kwBlokMenu(wk, tid, +ti.dataset.ti);
  });
}
function kwPlankTekst(wk, x) {
  const t = S.tafels[x.tafel]; if (!t) return ''; const ind = indelingVan(wk, x.tafel); const R = +t.rijen || 2, K = +t.kol || 3; const regels = [];
  for (let r = 0; r < R; r++) { const l = (ind.items || []).filter(it => (it.cellen || []).some(c => Math.floor(c / K) === r)).map(it => { const ks = it.cellen.filter(c => Math.floor(c / K) === r).map(c => c % K); return `${it.naam} (${ks.length === K ? 'hele plank' : 'vak ' + [...new Set(ks)].sort((a, b) => a - b).map(k => k + 1).join(',')})`; }); if (l.length) regels.push(`Plank ${r + 1}: ${l.join(', ')}`); }
  return regels.join('\n');
}
/* ---------- 1.17 ---------- */
function plekVan(naam) { return kwPlekken().find(p => p.naam === naam) || null; }
function plekF(naam) { const p = plekVan(naam); return p ? C.num(p.factor) : 1; }
function kwLijstKeuze(ov, x, klaar) {
  const teken = () => {
    const l = x.lijst || [];
    ov.querySelector('.sheetIn').innerHTML = `<h2 style="margin:0">Keuzelijst · ${esc(x.naam)}</h2><p class="small">Deze artikelen zie je als eerste als je in de tekening van deze plek een vakje aantikt. Bijvoorbeeld de euro-koopjes.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn sm">📄 Pdf inlezen<input type="file" id="klP" accept=".pdf" class="hide"></label><button class="btn sm sec" id="klZ">🔍 Uit bestelboek</button><button class="btn sm sec" id="klT">✏️ Tekst plakken</button>${l.length ? '<button class="btn sm sec" id="klW">Leegmaken</button>' : ''}</div>
    <div class="msg" id="klM"></div><div class="list" style="margin-top:8px">${l.map((a, i) => `<div class="it"><span style="flex:1">${esc(a.naam)}<br><span class="small">${esc(a.nr || '')}${a.nr && M.art['kw:' + a.nr] ? ' · in bestelboek' : a.nr ? ' · niet in KW-boek' : ''}</span></span><button class="btn sm sec" data-klx="${i}">✕</button></div>`).join('') || '<div class="small">Nog leeg.</div>'}</div>
    <button class="btn" id="klK" style="width:100%;margin-top:10px">Klaar (${l.length})</button>`;
    const q = s => ov.querySelector(s);
    q('#klP').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const l2 = C.parseLijst(await C.pdfPages(await pdfjs(), await f.arrayBuffer())); if (!l2.length) throw new Error('Geen artikelen gevonden'); x.lijst = l2; teken(); q('#klM').textContent = `✓ ${l2.length} artikelen ingelezen`; } catch (er) { q('#klM').textContent = 'Niet gelukt: ' + er.message; } };
    q('#klZ').onclick = () => { ov.querySelector('.sheetIn').innerHTML = `<h2 style="margin:0">Uit bestelboek</h2><input type="search" id="klQ" placeholder="🔍 Naam of nummer" style="width:100%"><div class="list" id="klR" style="margin-top:8px"></div><button class="btn" id="klB" style="width:100%;margin-top:10px">Terug</button>`; const r = () => { const t = q('#klQ').value.toLowerCase().trim(); q('#klR').innerHTML = t.length < 2 ? '' : Object.values(M.art).filter(a => !a.uit && (a.naam.toLowerCase().includes(t) || a.nr.includes(t))).slice(0, 25).map(a => `<button class="it rijtik" data-kla="${esc(a.key)}"><span style="flex:1">${esc(a.naam)}<br><span class="small">${esc(a.nr)}</span></span>${(x.lijst || []).some(y => y.nr === a.nr) ? '✓' : '+'}</button>`).join(''); }; q('#klQ').oninput = r; q('#klR').onclick = e => { const b = e.target.closest('[data-kla]'); if (!b) return; const a = M.art[b.dataset.kla]; if (!(x.lijst || []).some(y => y.nr === a.nr)) x.lijst = (x.lijst || []).concat([{ naam: a.naam, nr: a.nr }]); r(); }; q('#klB').onclick = teken; };
    q('#klT').onclick = () => { ov.querySelector('.sheetIn').innerHTML = `<h2 style="margin:0">Tekst plakken</h2><p class="small">Eén artikel per regel. Staat er een artikelnummer in, dan neemt de app dat over.</p><textarea id="klTa" rows="8" style="width:100%"></textarea><button class="btn" id="klTo" style="width:100%;margin-top:10px">Toevoegen</button>`; q('#klTo').onclick = () => { const r = q('#klTa').value.split(/\n/).map(s => s.trim()).filter(Boolean).map(s => { const m = s.match(/\b(\d{4,6})\b/); return { naam: s.replace(/\b\d{8,14}\b/g, '').replace(m ? m[0] : '', '').replace(/[;\t,]+/g, ' ').replace(/\s+/g, ' ').trim() || s, nr: m ? m[1].padStart(6, '0') : '' }; }); x.lijst = (x.lijst || []).concat(r); teken(); }; };
    const w = q('#klW'); if (w) w.onclick = () => { x.lijst = []; teken(); };
    ov.querySelectorAll('[data-klx]').forEach(b => b.onclick = () => { x.lijst.splice(+b.dataset.klx, 1); teken(); });
    q('#klK').onclick = klaar;
  };
  teken();
}
function kwPrintKies(wk) {
  const pls = kwPlekken().filter(x => x.tafel && S.tafels[x.tafel] && !S.tafels[x.tafel].weg); if (!pls.length) return toast('Geef eerst een kop een tekening (Plekken instellen)');
  const gekozen = new Set(ls.get('cba-kwprint') || pls.map(x => x.naam));
  const ov = sheet(`<h2 style="margin:0">Pdf maken</h2><p class="small">Elke kop op een eigen staande A4. Als laatste, als je dat aanzet, een pagina met wat in het vak moet.</p><div class="list">${pls.map(x => `<label class="it"><span style="flex:1">${esc(x.naam)}</span><input type="checkbox" class="schak" data-pp="${esc(x.naam)}" ${gekozen.has(x.naam) ? 'checked' : ''}></label>`).join('')}<label class="it"><span style="flex:1">In het vak</span><input type="checkbox" class="schak" id="ppV" ${ls.get('cba-kwprintvak') !== false ? 'checked' : ''}></label><label class="it"><span style="flex:1">Met barcodes</span><input type="checkbox" class="schak" id="ppB" ${ls.get('cba-kwprintbc') ? 'checked' : ''}></label></div><button class="btn" id="ppO" style="width:100%;margin-top:10px">👁️ Pdf bekijken</button><button class="btn sec" data-x style="width:100%;margin-top:8px">Annuleren</button>`);
  ov.querySelector('#ppO').onclick = () => { const k = [...ov.querySelectorAll('[data-pp]')].filter(c => c.checked).map(c => c.dataset.pp); if (!k.length) return toast('Kies minstens één plek'); const bc = ov.querySelector('#ppB').checked, vk = ov.querySelector('#ppV').checked; ls.set('cba-kwprintvak', vk); ls.set('cba-kwprint', k); ls.set('cba-kwprintbc', bc); ov.remove(); kwPrint(wk, pls.filter(x => k.includes(x.naam)), bc, !vk); };
}
function kwPrint(wk, pls, bc, zonderVak) {
  const f = S.kwplan[wk].folder; const pl = S.kwplan[wk]; const wn = (WINKEL && WINKEL.naam) || '';
  const blok = x => {
    const t = S.tafels[x.tafel]; const ind = indelingVan(wk, x.tafel); const R = +t.rijen || 2, K = +t.kol || 3; const hoog = Math.min(150, R * 26);
    const teken = tafelTekening(t, ind).replace(/grid-template-rows:[^"]*"/, `grid-template-rows:repeat(${R},${(hoog / R).toFixed(1)}mm)"`);
    const rg = l => { const u = [...new Set(l)].sort((x, y) => x - y); return u.length === 1 ? String(u[0] + 1) : u[u.length - 1] - u[0] === u.length - 1 ? `${u[0] + 1}–${u[u.length - 1] + 1}` : u.map(x => x + 1).join(','); };
    const regels = (ind.items || []).filter(it => (it.cellen || []).length).sort((x, y) => Math.min(...x.cellen) - Math.min(...y.cellen)).map(it => `<tr><td class="pl">${rg(it.cellen.map(c => Math.floor(c / K)))}</td><td class="n">☐ <b>${esc(it.naam)}</b> <span style="color:#555">· vak ${rg(it.cellen.map(c => c % K))}</span>${it.nota ? ` <b>· 💬 ${esc(it.nota)}</b>` : ''}${bc ? tafelArts(it).filter(a => /^\d{4,}$/.test(a.nr || '')).slice(0, 2).map(a => C.msi(a.nr, 22, true)).join('') : ''}</td></tr>`);
    return `<div class="pdfpagina kpb"><h1>${esc(x.naam)}</h1><p class="kpsub">Acties KW week ${f.week} · ${esc(wn)}</p>${teken}${regels.length ? `<table><tr><td class="pl">Plank</td><td class="n"><b>Wat</b></td></tr>${regels.join('')}</table>` : ''}</div>`;
  };
  const vak = (f.items || []).filter(it => (pl.notitie || {})[it.id] === 'In het vak');
  const vakBlok = vak.length && !zonderVak ? `<div class="pdfpagina kpb"><h1>In het vak</h1><p class="kpsub">Acties KW week ${f.week} · ${esc(wn)} · ${vak.length} acties</p><table><tr><td class="pl">✓</td><td class="n"><b>Wat</b></td></tr>${vak.map(it => `<tr><td class="pl">☐</td><td class="n"><b>${esc(it.naam)}</b>${it.variant ? ` <span style="color:#555">${esc(it.variant)}</span>` : ''}${(it.nrs || []).length ? ` <span style="color:#555">· ${esc(it.nrs.join(', '))}</span>` : ''}${bc ? (it.nrs || []).filter(n => /^\d{4,}$/.test(n)).slice(0, 2).map(n => C.msi(n, 22, true)).join('') : ''}</td></tr>`).join('')}</table></div>` : '';
  $('#printArea').innerHTML = `<div class="kopprint">${pls.map(blok).join('')}${vakBlok}</div>`;
  window.__laatstePrint = { koppen: pls.map(x => x.naam), bc, inHetVak: vak.length }; log('acties', `Pdf koppen: ${pls.map(x => x.naam).join(', ')}`);
  toonPdf(`Acties KW week ${f.week}${pls.length === 1 ? ' ' + pls[0].naam : ''}`, () => kwPrintKies(wk), { staand: true });
}
async function kwAutoHaal() {
  if (DEMO || OEFEN || !mag('o_kw') || !magKwPlan() || !navigator.onLine) return; const vandaag = C.today();
  for (let n = 1; n <= 6; n++) {
    const d = C.add(C.monday(vandaag), 7 * n - 7); const x = C.isoWeek(d); const k = weekSleutel(d); const oud = S.kwplan[k]; if (oud && oud.folder && oud.folder.bron === 'voorkoop' && oud.folder.items.some(i => i.pag)) continue; if (!oud && n === 1) continue;
    const lk = `cba-kwhaal-${W}-${k}`; if (ls.get(lk) === vandaag) continue; ls.set(lk, vandaag);
    try { const oudF = oud && oud.folder; const r = await kwHaalOp(x.y, x.w, !!oudF); if (r.folderFout && !r.nieuwVk) continue; const wat = r.nieuwVk ? (r.folderFout ? 'Voorkooplijst' : 'Voorkooplijst en folderplanning') : 'Folderplanning'; toast(`📣 ${wat} week ${x.w} automatisch opgehaald`, 4000); log('acties', `${wat} week ${x.w} automatisch opgehaald`); if (ui.tab === 'home' || ui.tab === 'kwacties') render(true); } catch (e) { }
  }
}
