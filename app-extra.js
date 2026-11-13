/* ---------- 1.8: bel, uitleg, eigen artikelen, scannen, tellen, min. schap, hoe goed, per leverancier ---------- */
const LEV_NAAM = { versunie: 'Versunie', vantol: 'Van Tol', anders: 'Anders (telefonisch of terminal)' };
function levVan(a) { return a.eigen ? a.lev : a.bron === 'kw' ? 'vantol' : 'versunie'; }
function eigenInBoek(a) {
  if (!a || !a.eigen) return null;
  if (a.artNr) for (const b of ['vers', 'kw']) { const x = M.art[b + ':' + a.artNr]; if (x && !x.uit) return x; }
  for (const ean of String(a.ean || '').split(/[\s,;]+/).filter(Boolean)) { const k = S.kassa[ean]; if (k && k.b) for (const b of ['vers', 'kw']) { const x = M.art[b + ':' + k.b]; if (x && !x.uit) return x; } }
  return null;
}
async function fotoVerklein(file) {
  const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const m = 360; const sc = Math.min(1, m / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.72);
}
function eigenBewerk(e, od, voor) {
  if (!mag('saneren')) return toast('Je hebt geen recht om artikelen toe te voegen');
  const nieuw = !e; const d = Object.assign({ naam: '', nr: '', ean: '', od: od && BESTEL_OD.includes(od) ? od : 'vers', groep: '', perHE: false, he: '', ehNaam: 'HE', lev: od === 'kw' ? 'vantol' : 'versunie', prijs: '', foto: '', volgen: true }, e || voor || {});
  const groepen = od => [...new Set(lijstArtikelen(od).map(groepVan))];
  const chips = (naam, lijst, waarde) => `<div class="chips2" data-chips="${naam}">${lijst.map(([k, l]) => `<button type="button" class="${k === waarde ? 'aan' : ''}" data-k="${k}">${l}</button>`).join('')}</div>`;
  const ov = sheet(`<h2 style="margin:0">${nieuw ? 'Artikel toevoegen' : 'Artikel aanpassen'}</h2><p class="small">Voor artikelen die niet in het bestelboek staan.</p><div class="form">
  <label>Naam</label><input type="text" id="eN" value="${esc(d.naam)}" placeholder="Bijv. Aardbeien Hollands 400 gr">
  <label>EAN of PLU (om de verkoop te koppelen)</label><input type="text" id="eE" inputmode="numeric" value="${esc(d.ean)}" placeholder="Bijv. 8712345678901 – meerdere met een komma">
  <label>Artikelnummer (als je het hebt)</label><input type="text" id="eA" inputmode="numeric" value="${esc(d.nr)}" placeholder="Bijv. 979699">
  <label>Onderdeel</label>${chips('od', BESTEL_OD.map(o => [o, odNaam(o)]), d.od)}
  <label>Groep</label><input type="text" id="eG" list="eGl" value="${esc(d.groep)}" placeholder="Kies of typ een groep"><datalist id="eGl"></datalist>
  <label>Besteleenheid</label>${chips('he', [['st', 'Per stuk'], ['he', 'Per doos of krat']], d.perHE ? 'he' : 'st')}
  <div id="eHEv" class="${d.perHE ? '' : 'hide'}"><label>Aantal stuks per doos</label><input type="number" id="eH" inputmode="decimal" value="${esc(d.he)}" placeholder="Bijv. 12"></div>
  <label>Leverancier</label>${chips('lev', Object.entries(LEV_NAAM), d.lev)}
  <label>Consumentenprijs (optioneel)</label><input type="number" id="eP" inputmode="decimal" step="0.01" value="${esc(d.prijs)}" placeholder="Bijv. 2.49">
  <label>Foto (optioneel)</label><div style="display:flex;gap:12px;align-items:center"><div class="fotovak" id="eFv">${d.foto ? `<img src="${d.foto}" alt="">` : 'Geen foto'}</div><div style="display:flex;flex-direction:column;gap:8px;flex:1"><label class="btn sm sec" style="text-align:center;margin:0">Foto kiezen<input type="file" accept="image/*" id="eF" class="hide"></label><button type="button" class="btn sm sec" id="eFw">Foto verwijderen</button></div></div>
  <div class="it" style="display:flex;justify-content:space-between;align-items:center;margin-top:12px"><span>Nieuw product (verkoop volgen)</span><input type="checkbox" class="schak" id="eV" ${d.volgen ? 'checked' : ''}></div>
  <div class="msg" id="eM"></div>
  <div class="row"><button class="btn sec" data-x style="flex:1">Annuleren</button><button class="btn" id="eS" style="flex:1">Opslaan</button></div>
  ${nieuw ? '' : '<button class="btn sec" id="eW" style="margin-top:6px;color:#d32f2f;border-color:#d32f2f">Artikel verwijderen</button>'}</div>`);
  const vulGroepen = () => { $('#eGl').innerHTML = groepen(d.od).map(g => `<option value="${esc(g)}">`).join(''); };
  vulGroepen();
  ov.querySelectorAll('[data-chips]').forEach(c => c.onclick = ev => { const b = ev.target.closest('[data-k]'); if (!b) return; c.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('aan', x === b)); const k = b.dataset.k; if (c.dataset.chips === 'od') { d.od = k; vulGroepen(); if (k === 'kw' && d.lev === 'versunie') { d.lev = 'vantol'; } } if (c.dataset.chips === 'he') { d.perHE = k === 'he'; $('#eHEv').classList.toggle('hide', !d.perHE); } if (c.dataset.chips === 'lev') d.lev = k; });
  $('#eF').onchange = async ev => { const f = ev.target.files[0]; if (!f) return; try { d.foto = await fotoVerklein(f); $('#eFv').innerHTML = `<img src="${d.foto}" alt="">`; } catch (x) { toast('Foto lukt niet'); } };
  $('#eFw').onclick = () => { d.foto = ''; $('#eFv').textContent = 'Geen foto'; };
  $('#eS').onclick = () => {
    d.naam = $('#eN').value.trim(); d.ean = $('#eE').value.replace(/[^\d,; ]/g, '').trim(); d.nr = $('#eA').value.replace(/\D/g, ''); d.groep = $('#eG').value.trim() || 'Eigen artikelen'; d.he = d.perHE ? (C.num($('#eH').value) || 1) : 1; d.prijs = C.num($('#eP').value) || 0; d.volgen = $('#eV').checked;
    if (!d.naam) return ($('#eM').textContent = 'Vul een naam in.');
    if (d.perHE && !(d.he > 0)) return ($('#eM').textContent = 'Vul het aantal stuks per HE in.');
    if (d.volgen && !d.sinds) d.sinds = C.today();
    const id = d.id || 'E' + Date.now().toString(36).toUpperCase(); d.id = id;
    const data = Object.assign({}, d); delete data.id;
    write('eigen_artikelen', [{ id, data, door: mijnNaam() }]); log('eigen', `${nieuw ? 'Artikel toegevoegd' : 'Artikel aangepast'}: ${d.naam}`);
    ov.remove(); rebuild(); render(true); toast(nieuw ? 'Artikel toegevoegd' : 'Opgeslagen');
  };
  const wb = $('#eW'); if (wb) wb.onclick = async () => { if (!await bevestig('Artikel verwijderen?', `<b>${esc(d.naam)}</b> verdwijnt uit de lijst.`, 'Verwijderen')) return; const data = Object.assign({}, d, { weg: true }); delete data.id; write('eigen_artikelen', [{ id: d.id, data, door: mijnNaam() }]); log('eigen', `Artikel verwijderd: ${d.naam}`); ov.remove(); rebuild(); render(true); };
}
async function eigenOvernemen(a, bk) {
  if (!bk) return;
  if (!await bevestig('Boekartikel overnemen?', `<b>${esc(bk.naam)}</b> staat nu in het bestelboek. Je eigen artikel <b>${esc(a.naam)}</b> wordt verwijderd en het boekartikel komt in je assortiment.`, 'Overnemen')) return;
  const e = S.eigen[a.nr]; const data = Object.assign({}, e, { weg: true }); delete data.id;
  write('eigen_artikelen', [{ id: a.nr, data, door: mijnNaam() }]);
  if (M.min[a.key]) write('schap_min', [{ bron: bk.bron, nr: bk.nr, min: M.min[a.key] }]);
  zetAssort(bk, 'in'); log('eigen', `Boekartikel overgenomen: ${bk.naam}`); rebuild(); render(true);
}
function minBewerk(a) {
  const u = eenheid(a); const cur = M.min[a.key] || '';
  const ov = sheet(`<h2 style="margin:0">Minimale schapvoorraad</h2><p class="small">${esc(a.naam)}<br>Het advies zorgt dat er na de levering minstens zoveel in het schap ligt. Leeg = geen minimum.</p><div class="form"><label>Minimaal in het schap (${u})</label><input type="number" id="mS" inputmode="decimal" value="${cur}" placeholder="Bijv. 6"><div class="row"><button class="btn sec" data-x style="flex:1">Annuleren</button><button class="btn" id="mO" style="flex:1">Opslaan</button></div></div>`);
  $('#mO').onclick = () => { const n = C.num($('#mS').value) || 0; write('schap_min', [{ bron: a.bron, nr: a.nr, min: n }]); M.min = S.min; log('minschap', `Min. schap ${a.naam}: ${n || 'geen'}`); ov.remove(); render(true); };
}
/* ---------- bel ---------- */
function belItemsBasis() {
  if (!M) return [];
  const out = []; const vandaag = C.today();
  for (const od of BESTEL_OD) {
    if (!mag('o_' + od)) continue; const cur = besteldag(od).cur;
    if (cur && (mag('bestellen') || mag('afvinken')) && cur.besteldag <= vandaag && (S.boeken[bronVan(od)] || lijstArtikelen(od).length)) { const st = voortgang(od, cur, cur.besteldag < vandaag); if (st.open) out.push({ ic: (ONDERDELEN.find(o => o[0] === od) || [])[2] || '🛒', t: `${odNaam(od)}: vandaag bestellen`, sub: `Nog ${st.open} te gaan · levering ${C.fmtDag(cur.L)}`, ga: od, n: st.open, laat: cur.besteldag < vandaag }); }
  }
  const at = assortTelling(); if (at.nieuw || at.uit || at.san) out.push({ ic: '🔄', t: 'Assortiment gewijzigd', sub: `${at.nieuw} nieuw · ${at.uit + at.san} schap opnieuw indelen`, ga: 'assort' });
  if (mag('saneren')) { const n = Object.values(M.art).filter(a => a.eigen && eigenInBoek(a)).length; if (n) out.push({ ic: '📘', t: `${n} eigen ${n === 1 ? 'artikel staat' : 'artikelen staan'} nu in het bestelboek`, sub: 'Neem het boekartikel over', ga: BESTEL_OD.find(od => Object.values(M.art).some(a => a.eigen && a.od === od && eigenInBoek(a))) || 'home' }); }
  if (mag('upload') && M.dagLijst.length) {
    const gister = C.add(vandaag, -1); const o = (M.st.open || [])[C.wd(gister)] || ['', '']; const dicht = (S.agenda || []).some(a => a.dag === gister && a.soort === 'gesloten') || (!o[0] && !o[1]);
    if (!dicht && !S.dagMeta[gister]) out.push({ ic: '📊', t: 'Dag-export ontbreekt', sub: `De verkoop van ${C.fmtDag(gister)} is nog niet geüpload`, ga: 'beheer' });
  }
  if (mag('o_overig')) { let n = 0; for (const ean in S.inout) { const io = S.inout[ean]; if (!(io.ingekocht > 0)) continue; const r = C.overig(M, 'e:' + ean, io); if (r.melding && r.melding.t === 'op') n++; } if (n) out.push({ ic: '📦', t: `${n} in/out-${n === 1 ? 'artikel' : 'artikelen'} bijna op`, sub: 'Telefonisch bijbestellen?', ga: 'overig' }); }
  const ovd = Object.values(S.overdracht || {}).filter(r => !r.klaar && !r.soort).length; if (ovd) out.unshift({ ic: '📋', t: `${ovd} ${ovd === 1 ? 'punt' : 'punten'} in de overdracht`, sub: 'Staat op Home', ga: 'home' });
  if (mag('upload') && onbekendLijst().length) out.push({ ic: '🔍', t: `${onbekendLijst().length} verkochte artikelen die de app niet kent`, sub: 'Tik om ze te koppelen of te negeren', ga: 'beheer', bsub: 'controle' });
  const pr = prijsLijst().length; if (pr) out.push({ ic: '🏷️', t: `${pr} schapkaartje${pr === 1 ? '' : 's'} vervangen`, sub: 'Prijs gewijzigd in het bestelboek', ga: 'assort' });
  const lv = leverRegels(C.today()); const lvOpen = lv.filter(x => !x.chk).length; if (lvOpen) out.push({ ic: '📦', t: 'Levering van vandaag controleren', sub: `Nog ${lvOpen} van ${lv.length} af te vinken`, ga: 'levering' });
  const tt = tafelTelling(); if (tt.ombouw && tt.open) out.push({ ic: '🗂️', t: 'Actietafels ombouwen', sub: `${tt.klaar} van ${tt.totaal} klaar`, ga: 'tafels' });
  out.push(...boBel());
  return out;
}
function belTel() { const el = $('#belN'); if (!el) return; let n = 0; try { n = belItems().filter(belInfo).length; } catch (e) { } el.textContent = n > 9 ? '9+' : n; el.classList.toggle('hide', !n); }
/* ---------- uitleg ---------- */
function renderUitleg() {
  const km = kantoorMag(), bs = mag('bestellen') || mag('afvinken'), basis = ['home', 'tellen', 'taken', 'meer', 'scannen', 'eigen'], ww = ['Tellen', 'Schap leeg', 'Derving', 'Oefenen', 'Overdracht', 'Advies'];
  const keys = Object.keys(HULP).filter(k => !HULP_ZIJ.has(k) && k !== 'uitleg' && (km || basis.includes(k) || (bs && ['lijst', 'leverancier', 'levering', 'printen'].includes(k))));
  $('#view').innerHTML = `<div class="blk lijstblok">${keys.map(k => { const h = HULP[k]; return `<details class="uitleg"><summary><b>${h[0]}</b><span class="pijl">▾</span></summary><div class="hulptekst">${typeof h[1] === 'function' ? h[1]() : h[1]}</div></details>`; }).join('')}</div><details class="blk uitleg"><summary><b>📖 Woordenlijst</b><span class="pijl">▾</span></summary><div class="woorden">${WOORDEN.filter(w => km || ww.includes(w[0])).map(w => `<p><b>${w[0]}</b> – ${w[1]}</p>`).join('')}</div></details>`;
}
/* ---------- barcode scannen ---------- */
function vindCode(code) {
  code = String(code || '').trim(); if (!code) return null;
  const k = S.kassa[code]; if (k && k.b) for (const b of ['vers', 'kw']) { const a = M.art[b + ':' + k.b]; if (a) return a; }
  for (const a of Object.values(M.art)) if (a.eigen && String(a.ean || '').split(/[\s,;]+/).includes(code)) return a;
  const nr = code.replace(/^0+(?=\d{6})/, ''); const kand = [code, nr, code.length === 8 ? code.slice(0, 6) : null, /^\d{3,5}$/.test(code) ? code.padStart(6, '0') : null].filter(Boolean);
  for (const c of kand) { for (const b of ['vers', 'kw']) { const a = M.art[b + ':' + c]; if (a) return a; } for (const a of Object.values(M.art)) if (a.eigen && a.artNr === c) return a; }
  return null;
}
function naarArtikel(a) {
  const od = onderdeelVan(a); if (!mag('o_' + od)) return toast('Dit artikel hoort bij ' + odNaam(od) + ', dat mag je niet zien');
  if (!mag('bestellen') && !mag('afvinken') && mag('tellen')) return telModus(od, [a]);
  ga(od); ui.q = a.eigen ? a.naam : a.nr; ui.modus = 'alles'; if (assStatus(a) !== 'in' || a.uit) ui.fAlles = true; ui.fAdv = false; ui.fOpen = false; ui.fActie = false; render();
}
let scanStop = null;
async function scanStart(od, opVondst) {
  const ov = document.createElement('div'); ov.className = 'scanner';
  ov.innerHTML = `<video playsinline muted></video><div class="scankader"></div><div class="scanbalk"><div id="scM">Richt de camera op de barcode</div><div class="row" style="width:100%;max-width:400px"><input type="text" id="scI" inputmode="numeric" placeholder="Of typ het nummer" style="flex:1"><button class="btn sm" id="scZ">Zoek</button></div><button class="btn sec" id="scX" style="background:#fff">Sluiten</button></div>`;
  document.body.appendChild(ov);
  let lezer = null; const stop = () => { try { lezer && lezer.reset(); } catch (e) { } ov.remove(); scanStop = null; scanHook = null; };
  scanStop = stop;
  const gevonden = code => { const a = vindCode(code); if (!a) { $('#scM', ov).textContent = `Niet gevonden: ${code}`; return false; } stop(); if (navigator.vibrate) navigator.vibrate(60); if (opVondst) opVondst(a); else naarArtikel(a); return true; };
  scanHook = c => gevonden(c);
  $('#scX', ov).onclick = stop; $('#scZ', ov).onclick = () => gevonden($('#scI', ov).value.trim()); $('#scI', ov).onkeydown = e => { if (e.key === 'Enter') gevonden(e.target.value.trim()); };
  try {
    await loadScript(LIB.zxing); const Z = window.ZXing;
    const hints = new Map(); hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.ITF]);
    lezer = new Z.BrowserMultiFormatReader(hints);
    let laatst = '';
    await lezer.decodeFromConstraints({ video: { facingMode: 'environment' } }, $('video', ov), res => { if (!res) return; const t = res.getText(); if (t === laatst) return; laatst = t; gevonden(t); });
  } catch (e) { const m = $('#scM', ov); if (m) m.textContent = /Permission|NotAllowed/i.test(e && (e.name + e.message)) ? 'Geen toegang tot de camera. Typ het nummer hieronder.' : 'Camera lukt niet. Typ het nummer hieronder.'; }
}
/* ---------- tel-modus ---------- */
function telDagen() { return +((S.inst || {}).telDagen || 28); }
function telModus(od, arts, vrij, ronde) {
  if (!arts.length && !vrij) return toast('Geen artikelen om te tellen');
  arts = arts.slice(); let i = 0, val = '', dz = 0, geteld = 0, zoek = arts.length ? null : ''; const besteller = mag('bestellen') || mag('afvinken');
  const lk = 'cba-tel-' + od + '-' + arts.length, oud = ls.get(lk), td = ronde ? telDagen() : 1, recent = a => { const v = S.voorraad[a.key]; return !!(v && v.dag && C.diff(v.dag, C.today()) < td); }, vrij0 = arts.findIndex(a => !recent(a));
  const heVan = a => a && a.perHE && a.he > 1 && eenheid(a) !== 'kg' ? a.he : 0, tot = () => C.r(dz * heVan(arts[i]) + C.num(val || '0'), 3), leeg0 = () => { val = ''; dz = 0; };
  const verder = () => { i++; leeg0(); if (ronde) while (i < arts.length && recent(arts[i])) i++; teken(); };
  i = Math.max(vrij0 < 0 ? 0 : vrij0, !ronde && oud && oud.dag === C.today() && oud.i < arts.length ? oud.i : 0); if (ronde && vrij0 < 0) i = arts.length; else if (i > 0) toast(`Verder bij ${i + 1} van ${arts.length}`, 2500);
  const ov = document.createElement('div'); ov.className = 'telmodus'; document.body.appendChild(ov);
  const curVan = a => besteldag(onderdeelVan(a)).cur;
  const opslaan = () => { const a = arts[i]; write('voorraad', [{ bron: a.bron, nr: a.nr, aantal: tot(), dag: C.today(), door: mijnNaam() }]); geteld++; };
  const naar = a => { const j = arts.findIndex(x => x.key === a.key); if (j >= 0) i = j; else { i = Math.min(i, arts.length); arts.splice(i, 0, a); } leeg0(); zoek = null; teken(); };
  const teken = () => {
    if (zoek !== null) {
      ov.innerHTML = `<div class="telkop"><button id="tX">Sluiten</button><span>${geteld ? geteld + ' geteld' : 'Tellen'}</span><button id="tS">📷</button></div>
      <div class="telnaam" style="margin-top:18px">${scannerGezien ? 'Scan een artikel' : 'Welk artikel?'}</div><div class="telsub">Scan een schapkaartje, product of het bestelboek, of typ het artikelnummer.</div>
      <div class="telwaarde">${zoek === '' ? '<span class="ph">Artikelnummer</span>' : esc(zoek)}</div><div class="teladv" id="tZm"></div>
      <div class="telblok">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-t="${n}">${n}</button>`).join('')}<button data-t="" disabled></button><button data-t="0">0</button><button data-t="w">⌫</button></div>
      <div class="telacties" style="grid-template-columns:1fr 2fr">${arts.length ? '<button id="tT">‹ Terug</button>' : '<span></span>'}<button class="hoofd" id="tZ">Zoek</button></div>`;
      ov.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const t = b.dataset.t; if (!t) return; zoek = t === 'w' ? zoek.slice(0, -1) : zoek.length < 14 ? zoek + t : zoek; teken(); });
      $('#tX', ov).onclick = sluit; const tt = $('#tT', ov); if (tt) tt.onclick = () => { zoek = null; teken(); };
      $('#tZ', ov).onclick = () => { const a = vindCode(zoek); if (!a) { piep(); $('#tZm', ov).textContent = `Niet gevonden: ${zoek}`; return; } naar(a); };
      $('#tS', ov).onclick = () => scanStart(od, naar);
      return;
    }
    if (i >= arts.length) { const ov2 = arts.length - geteld; ov.innerHTML = `<div class="telkop"><span></span><span></span></div><div style="margin:auto;text-align:center"><div style="font-size:64px">${ov2 > 0 && arts.length ? '👍' : '✓'}</div><div class="telnaam">${ov2 > 0 && arts.length ? 'Einde van de lijst' : 'Klaar'}</div><div class="telsub">${geteld} van ${arts.length || geteld} geteld${ov2 > 0 && arts.length ? ` · ${ov2} overgeslagen of al eerder geteld` : ''}${scannerGezien ? '<br>Scan nog een artikel om verder te tellen.' : ''}</div></div><button class="btn" id="tK">Klaar</button>`; $('#tK', ov).onclick = sluit; return; }
    const a = arts[i]; const vr = S.voorraad[a.key]; const u = eenheid(a); const cur = curVan(a);
    const he = heVan(a), leeg = val === '' && !dz, T = tot(), ad = besteller && cur && !leeg ? C.advies(M, a.key, cur, { aantal: T, dag: C.today() }, bestellingenVan(a.key)) : null, eh = u === 'kg' ? 'kilo' : T === 1 ? 'stuk' : 'stuks';
    ov.innerHTML = `<div class="telkop"><button id="tX">Sluiten</button><span>${i + 1} van ${arts.length}${ronde ? `<small class="telnog">nog ${arts.filter(x => !recent(x)).length} te tellen</small>` : ''}</span><span><button id="tN" aria-label="Artikelnummer typen">🔢</button> <button id="tS">📷</button></span></div><div class="telbalk"><div style="width:${Math.round(i / arts.length * 100)}%"></div></div>
    ${a.merk ? `<div class="telmerk">${esc(a.merk)}</div>` : ''}<div class="telnaam">${esc(a.naam)}</div><div class="telsub">${esc(a.eigen ? a.artNr || '' : a.nr)} · ${esc(groepVan(a))}${vr && vr.dag ? ` · laatst ${C.fmtDag(vr.dag)}: ${C.fmt(vr.aantal)}` : ''}</div>
    <div class="telwaarde">${leeg ? '<span class="ph">Hoeveel ' + (u === 'kg' ? 'kilo' : 'stuks') + '?</span>' : `${dz ? C.fmt(T, 3) : esc(val)} <small>${eh}</small>`}</div><div class="teladv">${dz ? `${dz} ${ehMv(a, dz)}${val !== '' ? ` + ${esc(val)} los` : ''}${ad ? ' · ' : ''}` : ''}${ad ? 'Advies ' + C.fmtDag(cur.besteldag) + ': ' + (ad.adv ? ad.adv + ' ' + ehTxt(a, ad.adv) : 'niets') : ''}</div>
    ${he ? `<div style="text-align:center"><button class="btn sm sec" id="tDoos">+ 1 ${ehMv(a, 1)} (${C.fmt(he)})</button></div>` : ''}
    ${val === '0' && !dz ? `<div style="text-align:center"><button class="btn sm sec" id="tLeeg">${S.leeg[a.key + '|' + C.today()] ? '✓ Leeg gemeld' : '🚫 Schap was leeg'}</button></div>` : ''}
    ${scannerGezien ? '<div class="telhint">📟 Volgende artikel scannen = opslaan · zelfde artikel scannen = +1</div>' : ''}
    <div class="telblok">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-t="${n}">${n}</button>`).join('')}<button data-t=",">,</button><button data-t="0">0</button><button data-t="w">⌫</button></div>
    <div class="telacties"><button id="tV" ${i ? '' : 'disabled'}>‹ Vorige</button><button id="tO">Overslaan</button><button class="hoofd" id="tB">Opslaan ›</button></div>`;
    ov.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const t = b.dataset.t; if (t === 'w') { if (val === '' && dz) dz--; else val = val.slice(0, -1); } else if (t === ',') { if (!val.includes(',')) val = (val || '0') + ','; } else if (val.length < 6) val = val === '0' ? t : val + t; teken(); });
    $('#tX', ov).onclick = () => { if (!leeg) { opslaan(); toast('✓ Opgeslagen: ' + a.naam, 1500); } sluit(); }; $('#tV', ov).onclick = () => { if (i) { i--; leeg0(); const v0 = S.voorraad[arts[i].key]; if (v0 && v0.dag === C.today()) val = String(v0.aantal).replace('.', ','); teken(); } }; $('#tO', ov).onclick = verder;
    const tdo = $('#tDoos', ov); if (tdo) tdo.onclick = () => { if (T + he > 99999) return; dz++; teken(); };
    const tl = $('#tLeeg', ov); if (tl) tl.onclick = () => { if (!S.leeg[a.key + '|' + C.today()]) { write('leeg', [{ bron: a.bron, nr: a.nr, dag: C.today(), door: mijnNaam(), ts: new Date().toISOString() }]); log('leeg', `Schap leeg: ${a.naam}`); } opslaan(); verder(); };
    $('#tN', ov).onclick = () => { if (!leeg) { opslaan(); toast('✓ ' + a.naam + ': ' + C.fmt(T, 3), 1500); leeg0(); } zoek = ''; teken(); };
    $('#tB', ov).onclick = () => { if (leeg) return toast('Tik eerst in hoeveel er liggen'); opslaan(); verder(); };
    $('#tS', ov).onclick = () => scanStart(od, naar);
  };
  telHook = code => {
    const a = vindCode(code); if (!a) { piep(); toast('Niet gevonden: ' + code); return; }
    if (zoek === null && i < arts.length && arts[i].key === a.key) { val = String(C.r(C.num(val || '0') + 1, 3)).replace('.', ','); if (navigator.vibrate) navigator.vibrate(30); teken(); return; }
    if (zoek === null && i < arts.length && (val !== '' || dz)) { opslaan(); toast('✓ ' + arts[i].naam + ': ' + C.fmt(tot(), 3), 1500); }
    if (navigator.vibrate) navigator.vibrate(60); naar(a);
  };
  const sluit = () => { if (arts.length && !vrij) ls.set(lk, { dag: C.today(), i }); ov.remove(); telHook = null; if (geteld) log('voorraad', `${geteld} artikelen geteld${vrij ? ' met scanner' : ` (${odNaam(od)})`}`); render(true); };
  teken();
}

function controle115() {
  const g28 = C.add(C.today(), -28);
  const mis = Object.values(S.lever || {}).filter(r => r.ok === false && r.lever >= g28 && M.art[r.bron + ':' + r.nr]).sort((a, b) => a.lever < b.lever ? 1 : -1);
  window.__afwTekst = `Niet of minder geleverd – ${(WINKEL && WINKEL.naam) || ''}\n` + mis.map(r => { const a = M.art[r.bron + ':' + r.nr]; return `${C.fmtDag(r.lever)}\t${a.eigen ? a.artNr || '' : a.nr}\t${a.naam}\tmist ${C.fmt(+r.mist || 0)}${a.perHE ? ' ' + ehMv(a, +r.mist || 0) : ''}\t${LEV_NAAM[levVan(a)] || ''}`; }).join('\n');
  const leegT = {}; for (const r of Object.values(S.leeg || {})) if (r.dag >= g28) { const k = r.bron + ':' + r.nr; leegT[k] = (leegT[k] || 0) + 1; }
  const leegL = Object.entries(leegT).filter(([k]) => M.art[k]).sort((a, b) => b[1] - a[1]).slice(0, 30);
  const red = {}; for (const k in S.bestel) { const b = S.bestel[k]; if (!b.reden || b.besteldag < g28) continue; const a = M.art[k.split('|')[0]]; if (!a) continue; const g = groepVan(a); red[g] = red[g] || {}; red[g][b.reden] = (red[g][b.reden] || 0) + 1; }
  const redL = Object.entries(red).map(([g, r]) => [g, r, Object.values(r).reduce((x, y) => x + y, 0)]).sort((a, b) => b[2] - a[2]).slice(0, 20);
  return `<div class="blk" data-sec="controle"><h2>Niet of minder geleverd (${mis.length})</h2><p class="small">Laatste 4 weken, uit de leveringscontrole.</p><div class="list">${mis.slice(0, 60).map(r => { const a = M.art[r.bron + ':' + r.nr]; return `<div class="it"><span style="flex:1">${esc(a.naam)}<br><span class="small">${C.fmtDag(r.lever)} · ${LEV_NAAM[levVan(a)] || ''} · mist ${C.fmt(+r.mist || 0)}${a.perHE ? ' ' + ehMv(a, +r.mist || 0) : ''}</span></span></div>`; }).join('') || '<div class="small">Niets gemist.</div>'}</div>${mis.length ? '<button class="btn sm sec" id="lcAfw" style="margin-top:8px">📤 Delen (voor het correctieformulier)</button>' : ''}</div>
  <div class="blk" data-sec="controle"><h2>Vaak leeg (${leegL.length})</h2><p class="small">Schap leeg gemeld in de laatste 4 weken. Vanaf 2 keer gaat het advies omhoog.</p><div class="list">${leegL.map(([k, n]) => `<div class="it"><span style="flex:1">${esc(M.art[k].naam)} <span class="small">· ${esc(groepVan(M.art[k]))}</span></span><b>${n}×</b></div>`).join('') || '<div class="small">Nog niets leeg gemeld.</div>'}</div></div>
  <div class="blk" data-sec="controle"><h2>Afwijken van het advies</h2><p class="small">Redenen die zijn gekozen, per groep, laatste 4 weken. Veel "Voorraad klopt niet" = vaker tellen.</p><div class="list">${redL.map(([g, r, n]) => `<div class="it"><span style="flex:1">${esc(g)}<br><span class="small">${REDENEN.filter(x => r[x[0]]).map(x => `${x[1]} ${r[x[0]]}×`).join(' · ')}</span></span><b>${n}</b></div>`).join('') || '<div class="small">Nog geen redenen gekozen.</div>'}</div></div>`;
}
function advies115() {
  const hb = (S.inst || {}).houdb || {}; const uit = new Set((S.inst || {}).weerUit || []); const wg = M.weerGroep || {};
  const opt = [0, 1, 2, 3, 4, 5, 7, 10, 14];
  const ods = BESTEL_OD.filter(od => od !== 'kw' && odGroepen(od).length);
  const pct = f => (f > 1 ? '+' : '−') + Math.round(Math.abs(f - 1) * 100) + '%';
  return `<div class="blk" data-sec="advies"><h2>Houdbaarheid per groep</h2><p class="small">Het advies bestelt nooit meer dan je verkoopt in deze dagen na de levering. Leeg = geen grens.</p>
  ${ods.map(od => { const gs = odGroepen(od); const n = gs.filter(g => hb[g]).length; return `<details class="hbd"><summary>${odNaam(od)}${n ? ` · ${n} ingesteld` : ''}</summary><div class="list">${gs.map(g => `<label class="it"><span style="flex:1">${esc(g)}</span><select data-hbg="${esc(g)}">${opt.map(o => `<option value="${o}" ${(+hb[g] || 0) === o ? 'selected' : ''}>${o ? o + (o === 1 ? ' dag' : ' dagen') : '–'}</option>`).join('')}</select></label>`).join('')}</div></details>`; }).join('')}</div>
  <div class="blk" data-sec="advies"><h2>Weer</h2><p class="small">Wat warm (22° of meer), koud (5° of minder) en regen (5 mm of meer) doet met de verkoop per groep, geleerd uit het weer van het afgelopen jaar. Het advies gebruikt de weersverwachting voor de leverdagen (max ±25%).</p>
  ${Object.keys(wg).length ? `<div class="list">${Object.entries(wg).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([g, m]) => `<label class="it"><span style="flex:1">${esc(g)}<br><span class="small">${[m.warm ? `warm ${pct(m.warm)}` : '', m.koud ? `koud ${pct(m.koud)}` : '', m.nat ? `regen ${pct(m.nat)}` : ''].filter(Boolean).join(' · ')}</span></span><input type="checkbox" class="schak" data-wg="${esc(g)}" ${uit.has(g) ? '' : 'checked'}></label>`).join('')}</div>` : `<p class="small">${ls.get('cba-weerhist') ? 'Nog geen duidelijk weer-effect gevonden. Daarvoor zijn een paar maanden actuele dag-exports nodig.' : 'Het weer van het afgelopen jaar wordt nog geladen.'}</p>`}</div>`;
}
