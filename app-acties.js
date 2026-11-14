/* ---------- 1.15: KW-acties (folderplanning) ---------- */
const STD_PLEKKEN = [{ naam: 'Kop 1 (links)', factor: 1.3 }, { naam: 'Kop 2 (rechts)', factor: 1.3 }, { naam: 'Euro-Coopjes', factor: 1.15 }];
const KW_OUD_NOTITIE = { 'in het vak': 'In het vak', 'niet bestellen': 'Niet besteld', 'niet besteld': 'Niet besteld' };
const KW_OUD_NAAM = { 'meter naast afbakbrood': 'Euro-Coopjes', 'meter naast afbakbroodjes': 'Euro-Coopjes', 'euro coopje': 'Euro-Coopjes', 'euro coopjes': 'Euro-Coopjes' };
function kwPlekkenNorm(l) {
  const out = [];
  for (const x of l || []) { const k = String(x.naam || '').trim().toLowerCase(); if (KW_OUD_NOTITIE[k]) continue; const naam = KW_OUD_NAAM[k] || x.naam; const al = out.find(y => y.naam === naam); if (al) { if (!al.tafel && x.tafel) al.tafel = x.tafel; if (!(al.lijst || []).length && (x.lijst || []).length) al.lijst = x.lijst; continue; } out.push(Object.assign({}, x, { naam })); }
  return out;
}
function kwPlekken() { const l = (S.inst || {}).kwPlekken; return Array.isArray(l) && l.length ? kwPlekkenNorm(l) : STD_PLEKKEN; }
function kwNormPlan(p) {
  let ander = false; if (!p) return false; ((p.folder || {}).items || []).forEach(i => { if (i.pag && i.instore) i.instore = false; }); // 1.57: in de Coop-folder = folder
  const pl = Object.assign({}, p.plek || {}), no = Object.assign({}, p.notitie || {});
  for (const id in pl) { const k = String(pl[id] || '').toLowerCase(); if (KW_OUD_NOTITIE[k]) { no[id] = no[id] || KW_OUD_NOTITIE[k]; delete pl[id]; ander = true; } else if (KW_OUD_NAAM[k]) { pl[id] = KW_OUD_NAAM[k]; ander = true; } }
  if (ander) { p.plek = pl; p.notitie = no; } return ander;
}
function kwMigreer() {
  if (!mag('instellingen') || kwMigreer.klaar) return; kwMigreer.klaar = true;
  const oud = (S.inst || {}).kwPlekken; if (Array.isArray(oud) && oud.length) { const n = kwPlekkenNorm(oud); if (JSON.stringify(n) !== JSON.stringify(oud)) { const w = JSON.parse(JSON.stringify(S.inst)); w.kwPlekken = n; saveInst(w); for (const x of n) { const t = x.tafel && S.tafels[x.tafel]; if (t && t.naam !== x.naam) { const d = Object.assign({}, t, { naam: x.naam }); delete d.id; write('tafels', [{ id: x.tafel, data: d }]); } } } }
  for (const wk of Object.keys(S.kwplan || {})) if (kwNormPlan(S.kwplan[wk])) kwPlanOpslaan(wk);
}
function magKwPlan() { return mag('tafels') || mag('bestellen'); }
function folderWeek(f) { return weekSleutel(f.van || C.mondayOf(C.isoWeek(C.today()).y, f.week)); }
function bewaarFolder(f, bron) {
  if (!f || !f.week || !f.items.length) throw new Error('Geen folderplanning herkend');
  f.versie = 2; const wk = folderWeek(f); const oud = S.kwplan[wk] || {}; const plan = { folder: f, plek: oud.plek || {}, klaar: oud.klaar || {}, bron: bron || '', geladen: new Date().toISOString() };
  write('kw_acties', [{ week: wk, data: plan }]); S.kwplan[wk] = Object.assign({ week: wk }, plan); rebuild(); return wk;
}
function kwPlanOpslaan(wk) { const p = S.kwplan[wk]; const d = Object.assign({}, p); delete d.week; write('kw_acties', [{ week: wk, data: d }]); clearTimeout(kwPlanOpslaan.t); kwPlanOpslaan.t = setTimeout(() => { rebuild(); }, 300); }
function kwKeys(it) { return (it.nrs || []).map(n => /^\d{6}$/.test(n) ? 'kw:' + n : null).filter(k => k && M.art[k]).concat((it.nrs || []).filter(n => /^\d{8,14}$/.test(n)).map(n => { const k = vindCode(n); return k ? k.key || k : null; }).filter(k => k && M.art[k])); }
function kwVerwacht(it, f, plek) {
  let keys = [...new Set(kwKeys(it))].filter(k => M.keys[k]); const n0 = kwKeys(it).length;
  const alt = []; for (const nr of it.nrs || []) for (const k of Object.values(S.kassa || {})) if (k.b === nr || k.ean === nr) { const kk = 'e:' + k.ean; if (M.keys[kk] && !alt.includes(kk)) alt.push(kk); }
  keys = keys.concat(alt); if (!keys.length) return n0 || (it.nrs || []).length ? { st: 0, he: 0, n: n0, geen: true } : null; if (!f.van) return null; const pl = kwPlekken().find(p => p.naam === plek); const fac = pl ? +pl.factor : 1;
  let st = 0, he = 0; for (const k of keys) { let v = 0; for (let d = f.van; d <= (f.tm || C.add(f.van, 6)); d = C.add(d, 1)) v += C.verwacht(M, k, d); st += v; const a = M.art[k]; he += v / (a && a.perHE && a.he > 0 ? a.he : 1); }
  return { st: st * (fac || 1), he: he * (fac || 1), n: Math.max(n0, keys.length), uit: fac === 0 };
}
function kwVorige(it, wk) {
  const nrs = new Set(it.nrs || []); if (!nrs.size) return null;
  for (const w of Object.keys(S.kwplan).filter(x => x < wk).sort().reverse()) {
    const p = S.kwplan[w]; const x = ((p.folder || {}).items || []).find(y => (y.nrs || []).some(n => nrs.has(n))); if (!x) continue;
    let verk = null; const f = p.folder; if (f.van && M.dagLijst.length && M.dagLijst[M.dagLijst.length - 1] >= (f.tm || f.van)) { verk = 0; for (const k of kwKeys(x)) { const sr = M.keys[k]; if (!sr) continue; for (let d = f.van; d <= f.tm; d = C.add(d, 1)) { const i = C.idx(M, d); if (i >= 0 && i < M.N) verk += sr.v[i]; } } }
    return { week: +w.slice(5), plek: (p.plek || {})[x.id] || '', verk };
  }
  return null;
}
async function folderOphalen(jaar, week) { return (await kwHaalOp(jaar, week)).wk; }
function kwStatus(p, id) { const pk = (p.plek || {})[id]; if (pk && plekVan(pk)) return { plek: pk }; const n = (p.notitie || {})[id]; return n ? { notitie: n } : null; }
function kwZetPlek(wk, id, nieuw) {
  const p = S.kwplan[wk]; const it = p.folder.items.find(i => i.id === id); const oud = (p.plek || {})[id] || '';
  p.plek = Object.assign({}, p.plek || {}); if (nieuw) p.plek[id] = nieuw; else delete p.plek[id];
  if (nieuw && p.notitie && /^(in het vak|niet besteld)$/i.test(p.notitie[id] || '')) { p.notitie = Object.assign({}, p.notitie); delete p.notitie[id]; }
  kwPlanOpslaan(wk); kwNaarTafel(wk, it, oud, nieuw);
}
function notitieKeuze(sub, nu, vast, zet, titel) {
  const eigen = nu && !vast.includes(nu);
  const ov = sheet(`<h2 style="margin:0">${titel || '📝 Notitie'}</h2><p class="small">${esc(sub)}</p>${vast.map(n => `<button class="it rijtik ${nu === n ? 'on' : ''}" data-nt="${n}" style="width:100%"><span style="flex:1">${nu === n ? '✓ ' : ''}${n}</span></button>`).join('')}<button class="it rijtik ${eigen ? 'on' : ''}" id="ntA" style="width:100%"><span style="flex:1">${eigen ? '✓ ' + esc(nu) : 'Anders…'}</span></button><div id="ntAnders" class="hide"><input type="text" id="ntT" value="${eigen ? esc(nu) : ''}" placeholder="Bijv. bij de kassa" style="width:100%;margin-top:8px"><button class="btn" id="ntS" style="width:100%;margin-top:8px">Opslaan</button></div>${nu ? '<button class="btn sec" id="ntW" style="width:100%;margin-top:8px">Notitie weghalen</button>' : ''}<button class="btn sec" data-x style="width:100%;margin-top:8px">Annuleren</button>`);
  if (titel) { const w = ov.querySelector('#ntW'); if (w) w.textContent = 'Geen opmerking'; }
  const z = t => { ov.remove(); zet(t); };
  ov.querySelectorAll('[data-nt]').forEach(b => b.onclick = () => z(b.dataset.nt));
  ov.querySelector('#ntA').onclick = () => { ov.querySelector('#ntAnders').classList.remove('hide'); ov.querySelector('#ntT').focus(); };
  ov.querySelector('#ntS').onclick = () => { const t = ov.querySelector('#ntT').value.trim(); if (t.length < 2) return toast('Typ een korte notitie'); z(t); };
  const w = ov.querySelector('#ntW'); if (w) w.onclick = () => z('');
}
function kwNotitieKies(wk, id) {
  const p = S.kwplan[wk]; const it = p.folder.items.find(i => i.id === id); const nu = (p.notitie || {})[id] || '';
  notitieKeuze(it.naam, nu, ['In het vak', 'Niet besteld'], t => { p.notitie = Object.assign({}, p.notitie || {}); if (t) p.notitie[id] = t; else delete p.notitie[id]; if (t && /^(In het vak|Niet besteld)$/.test(t) && (p.plek || {})[id]) { const oud = p.plek[id]; p.plek = Object.assign({}, p.plek); delete p.plek[id]; kwNaarTafel(wk, it, oud, ''); } kwPlanOpslaan(wk); render(true); });
}
function kwItemKaart(wk, p, it, kan) {
  const f = p.folder; const st = kwStatus(p, it.id); const pk = st && st.plek || ''; const no = (p.notitie || {})[it.id] || '';
  const ver = it.soort === 'kw' ? kwVerwacht(it, f, pk) : null; const vg = it.soort === 'kw' ? kwVorige(it, wk) : null;
  const vt = ver && ver.geen ? (vg && vg.verk ? `Verwacht ±${C.fmt(Math.round(vg.verk * (pk ? plekF(pk) : 1) / Math.max(0.1, plekF(vg.plek) || 1)))} st (zoals vorige keer)` : 'Geen verkoop bekend van deze artikelnummers') : ver ? `Verwacht ±${C.fmt(Math.round(ver.st))} st${ver.he ? ` (${C.fmt(Math.ceil(ver.he))} HE)` : ''}` : '';
  return `<div class="card kwit ${it.soort !== 'kw' ? 'kwvers' : ''} ${st ? 'kwklaar' : ''}"><div class="nm">${esc(it.naam)}${it.extra ? ' <span class="lbl uit">Extra</span>' : ''}${kan && it.bron !== 'voorkoop' ? ` <button class="lbl info kwsrt" data-ks="${it.id}">${(KW_SOORT.find(x => x[0] === it.soort) || ['', 'KW'])[1]} ▾</button>` : ''}</div>
    ${it.bron === 'voorkoop' ? `<div class="small">${esc([it.merk, it.inhoud].filter(Boolean).join(' · '))}</div>${(it.arts || []).length > 1 ? `<details class="kwsoorten"><summary>${it.arts.length} soorten</summary>${it.arts.map(a => `<div class="small">${esc(a.naam)} · ${esc(a.nr)}${a.cvoor ? ' · € ' + a.cvoor.toFixed(2).replace('.', ',') : ''}</div>`).join('')}${kan ? `<button class="link" data-kspl="${it.id}">✂️ Soorten los sorteren</button>` : ''}</details>` : ''}` : `<div class="small">${[it.variant, it.inhoud].filter(Boolean).map(esc).join(' · ')}</div>`}
    <div class="small"><b>${it.prijs.length ? '€ ' + it.prijs.map(x => x.toFixed(2).replace('.', ',')).join(' – ') : ''}${it.mech ? ' ' + esc(it.mech) : ''}</b>${it.streep && it.streep.length && it.bron === 'voorkoop' ? ` <s class="small">€ ${Math.max(...it.streep).toFixed(2).replace('.', ',')}</s>` : ''}${it.bijz ? ' · ' + esc(it.bijz) : ''}${it.pag ? ` · <button class="link paglink" data-kpag="${esc(String(it.pag).split(' ')[0].replace(/\D.*$/, ''))}">pag. ${esc(String(it.pag).split(' ')[0])}</button>` : ''}${it.groot ? ' · grote plek' : it.klein ? ' · kleine plek' : ''}</div>
    ${vt ? `<div class="small">${vt}</div>` : ''}${voorkoopAdvies(it, wk, ver, vg)}${vg && vg.plek ? `<div class="small">Vorige keer wk ${vg.week}: ${esc(vg.plek)}${vg.verk !== null ? ` · ${C.fmt(Math.round(vg.verk))} verkocht` : ''}</div>` : ''}
    ${no ? `<div class="kwnot">📝 ${esc(no)}</div>` : ''}${(() => { const o = kwPlekken().map(x => x.tafel && (indelingVan(wk, x.tafel).items || []).find(y => y.kw === it.id && y.nota)).find(Boolean); return o ? `<div class="kwnot">💬 ${esc(o.nota)}</div>` : ''; })()}
    ${kan ? `<div class="kwchips">${kwPlekken().map(x => `<button class="${pk === x.naam ? 'aan' : ''}" data-kz="${it.id}" data-kzp="${esc(x.naam)}">${esc(x.naam)}</button>`).join('')}<button class="${no ? 'aan' : ''}" data-knt="${it.id}">📝</button></div>` : pk ? `<div class="small">📍 ${esc(pk)}</div>` : ''}
  </div>`;
}
function renderKwActies() {
  kwMigreer(); kwHerlees();
  const v = $('#view'); const nu = weekSleutel(C.today()); const weken = Object.keys(S.kwplan || {}).sort();
  if (!ui.kwWeek || !S.kwplan[ui.kwWeek]) ui.kwWeek = weken.find(w => w >= nu) || weken[weken.length - 1] || null;
  const wk = ui.kwWeek; const p = wk ? kwPas(S.kwplan[wk]) : null; if (p) kwNormPlan(p); const f = p && p.folder; const kan = magKwPlan();
  const volg = [1, 2, 3, 4, 5, 6].map(n => { const d = C.add(C.monday(C.today()), 7 * n); const x = C.isoWeek(d); return { y: x.y, w: x.w, k: weekSleutel(d) }; }).filter(x => !S.kwplan[x.k]);
  const stap = ui.kwStap || 'sort';
  let h = `<div class="bar"><div class="chips">${weken.filter(w => w >= weekSleutel(C.add(C.today(), -21))).map(w => `<button class="chip ${w === wk ? 'on' : ''}" data-kw="${w}"><b>Week ${+w.slice(5)}</b></button>`).join('')}${kan ? volg.slice(0, 2).map(x => `<button class="chip" data-haal="${x.y}|${x.w}"><b>+ Week ${x.w} ophalen</b></button>`).join('') : ''}</div>
  ${f ? `<div class="seg kwseg"><button class="${stap === 'sort' ? 'on' : ''}" data-kst="sort">1 · Sorteren</button><button class="${stap === 'in' ? 'on' : ''}" data-kst="in">2 · Indelen</button><button data-kst="best">3 · Bestellen</button></div>${stap === 'in' && kwPlekken().some(y => y.tafel && S.tafels[y.tafel] && !S.tafels[y.tafel].weg) ? `<button class="btn kwpdfknop" id="kwPdf1">👁️ Pdf bekijken${ui.kwKop ? ' · ' + esc(ui.kwKop) : ''}</button>` : ''}` : ''}</div>`;
  if (!f) h += `<div class="empty">Nog geen folderplanning. ${kan ? 'Tik op "Week ophalen" of kies de pdf hieronder.' : 'De beheerder zet hem klaar.'}</div>`;
  else if (stap === 'sort') {
    const toonAlles = !!ui.kwAlles; const alle = f.items.filter(i => toonAlles || i.soort === 'kw'); const kwL = f.items.filter(i => i.soort === 'kw' && !i.instore); const anderN = f.items.filter(i => i.soort !== 'kw').length;
    const klaarN = kwL.filter(i => kwStatus(p, i.id)).length; const items = ui.kwOpen ? alle.filter(i => !kwStatus(p, i.id)) : alle;
    h += `<div class="blk"><h2 style="margin:0">Week ${f.week}${f.thema ? ' · ' + esc(f.thema) : ''}</h2><p class="small">${f.van ? `${C.fmtDag(f.van)} t/m ${C.fmtDag(f.tm)} · ` : ''}<b class="${klaarN < kwL.length ? 'oranje' : 'groen'}">${kwL.length - klaarN ? `${kwL.length - klaarN} van ${kwL.length} nog sorteren` : `✓ alle ${kwL.length} gesorteerd`}</b></p>
    <p class="small">Tik bij elke actie op de kop waar hij komt, of 📝 voor een notitie zoals "In het vak". Daarna ga je naar <b>2 · Indelen</b>.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm ${ui.kwOpen ? '' : 'sec'}" id="kwOpen">${ui.kwOpen ? '✓ ' : ''}Alleen nog te doen</button>${anderN ? `<button class="btn sm sec" id="kwAlles">${toonAlles ? 'Alleen KW' : `+ vers, diepvries, brood (${anderN})`}</button>` : ''}<button class="btn sm sec" id="kwDeel">📤 Delen</button><button class="btn sm sec" id="pdfBk">📄 Bekijken</button>${kan && !DEMO ? '<button class="btn sm sec" id="kwHaalNu">🔄 Opnieuw ophalen</button>' : ''}</div></div>`;
    h += terugblikHtml(f.van, f.tm, kwL.filter(i => kwStatus(p, i.id)).map(i => [i.naam, kwKeys(i)]));
    const fl = items.filter(i => !i.instore), ins = items.filter(i => i.instore);
    if (f.bron === 'voorkoop') h += `<h3 class="meerkop">📰 Folder (${fl.length})</h3>`;
    h += fl.map(it => kwItemKaart(wk, p, it, kan)).join('') || '<div class="empty">✓ Alle folder-acties gesorteerd. Ga naar 2 · Indelen.</div>';
    if (ins.length) h += `<h3 class="meerkop">🏷️ Instore (${ins.length})</h3><p class="small" style="margin:0 16px">Sorteren mag, hoeft niet. Wat je niet sorteert blijft hier staan.</p>` + ins.map(it => kwItemKaart(wk, p, it, kan)).join('');
  } else {
    const pls = kwPlekken();
    if (!ui.kwKop || !pls.some(x => x.naam === ui.kwKop)) {
      h += `<div class="kwkoppen">${pls.map(x => { const t = x.tafel && S.tafels[x.tafel] && !S.tafels[x.tafel].weg ? S.tafels[x.tafel] : null; const l = f.items.filter(i => (p.plek || {})[i.id] === x.naam); const ind = t ? indelingVan(wk, x.tafel) : { items: [] }; const open = l.filter(i => !(ind.items || []).some(y => y.kw === i.id && (y.cellen || []).length)).length;
        return `<button class="tafelkaart" data-kkop="${esc(x.naam)}"><b>${esc(x.naam)}</b>${t ? tafelTekening(t, ind, true) : '<span class="small">Nog geen tekening</span>'}<span class="small">${l.length} acties${t && open ? ` · <b class="oranje">${open} nog plaatsen</b>` : l.length && t ? ' · ✓ geplaatst' : ''}</span></button>`; }).join('')}</div>`;
      const notL = f.items.filter(i => !kwStatus(p, i.id) || kwStatus(p, i.id).notitie).filter(i => i.soort === 'kw' && !(i.instore && !kwStatus(p, i.id)));
      const groep = {}; notL.forEach(i => { const n = (p.notitie || {})[i.id] || 'Nog sorteren'; (groep[n] = groep[n] || []).push(i); });
      h += Object.keys(groep).sort((a, b) => a === 'Nog sorteren' ? 1 : b === 'Nog sorteren' ? -1 : a < b ? -1 : 1).map(n => `<div class="blk"><h2 style="margin:0 0 6px">${n === 'Nog sorteren' ? '⏳ Nog sorteren' : '📝 ' + esc(n)} <span class="small">(${groep[n].length})</span></h2><div class="small">${groep[n].map(i => esc(i.naam)).join(' · ')}</div></div>`).join('');
      h += `<div class="blk"><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm sec" id="kwDeel">📤 Delen</button><button class="btn sm sec" id="pdfBk">📄 Bekijken</button></div></div>`;
    } else {
      const x = pls.find(y => y.naam === ui.kwKop); const t = x.tafel && S.tafels[x.tafel] && !S.tafels[x.tafel].weg ? S.tafels[x.tafel] : null;
      h += `<div class="blk"><button class="link" id="kwTerug">‹ Alle koppen</button></div>`;
      if (!t) h += `<div class="blk"><h2>${esc(x.naam)}</h2><p class="small">Deze plek heeft nog geen tekening.</p>${mag('instellingen') ? '<button class="btn" id="kwMaakT">Tekening maken</button>' : ''}</div>`;
      else {
        h += kwTekeningen(wk, kan, x.naam);
        const ind = indelingVan(wk, x.tafel); const l = f.items.filter(i => (p.plek || {})[i.id] === x.naam); const open = l.filter(i => !(ind.items || []).some(y => y.kw === i.id && (y.cellen || []).length));
        const sel = ui.kwSel && ui.kwSel.tafel === x.tafel;
        h += `<div class="blk"><h2>Nog plaatsen (${open.length})</h2>${open.length ? `<p class="small">Tik een actie aan en daarna de vakjes in de tekening.</p><div class="list">${open.map(i => `<button class="it rijtik" data-plaats="${i.id}"><span style="flex:1;text-align:left"><b>${esc(i.naam)}</b><br><span class="small">${esc([i.variant, i.mech].filter(Boolean).join(' · '))}</span></span><span class="pijl">›</span></button>`).join('')}</div>` : `<p class="small">${l.length ? '✓ Alles van deze kop staat in de tekening.' : 'Nog geen acties naar deze kop gesorteerd (stap 1).'}</p>`}
        ${(x.lijst || []).length ? `<details class="hbd" ${sel ? '' : ''}><summary>Uit de keuzelijst (${x.lijst.length})</summary><input type="search" id="kplQ" placeholder="🔍 Zoek" style="width:100%"><div class="list" id="kplL">${x.lijst.map((a, i) => `<button class="it rijtik" data-plaatsl="${i}"><span style="flex:1;text-align:left">${esc(a.naam)}<br><span class="small">${esc(a.nr || '')}</span></span><span class="pijl">›</span></button>`).join('')}</div></details>` : ''}
        </div>`;
      }
    }
  }
  if (kan) h += `<div class="blk"><h2>Instellen</h2><div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn sm sec">📄 Pdf kiezen<input type="file" id="kwPdf" accept=".pdf" class="hide"></label>${mag('instellingen') ? '<button class="btn sm sec" id="kwPl">⚙️ Plekken</button>' : ''}</div></div>`;
  v.innerHTML = h; tafelPas(v);
  v.querySelectorAll('[data-kw]').forEach(b => b.onclick = () => { ui.kwWeek = b.dataset.kw; ui.kwSel = null; render(); });
  v.querySelectorAll('[data-kst]').forEach(b => b.onclick = () => { if (b.dataset.kst === 'best') return ga('acties'); ui.kwStap = b.dataset.kst; ui.kwKop = null; ui.kwSel = null; render(); window.scrollTo(0, 0); });
  v.querySelectorAll('[data-haal]').forEach(hb => hb.onclick = async () => { const [y, w] = hb.dataset.haal.split('|').map(Number); hb.disabled = true; hb.innerHTML = '<b>Ophalen…</b>'; try { ui.kwWeek = await folderOphalen(y, w); toast('✓ Folderplanning opgehaald'); log('acties', `Folderplanning week ${w} opgehaald`); } catch (e) { toast(e.message, 5000); } render(); });
  const pi = $('#kwPdf'); if (pi) pi.onchange = async e => { const fl = e.target.files[0]; e.target.value = ''; if (!fl) return; try { const buf = await fl.arrayBuffer(); const r = await kwPdfLezen(buf, fl.name); ui.kwWeek = r.wk; toast(r.tekst, 4000); log('acties', r.tekst.replace('✓ ', '') + ' (geüpload)'); } catch (x) { toast('Niet gelukt: ' + x.message, 5000); } render(); };
  const pl = $('#kwPl'); if (pl) pl.onclick = kwPlekkenBeheer;
  if (!f) return;
  const deel = $('#kwDeel'); if (deel) deel.onclick = () => kwDelen(wk);
  const bk = $('#pdfBk'); if (bk) bk.onclick = () => pdfBekijkKeuze(wk, f && f.bron === 'voorkoop' ? ['folder', 'voorkoop'] : ['folder']);
  v.querySelectorAll('[data-kpag]').forEach(b => b.onclick = () => pdfBekijk(wk, 'folder', +b.dataset.kpag));
  const kpb = $('#kwPrint'); if (kpb) kpb.onclick = () => kwPrintKies(wk);
  const hn = $('#kwHaalNu'); if (hn) hn.onclick = async () => { hn.disabled = true; hn.textContent = 'Ophalen…'; const [y, w] = wk.split('-').map(Number);
    try { const r = await kwHaalOp(y, w); toast(r.folderFout ? `Voorkooplijst opgehaald · folderplanning: ${r.folderFout.message}` : '✓ Voorkooplijst en folderplanning opgehaald', 5000); } catch (e) { toast('Ophalen mislukt: ' + e.message, 5000); } render(true); };
  const ko = $('#kwOpen'); if (ko) ko.onclick = () => { ui.kwOpen = !ui.kwOpen; render(); };
  const ka = $('#kwAlles'); if (ka) ka.onclick = () => { ui.kwAlles = !ui.kwAlles; render(); };
  v.querySelectorAll('[data-ks]').forEach(b => b.onclick = () => kwSoortKies(wk, b.dataset.ks));
  v.querySelectorAll('[data-kz]').forEach(b => b.onclick = () => { const id = b.dataset.kz, pk = b.dataset.kzp; kwZetPlek(wk, id, (p.plek || {})[id] === pk ? '' : pk); render(true); });
  v.querySelectorAll('[data-knt]').forEach(b => b.onclick = () => kwNotitieKies(wk, b.dataset.knt));
  v.querySelectorAll('[data-kspl]').forEach(b => b.onclick = () => kwSplits(wk, b.dataset.kspl));
  v.querySelectorAll('[data-kkop]').forEach(b => b.onclick = () => { ui.kwKop = b.dataset.kkop; ui.kwSel = null; render(); window.scrollTo(0, 0); });
  const kt = $('#kwTerug'); if (kt) kt.onclick = () => { ui.kwKop = null; ui.kwSel = null; render(); window.scrollTo(0, 0); };
  const mt = $('#kwMaakT'); if (mt) mt.onclick = () => kwPlekBewerk(ui.kwKop);
  kwTekenEvents(v, wk, kan);
  const x = kwPlekken().find(y => y.naam === ui.kwKop);
  v.querySelectorAll('[data-plaats]').forEach(b => b.onclick = () => { const it = f.items.find(i => i.id === b.dataset.plaats); const ind = JSON.parse(JSON.stringify(indelingVan(wk, x.tafel))); ind.items = ind.items || []; let j = ind.items.findIndex(y => y.kw === it.id); if (j < 0) { ind.items.push({ naam: it.naam, artikelen: kwKeys(it).map(k => ({ key: k, naam: M.art[k].naam, nr: M.art[k].nr })), cellen: [], aantal: '', opm: [it.mech, it.variant].filter(Boolean).join(' · '), kleur: ind.items.length % TKLEUR.length, klaar: false, kw: it.id }); j = ind.items.length - 1; slaIndelingOp(wk, x.tafel, ind); } ui.kwSel = { tafel: x.tafel, idx: j }; render(true); window.scrollTo(0, 0); });
  v.querySelectorAll('[data-plaatsl]').forEach(b => b.onclick = () => { const a = x.lijst[+b.dataset.plaatsl]; const key = a.nr && M.art['kw:' + a.nr] ? 'kw:' + a.nr : null; const ind = JSON.parse(JSON.stringify(indelingVan(wk, x.tafel))); ind.items = ind.items || []; let j = ind.items.findIndex(y => y.lijst && y.naam === a.naam); if (j < 0) { ind.items.push({ naam: a.naam, artikelen: key ? [{ key, naam: M.art[key].naam, nr: M.art[key].nr }] : a.nr ? [{ naam: a.naam, nr: a.nr }] : [], cellen: [], aantal: '', opm: '', kleur: ind.items.length % TKLEUR.length, klaar: false, lijst: true }); j = ind.items.length - 1; slaIndelingOp(wk, x.tafel, ind); } ui.kwSel = { tafel: x.tafel, idx: j }; render(true); window.scrollTo(0, 0); });
  const kq = $('#kplQ'); if (kq) kq.oninput = e => { const q = e.target.value.toLowerCase(); v.querySelectorAll('#kplL [data-plaatsl]').forEach(y => y.style.display = !q || y.textContent.toLowerCase().includes(q) ? '' : 'none'); };
  const pv = $('#kwPdf1'); if (pv) pv.onclick = () => { const alle = kwPlekken().filter(y => y.tafel && S.tafels[y.tafel] && !S.tafels[y.tafel].weg); const keus = x && x.tafel ? [x] : (ls.get('cba-kwprint') ? alle.filter(y => ls.get('cba-kwprint').includes(y.naam)) : alle); if (!keus.length) return toast('Geef eerst een kop een tekening'); kwPrint(wk, keus, !!ls.get('cba-kwprintbc'), ls.get('cba-kwprintvak') === false); };
}
async function kwDelen(wk) {
  const p = S.kwplan[wk]; const f = p.folder; const kwL = f.items.filter(i => i.soort === 'kw');
  let t = `Acties KW week ${f.week}${f.thema ? ' – ' + f.thema : ''}\n`;
  for (const x of kwPlekken()) { const l = kwL.filter(i => (p.plek || {})[i.id] === x.naam); if (!l.length) continue; const pt = x.tafel ? kwPlankTekst(wk, x) : ''; t += `\n${x.naam.toUpperCase()}\n` + (pt ? pt + '\n' : '') + l.map(i => `${kwKlaar(wk, i.id) ? '☑' : '☐'} ${i.naam}${i.variant ? ' (' + i.variant + ')' : ''}`).join('\n') + '\n'; }
  const not = {}; kwL.filter(i => !kwStatus(p, i.id) || kwStatus(p, i.id).notitie).forEach(i => { const n = (p.notitie || {})[i.id] || 'NOG SORTEREN'; (not[n] = not[n] || []).push(i); });
  for (const n of Object.keys(not).sort((a, b) => a === 'NOG SORTEREN' ? 1 : b === 'NOG SORTEREN' ? -1 : 0)) t += `\n${n.toUpperCase()}\n` + not[n].map(i => '☐ ' + i.naam).join('\n') + '\n';
  t = t.trim(); window.__laatsteDeel = t; try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); toast('Gekopieerd'); } } catch (e) { }
}
function kwPlekkenOpslaan(l) { const w = JSON.parse(JSON.stringify(S.inst || {})); w.kwPlekken = l; return saveInst(w); }
function kwPlekkenBeheer() {
  const pct = f => { f = C.num(f); return f === 1 ? 'normaal' : f === 2 ? 'dubbel' : f > 1 ? Math.round((f - 1) * 100) + '% meer' : Math.round((1 - f) * 100) + '% minder'; };
  const ov = sheet(`<h2 style="margin:0">Plekken</h2><p class="small">De vaste plekken in de winkel waar KW-acties komen. Tik op een plek om hem aan te passen.</p><div class="list">${kwPlekken().map(x => { const t = x.tafel && S.tafels[x.tafel] && !S.tafels[x.tafel].weg ? S.tafels[x.tafel] : null; return `<button class="it rijtik" data-pb="${esc(x.naam)}"><span style="flex:1;text-align:left"><b>🗂️ ${esc(x.naam)}</b><br><span class="small">${pct(x.factor)}${t ? ` · tekening ${t.rijen}×${t.kol}` : ' · nog geen tekening'}${(x.lijst || []).length ? ` · keuzelijst ${x.lijst.length}` : ''}</span></span><span class="pijl">›</span></button>`; }).join('')}</div>
  <button class="btn sec" id="pbN" style="width:100%;margin-top:10px">+ Plek toevoegen</button><button class="btn" data-x style="width:100%;margin-top:8px">Klaar</button>`, (e, o) => { const b = e.target.closest('[data-pb]'); if (b) { o.remove(); kwPlekBewerk(b.dataset.pb); } });
  ov.querySelector('#pbN').onclick = async () => { ov.remove(); let n = 'Nieuwe plek', i = 2; while (kwPlekken().some(x => x.naam === n)) n = 'Nieuwe plek ' + i++; await kwPlekkenOpslaan(kwPlekken().concat([{ naam: n, factor: 1.3 }])); kwPlekBewerk(n, true); };
}
function kwPlekBewerk(naam, nieuw) {
  const FAC = [[1, 'Normaal'], [1.15, '15% meer'], [1.3, '30% meer'], [1.5, '50% meer'], [2, 'Dubbel']];
  const ov = sheet('<div id="pbx"></div>');
  const teken = () => {
    const l = kwPlekken(); const x = l.find(y => y.naam === naam); if (!x) { ov.remove(); return; } const t = x.tafel && S.tafels[x.tafel] && !S.tafels[x.tafel].weg ? S.tafels[x.tafel] : null;
    ov.querySelector('#pbx').innerHTML = `<button class="link" id="pbT">‹ Alle plekken</button><h2 style="margin:6px 0 0">${esc(x.naam)}</h2>
    <label class="small" style="display:block;margin-top:10px">Naam</label><input type="text" id="pbNaam" value="${esc(x.naam)}" style="width:100%">
    <label class="small" style="display:block;margin-top:12px">Verkoopt hier</label><div class="chips2" id="pbF">${FAC.map(([f, n]) => `<button type="button" class="${Math.abs(C.num(x.factor) - f) < 0.01 ? 'aan' : ''}" data-f="${f}">${n}</button>`).join('')}</div>
    <label class="small" style="display:block;margin-top:12px">Tekening</label>${t ? `<div class="pbmini">${tafelTekening(t, { items: [] }, true)}</div><p class="small">${t.rijen} planken × ${t.kol} vakken${(t.vast || []).length ? ` · ${t.vast.length} vast` : ''}</p><button class="btn sm sec" id="pbTk">✏️ Aanpassen</button>` : '<button class="btn sm" id="pbTk">+ Tekening maken</button>'}
    <label class="small" style="display:block;margin-top:12px">Keuzelijst</label><p class="small">${(x.lijst || []).length ? `${x.lijst.length} artikelen (bijv. de euro-koopjes)` : 'Leeg. Handig voor bijvoorbeeld de euro-koopjes.'}</p><button class="btn sm sec" id="pbL">📋 ${(x.lijst || []).length ? 'Bekijken' : 'Vullen'}</button>
    <button class="btn sec" id="pbW" style="width:100%;margin-top:20px;color:#d32f2f;border-color:#d32f2f">Plek verwijderen</button>`;
    const q = s => ov.querySelector(s);
    const bewaar = async (fn, opnieuw = true) => { const l2 = JSON.parse(JSON.stringify(kwPlekken())); const y = l2.find(z => z.naam === naam); fn(y, l2); await kwPlekkenOpslaan(l2); if (opnieuw) teken(); };
    q('#pbT').onclick = () => { ov.remove(); kwPlekkenBeheer(); };
    q('#pbNaam').onchange = async e => { const nn = e.target.value.trim(); if (!nn || nn === naam) return; if (kwPlekken().some(y => y.naam === nn)) { toast('Die naam bestaat al'); e.target.value = naam; return; } const oud = naam;
      await bewaar(y => { y.naam = nn; }, false); naam = nn;
      for (const wk of Object.keys(S.kwplan || {})) { const p = S.kwplan[wk]; let a = false; const pl = Object.assign({}, p.plek || {}); for (const id in pl) if (pl[id] === oud) { pl[id] = nn; a = true; } if (a) { p.plek = pl; kwPlanOpslaan(wk); } }
      const x2 = kwPlekken().find(y => y.naam === nn); const t2 = x2 && x2.tafel && S.tafels[x2.tafel]; if (t2) { const d = Object.assign({}, t2, { naam: nn }); delete d.id; write('tafels', [{ id: x2.tafel, data: d }]); }
      if (ui.kwKop === oud) ui.kwKop = nn; teken(); };
    q('#pbF').onclick = e => { const b = e.target.closest('[data-f]'); if (b) bewaar(y => { y.factor = +b.dataset.f; }); };
    q('#pbTk').onclick = () => tafelBewerk(t, { kop: true, voor: { naam: x.naam, rijen: 4, kol: 4, kw: true }, klaar: id => { bewaar(y => { y.tafel = id; }); } });
    q('#pbL').onclick = () => { const y = JSON.parse(JSON.stringify(x)); kwLijstKeuze(ov, y, async () => { ov.querySelector('.sheetIn').innerHTML = '<div id="pbx"></div>'; await bewaar(z => { z.lijst = y.lijst || []; }); }); };
    q('#pbW').onclick = async () => { if (!await bevestig('Plek verwijderen?', `<b>${esc(x.naam)}</b> verdwijnt. Acties die hier stonden komen terug bij "Nog sorteren".`, 'Verwijderen', 'Annuleren')) return; const l2 = kwPlekken().filter(y => y.naam !== naam); await kwPlekkenOpslaan(l2); if (x.tafel && S.tafels[x.tafel]) { const d = Object.assign({}, S.tafels[x.tafel], { weg: true }); delete d.id; write('tafels', [{ id: x.tafel, data: d }]); } ov.remove(); render(); };
  };
  teken();
}
function kwNaarTafel(wk, it, oud, nieuw) {
  const tf = n => { const x = kwPlekken().find(p => p.naam === n); return x && x.tafel && S.tafels[x.tafel] ? x.tafel : null; };
  const to = tf(oud), tn = tf(nieuw); if (to === tn) return;
  if (to) { const ind = JSON.parse(JSON.stringify(indelingVan(wk, to))); ind.items = (ind.items || []).filter(x => x.kw !== it.id); slaIndelingOp(wk, to, ind); }
  if (tn) { const ind = JSON.parse(JSON.stringify(indelingVan(wk, tn))); ind.items = (ind.items || []).filter(x => x.kw !== it.id); ind.items.push({ naam: it.naam, artikelen: kwKeys(it).map(k => ({ key: k, naam: M.art[k].naam, nr: M.art[k].nr })), cellen: [], aantal: '', opm: [it.mech, it.variant].filter(Boolean).join(' · '), kleur: ind.items.length % TKLEUR.length, klaar: false, kw: it.id }); slaIndelingOp(wk, tn, ind); }
}
function kwKlaar(wk, id) { const p = S.kwplan[wk]; if ((p.klaar || {})[id]) return true; const pl = kwPlekken().find(x => x.naam === (p.plek || {})[id]); if (!pl || !pl.tafel) return false; const it = (indelingVan(wk, pl.tafel).items || []).find(x => x.kw === id); return !!(it && it.klaar); }
const KW_SOORT = [['kw', 'KW'], ['vers', 'Vers'], ['brood', 'Brood'], ['diep', 'Diepvries']];
function kwPas(p) { if (!p || !p.folder) return p; const o = p.soort || {}; for (const it of p.folder.items || []) { if (it.soort0 === undefined) it.soort0 = it.soort; it.soort = o[it.id] || it.soort0; } return p; }
function kwSoortKies(wk, id) {
  const p = S.kwplan[wk]; const it = p.folder.items.find(i => i.id === id);
  const ov = sheet(`<h2 style="margin:0">${esc(it.naam)}</h2><p class="small">Wat is dit voor artikel? Uit de pdf: ${(KW_SOORT.find(x => x[0] === it.soort0) || [, it.soort0])[1]}.</p><div class="list">${KW_SOORT.map(([k, n]) => `<button class="it rijtik ${it.soort === k ? 'on' : ''}" data-ks2="${k}"><span style="flex:1">${it.soort === k ? '✓ ' : ''}${n}</span></button>`).join('')}</div><button class="btn sec" data-x style="width:100%;margin-top:10px">Annuleren</button>`, (e, o) => {
    const b = e.target.closest('[data-ks2]'); if (!b) return; o.remove(); p.soort = Object.assign({}, p.soort || {}); if (b.dataset.ks2 === it.soort0) delete p.soort[id]; else p.soort[id] = b.dataset.ks2; kwPas(p); kwPlanOpslaan(wk); render(true);
  });
}
function kwTegel() { const nu = weekSleutel(C.today()); const w = Object.keys(S.kwplan || {}).sort().find(x => x >= nu); if (!w) return 'Nog geen folderplanning'; kwPas(S.kwplan[w]); const f = S.kwplan[w].folder; const kw = f.items.filter(i => i.soort === 'kw' && !i.instore); kwNormPlan(S.kwplan[w]); const ing = kw.filter(i => kwStatus(S.kwplan[w], i.id)).length; return `<b class="${ing < kw.length ? 'oranje' : ''}">Week ${f.week}: ${ing} van ${kw.length} gesorteerd</b>`; }
