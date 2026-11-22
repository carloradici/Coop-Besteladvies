/* ---------- 1.83: retourbonnen Van Tol (karren- en krattensaldo) ---------- */
/* velden in de volgorde van de bon: [sleutel, tekst, statiegeld €] */
const RB_V = [['k', 'Containers totaal', 100], ['bk', 'Bierkrat + 16/24 fles', 3.9], ['b12', 'Bierkrat + 12 fles', 1.95], ['fk', 'Friskrat + 24/28 fles', 5], ['bl', 'Leeg krat bier 24 fles', 1.5], ['fl', 'Bierfles los', 0.1], ['bb', 'Bigbag', 0], ['pl', 'Plank Van Tol', 12.5], ['ep', 'Euro pallet', 7.5], ['rad', 'RAD', 30]];
/* kolommen C t/m L van de Excel */
const RB_X = [['k', 'karren retour'], ['bb', 'bigbags retour'], ['bk', 'bierkratten'], ['bl', 'bierkrat leeg'], ['fk', 'friskratten'], ['rad', 'RAD'], ['pl', 'plank'], ['ep', 'euro pallet'], ['b12', 'bierkrat 12 flessen'], ['fl', 'bierfles los']];
LIB.ocr = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let RB = null, rbRij = [], rbOcr = null;
const rbEuro = x => '€ ' + (Math.round(x * 100) / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+,)/g, '.');
const rbSom = s => String(s ?? '').split(/[\s,;.+]+/).reduce((t, x) => t + (+x || 0), 0);
const rbWaarde = b => RB_V.reduce((t, [k, , p]) => t + (+b[k] || 0) * p, 0);
async function rbLaad() {
  if (RB) return; RB = ls.get('cba-retour') || { bonnen: [] };
  if (!DEMO && navigator.onLine) try { const r = await rest(wq('voorkeuren?wie=eq.retour')); if (r[0] && r[0].data && r[0].data.bonnen) { RB = r[0].data; ls.set('cba-retour', RB); } } catch (e) { }
}
function rbBewaar() { ls.set('cba-retour', RB); write('voorkeuren', [{ wie: 'retour', data: RB }], true); }

async function renderRetour() {
  const v = $('#view'); if (!RB) { v.innerHTML = '<div class="empty">Laden…</div>'; await rbLaad(); if (ui.tab !== 'retour') return; }
  if (ui.rbEdit) return rbForm(v);
  const B = RB.bonnen, tot = Object.fromEntries(RB_V.map(([k]) => [k, B.reduce((t, b) => t + (+b[k] || 0), 0)])), open = B.filter(b => !b.ok).length;
  v.innerHTML = `<div class="blk"><h2>Totaal retour · ${B.length} bonnen</h2><div class="rbtot">${RB_V.filter(([k]) => tot[k]).map(([k, t, p]) => `<div><b>${C.fmt(tot[k])}</b><small>${t}${p ? ' · ' + rbEuro(tot[k] * p) : ''}</small></div>`).join('') || '<p class="small">Nog geen bonnen.</p>'}</div>
    <p class="rbsom">Waarde retour <b>${rbEuro(B.reduce((t, b) => t + rbWaarde(b), 0))}</b></p>${open ? `<p class="small rood">${open} ${open === 1 ? 'bon' : 'bonnen'} nog niet gecontroleerd met de factuur</p>` : ''}</div>
    ${rbRij.length ? `<button class="btn" id="rbVerder" style="width:100%;margin-bottom:10px">✏️ Verder invullen · nog ${rbRij.length} ${rbRij.length === 1 ? 'scan' : 'scans'}</button>` : ''}
    <label class="btn" style="display:block;text-align:center">📄 Scans uploaden<input type="file" id="rbUp" multiple accept=".pdf,image/*" class="hide"></label>
    <div class="rbknop"><button class="btn sec" id="rbNieuw">+ Zonder scan</button><label class="btn sec">Excel importeren<input type="file" id="rbImp" accept=".xlsx,.xls" class="hide"></label><button class="btn sec" id="rbExp">Excel maken</button></div>
    <div class="blk">${B.length ? B.map((b, i) => [b, i]).reverse().map(([b, i]) => `<div class="rbrij"><button class="rbok ${b.ok ? 'on' : ''}" data-rok="${i}" aria-label="Klopt met factuur">✓</button><button class="rbtx" data-rb="${i}"><b>${esc(b.nr || 'Zonder nummer')}</b><small>${[b.datum ? C.fmtDag(b.datum) : '', b.k ? b.k + ' karren' : '', b.bk ? b.bk + ' bierkratten' : '', b.fk ? b.fk + ' friskratten' : '', b.rb ? 'retourbon ' + esc(b.rb) : '', rbEuro(rbWaarde(b))].filter(Boolean).join(' · ')}</small>${b.opm ? `<small class="rood">${esc(b.opm)}</small>` : ''}</button></div>`).join('') : '<p class="small">Upload je scans of importeer je Excel.</p>'}</div>`;
  $('#rbUp').onchange = e => rbUpload([...e.target.files]);
  $('#rbImp').onchange = e => rbImport(e.target.files[0]);
  $('#rbExp').onclick = rbExport;
  $('#rbNieuw').onclick = () => { ui.rbEdit = { b: {}, i: -1 }; renderRetour(); };
  if ($('#rbVerder')) $('#rbVerder').onclick = () => { ui.rbEdit = Object.assign({ i: -1 }, rbRij[0], { rij: 1 }); renderRetour(); };
  v.querySelectorAll('[data-rok]').forEach(x => x.onclick = () => { const b = B[+x.dataset.rok]; b.ok = !b.ok; rbBewaar(); renderRetour(); });
  v.querySelectorAll('[data-rb]').forEach(x => x.onclick = async () => { const i = +x.dataset.rb, b = B[i]; ui.rbEdit = { b: Object.assign({}, b), i, img: b.scan ? await iget('rbscan:' + b.nr) : null }; renderRetour(); });
}

function rbForm(v) {
  const e = ui.rbEdit, b = e.b, veld = (k, t, x = '') => `<div class="f"><label>${t}</label><input data-rf="${k}" type="text" inputmode="decimal" value="${esc(b['_' + k] ?? (b[k] || ''))}" ${x}><span class="rbis" data-ris="${k}"></span></div>`;
  v.innerHTML = `${e.img ? `<div class="rbscan"><img src="${e.img}" alt="Scan van de bon"></div><p class="small" style="text-align:center">Tik op de scan om in of uit te zoomen</p>` : ''}
    <div class="blk form">${e.rij ? `<p class="small">Scan ${rbRij.length ? 'nog ' + rbRij.length + ' te gaan' : ''}</p>` : ''}
    <div class="f"><label>Bonnummer</label><input id="rbNr" type="text" value="${esc(b.nr || '')}" placeholder="BGR 202606941"></div>
    <div class="f"><label>Datum</label><input id="rbDat" type="date" value="${esc(b.datum || '')}"></div>
    <div class="f"><label>Retourbon (producten)</label><input id="rbRb" type="text" inputmode="numeric" value="${esc(b.rb || '')}" placeholder="alleen als er producten mee gaan"></div>
    <p class="small">Meer kolommen op de bon? Typ ze achter elkaar met een komma: <b>18,11,17</b> wordt 46.</p>
    ${RB_V.map(([k, t]) => veld(k, t)).join('')}
    <div class="f"><label>Opmerking</label><input id="rbOpm" type="text" value="${esc(b.opm || '')}" placeholder="bv. mist op factuur"></div>
    <label class="f"><input type="checkbox" id="rbOk" ${b.ok ? 'checked' : ''}> Klopt met de factuur</label></div>
    <button class="btn" id="rbSla" style="width:100%">${e.rij && rbRij.length > 1 ? 'Opslaan → volgende bon' : 'Opslaan'}</button>
    <div class="rbknop">${e.rij ? '<button class="btn sec" id="rbSkip">Scan overslaan</button>' : ''}<button class="btn sec" id="rbTerug">Annuleren</button>${e.i >= 0 ? '<button class="btn sec rood" id="rbDel">Verwijderen</button>' : ''}</div>`;
  const toon = i => { const k = i.dataset.rf, s = $(`[data-ris="${k}"]`); s.textContent = /[\s,;.+]/.test(i.value.trim()) ? '= ' + rbSom(i.value) : ''; };
  v.querySelectorAll('[data-rf]').forEach(i => { toon(i); i.oninput = () => toon(i); });
  if ($('.rbscan')) $('.rbscan').onclick = () => $('.rbscan').classList.toggle('groot');
  const klaar = () => { if (e.rij) rbRij.shift(); ui.rbEdit = e.rij && rbRij.length ? Object.assign({ i: -1 }, rbRij[0], { rij: 1 }) : null; renderRetour(); window.scrollTo(0, 0); };
  $('#rbTerug').onclick = () => { ui.rbEdit = null; renderRetour(); };
  if ($('#rbSkip')) $('#rbSkip').onclick = klaar;
  if ($('#rbDel')) $('#rbDel').onclick = async () => { if (!await bevestig('Bon verwijderen?', `${esc(b.nr || 'Deze bon')} verdwijnt uit de lijst.`, 'Verwijderen')) return; RB.bonnen.splice(e.i, 1); if (b.nr) idel('rbscan:' + b.nr); rbBewaar(); ui.rbEdit = null; renderRetour(); };
  $('#rbSla').onclick = async () => {
    const n = Object.assign({}, e.i >= 0 ? RB.bonnen[e.i] : {}, { nr: $('#rbNr').value.trim().replace(/^bgr\s*/i, 'BGR ').toUpperCase(), datum: $('#rbDat').value, rb: $('#rbRb').value.trim(), opm: $('#rbOpm').value.trim(), ok: $('#rbOk').checked });
    v.querySelectorAll('[data-rf]').forEach(i => { const k = i.dataset.rf, s = rbSom(i.value); if (s) n[k] = s; else delete n[k]; });
    if (!n.nr) return toast('Vul het bonnummer in');
    if (RB.bonnen.some((x, j) => j !== e.i && x.nr === n.nr) && !await bevestig('Bon staat er al', `${esc(n.nr)} staat al in de lijst. Toch nog een keer opslaan?`, 'Toch opslaan')) return;
    if (e.img) { await iset('rbscan:' + n.nr, e.img); n.scan = true; }
    if (e.i >= 0) RB.bonnen[e.i] = n; else RB.bonnen.push(n); rbBewaar(); toast('✓ ' + n.nr + ' opgeslagen'); klaar();
  };
}

/* scans (pdf van de iPhone-scanner of foto's) → per bladzijde een plaatje + gedrukte tekst lezen */
async function rbUpload(files) {
  if (!files.length) return; const pag = [];
  try {
    for (const f of files) {
      if (/pdf/i.test(f.type) || /\.pdf$/i.test(f.name)) { const p = await pdfjs(), d = await p.getDocument({ data: await f.arrayBuffer() }).promise;
        for (let i = 1; i <= d.numPages; i++) { const pg = await d.getPage(i), vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 2400 / vp0.width }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; pag.push(c); } }
      else { const bm = await createImageBitmap(f), s = Math.min(1, 2400 / bm.width), c = document.createElement('canvas'); c.width = bm.width * s; c.height = bm.height * s; c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height); pag.push(c); }
    }
  } catch (e) { return toast('Kon de scan niet openen: ' + e.message, 6000); }
  try { if (!rbOcr) { await loadScript(LIB.ocr); rbOcr = await window.Tesseract.createWorker('eng'); } } catch (e) { rbOcr = null; toast('Tekst lezen lukt nu niet (offline?): vul het bonnummer zelf in', 6000); }
  let n = 0;
  for (const c of pag) {
    toast(`Scan ${++n} van ${pag.length} lezen…`, 8000); const kl = document.createElement('canvas'), fz = Math.min(1, 1400 / c.width); kl.width = c.width * fz; kl.height = c.height * fz; kl.getContext('2d').drawImage(c, 0, 0, kl.width, kl.height); const r = { img: kl.toDataURL('image/jpeg', 0.6), b: {} };
    if (rbOcr) try { const strook = (x0, y0, x1, y1) => { const k = document.createElement('canvas'), sw = (x1 - x0) * c.width, sh = (y1 - y0) * c.height, f = Math.max(1, 1440 / sw); k.width = sw * f; k.height = sh * f; const g = k.getContext('2d'); g.drawImage(c, x0 * c.width, y0 * c.height, sw, sh, 0, 0, k.width, k.height);
        const im = g.getImageData(0, 0, k.width, k.height), d = im.data, hs = new Array(256).fill(0); for (let p = 0; p < d.length; p += 4) { d[p] = d[p + 1] = d[p + 2] = (d[p] * 3 + d[p + 1] * 6 + d[p + 2]) / 10 | 0; hs[d[p]]++; }
        let lo = 0, hi = 255, n = 0, z = d.length / 4 * 0.02; while ((n += hs[lo]) < z) lo++; n = 0; while ((n += hs[hi]) < z) hi--; const sc = 255 / Math.max(1, hi - lo); for (let p = 0; p < d.length; p += 4) d[p] = d[p + 1] = d[p + 2] = Math.max(0, Math.min(255, (d[p] - lo) * sc)); g.putImageData(im, 0, 0); return k; };
      const t = (await rbOcr.recognize(strook(0.4, 0, 1, 0.2))).data.text, o = (await rbOcr.recognize(strook(0.2, 0.68, 0.7, 0.92))).data.text;
      const m = t.match(/BGR\s*(\d{6,10})/i) || t.match(/\b(20\d{6,7})\b/), d = t.match(/(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(20\d\d)/);
      if (m) r.b.nr = 'BGR ' + m[1]; if (d) r.b.datum = `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}`; if (/KLANT|LABEL|Bag-?ID|Klant-?ID/i.test(o)) { r.b.bb = 1; r.b._bb = '1'; } } catch (e) { }
    rbRij.push(r);
  }
  toast(`${pag.length} ${pag.length === 1 ? 'scan' : 'scans'} klaar om in te vullen`, 3000);
  ui.rbEdit = Object.assign({ i: -1 }, rbRij[0], { rij: 1 }); renderRetour();
}

async function rbImport(f) {
  if (!f) return; try { await loadScript(LIB.xlsx); } catch (e) { return toast(e.message); }
  const wb = XLSX.read(await f.arrayBuffer()), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
  let n = 0, dub = 0;
  for (const r of rows.slice(1)) {
    const nr = String(r[1] ?? '').trim(); if (!/^BGR/i.test(nr)) continue;
    if (RB.bonnen.some(x => x.nr === nr)) { dub++; continue; }
    const b = { nr, ok: r[0] === true || /^(true|waar|ja|x|1)$/i.test(String(r[0] ?? '')) }; RB_X.forEach(([k], j) => { const x = +r[2 + j]; if (x) b[k] = x; });
    const opm = r.slice(12).filter(x => x !== null && x !== '' && typeof x !== 'number').join(' · '); if (opm) b.opm = opm;
    RB.bonnen.push(b); n++;
  }
  rbBewaar(); toast(`${n} bonnen geïmporteerd${dub ? ` · ${dub} stonden er al in` : ''}`, 5000); renderRetour();
}

async function rbExport() {
  try { await loadScript(LIB.xlsx); } catch (e) { return toast(e.message); }
  const B = RB.bonnen, L = 'CDEFGHIJKL', n = B.length + 1, prijs = Object.fromEntries(RB_V.map(([k, , p]) => [k, p]));
  const aoa = [['gecontroleerd', 'retourbon nummer', ...RB_X.map(x => x[1]), 'opmerking', 'datum', 'retourbon producten']].concat(B.map(b => [!!b.ok, b.nr, ...RB_X.map(([k]) => b[k] || null), b.opm || null, b.datum || null, b.rb || null]));
  const ws = XLSX.utils.aoa_to_sheet(aoa), cel = (a, v) => ws[a] = v;
  cel('B' + (n + 2), { t: 's', v: 'totaal' }); cel('B' + (n + 3), { t: 's', v: 'waarde €' }); cel('B' + (n + 5), { t: 's', v: 'totale waarde €' });
  RB_X.forEach(([k], j) => { const c = L[j]; cel(c + (n + 2), { t: 'n', f: `SUM(${c}2:${c}${n})` }); if (prijs[k]) cel(c + (n + 3), { t: 'n', f: `${c}${n + 2}*${prijs[k]}` }); });
  cel('C' + (n + 5), { t: 'n', f: RB_X.map(([k], j) => prijs[k] ? L[j] + (n + 3) : '').filter(Boolean).join('+') });
  ws['!ref'] = 'A1:O' + (n + 5); ws['!cols'] = [{ wch: 13 }, { wch: 17 }, ...RB_X.map(() => ({ wch: 11 })), { wch: 30 }, { wch: 11 }, { wch: 14 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'bonnen');
  const file = new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], 'retourbonnen van tol.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) try { return await navigator.share({ files: [file], title: 'Retourbonnen Van Tol' }); } catch (e) { return; }
  const u = URL.createObjectURL(file), l = document.createElement('a'); l.href = u; l.download = file.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
  window.__rbExport = aoa.length - 1;
}
