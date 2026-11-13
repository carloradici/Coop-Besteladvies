/* ---------- 1.33: looproute (pad per artikel, leert mee) ---------- */
const ROUTE_STD = { kw: [
  ['Aperitieven en premixen › Premixen en likorettes', 'Wijnen › Witte wijn', 'Wijnen › Rosé wijn', 'Wijnen › Rode wijn', 'Bieren › Speciaalbieren', 'Bieren › Pilseners', 'Bieren › Alcoholvrije bieren', "Chips, nootjes en toast › Pinda's en noten", 'Chips, nootjes en toast › Cocktailsnacks en zoute biscuits', 'Chips, nootjes en toast › Chips'],
  ['Non food › Lucifers, aanstekers en kaarsen', 'Papierwaren › Toiletpapier', 'Dierenvoeding › Hondenvoeding', 'Dierenvoeding › Kattenvoeding', 'Wasmiddelen › Wasverzachters', 'Wasmiddelen › Wasmiddelen', 'Schoonmaakmiddelen › Allesreinger', 'Schoonmaakmiddelen › Bleek', 'Schoonmaakmiddelen › Schuurmiddel', 'Schoonmaakmiddelen › Specialistische reinigers', 'Schoonmaakmiddelen › Toiletreinigers', 'Schoonmaakmiddelen › Handafwasmiddel', 'Schoonmaakmiddelen › Vaatwasmiddel en toebehoren', 'Schoonmaakmiddelen › Onderhoudsmiddelen', 'Schoonmaakmiddelen › Poetsmiddel', 'Verfrissers › Toiletblokken', 'Verfrissers › Luchtverfrissers', 'Non food › Overig non food assortiment'],
  ['Sappen en siropen › Siropen', 'Sappen en siropen › Vruchten- en groentesappen', 'Sappen en siropen › Frisse fruitdranken', 'Sappen en siropen › Vruchtendranken', 'Chips, nootjes en toast › Toastjes', 'Mineraal- en bronwaters › Koolzuurhoudend', 'Mineraal- en bronwaters › Koolzuurvrij', 'Sappen en siropen › Ice Tea', 'Frisdrank › Overige frisdranken', 'Frisdrank › Sinas', 'Frisdrank › Cola'],
  ['Snoep en chocolade › Drop', 'Snoep en chocolade › Snoep', 'Snoep en chocolade › Kauwgom', 'Koffie, thee en cacao › Koffiepads en -cups', 'Koffie, thee en cacao › Gemalen koffie en koffiebonen', 'Koffie, thee en cacao › Oploskoffie', 'Koffie, thee en cacao › Koffiemelk, -room en -creamer', 'Koffie, thee en cacao › Suiker en zoetmiddelen', 'Koffie, thee en cacao › Thee', "Baby's en peuters › Luiers", "Baby's en peuters › Fruit- en groentehapjes en sapjes", "Baby's en peuters › Kindermeel", 'Persoonlijke verzorging › Handzeep', 'Persoonlijke verzorging › Shampoo en conditioner', 'Persoonlijke verzorging › Douche en bad', 'Persoonlijke verzorging › Haarstyling', 'Persoonlijke verzorging › Mondverzorging', 'Persoonlijke verzorging › Huid en gezicht', 'Persoonlijke verzorging › Scheerproducten', 'Persoonlijke verzorging › Deodorants'],
  ['Ontbijtgranen › Cornflakes', 'Ontbijtgranen › Muesli', 'Ontbijtgranen › Overige ontbijtgranen', 'Broodvervangers › Roggebrood', 'Broodvervangers › Beschuit en rijstwafels', 'Broodvervangers › Ontbijtkoek', 'Broodvervangers › Crackers', 'Boterhambeleg › Jam', 'Boterhambeleg › Boterhamsmeersels', 'Boterhambeleg › Boterhamstrooisels', 'Boterhambeleg › Suikerstroop'],
  ['Conserven › Groenteconserven', 'Conserven › Tomatenconserven', 'Kookproducten › Maaltijdpakketten', 'Kookproducten › Maaltijdsauzen', 'Olie, sauzen en zuren › Sambal', 'Olie, sauzen en zuren › Ketjap en Marinades']] };
function routeR() { if (!S.route) S.route = { od: { kw: { aan: true, paden: ROUTE_STD.kw } }, art: {}, hand: {} }; return S.route; }
function routeOd(od) { return routeR().od[od] || { aan: false, paden: [] }; }
function routeAan(od) { return !!routeOd(od).aan; }
let ROUTE_GI = null; function routeGi(od) { if (!ROUTE_GI || ROUTE_GI._r !== routeR()) ROUTE_GI = { _r: S.route }; if (!ROUTE_GI[od]) { const m = {}; routeOd(od).paden.forEach((l, p) => l.forEach((g, j) => m[g] = [p + 1, j])); ROUTE_GI[od] = m; } return ROUTE_GI[od]; }
function routeOpslaan() { ROUTE_GI = null; clearTimeout(routeOpslaan.t); routeOpslaan.t = setTimeout(() => write('voorkeuren', [{ wie: 'route', data: S.route }], true), 3000); }
function routePad(a) { const R = routeR(), h = R.hand[a.key], l = R.art[a.key], g = routeGi(onderdeelVan(a))[groepVan(a)]; return h || (l && l.p) || (g ? g[0] : 0); }
function routeRang(a, gr) {
  const R = routeR(), p = routePad(a), l = R.art[a.key], g = routeGi(onderdeelVan(a))[groepVan(a)], i = (a.i ?? 9999) % 1e4;
  if (!p) return 99e6 + gr * 1e4 + i;
  return p * 1e6 + (l && l.p === p && l.x != null ? l.x : g && g[0] === p ? g[1] * 1e4 + i : 9e5 + i);
}
const ROUTE_SES = {};
function routeTik(a, cur) {
  const od = onderdeelVan(a); if (!routeAan(od) || !cur) return; const s = ROUTE_SES[od];
  if (!s || s.bd !== cur.besteldag || Date.now() - s.t > 6e5) ROUTE_SES[od] = { bd: cur.besteldag, t: 0, l: [] };
  const z = ROUTE_SES[od]; z.t = Date.now(); if (z.l.includes(a.key)) return; z.l.push(a.key);
  if (z.l.length >= 3) routeLeer(...z.l.slice(-3).map(k => M.art[k]));
}
function routeLeer(v, a, n) {
  if (!v || !a || !n) return; const rv = routeRang(v, 0), rn = routeRang(n, 0); if (!(rv < rn) || rn >= 99e6) return;
  const R = routeR(), t = (rv + rn) / 2, pT = Math.floor(t / 1e6), xT = t % 1e6, p = routePad(a), l = R.art[a.key];
  if (R.hand[a.key] && R.hand[a.key] !== pT) return;
  if (pT === p || !p || (l && l.c === pT)) R.art[a.key] = { p: pT, x: l && l.p === pT && l.x != null ? (l.x + xT) / 2 : xT };
  else R.art[a.key] = Object.assign({}, l || { p }, { c: pT });
  routeOpslaan();
}
function routeChip(a) { const od = onderdeelVan(a); if (!routeAan(od)) return ''; const p = routePad(a); return `<button class="padchip ${p ? '' : 'onb'}" data-pad="1">🚶 Pad ${p || '?'}${routeR().hand[a.key] ? ' ✋' : ''}</button>`; }
function routeKiesPad(a) {
  const n = Math.max(routeOd(onderdeelVan(a)).paden.length, 1), R = routeR();
  sheet(`<h2 style="margin:0">${esc(a.naam)}</h2><p class="small">In welk pad staat dit artikel? Dit gaat voor op wat de app leert.</p><div class="padkeus">${Array.from({ length: n }, (_, i) => `<button class="btn ${routePad(a) === i + 1 ? '' : 'sec'}" data-kp="${i + 1}">Pad ${i + 1}</button>`).join('')}</div><button class="btn sec" data-kp="0" style="width:100%;margin-top:8px">Automatisch (laat de app leren)</button><button class="btn sec" data-x style="width:100%;margin-top:8px">Annuleren</button>`, (e, o) => {
    const b = e.target.closest('[data-kp]'); if (!b) return; const p = +b.dataset.kp; if (p) { R.hand[a.key] = p; delete R.art[a.key]; } else delete R.hand[a.key];
    o.remove(); routeOpslaan(); render(true);
  });
}
function renderRoute() {
  const v = $('#view'), R = routeR(), ods = BESTEL_OD.filter(od => mag('o_' + od) && lijstArtikelen(od).length), od = ui.routeOd && ods.includes(ui.routeOd) ? ui.routeOd : ods.includes('kw') ? 'kw' : ods[0];
  if (!od) { v.innerHTML = '<div class="empty">Nog geen bestelboek.</div>'; return; }
  ui.routeOd = od; const r = routeOd(od), ed = mag('instellingen'), arts = lijstArtikelen(od), gi = routeGi(od);
  const groepen = [...new Set(arts.map(groepVan))], los = groepen.filter(g => !gi[g]), tel = {}; arts.forEach(a => { const p = routePad(a); tel[p] = (tel[p] || 0) + 1; });
  const onb = arts.filter(a => !routePad(a)), og = {}; onb.forEach(a => og[groepVan(a)] = (og[groepVan(a)] || 0) + 1);
  const padOpt = n => r.paden.map((_, i) => `<option value="${i + 1}" ${n === i + 1 ? 'selected' : ''}>Pad ${i + 1}</option>`).join('');
  v.innerHTML = `<div class="segment licht">${ods.map(o => `<button class="${o === od ? 'aan' : ''}" data-rod="${o}">${odNaam(o)}</button>`).join('')}</div>
  <div class="blk"><h2>🚶 Looproute ${odNaam(od)}</h2><p class="small">De lijst staat in de volgorde waarin je door de winkel loopt. Bij elke bestelling leert de app per artikel waar je het pakt.</p>
  <label class="schak"><input type="checkbox" id="rAan" ${r.aan ? 'checked' : ''} ${ed ? '' : 'disabled'}> Route gebruiken</label></div>
  ${r.paden.map((l, p) => `<div class="blk">${klap('rp' + od + p, `Pad ${p + 1} <span class="small">· ${l.length} groepen · ${tel[p + 1] || 0} artikelen</span>`, `<div class="list">${l.map((g, j) => `<div class="it"><span style="flex:1">${esc(g)}</span>${ed ? `<button class="btn sm sec" data-rup="${p},${j}" ${j ? '' : 'disabled'}>▲</button><button class="btn sm sec" data-rx="${p},${j}">✕</button>` : ''}</div>`).join('') || '<p class="small">Nog geen groepen.</p>'}</div>
  ${ed && los.length ? `<select data-radd="${p}"><option value="">+ Groep toevoegen…</option>${los.map(g => `<option>${esc(g)}</option>`).join('')}</select>` : ''}`)}</div>`).join('')}
  ${ed ? '<button class="btn sec" id="rPad" style="width:100%">+ Pad toevoegen</button>' : ''}
  <div class="blk">${klap('rnp' + od, `Nog geen pad <span class="small">· ${onb.length} artikelen</span>`, `<p class="small">De app leert het pad zodra je deze artikelen bestelt tussen andere artikelen. Je kunt ook een hele groep in één keer toewijzen.</p><div class="list">${Object.entries(og).sort((x, y) => y[1] - x[1]).map(([g, n]) => `<div class="it"><span style="flex:1">${esc(g)} <span class="small">(${n})</span></span>${ed && r.paden.length ? `<select data-rgp="${esc(g)}"><option value="">Pad…</option>${padOpt(0)}</select>` : ''}</div>`).join('') || '<p class="small">✓ Alles heeft een pad.</p>'}</div>`)}</div>
  ${ed ? '<button class="btn sec" id="rReset" style="width:100%">Terug naar volgorde bestelboek</button>' : ''}`;
  const zet = f => { R.od[od] = Object.assign({ aan: false, paden: [] }, R.od[od]); R.od[od].paden = R.od[od].paden.map(l => l.slice()); f(R.od[od]); routeOpslaan(); render(true); };
  v.querySelectorAll('[data-rod]').forEach(b => b.onclick = () => { ui.routeOd = b.dataset.rod; render(); });
  const ra = $('#rAan'); if (ra) ra.onchange = () => zet(x => x.aan = ra.checked);
  v.querySelectorAll('[data-rup]').forEach(b => b.onclick = () => { const [p, j] = b.dataset.rup.split(',').map(Number); zet(x => x.paden[p].splice(j - 1, 0, x.paden[p].splice(j, 1)[0])); });
  v.querySelectorAll('[data-rx]').forEach(b => b.onclick = () => { const [p, j] = b.dataset.rx.split(',').map(Number); let weg; zet(x => { weg = x.paden[p].splice(j, 1)[0]; }); ongedaan('Groep uit pad gehaald', () => zet(x => x.paden[p].splice(j, 0, weg))); });
  v.querySelectorAll('[data-radd]').forEach(s => s.onchange = () => s.value && zet(x => x.paden[+s.dataset.radd].push(s.value)));
  v.querySelectorAll('[data-rgp]').forEach(s => s.onchange = () => s.value && zet(x => x.paden[+s.value - 1].push(s.dataset.rgp)));
  const rp = $('#rPad'); if (rp) rp.onclick = () => zet(x => x.paden.push([]));
  const rr = $('#rReset'); if (rr) rr.onclick = async () => { if (!await bevestig('Terug naar bestelboek?', `De route van ${odNaam(od)} gaat uit en wat de app geleerd heeft wordt gewist.`, 'Ja, terug')) return; arts.forEach(a => { delete R.art[a.key]; delete R.hand[a.key]; }); zet(x => x.aan = false); };
}
