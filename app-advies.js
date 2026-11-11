/* ---------- 1.15: beter advies ---------- */
function alleActies() {
  const l = (S.acties || []).slice(); const per = {}; l.forEach(a => { per[a.week + '|' + (a.van || '').slice(0, 4)] = new Set((a.items || []).map(i => i.nr)); });
  for (const p of Object.values(S.kwplan || {})) {
    kwNormPlan(p); const f = p.folder; if (!f || !f.week || !f.van) continue; const ac = C.folderNaarActie(f, 'fp-' + p.week); const al = per[f.week + '|' + f.van.slice(0, 4)];
    const pf = {}; for (const it of f.items) { const pk = (p.plek || {})[it.id]; if (pk && plekVan(pk)) for (const nr of it.nrs || []) pf[nr] = [plekF(pk), pk]; }
    ac.items.forEach(i => { if (pf[i.nr]) { i.plekF = pf[i.nr][0]; i.plek = pf[i.nr][1]; } });
    if (al) { const idx = l.findIndex(a => a.week === f.week && (a.van || '').slice(0, 4) === f.van.slice(0, 4) && !String(a.id).startsWith('fp-')); if (idx >= 0 && Object.keys(pf).length) l[idx] = Object.assign({}, l[idx], { items: l[idx].items.map(i => pf[i.nr] ? Object.assign({}, i, { plekF: pf[i.nr][0], plek: pf[i.nr][1] }) : i) }); ac.items = ac.items.filter(i => !al.has(i.nr)); }
    if (ac.items.length) l.push(ac);
  }
  return l.sort((p, q) => (p.van || '') < (q.van || '') ? -1 : 1);
}
function naModel() {
  M.leegN = {}; const g28 = C.add(C.today(), -28);
  for (const r of Object.values(S.leeg || {})) { const key = r.bron + ':' + r.nr; const sr = M.keys[key]; const i = C.idx(M, r.dag); if (sr && i >= 0 && i < M.N) { sr.leeg = sr.leeg || new Set(); sr.leeg.add(i); sr.bc = {}; } if (r.dag >= g28) M.leegN[key] = (M.leegN[key] || 0) + 1; }
  for (const k in S.bestel) {
    const b = S.bestel[k]; if (!b || b.reden !== 'klant' || !b.lever || b.aantal === null || b.aantal === undefined) continue;
    const key = k.split('|')[0]; const sr = M.keys[key], a = M.art[key]; if (!sr || !a) continue;
    let extra = (+b.aantal - +(b.advies || 0)) * (a.perHE && a.he > 0 ? a.he : 1);
    for (let d = b.lever; extra > 0 && d < C.add(b.lever, 3); d = C.add(d, 1)) { const i = C.idx(M, d); if (i < 0 || i >= M.N) continue; const af = Math.min(extra, sr.v[i]); sr.v[i] -= af; extra -= af; }
    sr.bc = {};
  }
  const hb = (S.inst || {}).houdb || {}; M.houdb = Object.keys(hb).length ? key => { const a = M.art[key]; const n = a ? +hb[groepVan(a)] : 0; return n > 0 ? n : null; } : null;
  const sc = {}; M.startBasis = (key, wd) => {
    const a = M.art[key]; if (!a || a.uit || !(a.nieuw || a.eigen)) return 0; const g = groepVan(a); const ck = g + '|' + wd;
    if (!(ck in sc)) { sc[ck] = 0; const vals = []; for (const k in M.art) { const b = M.art[k]; if (b === a || !M.keys[k] || groepVan(b) !== g) continue; const v = C.basis(M, k, wd, M.vandaag); if (v > 0) vals.push(v); } vals.sort((x, y) => x - y); sc[ck] = vals.length >= 3 ? vals[Math.floor(vals.length / 2)] : 0; }
    return sc[ck];
  };
  M.weerFactor = weerModel();
}
function vrVan(key) { const v = S.voorraad[key]; const bo = boVr(key); if (bo && !(v && v.dag && v.dag >= bo.dag)) return bo; if (v && v.dag && C.diff(v.dag, C.today()) <= 7) return v; return restant(key) || schatVoorraad(key) || v; }
/* 1.37: geschatte voorraad = leveringen via de app min kassaverkoop (vanaf de eerste levering in 21 dagen) */
function schatVoorraad(key) {
  const a = M.art[key], sr = M.keys[key], vandaag = C.today(); if (!a || !sr) return null; const he = a.perHE && a.he > 0 ? a.he : 1, lev = {};
  for (const b of bestellingenVan(key)) { if (!b.lever || b.lever > vandaag || b.lever < C.add(vandaag, -21)) continue; const n = b.aantal != null && b.aantal !== '' ? +b.aantal : b.besteld ? +(b.advies || 0) : 0; if (n > 0) lev[b.lever] = (lev[b.lever] || 0) + n * he; }
  const g = S.voorraad[key], basis = g && g.dag && g.dag >= C.add(vandaag, -21) ? g : null;
  const d0 = basis ? C.add(basis.dag, 1) : Object.keys(lev).sort()[0]; if (!d0) return null; let s = basis ? Math.max(0, +basis.aantal || 0) : 0;
  for (let d = d0; d <= vandaag; d = C.add(d, 1)) { s += lev[d] || 0; const i = C.idx(M, d); if (d < vandaag && i >= 0 && i < M.N && M.heeftData[i]) s = Math.max(0, s - sr.v[i]); }
  return { aantal: Math.round(s * 10) / 10, dag: vandaag, schat: true };
}
function restant(key) {
  const l = M.actieArt && M.actieArt[key]; if (!l) return null; const vandaag = C.today(); const a = M.art[key]; if (!a) return null; const he = a.perHE && a.he > 0 ? a.he : 1;
  const p = l.filter(x => x.zon < vandaag && x.zon >= C.add(vandaag, -10)).sort((x, y) => x.zon < y.zon ? 1 : -1)[0]; if (!p) return null;
  const last = M.dagLijst[M.dagLijst.length - 1]; if (!last || last < p.zon) return null; const sr = M.keys[key];
  let besteld = 0, eerste = null;
  for (const b of bestellingenVan(key)) { if (!b.lever || b.lever < C.add(p.mon, -4) || b.lever > p.zon) continue; const n = b.aantal !== null && b.aantal !== undefined ? +b.aantal : b.besteld ? +(b.advies || 0) : 0; if (n > 0) { besteld += n * he; if (!eerste || b.lever < eerste) eerste = b.lever; } }
  if (!besteld || !eerste) return null; let verk = 0; for (let d = eerste; d <= p.zon; d = C.add(d, 1)) { const i = C.idx(M, d); if (sr && i >= 0 && i < M.N) verk += sr.v[i]; }
  const rest = Math.round(besteld - verk); return rest > 0 ? { aantal: rest, dag: p.zon, restant: true, week: p.week } : null;
}
function nietGeleverd(key) { if (!S.lever) return false; const g = C.add(C.today(), -10); let laatst = null; for (const k in S.lever) { if (!k.startsWith(key + '|')) continue; const r = S.lever[k]; if (r.lever >= g && (!laatst || r.lever > laatst.lever)) laatst = r; } return !!(laatst && laatst.ok === false); }
function leegMelden(a) {
  const k = a.key + '|' + C.today(); if (S.leeg && S.leeg[k]) return toast('Vandaag al als leeg gemeld');
  write('leeg', [{ bron: a.bron, nr: a.nr, dag: C.today(), door: mijnNaam(), ts: new Date().toISOString() }]); log('leeg', `Schap leeg: ${a.naam}`);
  toast('🚫 Leeg gemeld. Deze dag telt niet als lage verkoop.', 3000); rebuild(); render(true);
}
const REDENEN = [['actie', 'Actie of display'], ['klant', 'Klantbestelling'], ['weer', 'Weer'], ['voorraad', 'Voorraad klopt niet'], ['anders', 'Anders']];
function toonReden(card, a, cur) {
  if (!card.isConnected) card = document.querySelector(`.card[data-k="${a.key}"]`); if (!card || card.querySelector('.redenrij')) return; const inp = card.querySelector('[data-in="b"]'); if (!inp) return;
  const host = inp.closest('.invoer') || inp.parentElement; host.insertAdjacentHTML('afterend', `<div class="redenrij"><span>Waarom anders dan het advies?</span>${REDENEN.map(r => `<button data-reden="${r[0]}">${r[1]}</button>`).join('')}</div>`);
  card.querySelector('.redenrij').onclick = e => { const b = e.target.closest('[data-reden]'); if (!b) return; e.stopPropagation(); write('bestellingen', [{ bron: a.bron, nr: a.nr, besteldag: cur.besteldag, lever: cur.L, reden: b.dataset.reden }]); const rr = card.querySelector('.redenrij'); if (rr) rr.innerHTML = `<span>✓ ${REDENEN.find(r => r[0] === b.dataset.reden)[1]}</span>`; if (b.dataset.reden === 'klant') rebuild(); };
}
/* weer */
async function weerHist() {
  const lat = (S.inst && S.inst.lat) || 52.325, lon = (S.inst && S.inst.lon) || 4.578; const c = ls.get('cba-weerhist');
  if (c && c.dag === C.today() && c.lat === lat) return;
  const eind = C.add(C.today(), -2), start = C.add(C.today(), -400);
  try {
    const r = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${eind}&daily=temperature_2m_max,precipitation_sum&timezone=Europe%2FAmsterdam`);
    const j = await r.json(); if (!j.daily) return; const data = {}; j.daily.time.forEach((d, i) => { if (j.daily.temperature_2m_max[i] !== null) data[d] = { t: j.daily.temperature_2m_max[i], r: j.daily.precipitation_sum[i] || 0 }; });
    ls.set('cba-weerhist', { dag: C.today(), lat, data });
    if (!ls.get('cba-weer')) await weer().catch(() => null);
    if (M && mw && !document.body.classList.contains('inlog')) { rebuild(); render(true); }
  } catch (e) { }
}
function weerModel() {
  M.weerGroep = {}; const hist = (ls.get('cba-weerhist') || {}).data, fc = (ls.get('cba-weer') || {}).data; if (!hist) return null;
  const grp = {};
  for (const key in M.keys) { const a = M.art[key]; const sr = M.keys[key]; if (!a || sr.kg) continue; const g = groepVan(a); const t = grp[g] || (grp[g] = new Float64Array(M.N)); for (let i = 0; i < M.N; i++) t[i] += sr.v[i]; }
  const med = l => { const b = l.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
  for (const g in grp) {
    const t = grp[g]; const r = { warm: [], koud: [], norm: [], nat: [], droog: [] };
    for (let i = 28; i < M.N - 1; i++) {
      const d = C.add(M.start, i); const w = hist[d]; if (!w || !M.heeftData[i] || M.bijz[d]) continue;
      const ref = []; for (const o of [-28, -21, -14, -7, 7, 14, 21, 28]) { const j = i + o; if (j >= 0 && j < M.N && M.heeftData[j] && !M.bijz[C.add(M.start, j)]) ref.push(t[j]); }
      if (ref.length < 3) continue; const base = ref.reduce((x, y) => x + y, 0) / ref.length; if (base < 3) continue; const q = t[i] / base;
      if (w.t >= 22) r.warm.push(q); else if (w.t <= 5) r.koud.push(q); else if (w.r < 5) r.norm.push(q);
      if (w.r >= 5) r.nat.push(q); else r.droog.push(q);
    }
    const n0 = med(r.norm), d0 = med(r.droog); const m = { n: r.norm.length + r.warm.length + r.koud.length };
    if (n0 > 0 && r.warm.length >= 8) { const e = med(r.warm) / n0; if (Math.abs(e - 1) >= 0.08) m.warm = Math.max(0.75, Math.min(1.25, e)); }
    if (n0 > 0 && r.koud.length >= 8) { const e = med(r.koud) / n0; if (Math.abs(e - 1) >= 0.08) m.koud = Math.max(0.75, Math.min(1.25, e)); }
    if (d0 > 0 && r.nat.length >= 8) { const e = med(r.nat) / d0; if (Math.abs(e - 1) >= 0.08) m.nat = Math.max(0.75, Math.min(1.25, e)); }
    if (m.warm || m.koud || m.nat) M.weerGroep[g] = m;
  }
  if (!fc || !Object.keys(M.weerGroep).length) return null; const uit = new Set((S.inst || {}).weerUit || []);
  return (key, d) => { const w = fc[d]; if (!w) return 1; const a = M.art[key]; if (!a) return 1; const g = groepVan(a); const m = M.weerGroep[g]; if (!m || uit.has(g)) return 1; let f = 1; if (w.t >= 22 && m.warm) f *= m.warm; if (w.t <= 5 && m.koud) f *= m.koud; if (w.r >= 5 && m.nat) f *= m.nat; return Math.max(0.75, Math.min(1.25, f)); };
}
/* ontbrekende dagen */
function ontbrekend(n = 56) {
  if (!M || !M.dagLijst.length) return []; const have = new Set(M.dagLijst); const eerste = M.dagLijst[0]; const out = [];
  for (let d = C.add(C.today(), -n); d < C.today(); d = C.add(d, 1)) { if (d < eerste || have.has(d)) continue; if (M.bijz[d] && M.bijz[d].soort === 'gesloten') continue; const o = M.st.open[C.wd(d)]; if (o && !o[0] && !o[1]) continue; out.push(d); }
  return out;
}
function ontbrekendTekst(l) { if (!l.length) return ''; if (l.length === 1) return `${C.fmtDag(l[0])} ontbreekt`; if (l.length <= 4) return `${l.length} dagen ontbreken: ${l.map(d => C.fmtDag(d)).join(', ')}`; return `${l.length} dagen ontbreken (sinds ${C.fmtDag(l[0])})`; }
function kalenderHtml() {
  if (!M) return ''; const have = new Set(M.dagLijst); const mis = new Set(ontbrekend(56)); const mon = C.add(C.monday(C.today()), -49); let h = `<div class="kal"><div class="kalkop">${['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map(d => `<span>${d}</span>`).join('')}</div>`;
  for (let w = 0; w < 8; w++) { h += '<div class="kalrij">'; for (let i = 0; i < 7; i++) { const d = C.add(mon, w * 7 + i); const c = d >= C.today() ? 'toek' : have.has(d) ? 'ok' : mis.has(d) ? 'mist' : 'dicht'; h += `<span class="${c}" title="${d}">${+d.slice(8)}</span>`; } h += '</div>'; }
  return h + '<div class="small" style="margin-top:6px"><span class="kalleg ok"></span> binnen <span class="kalleg mist"></span> ontbreekt <span class="kalleg dicht"></span> gesloten / voor de eerste export</div></div>';
}
