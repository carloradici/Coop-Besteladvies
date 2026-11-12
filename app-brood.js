/* ---------- 1.32: koppeling met Brood Opzet (bake-off) ---------- */
function boInst() { return (S.inst || {}).bo || {}; }
async function boHaal(forceer) {
  const b = boInst(); if (!b.url || !b.code || OEFEN || (DEMO && !forceer)) return;
  if (!forceer && S.bo && Date.now() - (S.bo.t || 0) < 36e5) return;
  try {
    const r = await fetch(b.url, { headers: { 'x-sleutel': b.code } }); const d = await r.json().catch(() => ({ fout: 'Geen antwoord (' + r.status + ')' }));
    if (!d.ok) throw new Error(d.fout || r.status);
    d.t = Date.now(); S.bo = d; await iset('bo:' + W, d); boAutoKoppel(); rebuild();
    if (!/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName)) render(true); return d;
  } catch (e) { if (forceer) throw e; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && M) boHaal(); });
const boNorm = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function boArts() { return Object.values(M.art).filter(a => ['brood', 'diep'].includes(onderdeelVan(a))); }
function boAutoKoppel() {
  const b = boInst(), kp = Object.assign({}, b.koppel || {}); let n = 0;
  const bb = boBoek().filter(x => x.key);
  for (const s of (S.bo || {}).soorten || []) { if (kp[s.id] !== undefined) continue; let l = boArts().filter(a => boNorm(a.naam) === boNorm(s.naam)).map(a => a.key);
    if (l.length !== 1) { const w = boNorm(s.naam).split(' ').filter(x => x.length > 1).map(boStam); l = w.length ? bb.filter(x => w.every(y => boNorm(x.naam).includes(y))).map(x => x.key) : []; }
    if (l.length === 1) { kp[s.id] = l[0]; n++; } }
  if (n && mag('instellingen') && !DEMO) saveInst(Object.assign({}, S.inst, { bo: Object.assign({}, b, { koppel: kp }) }));
}
function boModel() {
  M.bo = {}; M.boInfo = {}; const d = S.bo, kp = boInst().koppel || {}; if (!d || !d.dagen) return;
  const dagen = Object.keys(d.dagen).filter(x => x < d.nu).sort().reverse(), gem = l => l.reduce((a, b) => a + b, 0) / l.length;
  for (const s of d.soorten || []) {
    const key = kp[s.id]; if (!key || !M.art[key]) continue; const wd = [], vlag = [];
    for (let w = 0; w < 7; w++) {
      const h = dagen.filter(x => C.wd(x) === w && !d.dagen[x].afw && d.dagen[x].o[s.id] != null).slice(0, 4).map(x => ({ g: d.dagen[x].g[s.id] || 0, o: d.dagen[x].o[s.id] }));
      if (h.length < 2) { wd.push(null); continue; }
      const gG = gem(h.map(x => x.g)), gO = gem(h.map(x => x.o)), gw = [4, 3, 2, 1].slice(0, h.length);
      if (gG > 0 && h.every(x => x.o === 0)) { wd.push(gG * 1.1); vlag.push([w, 'op']); }
      else if (gG > 0 && gO / gG >= 0.1) { wd.push(h.reduce((t, x, i) => t + Math.max(0, x.g - x.o) * gw[i], 0) / gw.reduce((a, b) => a + b, 0)); vlag.push([w, 'over', Math.round(gO)]); }
      else wd.push(gG);
    }
    let g = 0, o = 0; for (const x of dagen.filter(x => x >= C.add(d.nu, -28))) { g += d.dagen[x].g[s.id] || 0; o += d.dagen[x].o[s.id] || 0; }
    M.bo[key] = wd; M.boMin = (k, lv) => M.boInfo[k] && lv && lv.L ? (boTekort(M.art[k], lv, 0) || {}).min || 0 : 0; M.boInfo[key] = { s, g: Math.round(g / 4), o: Math.round(o / 4), vlag, vr: (d.voorraad || {})[s.id], gezet: ((d.dagen[d.nu] || {}).g || {})[s.id] > 0 };
  }
}
function boVr(key) { const i = M.boInfo && M.boInfo[key]; if (!i || !i.vr || C.diff(S.bo.nu, C.today()) > 7) return null; return { aantal: Math.max(0, Math.round(i.vr.n)), dag: S.bo.nu, bo: true }; }
function boTekort(a, bd, n) {
  const i = M.boInfo && M.boInfo[a.key]; if (!i || !bd || !bd.L) return null;
  const v = vrVan(a.key); if (!v || v.aantal == null || v.aantal === '') return { geenVr: true };
  const he = a.perHE && a.he > 0 ? a.he : 1, bij = {};
  for (const k in S.bestel) { const [key, bdag] = k.split('|'); const b = S.bestel[k]; if (key !== a.key || bdag === bd.besteldag || !b || !b.lever || b.lever <= v.dag) continue; const m = b.aantal != null ? +b.aantal : b.besteld ? +(b.advies || 0) : 0; if (m > 0) bij[b.lever] = (bij[b.lever] || 0) + m * he; }
  let s = +v.aantal, voor = null; const pts = [];
  for (let d = v.bo && i.gezet ? C.add(v.dag, 1) : v.dag; d < bd.L2; d = C.add(d, 1)) {
    s += bij[d] || 0; s -= C.verwacht(M, a.key, d) * (!v.bo && d === v.dag ? 0.5 : 1);
    if (d < bd.L) { if (s < 0) { voor = voor || { dag: d, t: 0 }; voor.t += Math.ceil(-s); s = 0; } }
    else pts.push([d, s]);
  }
  const laag = Math.min(0, ...pts.map(p => p[1])), x = (+n || 0) * he, eerst = pts.find(p => p[1] + x < 0);
  return { voor, na: eerst ? { dag: eerst[0], t: Math.ceil(-(laag + x)) } : null, min: Math.ceil(-laag / he) };
}
function boEh(a, n) { return a.perHE ? ehMv(a, n) : n === 1 ? 'stuk' : 'stuks'; }
function boHtml(a, bd, be, ad) {
  const i = M.boInfo && M.boInfo[a.key]; if (!i) return '';
  const vr = boVr(a.key), om = i.vlag.filter(x => x[1] === 'op').map(x => C.DAGEN[x[0]]), af = i.vlag.filter(x => x[1] !== 'op').map(x => C.DAGEN[x[0]]);
  let h = `<div class="bo">🥐 Opzet: per week ${i.o} over van ${i.g}${vr ? ` · ligt nu ${vr.aantal}` : ''}${af.length ? ` · advies lager (${af.join(', ')})` : ''}${om.length ? ` · advies hoger (${om.join(', ')})` : ''}`;
  const t = boTekort(a, bd, be && be.aantal != null ? +be.aantal : ad.adv);
  if (t && t.geenVr && mag('tellen')) h += '<br><span class="small">Tel de voorraad om te zien of je uitkomt.</span>';
  if (t && t.voor) h += `<div class="bowarn">⚠️ Te weinig vóór de levering: vanaf ${C.fmtDag(t.voor.dag)} ±${t.voor.t} stuks tekort.${mag('bestellen') ? '' : ' Meld het aan ' + esc(beheerNamen()[0]) + '.'}</div>`;
  if (t && t.na) h += `<div class="bowarn">⚠️ Je komt ${C.fmtDag(t.na.dag)} ${t.na.t} stuks tekort. Bestel minstens ${t.min} ${boEh(a, t.min)}.</div>`;
  return h + '</div>';
}
function boNietUit(arts, cur) { return arts.filter(a => { if (!M.boInfo || !M.boInfo[a.key] || a.uit || assStatus(a) !== 'in') return false; const be = S.bestel[a.key + '|' + cur.besteldag]; const n = be && be.aantal != null ? +be.aantal : C.advies(M, a.key, cur, vrVan(a.key), bestellingenVan(a.key)).adv; const t = boTekort(a, cur, n); return t && (t.voor || t.na); }); }
function boBanner(arts, cur) { const l = boNietUit(arts, cur); return l.length ? `<div class="banner warn"><h3>⚠️ Te weinig tot de volgende levering: ${l.length} ${l.length === 1 ? 'artikel' : 'artikelen'}</h3><div class="sub">${l.map(a => esc(a.naam)).join(' · ')}</div></div>` : ''; }
function boBel() {
  const out = []; if (!M || !M.boInfo || !Object.keys(M.boInfo).length) return out;
  for (const od of ['brood', 'diep']) { if (!mag('o_' + od)) continue; const cur = besteldag(od).cur; if (!cur || cur.besteldag !== C.today()) continue; const l = boNietUit(lijstArtikelen(od), cur); if (l.length) out.push({ ic: '🥐', t: `${odNaam(od)}: te weinig van ${l.length} ${l.length === 1 ? 'artikel' : 'artikelen'}`, sub: l.map(a => a.naam).join(' · '), ga: od, jij: false }); }
  return out;
}
function boBeheerHtml() {
  if (!mag('instellingen')) return ''; const b = boInst(), d = S.bo, kp = b.koppel || {};
  const st = d ? `✓ Opgehaald ${new Date(d.t).toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${(d.soorten || []).length} soorten bake-off` : b.url ? 'Nog niet opgehaald' : 'Nog niet gekoppeld';
  const rij = s => { const a = kp[s.id] && M.art[kp[s.id]]; return `<button class="it boKop" data-bok="${esc(s.id)}"><span style="flex:1;min-width:0"><b>${esc(s.naam)}</b><br><span class="small ${a ? '' : kp[s.id] === '' ? '' : 'rood'}">${a ? '→ ' + esc(a.naam) + ' · ' + boNrTxt(a) : kp[s.id] === '' ? 'Niet koppelen' : 'Nog niet gekoppeld – tik om te kiezen'}</span></span><span class="pijl">›</span></button>`; };
  return `<div class="blk" data-sec="brood"><h2>🥐 Brood Opzet koppelen</h2><p class="small">Haalt elk uur op wat er per bake-off-soort is klaargezet, wat er over was en de voorraad. Het advies en de waarschuwing "komt niet uit" gebruiken dit.</p>
  <div class="form"><div class="f"><label>Adres</label><input id="boUrl" type="url" placeholder="https://….supabase.co/functions/v1/…" value="${esc(b.url || '')}"></div><div class="f"><label>Koppelcode</label><input id="boCode" value="${esc(b.code || '')}" autocomplete="off"></div></div>
  <button class="btn" id="boTest" style="width:100%">Opslaan en ophalen</button><p class="small" id="boSt">${st}</p></div>
  ${d && d.soorten ? `<div class="blk" data-sec="brood"><h2>Soorten koppelen (${(d.soorten).filter(s => kp[s.id]).length} van ${d.soorten.length})</h2><p class="small">Koppel elke soort aan het artikel in het bestelboek. Bij precies dezelfde naam gaat het vanzelf.</p><div class="list">${d.soorten.map(rij).join('')}</div></div>` : ''}`;
}
function boBeheerEvents(v) {
  const k = v.querySelector('#boTest'); if (k) k.onclick = async () => {
    const url = $('#boUrl').value.trim(), code = $('#boCode').value.trim(); if (!/^https:\/\/.+/.test(url) || !code) return toast('Vul het adres en de koppelcode in');
    $('#boSt').textContent = 'Bezig…'; const w = Object.assign({}, S.inst, { bo: Object.assign({}, boInst(), { url, code }) });
    if (!DEMO) await saveInst(w); else S.inst = w;
    try { const d = await boHaal(true); toast(`✓ ${d.soorten.length} soorten opgehaald`); render(); } catch (e) { $('#boSt').textContent = '✗ ' + e.message; }
  };
  v.querySelectorAll('[data-bok]').forEach(b => b.onclick = () => boKies(b.dataset.bok));
}
const boStam = w => w.replace(/(jes|tjes|en|s)$/, '');
const boNrs = a => [a.nr, a.bst, a.artNr, a.ean].map(x => String(x || ''));
const boNrTxt = a => a.eigen ? (a.bst || '–') + ' · eigen' : a.nr;
function boZoek(q, l) {
  q = q.trim(); if (/^\d{3,}$/.test(q)) return l.filter(a => boNrs(a).some(x => x.includes(q)));
  const w = boNorm(q).split(' ').filter(x => x.length > 1).map(boStam); if (!w.length) return [];
  const ns = l.map(a => boNorm(a.naam)), gw = w.map(x => 1 / (1 + ns.filter(n => n.includes(x)).length));
  return l.map((a, i) => [a, w.reduce((t, x, j) => t + (ns[i].includes(x) ? 1 + gw[j] : 0), 0)]).filter(x => x[1] > 0).sort((x, y) => y[1] - x[1] || x[0].naam.localeCompare(y[0].naam)).map(x => x[0]);
}
function boBoek() {
  const d = S.bo || {}, idx = {}, uit = {}; Object.values(M.art).forEach(a => (a.eigen ? [a.bst, a.artNr] : a.bron === 'vers' ? [a.nr] : []).forEach(n => { if (n && !idx[n]) idx[n] = a; }));
  const eig = {}; (d.eigen || []).forEach(e => eig[e.art] = e);
  for (const b of d.boeken || []) for (const nr of b.arts) { const a = idx[nr]; (uit[nr] ??= { nr, naam: a ? a.naam : (eig[nr] || {}).naam || nr, key: a ? a.key : null, boek: [], e: eig[nr] }).boek.push(b.naam); }
  for (const e of d.eigen || []) if (!uit[e.art]) { const a = idx[e.art]; uit[e.art] = { nr: e.art, naam: a ? a.naam : e.naam, key: a ? a.key : null, boek: ['eigen artikel'], e }; }
  return Object.values(uit);
}
function boKies(sid) {
  const s = ((S.bo || {}).soorten || []).find(x => x.id === sid); if (!s) return; const l = Object.values(M.art), bb = boBoek();
  const lijst = q => {
    const rb = boZoek(q || s.naam, bb).slice(0, 10), keys = new Set(rb.map(x => x.key)), r = boZoek(q || s.naam, l).filter(a => !keys.has(a.key)).slice(0, q ? 25 : 10);
    const hb = rb.map(x => `<button class="it" ${x.key ? `data-bka="${esc(x.key)}"` : `data-bkn="${esc(x.nr)}"`}><span style="flex:1">${esc(x.naam)}<br><span class="small">${x.nr} · 📒 ${esc(x.boek.join(', '))}${x.key ? '' : ' · ➕ wordt aangemaakt'}</span></span></button>`).join('');
    return (hb ? `<p class="small"><b>📒 Uit je Brood Opzet-bestelboek</b></p>${hb}` : '') + (r.length ? `<p class="small"><b>${q ? 'Hele bestelboek' : 'Suggesties uit het bestelboek'}</b></p>` + r.map(a => `<button class="it" data-bka="${esc(a.key)}"><span style="flex:1">${esc(a.naam)}<br><span class="small">${boNrTxt(a)} · ${odNaam(onderdeelVan(a))}</span></span></button>`).join('') : '') || '<p class="small">Niets gevonden. Typ een ander woord of het artikelnummer.</p>';
  };
  const koppel = (key, o) => { const w = Object.assign({}, S.inst); w.bo = Object.assign({}, boInst()); w.bo.koppel = Object.assign({}, w.bo.koppel || {}, { [sid]: key }); o.remove(); if (DEMO) { S.inst = w; rebuild(); render(); } else saveInst(w); };
  const ov = sheet(`<h2 style="margin:0">${esc(s.naam)}</h2><p class="small">Zoek op naam of artikelnummer. Bovenaan staat wat in je Brood Opzet-bestelboek staat.</p><input type="search" id="bkQ" placeholder="🔍 Naam of nummer" style="width:100%"><div class="list" id="bkL">${lijst('')}</div><button class="btn sec" data-bka="" style="width:100%;margin-top:8px">Niet koppelen</button><button class="btn sec" data-x style="width:100%;margin-top:8px">Annuleren</button>`, (e, o) => {
    const n = e.target.closest('[data-bkn]'); if (n) { const x = bb.find(y => y.nr === n.dataset.bkn); const id = 'E' + Date.now().toString(36).toUpperCase();
      const data = { naam: x.naam, nr: x.nr, ean: '', groep: (x.e && x.e.groep) || 'Bake-off', od: 'brood', lev: 'versunie', perHE: !!s.perDoos, he: s.perDoos || 1, ehNaam: s.perDoos ? ((x.e && x.e.eh) || 'DS').toUpperCase().slice(0, 2) : '', prijs: 0, volgen: false };
      if (DEMO) S.eigen[id] = Object.assign({ id }, data); else write('eigen_artikelen', [{ id, data, door: mijnNaam() }]); log('eigen', `Artikel toegevoegd uit Brood Opzet: ${x.naam}`); rebuild(); return koppel('eigen:' + id, o); }
    const b = e.target.closest('[data-bka]'); if (b) koppel(b.dataset.bka, o);
  });
  const q = ov.querySelector('#bkQ'); q.oninput = () => { ov.querySelector('#bkL').innerHTML = lijst(q.value); };
}
