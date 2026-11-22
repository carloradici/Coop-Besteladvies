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
/* 1.86: lijst per weekstaat (nieuwste eerst), binnen een groep eerst de verschillen, dan op bonnummer */
function rbGroepen(B, ST, gekop) {
  const g = {}, rang = x => ({ verschil: 0, mist: 0, wacht: 1, ok: 2, leeg: 3 }[x[2].st]); B.forEach((b, i) => { const k = ST[i].st === 'leeg' ? '~leeg' : ST[i].f ? ST[i].f.ws : ''; (g[k] = g[k] || []).push([b, i, ST[i]]); });
  return Object.keys(g).sort((x, y) => (x === '~leeg') - (y === '~leeg') || (!x ? 1 : !y ? -1 : y.localeCompare(x))).map(k => { const l = g[k].sort((x, y) => rang(x) - rang(y) || rbKey(x[0].nr).localeCompare(rbKey(y[0].nr))), dv = l.reduce((t, x) => t + (x[2].st === 'verschil' || x[2].st === 'mist' ? x[2].v : 0), 0), n = `${l.length} ${l.length === 1 ? 'bon' : 'bonnen'}`;
    return [k === '~leeg' ? `Leeg · niets retour · ${n}` : k ? `Weekstaat ${esc(k)} · ${n} · ${Math.abs(dv) >= 0.01 ? `<span class="rood">${rbEuro(Math.abs(dv))} verschil</span>` : '✓ klopt'}` : `${gekop ? 'Nog niet op een weekstaat' : 'Bonnen'} · ${n}${dv ? ` · <span class="rood">${rbEuro(dv)} mist</span>` : ''}`, l]; });
}
/* 1.84: controle tegen de Van Tol-weekstaten (via Brood Opzet: S.bo.retour) */
const rbRet = () => (S.bo || {}).retour || {}, rbKey = nr => String(nr || '').replace(/\D/g, '');
const RB_OMS = [[/CONTAINER/i, 'k'], [/PLANK/i, 'pl'], [/PALLET/i, 'ep'], [/\bRAD\b/i, 'rad'], [/BIG ?BAG/i, 'bb'], [/FRIS/i, 'fk'], [/LEEG/i, 'bl'], [/12/, 'b12'], [/KRAT/i, 'bk'], [/FLES/i, 'fl']];
function rbStatus(b) {
  if (!RB_V.some(([k]) => +b[k])) return { v: 0, st: 'leeg' };
  const f = (rbRet().bonnen || {})[rbKey(b.nr)], w = rbWaarde(b);
  if (f) { const v = Math.round((w - Math.abs(+f.eur || 0)) * 100) / 100, n = {}; (f.regels || []).forEach(r => { const m = RB_OMS.find(([re]) => re.test(r.oms || '')); if (m) n[m[1]] = (n[m[1]] || 0) + Math.abs(+r.n || 0); });
    const dif = RB_V.filter(([k]) => k !== 'bb' && (+b[k] || 0) !== (n[k] || 0)).map(([k, t]) => `${t}: bon ${+b[k] || 0}, weekstaat ${n[k] || 0}`); return { f, v, dif, st: Math.abs(v) < 0.01 ? 'ok' : 'verschil' }; }
  const dr = rbRet().dragers; return { v: w, st: w > 0 && b.datum && dr && dr.d && C.diff(b.datum, dr.d) >= 14 ? 'mist' : 'wacht' };
}
/* 1.85: ontbrekende bonnen: op de weekstaat maar niet in de lijst, en gaten in de nummering */
function rbMist(B) {
  const ken = new Set(B.map(b => rbKey(b.nr))), neg = new Set(RB.neg || []), ws = Object.entries(rbRet().bonnen || {}).filter(([k]) => !ken.has(k) && !neg.has(k));
  const nrs = [...ken].filter(k => k.length >= 8).map(Number).sort((a, b) => a - b), gat = [];
  for (let i = 1; i < nrs.length; i++) { const d = nrs[i] - nrs[i - 1]; if (d > 1 && d <= 4) for (let x = nrs[i - 1] + 1; x < nrs[i]; x++) if (!neg.has(String(x)) && !(rbRet().bonnen || {})[x]) gat.push(String(x)); }
  return { ws, gat };
}
function rbBoTekst() { const R = rbRet(), bn = Object.values(R.bonnen || {}), ws = [...new Set(bn.map(x => x.ws).filter(Boolean))].sort();
  if (!S.bo) return 'Nog niet opgehaald van Brood Opzet.'; if (!S.bo.retour) return '⚠️ Brood Opzet geeft nog geen retourgegevens door: tik in Supabase op Deploy bij brood-export (Brood Opzet-project) en lees de weekstaten in Brood Opzet in.';
  return `Van Brood Opzet: ${bn.length} retourbonnen uit ${ws.length} weekstaten${ws.length ? ` (${ws[0]} t/m ${ws[ws.length - 1]})` : ''} · opgehaald ${new Date(S.bo.t || Date.now()).toTimeString().slice(0, 5)}`; }
function rbBewaar() { ls.set('cba-retour', RB); write('voorkeuren', [{ wie: 'retour', data: RB }], true); }

async function renderRetour() {
  const v = $('#view'); if (!RB) { v.innerHTML = '<div class="empty">Laden…</div>'; await rbLaad(); if (ui.tab !== 'retour') return; }
  if (ui.rbEdit) return rbForm(v);
  if (!rbLaad.bo && boInst().url && boInst().code) { rbLaad.bo = 1; boHaal(true).then(() => ui.tab === 'retour' && !ui.rbEdit && renderRetour()).catch(() => { }); }
  const B = RB.bonnen, tot = Object.fromEntries(RB_V.map(([k]) => [k, B.reduce((t, b) => t + (+b[k] || 0), 0)])), ST = B.map(rbStatus), dr = rbRet().dragers, gekop = !!(boInst().url && boInst().code);
  const MI = rbMist(B); let auto = 0; B.forEach((b, i) => { if (ST[i].st === 'ok' && !b.ok) { b.ok = true; auto++; } }); if (auto) rbBewaar();
  const rood = ST.filter(x => x.st === 'verschil' || x.st === 'mist'), tegoed = rood.reduce((t, x) => t + Math.max(0, x.v), 0), teveel = rood.reduce((t, x) => t + Math.min(0, x.v), 0), wacht = ST.filter(x => x.st === 'wacht').length;
  v.innerHTML = `<div class="blk"><h2>Van Tol</h2>${gekop ? `<p class="rbsom">Nog te ontvangen <b>${rbEuro(tegoed)}</b></p><p class="small">${rood.length ? `${rood.length} ${rood.length === 1 ? 'bon klopt' : 'bonnen kloppen'} niet met de weekstaat` : '✓ Alle gecontroleerde bonnen kloppen'}${teveel < 0 ? ` · ${rbEuro(-teveel)} te veel gecrediteerd` : ''}${wacht ? ` · ${wacht} nog niet op een ingelezen weekstaat` : ''}</p>
    <p class="small">${rbBoTekst()}</p>
    ${dr ? `<p class="rbsom">Karren volgens Van Tol <b>${Object.entries(dr.items || {}).map(([n, a]) => `${a} ${/CONTAINER/i.test(n) ? 'karren' : n.toLowerCase()}`).join(' · ')}</b></p><p class="small">Weekstaat ${esc(dr.ws)}${dr.d ? ' · ' + C.fmtDag(dr.d) : ''}</p>` : ''}`
    : '<p class="small">Koppel Brood Opzet (Kantoor › Brood Opzet) en lees daar de weekstaten in: dan controleert de app elke bon tegen Van Tol.</p>'}</div>
    ${MI.ws.length || MI.gat.length ? `<div class="blk rbmist"><h2>Ontbrekende bonnen</h2>${MI.ws.length ? `<p class="small">Wel gecrediteerd op een weekstaat, maar niet in je lijst:</p>${MI.ws.map(([k, f]) => `<div class="rbrij"><span class="rbtx"><b>BGR ${esc(k)}</b><small>${(f.regels || []).map(r => `${r.n} × ${esc(r.oms)}`).join(' · ')} · ${rbEuro(Math.abs(+f.eur || 0))} · weekstaat ${esc(f.ws)}</small></span><button class="btn sm" data-rbws="${esc(k)}">+ Toevoegen</button><button class="btn sm sec" data-rbneg="${esc(k)}" aria-label="Negeren">✕</button></div>`).join('')}` : ''}
      ${MI.gat.length ? `<p class="small">Gat in de nummering (zoek de bon op of tik ✕ als hij niet van jou is):</p>${MI.gat.map(k => `<div class="rbrij"><span class="rbtx"><b>BGR ${k}</b><small>tussen je andere bonnen in, nog niet ingevoerd</small></span><button class="btn sm sec" data-rbneg="${k}" aria-label="Negeren">✕</button></div>`).join('')}` : ''}</div>` : ''}
    <div class="blk"><h2>Retour · ${B.length} bonnen</h2><div class="rbtot">${RB_V.filter(([k]) => tot[k]).map(([k, t]) => `<div><b>${C.fmt(tot[k])}</b><small>${t}</small></div>`).join('') || '<p class="small">Nog geen bonnen.</p>'}</div></div>
    ${rbRij.length ? `<button class="btn" id="rbVerder" style="width:100%;margin-bottom:10px">✏️ Verder invullen · nog ${rbRij.length} ${rbRij.length === 1 ? 'scan' : 'scans'}</button>` : ''}
    <label class="btn" style="display:block;text-align:center">📄 Scans uploaden<input type="file" id="rbUp" multiple accept=".pdf,image/*" class="hide"></label>
    <div class="rbknop"><button class="btn sec" id="rbNieuw">+ Zonder scan</button><label class="btn sec">Excel importeren<input type="file" id="rbImp" accept=".xlsx,.xls" class="hide"></label><button class="btn sec" id="rbExp">Excel maken</button></div>
    <div class="blk">${B.length ? rbGroepen(B, ST, gekop).map(([kop, l]) => `<h3 class="rbgrp">${kop}</h3>` + l.map(([b, i, s]) => `<div class="rbrij ${s.st}"><button class="rbok ${b.ok ? 'on' : ''}" data-rok="${i}" aria-label="Klopt">✓</button><button class="rbtx" data-rb="${i}"><b>${esc(b.nr || 'Zonder nummer')}</b><small>${[b.datum ? C.fmtDag(b.datum) : '', b.k ? b.k + ' karren' : '', b.bk ? b.bk + ' bierkratten' : '', b.fk ? b.fk + ' friskratten' : '', b.rb ? 'retourbon ' + esc(b.rb) : ''].filter(Boolean).join(' · ')}</small>
      <small class="rbst">${s.st === 'ok' ? '✓ klopt' : s.st === 'verschil' ? `${s.v > 0 ? rbEuro(s.v) + ' te weinig' : rbEuro(-s.v) + ' te veel'} gecrediteerd` : s.st === 'mist' ? `${rbEuro(s.v)} · mist op de weekstaten` : s.st === 'leeg' ? 'leeg · niets retour' : ''}</small>${b.opm ? `<small class="rood">${esc(b.opm)}</small>` : ''}</button></div>`).join('')).join('') : '<p class="small">Upload je scans of importeer je Excel.</p>'}</div>`;
  $('#rbUp').onchange = e => rbUpload([...e.target.files]);
  $('#rbImp').onchange = e => rbImport(e.target.files[0]);
  $('#rbExp').onclick = rbExport;
  $('#rbNieuw').onclick = () => { ui.rbEdit = { b: {}, i: -1 }; renderRetour(); };
  if ($('#rbVerder')) $('#rbVerder').onclick = () => { ui.rbEdit = Object.assign({ i: -1 }, rbRij[0], { rij: 1 }); renderRetour(); };
  v.querySelectorAll('[data-rbneg]').forEach(x => x.onclick = () => { (RB.neg = RB.neg || []).push(x.dataset.rbneg); rbBewaar(); renderRetour(); });
  v.querySelectorAll('[data-rbws]').forEach(x => x.onclick = () => { const k = x.dataset.rbws, f = rbRet().bonnen[k], b = { nr: 'BGR ' + k, datum: f.d || '' };
    (f.regels || []).forEach(r => { const m = RB_OMS.find(([re]) => re.test(r.oms || '')); if (m) b[m[1]] = (b[m[1]] || 0) + Math.abs(+r.n || 0); }); ui.rbEdit = { b, i: -1 }; renderRetour(); window.scrollTo(0, 0); });
  v.querySelectorAll('[data-rok]').forEach(x => x.onclick = () => { const b = B[+x.dataset.rok]; b.ok = !b.ok; rbBewaar(); renderRetour(); });
  v.querySelectorAll('[data-rb]').forEach(x => x.onclick = async () => { const i = +x.dataset.rb, b = B[i]; ui.rbEdit = { b: Object.assign({}, b), i, img: b.scan ? await iget('rbscan:' + b.nr) : null }; renderRetour(); });
}

function rbForm(v) {
  const e = ui.rbEdit, b = e.b, veld = (k, t, x = '') => `<div class="f"><label>${t}</label><input data-rf="${k}" type="text" inputmode="decimal" value="${esc(b['_' + k] ?? (b[k] || ''))}" ${x}><span class="rbis" data-ris="${k}"></span></div>`;
  v.innerHTML = `${e.img ? `<div class="rbscan"><img src="${e.img}" alt="Scan van de bon"></div><p class="small" style="text-align:center">Tik op de scan om in of uit te zoomen</p>` : ''}
    <div class="blk form">${e.rij ? `<p class="small">Scan ${rbRij.length ? 'nog ' + rbRij.length + ' te gaan' : ''}</p>` : ''}
    ${e.fout ? `<p class="small rood">⚠️ ${esc(e.fout)}</p>` : ''}<div class="f"><label>Bonnummer</label><input id="rbNr" type="text" value="${esc(b.nr || '')}" placeholder="BGR 202606941"></div>
    <div class="f"><label>Datum</label><input id="rbDat" type="date" value="${esc(b.datum || '')}"></div>
    <div class="f"><label>Retourbon (producten)</label><input id="rbRb" type="text" inputmode="numeric" value="${esc(b.rb || '')}" placeholder="alleen als er producten mee gaan"></div>
    <p class="small">Meer kolommen op de bon? Typ ze achter elkaar met een komma: <b>18,11,17</b> wordt 46.</p>
    ${RB_V.map(([k, t]) => veld(k, t)).join('')}
    <div class="f"><label>Opmerking</label><input id="rbOpm" type="text" value="${esc(b.opm || '')}" placeholder="bv. mist op factuur"></div>
    ${e.i >= 0 ? rbWsHtml(b) : ''}
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
    if (!RB_V.some(([k]) => n[k])) n.ok = true;
    if (e.i >= 0) RB.bonnen[e.i] = n; else RB.bonnen.push(n); rbBewaar(); toast('✓ ' + n.nr + ' opgeslagen'); klaar();
  };
}

function rbWsHtml(b) { const s = rbStatus(b); if (s.st === 'leeg') return '<p class="small">Lege bon: er ging niets retour.</p>'; if (!s.f) return `<p class="small">${s.st === 'mist' ? 'Deze bon staat niet op de ingelezen weekstaten.' : 'Nog niet op een ingelezen weekstaat.'}</p>`;
  return `<div class="rbws ${s.st}"><b>Weekstaat ${esc(s.f.ws)}${s.f.fnr ? ' · factuur ' + esc(s.f.fnr) : ''}</b>${(s.f.regels || []).map(r => `<small>${r.n} × ${esc(r.oms)} · ${rbEuro(Math.abs(r.eur))}</small>`).join('')}<small>Gecrediteerd ${rbEuro(Math.abs(s.f.eur))} · bon ${rbEuro(rbWaarde(b))}</small>${s.st === 'verschil' ? `<small class="rood"><b>${s.v > 0 ? rbEuro(s.v) + ' te weinig' : rbEuro(-s.v) + ' te veel'}</b>${s.dif.length ? ' · ' + s.dif.map(esc).join(' · ') : ''}</small>` : '<small>✓ Klopt</small>'}</div>`; }
/* scans (pdf van de iPhone-scanner of foto's) → per bladzijde een plaatje + gedrukte tekst lezen */
async function rbUpload(files) {
  if (!files.length) return; let n = 0, tot = 0, eerst = true, weg = 0;
  const klaar = r => { if (r.leeg) { weg++; tot--; return; } rbRij.push(r); toast(`Scan ${++n} van ${tot} gelezen`, 4000); if (eerst && !ui.rbEdit && ui.tab === 'retour') { eerst = false; ui.rbEdit = Object.assign({ i: -1 }, rbRij[0], { rij: 1 }); renderRetour(); } };
  try {
    for (const f of files) {
      if (/pdf/i.test(f.type) || /\.pdf$/i.test(f.name)) { const p = await pdfjs(), d = await p.getDocument({ data: await f.arrayBuffer() }).promise; tot += d.numPages;
        for (let i = 1; i <= d.numPages; i++) { const pg = await d.getPage(i), tx = (await pg.getTextContent()).items.map(x => x.str).join(' '), vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 2400 / vp0.width }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
          await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; const r = await rbLees(c, tx); c.width = c.height = 0; pg.cleanup(); klaar(r); } }
      else { tot++; const bm = await createImageBitmap(f), sc = Math.min(1, 2400 / bm.width), c = document.createElement('canvas'); c.width = bm.width * sc; c.height = bm.height * sc; c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height); bm.close && bm.close(); const r = await rbLees(c, ''); c.width = c.height = 0; klaar(r); }
    }
  } catch (e) { toast('Kon de scan niet openen: ' + e.message, 6000); }
  if (n || weg) toast(`${n} ${n === 1 ? 'scan' : 'scans'} klaar om in te vullen${weg ? ` · ${weg} lege ${weg === 1 ? 'bladzijde' : 'bladzijden'} overgeslagen` : ''}`, 4000);
}
/* 1.86: één bladzijde tegelijk (iPhone-geheugen); eerst de tekst in de pdf zelf, anders tekstherkenning op twee stroken */
async function rbLees(c, tx) {
  const kl = document.createElement('canvas'), fz = Math.min(1, 1400 / c.width); kl.width = c.width * fz; kl.height = c.height * fz; kl.getContext('2d').drawImage(c, 0, 0, kl.width, kl.height);
  const r = { img: kl.toDataURL('image/jpeg', 0.6), b: {} }; { const d = kl.getContext('2d').getImageData(0, 0, kl.width, kl.height).data; let z = 0; for (let p = 0; p < d.length; p += 16) if (d[p] + d[p + 1] + d[p + 2] < 300) z++; r.inkt = z / (d.length / 16); } kl.width = kl.height = 0;
  const zoek = (t, o) => { const m = t.match(/BGR\s*(\d{6,10})/i) || t.match(/\b(20\d{7})\b/), d = t.match(/(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(20\d\d)/);
    if (m) r.b.nr = 'BGR ' + m[1]; if (d) r.b.datum = `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}`; if (/KLANT\s*LABEL|Bag-?ID|Klant-?ID/i.test(o)) { r.b.bb = 1; r.b._bb = '1'; } };
  if (/BGR\s*\d{6}/i.test(tx || '')) { zoek(tx, tx); return r; }
  if (!rbOcr) try { await loadScript(LIB.ocr); rbOcr = await window.Tesseract.createWorker('eng'); } catch (e) { r.fout = 'Tekst lezen kon niet laden (offline?): vul het bonnummer zelf in'; return r; }
  try { const strook = (x0, y0, x1, y1) => { const k = document.createElement('canvas'), sw = (x1 - x0) * c.width, sh = (y1 - y0) * c.height, f = Math.max(1, 1440 / sw); k.width = sw * f; k.height = sh * f; const g = k.getContext('2d'); g.drawImage(c, x0 * c.width, y0 * c.height, sw, sh, 0, 0, k.width, k.height);
      const im = g.getImageData(0, 0, k.width, k.height), d = im.data, hs = new Array(256).fill(0); for (let p = 0; p < d.length; p += 4) { d[p] = d[p + 1] = d[p + 2] = (d[p] * 3 + d[p + 1] * 6 + d[p + 2]) / 10 | 0; hs[d[p]]++; }
      let lo = 0, hi = 255, n = 0, z = d.length / 4 * 0.02; while ((n += hs[lo]) < z) lo++; n = 0; while ((n += hs[hi]) < z) hi--; const sc = 255 / Math.max(1, hi - lo); for (let p = 0; p < d.length; p += 4) d[p] = d[p + 1] = d[p + 2] = Math.max(0, Math.min(255, (d[p] - lo) * sc)); g.putImageData(im, 0, 0); return k; };
    const k1 = strook(0.4, 0, 1, 0.22); let t = '';
    for (const psm of ['6', '4', '12', '3']) { await rbOcr.setParameters({ tessedit_pageseg_mode: psm }); const x = (await rbOcr.recognize(k1)).data.text; t += '\n' + x; if (/BGR\s*\d{6}/i.test(x)) break; }
    k1.width = k1.height = 0; await rbOcr.setParameters({ tessedit_pageseg_mode: '6' }); const k2 = strook(0.2, 0.68, 0.7, 0.92), o = (await rbOcr.recognize(k2)).data.text; k2.width = k2.height = 0;
    zoek(t, o); if (!r.b.nr) r.fout = 'Bonnummer niet gevonden op deze scan: vul het zelf in'; } catch (e) { r.fout = 'Tekst lezen mislukt: ' + (e.message || e); }
  if (!r.b.nr && r.inkt < 0.01) r.leeg = true;
  return r;
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
  const aoa = [['gecontroleerd', 'retourbon nummer', ...RB_X.map(x => x[1]), 'opmerking', 'datum', 'retourbon producten', 'gecrediteerd €', 'verschil €', 'weekstaat']].concat(B.map(b => { const s = rbStatus(b); return [!!b.ok, b.nr, ...RB_X.map(([k]) => b[k] || null), b.opm || null, b.datum || null, b.rb || null, s.f ? Math.abs(+s.f.eur || 0) : null, ['wacht', 'ok', 'leeg'].includes(s.st) ? null : s.v, s.f ? s.f.ws : null]; }));
  const ws = XLSX.utils.aoa_to_sheet(aoa), cel = (a, v) => ws[a] = v;
  cel('B' + (n + 2), { t: 's', v: 'totaal' }); cel('B' + (n + 3), { t: 's', v: 'waarde €' }); cel('B' + (n + 5), { t: 's', v: 'totale waarde €' });
  RB_X.forEach(([k], j) => { const c = L[j]; cel(c + (n + 2), { t: 'n', f: `SUM(${c}2:${c}${n})` }); if (prijs[k]) cel(c + (n + 3), { t: 'n', f: `${c}${n + 2}*${prijs[k]}` }); });
  cel('C' + (n + 5), { t: 'n', f: RB_X.map(([k], j) => prijs[k] ? L[j] + (n + 3) : '').filter(Boolean).join('+') });
  cel('P' + (n + 2), { t: 's', v: 'nog te ontvangen' }); cel('Q' + (n + 2), { t: 'n', f: `SUMIF(Q2:Q${n},">0")` });
  ws['!ref'] = 'A1:R' + (n + 5); ws['!cols'] = [{ wch: 13 }, { wch: 17 }, ...RB_X.map(() => ({ wch: 11 })), { wch: 30 }, { wch: 11 }, { wch: 14 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'bonnen');
  const file = new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], 'retourbonnen van tol.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) try { return await navigator.share({ files: [file], title: 'Retourbonnen Van Tol' }); } catch (e) { return; }
  const u = URL.createObjectURL(file), l = document.createElement('a'); l.href = u; l.download = file.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
  window.__rbExport = aoa.length - 1;
}
