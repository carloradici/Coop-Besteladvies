/* ---------- deadlines per groep (1.13) ---------- */
const DL_ODS = { versunie: ['agf', 'vers', 'brood', 'diep'], vantol: ['kw'] };
const nuTs = () => C.today() + ' ' + nuHHMM();
const mooiGroep = g => { g = String(g || ''); return g === g.toUpperCase() ? g.charAt(0) + g.slice(1).toLowerCase() : g; };
function regelNaam(r) { if (r.naam) return r.naam; const g = (r.groepen || []).map(mooiGroep); return g.length <= 2 ? g.join(' en ') : `${g[0]}, ${g[1]} +${g.length - 2}`; }
function dlRegels() { return ((S.inst || {}).dlRegels || []).filter(r => r && r.t && (r.groepen || []).length); }
function dlVoor(lev, g, lv) {
  if (!lv) return null; const r = dlRegels().find(x => x.lev === lev && x.groepen.includes(g)) || null;
  const t = r ? r.t : ((S.inst || {}).deadline || {})[lev]; if (!t) return null;
  let dag = C.add(lv.besteldag, r ? +r.d || 0 : 0); if (dag >= lv.L) dag = C.add(lv.L, -1); if (dag < lv.besteldag) dag = lv.besteldag;
  return { dag, t, ts: dag + ' ' + t, regel: r };
}
function dlArt(a, lv) { const lev = levVan(a); return lev === 'versunie' || lev === 'vantol' ? dlVoor(lev, groepVan(a), lv) : null; }
function dlKort(dg) { return dg.dag === C.today() ? `tot ${dg.t}` : `tot ${C.DAGEN[C.wd(dg.dag)]} ${dg.t}`; }
let odgCache = null;
function odGroepen(od) { if (!odgCache || odgCache.M !== M) odgCache = { M }; return odgCache[od] || (odgCache[od] = [...new Set(lijstArtikelen(od).map(groepVan))]); }
function bdLijst(od, n = 4) {
  const vandaag = C.today(); const sch = M.st.schema[od] || M.st.schema.vers || []; const verl = []; const lev = od === 'kw' ? 'vantol' : 'versunie'; const nu = nuTs();
  const regels = dlRegels().filter(r => r.lev === lev && odGroepen(od).some(g => r.groepen.includes(g)) && (+r.d || 0) > 0);
  if (regels.length) for (let k = 3; k >= 1; k--) {
    const d = C.add(vandaag, -k); if (!sch.some(x => x.b === C.wd(d))) continue; const lv = C.levering(M, od, d); if (!lv || lv.L <= vandaag) continue;
    if (regels.some(r => (dlVoor(lev, r.groepen[0], lv) || {}).ts > nu)) verl.push(lv);
  }
  return verl.concat(C.besteldagen(M, od, n));
}
function groepRang(od) { const l = (S.inst && S.inst.groepVolgorde && S.inst.groepVolgorde[od]) || []; const m = {}; l.forEach((g, i) => m[g] = i); return m; }
function lijstArtikelen(od) {
  const bron = bronVan(od); const b = S.boeken[bron];
  const lijst = Object.values(M.art).filter(a => (a.eigen ? a.od === od : b && a.bron === bron && onderdeelVan(a) === od) && !(a.uit && S.schapOk.has(a.key)));
  const rang = groepRang(od); const eerst = {}; lijst.forEach(a => { const g = groepVan(a); const i = a.i ?? 1e9; if (eerst[g] === undefined || i < eerst[g]) eerst[g] = i; });
  const gr = a => { const g = groepVan(a); return g in rang ? rang[g] : 1000 + eerst[g] / 1e9; };
  const bo = a => M.boInfo && M.boInfo[a.key] ? 0 : 1;
  if (routeAan(od)) { const r = new Map(lijst.map(a => [a, routeRang(a, gr(a))])); return lijst.sort((x, y) => bo(x) - bo(y) || r.get(x) - r.get(y)); }
  return lijst.sort((x, y) => bo(x) - bo(y) || gr(x) - gr(y) || (x.i ?? 1e9) - (y.i ?? 1e9));
}
function groepToon(a) { return M.boInfo && M.boInfo[a.key] ? '🥐 Bake-off' : groepVan(a);
}
function groepVan(a) { return a.groep || a.afd || ''; }
function zichtbaar(a, bd) {
  const st = assStatus(a); const r = S.assort[a.key]; const label = C.actieLabel(M, a.key);
  if (ui.q) { const q = ui.q.toLowerCase(); if (!(a.nr.includes(q) || (a.eigen ? (a.bst || '').includes(q) : (a.bst || '') === q) || zoekScore(ui.q, a.naam + ' ' + (a.merk || '')) > 0)) return false; }
  if (ui.groep && groepVan(a) !== ui.groep) return false;
  if (ui.fActie && !(label && label.some(l => l.t !== 'vorige'))) return false;
  if (!ui.fAlles && !ui.q && !ui.fActie) { const tonen = st === 'in' || a.uit || (st === 'gesaneerd' && !(r && r.schap_ok)); if (!tonen) return false; }
  if (ui.fAdv || ui.fOpen) {
    if (st !== 'in' || a.uit) return false;
    const ad = C.advies(M, a.key, bd, vrVan(a.key), bestellingenVan(a.key));
    if (ui.fAdv && !ad.adv) return false;
    if (ui.fOpen && bd.besteldag < C.today()) { const dg = dlArt(a, bd); if (!(dg && dg.ts > nuTs())) return false; }
    if (ui.fOpen) { const be = S.bestel[a.key + '|' + bd.besteldag]; const nodig = be && be.aantal !== null && be.aantal !== undefined ? be.aantal > 0 : ad.adv > 0; if (!nodig || (be && be.besteld)) return false; }
  }
  return true;
}
function bestellingenVan(key) { const out = []; for (const k in S.bestel) if (k.startsWith(key + '|')) { const b = S.bestel[k]; const lc = S.lever && S.lever[key + '|' + b.lever]; out.push(lc && lc.ok === false && b.aantal !== null && b.aantal !== undefined ? Object.assign({}, b, { aantal: Math.max(0, +b.aantal - (+lc.mist || +b.aantal)) }) : b); } return out; }

function lijstMenu(od, cur, arts, bdSleutel) {
  const st = cur ? voortgang(od, cur) : null; const opties = [];
  if (cur && mag('bestellen') && st && st.advies) opties.push(['allesAdv', '✨', 'Alles volgens advies invullen', 'Bij alles zonder eigen bestelling']);
  opties.push(['prt', '👁️', 'Pdf bekijken', 'Bestellijst met barcodes, om te printen of te delen']);
  if (cur && mag('afvinken')) opties.push(['ctl', '🔍', 'Controle met terminal', 'Vrijwillig: vergelijk met je bestelgeschiedenis']);
  opties.push(['bericht', '✉️', 'Bericht voor ' + beheerNamen().join(' of '), 'Bijvoorbeeld een tekort of iets wat niet klopt']);
  if (cur && S.notities[bdSleutel]) opties.push(['bdNot', '📝', 'Notitie bij deze besteldag', '']);
  if (mag('saneren')) opties.push(['eigAdd', '➕', 'Artikel toevoegen', 'Een artikel dat niet in het bestelboek staat']);
  opties.push(['fAdv', ui.modus === 'advies' ? '✅' : '✨', 'Alleen artikelen met advies', ui.modus === 'advies' ? 'Staat aan · tik om uit te zetten' : ''], ['fAct', ui.modus === 'acties' ? '✅' : '🏷️', 'Alleen acties', ui.modus === 'acties' ? 'Staat aan · tik om uit te zetten' : ''], ['telA', ui.telAlle ? '✅' : '🔢', 'Tellen bij elk artikel tonen', ui.telAlle ? 'Staat aan' : 'Standaard alleen als de app erom vraagt']);
  if (mag('heleboek')) opties.push(['heleBoek', ui.fAlles ? '✅' : '📚', ui.fAlles ? 'Hele boek tonen: aan' : 'Hele boek tonen', 'Ook artikelen buiten jullie assortiment']);
  const ov = sheet(`<h2 style="margin:0 0 4px">Meer opties</h2>${opties.map(o => `<button class="belrij" data-lm="${o[0]}"><span class="ic">${o[1]}</span><span><b>${o[2]}</b>${o[3] ? `<small>${o[3]}</small>` : ''}</span><span class="pijl">›</span></button>`).join('')}<button class="btn sec" data-x style="margin-top:10px">Sluiten</button>`, (e, o) => {
    const b = e.target.closest('[data-lm]'); if (!b) return; o.remove(); const k = b.dataset.lm;
    if (k === 'allesAdv') allesVolgensAdvies(od, cur);
    if (k === 'telB') telModus(od, arts.filter(a => !a.uit && assStatus(a) === 'in'));
    if (k === 'telS') telModus(od, [], true);
    if (k === 'prt') printOpties(od, lijstArtikelen(od));
    if (k === 'ctl') controleSheet(od, cur);
    if (k === 'bericht') berichtMaken(`${odNaam(od)}${cur ? ' · bestellen ' + C.fmtDag(cur.besteldag) : ''}: `);
    if (k === 'bdNot') notitieBewerk(bdSleutel, `${odNaam(od)} – bestellen ${C.fmtDag(cur.besteldag)}`);
    if (k === 'eigAdd') eigenBewerk(null, od);
    if (k === 'heleBoek') { ui.fAlles = !ui.fAlles; saveUi(); render(); }
    if (k === 'fAdv' || k === 'fAct') { const m = k === 'fAdv' ? 'advies' : 'acties'; ui.modus = ui.modus === m ? 'alles' : m; ui.fAdv = ui.modus === 'advies'; ui.fActie = ui.modus === 'acties'; ui.fOpen = false; saveUi(); render(); }
    if (k === 'telA') { ui.telAlle = !ui.telAlle; saveUi(); render(); }
  });
}
let lazy = null;
function renderLijst(od, soft) {
  const v = $('#view'); const bron = bronVan(od);
  const boek = S.boeken[bron];
  const { lijst, cur } = besteldag(od);
  const y = window.scrollY;
  const alleArts = lijstArtikelen(od);
  const groepen = [...new Set(alleArts.filter(a => ui.fAlles || assStatus(a) === 'in').map(groepVan))];
  const bdSleutel = cur ? `b:${od}:${cur.besteldag}` : '';
  if (!ui.modus) ui.modus = ui.fOpen ? 'todo' : ui.fAdv ? 'advies' : ui.fActie ? 'acties' : 'alles';
  const zetModus = m => { ui.modus = m; ui.fOpen = m === 'todo'; ui.fAdv = m === 'advies'; ui.fActie = m === 'acties'; ui.groep = ''; saveUi(); };
  if (beginner() || !mag('bestellen')) { if (!window.__E2E_ALLES) ui.modus = 'todo'; }
  zetModus(ui.modus);
  const ci = cur ? lijst.indexOf(cur) : -1;
  const st = cur ? voortgang(od, cur, cur.besteldag < C.today()) : null; const klaar = st ? st.nodig - st.open : 0;
  const leeg = !boek || !M.dagLijst.length;
  let html = `<div class="bar lijstkop">
  ${cur ? `<div class="bdkop"><button class="bdpijl" id="bdV" ${ci > 0 ? '' : 'disabled'} aria-label="Vorige besteldag">‹</button><div class="bdmid"><b>Bestellen ${C.DAGNAAM[C.wd(cur.besteldag)]} ${C.fmtDag(cur.besteldag).split(' ')[1]}</b><span>levering ${C.fmtDag(cur.L)}${!leeg && st.nodig ? ` · ${st.open ? `${klaar} van ${st.nodig} besteld` : '✓ alles besteld'}` : ''}</span></div><button class="bdpijl" id="bdN" ${ci < lijst.length - 1 ? '' : 'disabled'} aria-label="Volgende besteldag">›</button>${!leeg && st.nodig && klaar ? `<div class="vgbalk ${st.open ? '' : 'klaar'}"><div style="width:${Math.round(klaar / st.nodig * 100)}%"></div></div>` : ''}</div>` : '<div class="bdkop"><div class="bdmid"><b>Geen besteldag</b><span>Stel de besteldagen in onder Beheer</span></div></div>'}
  ${cur && cur.besteldag < C.today() ? `<div class="banner dlnog"><h3>⏰ Nog te bestellen: ${dlRegels().filter(r => r.lev === (od === 'kw' ? 'vantol' : 'versunie') && odGroepen(od).some(g => r.groepen.includes(g))).map(r => [r, dlVoor(r.lev, r.groepen[0], cur)]).filter(x => x[1] && x[1].ts > nuTs()).map(([r, dg]) => `${esc(regelNaam(r))} ${dlKort(dg)}`).join(', ')}</h3><div class="sub">De andere groepen van deze bestelling zijn al voorbij.</div></div>` : ''}
  ${cur && !leeg && !st.nodig ? '<div class="vgtxt">Voor deze besteldag is er geen advies.</div>' : ''}
  <div id="weer"></div>
  ${cur && !leeg ? telVraagHtml(od, cur) : ''}
  ${cur ? notitieHtml(bdSleutel) : ''}
  <div class="row zoekrij"><input type="search" id="q" placeholder="🔍 Zoek naam of nummer" value="${esc(ui.q)}"><button class="btn sm sec scanknop" id="scanB" aria-label="Scannen">📷 Scan</button></div>
  ${cur && !leeg && st.nodig && !st.open && !kantoorMag() && !ui.q ? `<div class="blk klaarblok"><div style="font-size:56px">✅</div><h2>Klaar! ${esc(odNaam(od))} is besteld.</h2><p class="small">${st.nodig} artikelen. Goed bezig!</p><button class="btn" id="klaarHome" style="width:100%">Terug naar Home</button></div>` : ''}
  ${beginner() || !mag('bestellen') ? '' : `<div class="segment licht modus">${[['todo', 'Te doen'], ['alles', 'Alles']].map(([k, l]) => `<button class="${ui.modus === k ? 'aan' : ''}" data-mod="${k}">${l}</button>`).join('')}${ui.modus === 'advies' || ui.modus === 'acties' ? `<button class="aan" data-mod="alles">${ui.modus === 'advies' ? 'Met advies' : 'Acties'} ✕</button>` : ''}</div>`}
  <button class="link meeropties" id="lijstMenu">⋯ Meer opties${ui.fAlles ? ' · hele boek aan' : ''}</button></div>`;
  if (leeg) html += `<div class="blk leegblok"><h2>Nog geen bestelboek of verkoopcijfers</h2><p class="small">${!boek ? `Het bestelboek van ${bron === 'vers' ? 'Versunie' : 'Van Tol'} ontbreekt. ` : ''}${!M.dagLijst.length ? 'Er zijn nog geen dag-exports uit CasPos. ' : ''}${mag('upload') ? 'Upload ze via Beheer, daarna zie je hier het advies.' : 'De beheerder zet dit klaar. Daarna zie je hier het advies.'}</p>${mag('upload') ? '<button class="btn" id="naarBeheer" style="width:100%">Naar Beheer</button>' : ''}</div>`;
  else { const last = M.dagLijst[M.dagLijst.length - 1]; const oud = C.diff(last, C.today()); if (oud > 2 && (isBeheer() || mag('upload'))) html += `<div class="banner warn"><h3>Verkoop t/m ${C.fmtDag(last)}</h3><div class="sub">De laatste dag-export is ${oud} dagen oud. Het advies is minder nauwkeurig.</div></div>`; }
  const t = (() => { let n = 0, u = 0; if (boek) { n = (boek.nieuw || []).filter(nr => M.art[bron + ':' + nr] && onderdeelVan(M.art[bron + ':' + nr]) === od).length; u = (boek.uit || []).filter(a => !S.schapOk.has(bron + ':' + a.nr) && M.art[bron + ':' + a.nr] && onderdeelVan(M.art[bron + ':' + a.nr]) === od).length; } for (const k in S.assort) { const r = S.assort[k], a = M.art[k]; if (!a || onderdeelVan(a) !== od || r.schap_ok) continue; if (r.status === 'gesaneerd') u++; if (r.status === 'in' && r.opgenomen) n++; } return { n, u }; })();
  if (t.n || t.u) html += `<div class="banner"><h3><span>Assortiment gewijzigd</span><button class="btn sm sec" id="assT">Bekijk</button></h3><div class="sub">${t.n} nieuw · ${t.u} schap opnieuw indelen</div></div>`;
  if (cur && !leeg) html += boBanner(alleArts, cur);
  let arts = alleArts.filter(a => zichtbaar(a, cur)), nulVan = -1;
  let extraNaam = 'Zonder advies';
  if (cur && ui.modus === 'todo' && !ui.q && kantoorMag()) { const tw = alleArts.filter(a => !a.uit && assStatus(a) === 'in' && (!ui.groep || groepVan(a) === ui.groep) && !S.bestel[a.key + '|' + cur.besteldag] && C.advies(M, a.key, cur, vrVan(a.key), bestellingenVan(a.key)).twijfel); if (tw.length) { extraNaam = '👀 Even kijken'; nulVan = arts.length; if (ui.toonNul) arts = arts.concat(tw); else arts.nulN = tw.length; } }
  if (cur && ui.modus === 'alles' && !ui.q) { const nul = arts.filter(a => { if (a.uit || assStatus(a) !== 'in') return false; const be = S.bestel[a.key + '|' + cur.besteldag]; return !(be && (be.besteld || (be.aantal != null && be.aantal !== ''))) && !C.advies(M, a.key, cur, vrVan(a.key), bestellingenVan(a.key)).adv; }); if (nul.length > 5) { const z = new Set(nul); arts = arts.filter(a => !z.has(a)); nulVan = arts.length; if (ui.toonNul) arts = arts.concat(nul); else arts.nulN = nul.length; } }
  html += `<div id="lst"></div>`;
  if (cur && !leeg && st.nodig && mag('afvinken')) html += `<div class="klaarblok"><button class="btn klaarknop" id="klaarB">${st.open ? 'Klaar, alles besteld ✓' : '✓ Alles besteld'}</button><p class="small">${st.open ? `Vinkt de ${st.open} open artikelen in één keer af.` : 'Goed bezig 👍'}</p></div>`;
  if (!arts.length && !leeg) html += `<div class="empty">${ui.modus === 'todo' ? '✓ Niets meer te doen voor deze besteldag.' : 'Geen artikelen voor deze keuze.'}</div>`;
  v.innerHTML = html;
  const bv = $('#bdV'); if (bv) bv.onclick = () => { ui.bd[od] = lijst[ci - 1].besteldag; render(); };
  const bnx = $('#bdN'); if (bnx) bnx.onclick = () => { ui.bd[od] = lijst[ci + 1].besteldag; render(); };
  v.querySelectorAll('[data-mod]').forEach(b => b.onclick = () => { zetModus(b.dataset.mod); render(); });
  const nb = $('#naarBeheer'); if (nb) nb.onclick = () => naarBeheer('upload');
  $('#lijstMenu').onclick = () => lijstMenu(od, cur, arts, bdSleutel);
  const tv = $('#telV'); if (tv) tv.onclick = () => telModus(od, telKeuze(od, cur).open.map(k => M.art[k]).filter(Boolean));
  const q = $('#q'); q.oninput = () => { ui.q = q.value.trim(); clearTimeout(q._t); q._t = setTimeout(() => { render(); const n = $('#q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  const at = $('#assT'); if (at) at.onclick = () => ga('assort');
  const kb = $('#klaarB'); if (kb) kb.onclick = () => allesBesteld(od, cur);
  $('#scanB').onclick = () => scanStart(od);
  const kh = $('#klaarHome'); if (kh) kh.onclick = () => ga('home');
  const lst = $('#lst'); let pos = 0, lastG = null, lastP = -1; const ra = routeAan(od);
  const tel = {}; arts.forEach(a => { const g = groepToon(a); tel[g] = (tel[g] || 0) + 1; });
  const nulKop = () => `<button class="grp nulkop" data-nul="1"><span>${extraNaam} (${ui.toonNul ? arts.length - nulVan : arts.nulN})</span><small>${ui.toonNul ? '▴ verbergen' : '▾ tonen'}</small></button>`;
  const chunk = () => {
    const end = Math.min(arts.length, pos + 40); let h = '';
    for (; pos < end; pos++) { if (pos === nulVan && ui.toonNul) { h += nulKop(); lastG = null; } const a = arts[pos]; const g = groepToon(a); if (ra) { const p = routePad(a); if (p !== lastP) { h += `<div class="padkop">🚶 ${p ? 'Pad ' + p : 'Nog geen pad'}</div>`; lastP = p; lastG = null; } } if (g !== lastG) { const dg = cur ? dlArt(a, cur) : null; const dv = dg && dg.ts < nuTs(); h += `<div class="grp ${dv ? 'dlvoorbij' : ''}"><span>${esc(g || 'Overig')}${dg ? `<em class="dltag">⏰ ${dv ? 'deadline voorbij' : dlKort(dg)}</em>` : ''}</span><small>${tel[g]} artikel${tel[g] === 1 ? '' : 'en'}</small></div>`; lastG = g; } const laatste = pos + 1 >= arts.length || groepToon(arts[pos + 1]) !== g; h += kaart(a, cur, laatste); }
    if (pos >= arts.length && nulVan >= 0 && !ui.toonNul) h += nulKop();
    lst.insertAdjacentHTML('beforeend', h);
    if (pos < arts.length) { const s = document.createElement('div'); s.className = 'more'; lst.appendChild(s); lazy && lazy.disconnect(); lazy = new IntersectionObserver(en => { if (en[0].isIntersecting) { lazy.disconnect(); s.remove(); chunk(); } }, { rootMargin: '800px' }); lazy.observe(s); }
  };
  if (lazy) lazy.disconnect();
  chunk();
  { const dy = soft ? y : window.__doelY || 0; if (dy) { while (pos < arts.length && document.body.scrollHeight < dy + innerHeight + 400) chunk(); window.scrollTo(0, dy); } else window.scrollTo(0, 0); }
  lst.onclick = e => { if (e.target.closest('[data-nul]')) { ui.toonNul = !ui.toonNul; return render(true); } onKaartKlik(e); }; lst.onchange = onKaartWijzig;

  if (cur) toonWeer(od, cur);
}
const EH = { DS: ['doos', 'dozen'], KR: ['krat', 'kratten'], ZK: ['zak', 'zakken'], PK: ['pak', 'pakken'], TR: ['tray', 'trays'], BS: ['bos', 'bossen'], KI: ['kist', 'kisten'], BK: ['bak', 'bakken'], NT: ['net', 'netten'], EM: ['emmer', 'emmers'], FL: ['fles', 'flessen'], CO: ['colli', 'colli'], HE: ['doos', 'dozen'], OM: ['omdoos', 'omdozen'], ST: ['stuk', 'stuks'], BL: ['blik', 'blikken'], PL: ['plaat', 'platen'], RL: ['rol', 'rollen'] };
const ehCode = a => String(a.eh || '').trim().toUpperCase().slice(0, 2);
function ehMv(a) { return (EH[ehCode(a)] || ['verpakking', 'verpakkingen'])[1]; }
function heTekst(a) { if (!a.perHE) return 'per stuk'; const e = EH[ehCode(a)] || ['verpakking']; return `${e[0]} van ${C.fmt(a.he)}${a.kg ? ' kg' : ''}`; }
function eenheid(a) { const k = M.keys[a.key]; return k && k.kg ? 'kg' : 'st'; }
function kaart(a, bd, laatste) {
  const k = M.keys[a.key]; const wt = C.weekTabel(M, a.key); const lbl = C.actieLabel(M, a.key);
  const st = assStatus(a); const r = S.assort[a.key]; const san = st === 'gesaneerd'; const niet = st === 'niet';
  const vr = S.voorraad[a.key]; const vrVandaag = vr && vr.dag === C.today() ? vr.aantal : '';
  const ad = san || niet ? { adv: 0, need: 0, days: [], stock: null } : C.advies(M, a.key, bd, vrVan(a.key), bestellingenVan(a.key));
  const be = S.bestel[a.key + '|' + bd.besteldag];
  const u = eenheid(a); const rT = mag('tellen'), rB = mag('bestellen'), rA = mag('afvinken'); const isB = !!(be && be.besteld);
  const heTxt = heTekst(a);
  const advTxt = ad.adv ? `${ad.adv}` : '0';
  const advSub = ad.adv ? (a.perHE ? `${ad.adv === 1 ? (EH[ehCode(a)] || ['verpakking'])[0] : ehMv(a)} · ${C.fmt(ad.adv * a.he)} ${u === 'st' ? 'st' : u}` : (u === 'st' ? (ad.adv === 1 ? 'stuk' : 'stuks') : u)) : ad.twijfel ? '👀 even kijken' : 'geen advies';
  const comp = S.pref && S.pref.compact; const telT = rT && (ui.telAlle || vrVandaag !== '' || (ui.telK && ui.telK.has(a.key)) || (bd && telKeuze(onderdeelVan(a), bd).alle.includes(a.key)));
  let tbl = `<table class="wk"><tr><th></th>${C.DAGEN.map(d => `<th>${d}</th>`).join('')}<th>wk</th></tr>`;
  for (const [ri, r2] of wt.rows.entries()) { if (comp && ri !== 2) continue; let s = 0, any = false; tbl += `<tr><td class="l">${r2.week}</td>${r2.cells.map(c => { if (c.v !== null) { s += c.v; any = true; } return `<td class="${c.actie ? 'a' : ''} ${c.dag === C.today() ? 'today' : ''}">${c.v === null ? '' : C.fmt(c.v)}</td>`; }).join('')}<td>${any ? C.fmt(s) : ''}</td></tr>`; }
  tbl += `<tr class="gd"><td class="l">gem.</td>${wt.gd.map(g => `<td>${C.fmt(g)}</td>`).join('')}<td class="gwt">${C.fmt(wt.gwt)}</td></tr></table>`;
  const labels = [];
  { const pa = (M.actieArt[a.key] || []).find(x => x.plek && x.zon >= C.today()); if (pa) labels.push(`<span class="lbl info">📍 ${esc(pa.plek)}${pa.plekF > 0 && pa.plekF !== 1 ? ' ×' + String(pa.plekF).replace('.', ',') : ''}</span>`); }
  if (lbl) for (const l of lbl) { labels.push(`<span class="lbl ${l.t}">Actie ${l.t} week${l.dag !== null && l.dag !== undefined ? ' (' + C.DAGNAAM[l.dag] + ')' : ''}</span><span class="lbl ${l.folder ? 'folder' : 'instore'}">${l.folder ? 'Folder' : 'Instore'}</span>`); }
  if (lbl) { const l0 = lbl[0]; labels.push(`<span class="lbl info">${l0.cap ? '€ ' + l0.cap.toFixed(2).replace('.', ',') : ''}${l0.opm && !/^(maandag|dinsdag|woensdag|donderd|vrijdag|zaterdag|zondag)$/i.test(l0.opm) ? ' · ' + esc(l0.opm) : ''}${l0.disc ? ' · −' + Math.round(l0.disc * 100) + '%' : ''}</span>`); }
  if (a.eigen) { labels.push('<span class="lbl eigen">Eigen artikel</span>'); const bk = eigenInBoek(a); if (bk) labels.push(`<span class="lbl chk">Staat nu in het bestelboek</span>${mag('saneren') ? `<button class="link" data-eigover="${bk.key}">Boekartikel overnemen</button>` : ''}`); }
  else if (a.nieuw) labels.push('<span class="lbl nieuw">Nieuw in assortiment</span>');
  if (st === 'in' && r && r.opgenomen && r.sinds && C.diff(r.sinds, C.today()) <= 28) labels.push(`<span class="lbl nieuw">Opgenomen ${C.fmtDag(r.sinds).split(' ')[1]} · ${esc(ini(r.door))}</span>`);
  if (a.uit) labels.push('<span class="lbl uit">Uit het bestelboek</span>');
  if (nietGeleverd(a.key)) labels.push('<span class="lbl uit">Vorige keer niet geleverd</span>');
  if (S.leeg && S.leeg[a.key + '|' + C.today()]) labels.push('<span class="lbl uit">🚫 Vandaag leeg gemeld</span>');
  if (bd && !a.uit && telKeuze(onderdeelVan(a), bd).open.includes(a.key)) labels.push('<span class="lbl tel">🔢 Graag tellen</span>');
  if (san) labels.push(`<span class="lbl uit">Gesaneerd ${r.sinds ? C.fmtDag(r.sinds).split(' ')[1] : ''} · ${esc(ini(r.door))} – niet meer bestellen</span>`);
  if (niet) labels.push('<span class="lbl vorige">Niet in assortiment</span>');
  if (a.check && mag('instellingen')) labels.push('<span class="lbl chk">Besteleenheid controleren</span>');
  const dagenTxt = ad.days.length ? ad.days.map(d => C.DAGEN[C.wd(d)]).join(', ') : '';
  let why = `Verwacht ${dagenTxt}: <b>${C.fmt(ad.need)} ${u}</b>`;
  if (ad.min) why += ` · min. schap ${C.fmt(ad.min)}`;
  if (ad.derv) why += M.dervSchat && M.dervSchat[a.key] ? ` · geschatte derving 4 wk ${C.fmt(ad.derv)} (besteld ${C.fmt(M.dervSchat[a.key].besteld)}, verkocht ${C.fmt(M.dervSchat[a.key].verkocht)}${ad.dervKorting ? `, advies −${Math.round(ad.dervKorting * 100)}%` : ''})` : ` · derving 4 wk ${C.fmt(ad.derv)}${ad.dervKorting ? ` (advies −${Math.round(ad.dervKorting * 100)}%)` : ''}`;
  if (ad.weer && Math.abs(ad.weer) >= 0.03) why += ` · weer: advies ${ad.weer > 0 ? '+' : '−'}${Math.round(Math.abs(ad.weer) * 100)}%`;
  if (ad.houdb) why += ` · houdbaar ${ad.houdb} ${ad.houdb === 1 ? 'dag' : 'dagen'}: alleen voor ${ad.days.map(d => C.DAGEN[C.wd(d)]).join(', ')}`;
  if (ad.leegN) why += ` · ${ad.leegN}× leeg in 4 wk${ad.leegBoost ? ` (advies +${Math.round(ad.leegBoost * 100)}%)` : ''}`;
  if (ad.start) why += ' · nieuw: startadvies op basis van de groep';
  { const rv = vrVan(a.key); if (rv && rv.restant) why += ` · actie-restant wk ${rv.week} ±${C.fmt(rv.aantal)}`; }
  if (ad.schat) why += ` · ± ${C.fmt(vrVan(a.key).aantal)} in winkel (geschat uit bestellingen en kassa)`;
  if (ad.stock !== null && ad.stock !== undefined) why += ` · voorraad bij levering ±${C.fmt(Math.max(0, ad.stock))}`;
  if (ad.twijfel) why += ' · minder dan 60% van een doos nodig en voorraad onbekend: even kijken';
  else if (vr && vr.dag) why += ` · laatst geteld ${C.fmtDag(vr.dag)}: ${C.fmt(vr.aantal)}${vr.door ? ' (' + esc(ini(vr.door)) + ')' : ''}`;
  const kanSan = mag('saneren');
  const assKnop = kanSan ? (san ? '<button class="link" data-ass="terug">Terugzetten in assortiment</button>' : niet ? '<button class="link" data-ass="op">+ Opnemen in assortiment</button>' : a.uit ? '' : '<button class="link rood" data-ass="san">Saneren</button>') : '';
  const besteldTxt = isB ? `✓ Besteld · ${esc(ini(be.besteld_door))} ${hhmm(be.besteld_om)}` : '';
  let onder;
  if (a.uit || san) onder = `${(a.uit && !S.schapOk.has(a.key)) || (san && !(r && r.schap_ok)) ? (mag('schap') ? `<div style="margin-top:10px"><button class="btn sm" data-schap="1">Schap klaar</button></div>` : '') : ''}`;
  else if (niet) onder = '';
  else onder = `<div class="ctl ${telT ? '' : 'een'}">${telT ? `<div><label>Tel wat er ligt <i>(mag leeg)</i></label><div class="stp ${rT ? '' : 'uit'}"><button data-s="v" data-d="-1" ${rT ? '' : 'disabled'}>−</button><input type="number" inputmode="decimal" data-in="v" value="${vrVandaag}" placeholder="" ${rT ? '' : 'disabled'}><button data-s="v" data-d="1" ${rT ? '' : 'disabled'}>+</button></div></div>` : ''}
  <div><label>Bestellen (${a.perHE ? ehMv(a) : u === 'st' ? 'stuks' : u})</label><div class="stp ${rB ? '' : 'uit'}"><button data-s="b" data-d="-1" ${rB ? '' : 'disabled'}>−</button><input type="number" inputmode="decimal" data-in="b" class="${be && be.aantal !== null && be.aantal !== undefined ? 'zelf' : ''}" value="${be && be.aantal !== null && be.aantal !== undefined ? be.aantal : ''}" placeholder="" data-adv="${ad.adv || 0}" ${rB ? '' : 'disabled'}><button data-s="b" data-d="1" ${rB ? '' : 'disabled'}>+</button></div>${rB && ad.adv && !(be && be.aantal !== null && be.aantal !== undefined) && !isB ? `<button class="neemadv groot" data-neem="1">✓ Bestel ${ad.adv} ${a.perHE ? (ad.adv === 1 ? (EH[ehCode(a)] || ['verpakking'])[0] : ehMv(a)) : u === 'st' ? (ad.adv === 1 ? 'stuk' : 'stuks') : u}</button>` : ''}</div></div>
  ${rA ? `<button class="besteld klein ${isB ? 'aan' : ''}" data-besteld="1">${isB ? besteldTxt : '☐ Besteld'}</button>` : isB ? `<div class="besteld aan">${besteldTxt}</div>` : ''}`;
  const dgv = bd && !isB ? dlArt(a, bd) : null;
  return `<div class="card ${dgv && dgv.ts < nuTs() ? 'dlvoorbij' : ''} ${a.uit || san ? 'uit' : ''} ${niet ? 'niet' : ''} ${laatste ? 'laatste' : ''} ${isB ? 'isbesteld' : ''} ${ui.open && ui.open.has(a.key) ? 'open' : ''}" data-k="${a.key}">
  <div class="hd" data-meer="1"><div class="nm" ${a.eigen && mag('saneren') ? 'data-eig="' + esc(a.nr) + '"' : ''}>${a.foto ? `<img class="duimfoto" src="${a.foto}" alt="">` : ''}${esc(a.naam)}${a.eigen && mag('saneren') ? ' <span class="small">✎</span>' : ''}</div><div class="adv ${ad.adv ? '' : 'nul'}"><small>Advies</small><b>${advTxt}</b><span>${advSub}</span></div></div>
  <div class="meta">${a.eigen ? esc(a.artNr || 'zonder nummer') + ' · ' + esc(LEV_NAAM[a.lev] || '') : a.nr} · ${heTxt}</div>${!a.uit && !niet ? colloHtml(a, ad, rB) + boHtml(a, bd, be, ad) : ''}
  ${labels.length ? `<div class="lbls">${labels.join('')}</div>` : ''}
  ${notitieHtml('a:' + a.key)}
  ${onder}
  <div class="tikmeer">${ui.open && ui.open.has(a.key) ? '▴ tik op de naam voor minder' : '▾ tik op de naam voor meer'}</div>
  <div class="kaartmeer"><div class="meta">${routeChip(a)}${a.merk ? esc(a.merk) + ' · ' : ''}${a.cons ? 'prijs ' + C.eur(a.cons) : ''}${mag('inkoop') && a.ink ? ' · inkoop ' + C.eur(a.ink) : ''}${a.bst && !a.eigen ? ' · bestelnr ' + esc(a.bst) : ''}</div>
  ${k ? tbl : '<div class="hint">Nog geen verkoop van dit artikel.</div>'}
  ${!(a.uit || san || niet) ? `<div class="why">${why}</div>${rB ? `<button class="minlink" data-min="1">Min. schap: ${M.min[a.key] ? C.fmt(M.min[a.key]) + ' ' + u : 'niet ingesteld'} ✎</button>` : ''}` : ''}
  <div class="kaartvoet">${rT && !telT && !a.uit ? '<button class="link" data-telnu="1">🔢 Tellen</button>' : ''}<button class="link" data-not="1">📝 Notitie</button>${mag('tellen') && !a.uit ? '<button class="link" data-derv="1">🗑️ Derving</button><button class="link" data-leeg="1">🚫 Schap leeg</button>' : ''}${assKnop}</div></div></div>`;
}
async function onKaartKlik(e) {
  const card = e.target.closest('.card'); if (!card) return; const key = card.dataset.k; const a = M.art[key]; const { cur } = besteldag(onderdeelVan(a));
  const eg = e.target.closest('[data-eig]'); if (eg) return eigenBewerk(S.eigen[eg.dataset.eig], a.od);
  if (e.target.closest('[data-pad]')) return routeKiesPad(a);
  if (e.target.closest('[data-meer]')) { ui.open = ui.open || new Set(); ui.open.has(key) ? ui.open.delete(key) : ui.open.add(key); card.classList.toggle('open', ui.open.has(key)); const tm = card.querySelector('.tikmeer'); if (tm) tm.textContent = ui.open.has(key) ? '▴ tik op de naam voor minder' : '▾ tik op de naam voor meer'; return; }
  if (e.target.dataset.collo !== undefined) { const inp = card.querySelector('[data-in="b"]'); inp.value = e.target.dataset.collo; card._okHoog = +inp.value; return opslaan(card, 'b', inp.value); }
  if (e.target.dataset.telnu !== undefined) { (ui.telK = ui.telK || new Set()).add(card.dataset.k); return render(true); }
  if (e.target.dataset.neem !== undefined) { const inp = card.querySelector('[data-in="b"]'); inp.value = inp.dataset.adv; return opslaan(card, 'b', inp.value); }
  if (e.target.dataset.not !== undefined) return notitieBewerk('a:' + key, a.naam);
  if (e.target.dataset.min !== undefined) return minBewerk(a);
  if (e.target.dataset.derv !== undefined) return dervingInvoer(a);
  if (e.target.dataset.leeg !== undefined) return leegMelden(a);
  if (e.target.dataset.eigover) return eigenOvernemen(a, M.art[e.target.dataset.eigover]);
  if (e.target.dataset.ass) {
    const w = e.target.dataset.ass;
    if (w === 'san') { if (!await bevestig('Saneren?', `<b>${esc(a.naam)}</b> gaat uit jullie assortiment. Het blijft doorgestreept staan tot het schap is aangepast.`, 'Saneren')) return; const t = zetAssort(a, 'gesaneerd'); log('saneren', `Gesaneerd: ${a.naam}`); ongedaan('Gesaneerd', t); }
    if (w === 'op') { const t = zetAssort(a, 'in'); log('opnemen', `Opgenomen in assortiment: ${a.naam}`); ongedaan('Opgenomen in assortiment', t); }
    if (w === 'terug') { const t = zetAssort(a, 'in', { opgenomen: false, schap_ok: true }); log('opnemen', `Teruggezet in assortiment: ${a.naam}`); ongedaan('Teruggezet', t); }
    render(true); return;
  }
  if (e.target.dataset.schap) {
    if (assStatus(a) === 'gesaneerd') { const r = S.assort[key]; const t = zetAssort(a, 'gesaneerd', { schap_ok: true, sinds: r.sinds, door: r.door }); ongedaan('Schap klaar', t); }
    else { write('schap_ok', [{ bron: a.bron, nr: a.nr, ok: true, door: mijnNaam() }]); ongedaan('Schap klaar', () => write('schap_ok', [{ bron: a.bron, nr: a.nr, ok: false }])); }
    log('schap', `Schap aangepast: ${a.naam}`); render(true); return;
  }
  if (e.target.closest('[data-besteld]')) {
    const be = S.bestel[key + '|' + cur.besteldag]; const was = !!(be && be.besteld); const nu = !was;
    const adv0 = C.advies(M, key, cur, vrVan(key), bestellingenVan(key)).adv;
    const zet = v => write('bestellingen', [{ bron: a.bron, nr: a.nr, besteldag: cur.besteldag, lever: cur.L, besteld: v, besteld_door: v ? mijnNaam() : null, besteld_om: v ? new Date().toISOString() : null, advies: adv0 }]);
    zet(nu); if (nu) { routeTik(a, cur); log('besteld', `Besteld: ${a.naam}${be && be.aantal ? ' (' + be.aantal + ')' : ''}`); ongedaan('Besteld afgevinkt', () => zet(false)); }
    if (ui.fOpen && nu) { card.style.transition = 'opacity .3s'; card.style.opacity = '0'; setTimeout(() => render(true), 300); } else ververs(card, a, cur);
    werkVoortgang(onderdeelVan(a), cur); return;
  }
  const s = e.target.dataset.s; if (!s) return;
  const inp = card.querySelector(`[data-in="${s}"]`);
  const val = inp.value === '' ? (s === 'b' ? (+inp.dataset.adv || 0) : 0) : C.num(inp.value);
  if (inp.value === '' && s === 'b') inp.value = val; else inp.value = Math.max(0, val + (+e.target.dataset.d));
  opslaan(card, s, inp.value);
}
function onKaartWijzig(e) { const card = e.target.closest('.card'); const s = e.target.dataset.in; if (!card || !s) return; opslaan(card, s, e.target.value, true); }
async function opslaan(card, s, val, getypt) {
  const key = card.dataset.k; const a = M.art[key]; const od = onderdeelVan(a); const { cur } = besteldag(od);
  if (s === 'v') { write('voorraad', [{ bron: a.bron, nr: a.nr, aantal: C.num(val), dag: C.today(), door: mijnNaam() }]); clearTimeout(card._lv); card._lv = setTimeout(() => log('voorraad', `Voorraad ${a.naam}: ${val}`), 1500); }
  else {
    const n = C.num(val); const ad = C.advies(M, key, cur, vrVan(key), bestellingenVan(key)); const vorig = S.bestel[key + '|' + cur.besteldag];
    const wf = waarschuwF(); const grens = ad.adv ? Math.max(ad.adv * wf, ad.adv + (a.perHE ? 1 : 2)) : (a.perHE ? 3 : 10);
    if (wf && n > grens && !(card._okHoog >= n)) {
      if (card._vraagt) return; card._vraagt = true;
      const ok = await bevestig('Klopt dit?', `Je bestelt <b>${C.fmt(n)} ${a.perHE ? ehMv(a) : eenheid(a) === 'st' ? 'stuks' : eenheid(a)}</b> ${esc(a.naam)}.<br>Het advies is ${ad.adv}.`, 'Ja, klopt', 'Aanpassen');
      card._vraagt = false; if (ok) card._okHoog = n;
      if (!ok) { const i = card.querySelector('[data-in="b"]'); i.value = vorig && vorig.aantal !== null && vorig.aantal !== undefined ? vorig.aantal : ''; return; }
    }
    write('bestellingen', [{ bron: a.bron, nr: a.nr, besteldag: cur.besteldag, lever: cur.L, aantal: n, door: mijnNaam(), advies: ad.adv }]); routeTik(a, cur);
    if (getypt && Math.abs(n - ad.adv) >= Math.max(ad.adv * 0.5, a.perHE ? 2 : 4) && !(vorig && vorig.reden)) setTimeout(() => toonReden(card, a, cur), 400);
    clearTimeout(card._lb); card._lb = setTimeout(() => log('bestelling', `Bestelling ${a.naam}: ${n}`), 1500);
  }
  clearTimeout(card._t); card._t = setTimeout(() => { ververs(card, a, cur); werkVoortgang(od, cur); }, 350);
}
function werkVoortgang(od, cur) { const el = $('.voortgang'); if (!el) return; const st = voortgang(od, cur); el.innerHTML = `<span>${st.advies} met advies</span><b>${st.open ? `nog ${st.open} te gaan` : '✓ alles besteld'}</b>`; }
function ververs(card, a, cur) {
  if (!card.isConnected) return;
  const n = document.createElement('div'); n.innerHTML = kaart(a, cur, card.classList.contains('laatste')); const nc = n.firstElementChild;
  const f = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.in : null; card.replaceWith(nc);
  if (f) { const i = nc.querySelector(`[data-in="${f}"]`); if (i && document.activeElement === document.body) i.focus(); }
}

/* ---------- overig ---------- */
function renderOverig() {
  const v = $('#view');
  const keys = Object.keys(M.keys).filter(k => k.startsWith('e:'));
  const io = keys.filter(k => M.keys[k].info.kl.soort === 'inout'), an = keys.filter(k => M.keys[k].info.kl.soort === 'ander');
  const meta = k => M.kassa[k.slice(2)] || {};
  const match = k => { if (!ui.q) return true; const m = meta(k); const q = ui.q.toLowerCase(); return (m.n || '').toLowerCase().includes(q) || k.includes(q) || (m.m || '').toLowerCase().includes(q); };
  let h = `<div class="bar"><div class="row"><input type="search" id="q" placeholder="Zoek naam, leverancier of EAN" value="${esc(ui.q)}"></div></div>`;
  const sect = (titel, lst, isIo) => {
    lst = lst.filter(match); if (!lst.length) return '';
    let voor = '';
    if (isIo) { const meld = lst.filter(k => C.overig(M, k, S.inout[k.slice(2)] || {}).melding); if (meld.length) { voor = `<div class="grp top" style="margin-top:18px">⚠️ Let op</div>`; meld.forEach((k, i) => voor += kaartOverig(k, true, i === meld.length - 1)); lst = lst.filter(k => !meld.includes(k)); if (!lst.length) return voor; } }
    const groups = {}; lst.forEach(k => { const m = meta(k); const g = isIo ? (m.l || '') + ' › ' + (m.so || '') : (m.l || m.m || 'Onbekende leverancier'); (groups[g] = groups[g] || []).push(k); });
    let s = voor + `<div class="grp top" style="margin-top:18px">${titel}</div>`;
    for (const g of Object.keys(groups).sort()) { const l = groups[g].sort((x, y) => C.weekTabel(M, y).gwt - C.weekTabel(M, x).gwt); s += `<div class="grp"><span>${esc(g)}</span><small>${l.length}</small></div>`; l.forEach((k, i) => s += kaartOverig(k, isIo, i === l.length - 1)); }
    return s;
  };
  h += sect('In/out (888888)', io, true) + sect('Andere leveranciers', an, false);
  if (!keys.length) h += '<div class="empty">Nog geen verkoopcijfers van deze artikelen.</div>';
  v.innerHTML = h;
  const q = $('#q'); q.oninput = () => { ui.q = q.value.trim(); clearTimeout(q._t); q._t = setTimeout(() => { render(); const n = $('#q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  v.onclick = e => { const mb = e.target.closest('[data-meer]'); if (!mb) return; const c = mb.closest('.card'); const key = 'o:' + c.dataset.ean; ui.open = ui.open || new Set(); ui.open.has(key) ? ui.open.delete(key) : ui.open.add(key); c.classList.toggle('open', ui.open.has(key)); mb.textContent = ui.open.has(key) ? '▴ Minder' : '▾ Meer'; };
  v.onchange = e => {
    const c = e.target.closest('.card'); if (!c || !e.target.dataset.io) return; const ean = c.dataset.ean; const cur = Object.assign({ ean }, S.inout[ean] || {});
    cur[e.target.dataset.io] = e.target.type === 'number' ? C.num(e.target.value) : (e.target.value || null);
    write('inout', [{ ean, ingekocht: cur.ingekocht || null, start: cur.start || null, eind: cur.eind || null }]); setTimeout(() => render(true), 50);
  };
}
function kaartOverig(k, isIo, laatste) {
  const ean = k.slice(2); const m = M.kassa[ean] || {}; const wt = C.weekTabel(M, k); const s = M.keys[k]; const u = s.kg ? 'kg' : 'st';
  let tbl = `<table class="wk"><tr><th></th>${C.DAGEN.map(d => `<th>${d}</th>`).join('')}<th>wk</th></tr>`;
  for (const r of wt.rows) { let t = 0, any = false; tbl += `<tr><td class="l">${r.week}</td>${r.cells.map(c => { if (c.v !== null) { t += c.v; any = true; } return `<td class="${c.dag === C.today() ? 'today' : ''}">${c.v === null ? '' : C.fmt(c.v)}</td>`; }).join('')}<td>${any ? C.fmt(t) : ''}</td></tr>`; }
  tbl += `<tr class="gd"><td class="l">gem.</td>${wt.gd.map(g => `<td>${C.fmt(g)}</td>`).join('')}<td class="gwt">${C.fmt(wt.gwt)}</td></tr></table>`;
  const exp = []; for (let i = 1; i <= 7; i++) { const d = C.add(C.today(), i); exp.push(C.verwacht(M, k, d)); }
  const verw7 = exp.reduce((a, b) => a + b, 0);
  let x = `<div class="why">Verwacht per dag: ${exp.map((e, i) => C.DAGEN[C.wd(C.add(C.today(), i + 1))] + ' ' + C.fmt(e)).join(' · ')}</div>`; let boven = '';
  if (isIo) {
    const io = S.inout[ean] || {}; const o = C.overig(M, k, io); const dis = mag('inout') ? '' : 'disabled';
    boven = `${o.melding ? `<div class="melding ${o.melding.t}">${esc(o.melding.txt)}</div>` : ''}<div class="why">Verkocht sinds ${C.fmtDag(o.start)}: <b>${C.fmt(o.totaal)} ${u}</b>${o.rest !== null ? ` · nog ±<b>${C.fmt(Math.max(0, o.rest))}</b> over` : ''}</div>
    <div class="ctl"><div><label>Ingekocht (${u === 'st' ? 'stuks' : u})</label><input type="number" inputmode="decimal" data-io="ingekocht" value="${io.ingekocht ?? ''}" ${dis} style="width:100%"></div><div><label>Laatste actiedag</label><input type="date" data-io="eind" value="${io.eind || ''}" ${dis} style="width:100%"></div></div>${dis ? '' : '<p class="small" style="margin:4px 0 0">Tik op het datumveld om een dag te kiezen.</p>'}`;
  }
  const open = ui.open && ui.open.has('o:' + ean);
  return `<div class="card ${laatste ? 'laatste' : ''} ${open ? 'open' : ''}" data-ean="${ean}"><div class="hd"><div class="nm">${esc(m.n)}</div><div class="adv"><b>${C.fmt(verw7, 0)}</b><span>deze week</span></div></div><div class="meta">gem. ${C.fmt(wt.gwt / 7)} per dag · ${esc(m.m || m.l || '')}</div>${boven}
  <button class="meerknop" data-meer="1">${open ? '▴ Minder' : '▾ Meer'}</button><div class="kaartmeer"><div class="meta">EAN ${ean}${m.b ? ' · bestelnr ' + m.b : ''}${m.so ? ' · ' + esc(m.so) : ''}</div>${tbl}${x}</div></div>`;
}
