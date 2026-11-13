/* ---------- beheer ---------- */
function renderBeheer() {
  const v = $('#view'); const st = M.st;
  const dagen = M.dagLijst; const last = dagen[dagen.length - 1];
  const gaten = []; if (dagen.length) for (let d = C.add(C.today(), -60) > dagen[0] ? C.add(C.today(), -60) : dagen[0]; d < C.today(); d = C.add(d, 1)) if (!S.dagen[d] && !(M.bijz[d] && M.bijz[d].soort === 'gesloten')) gaten.push(d);
  const bz = []; for (let d = C.today(); d <= C.add(C.today(), 370); d = C.add(d, 1)) if (M.bijz[d] && !M.bijz[d].voor) bz.push(d);
  const effTxt = naam => { const e = M.effect[naam]; if (!e || !e.length) return ''; const r = e[e.length - 1]; const p = Math.round((r.r - 1) * 100); return ` · vorige keer ${p >= 0 ? '+' : ''}${p}%`; };
  const voorEff = naam => { const e = M.effect['Dag voor ' + naam]; if (!e || !e.length) return ''; const p = Math.round((e[e.length - 1].r - 1) * 100); return ` · dag ervoor ${p >= 0 ? '+' : ''}${p}%`; };
  const chk = Object.values(M.art).filter(a => a.check && M.keys[a.key]);
  const kU = mag('upload'), kI = mag('instellingen');
  const vg = S.boeken.vers ? [...new Set(S.boeken.vers.artikelen.map(x => x.groep))] : [];
  const odVan = g => ((S.inst && S.inst.onderdelen) || {})[g] || (odCache && odCache.m[g]) || C.standaardOnderdelen(vg)[g] || 'vers';
  const schemaVan = o => st.schema[o] || st.schema.vers;
  const schemaRij = (bron, r, i) => `<div class="f"><label>Bestellen <select data-sch="${bron}" data-i="${i}" data-f="b">${C.DAGNAAM.map((d, j) => `<option value="${j}" ${j === r.b ? 'selected' : ''}>${d}</option>`).join('')}</select></label><label>levering <select data-sch="${bron}" data-i="${i}" data-f="l">${C.DAGNAAM.map((d, j) => `<option value="${j}" ${j === r.l ? 'selected' : ''}>${d}</option>`).join('')}</select></label><button class="btn sm sec" data-schdel="${bron}" data-i="${i}" aria-label="Verwijderen">🗑️</button></div>`;
  v.innerHTML = `${kU ? `
  <div class="blk" data-sec="upload"><h2>Bestanden uploaden</h2><p class="small">Kies één of meer bestanden tegelijk: dag-exports uit CasPos (.xls), bestelboek Vers of KW (.pdf) en de actie-pdf. De app herkent zelf wat het is.</p>
  <label class="btn" style="display:block;text-align:center">Bestanden kiezen<input type="file" id="up" multiple accept=".xls,.xlsx,.pdf" class="hide"></label><button class="btn sec" id="upLink" style="width:100%;margin-top:8px">🔗 Link plakken</button><div class="log hide" id="upLog"></div></div>
  <div class="blk" data-sec="upload"><h2>Dag-exports laatste 8 weken</h2>${(() => { const m = ontbrekend(); return m.length ? `<p class="small rood">⚠️ ${ontbrekendTekst(m)}</p>` : '<p class="small groen">✓ Geen dagen ontbreken</p>'; })()}${kalenderHtml()}</div>
  <div class="blk" data-sec="upload"><h2>Status</h2><div class="kv">
  <span>Verkoopdagen</span><b>${dagen.length ? `${dagen.length} dagen · ${C.fmtDag(dagen[0])} t/m ${C.fmtDag(last)}` : 'nog geen'}</b>
  <span>Bestelboek Vers</span><b>${S.boeken.vers ? 'week ' + (S.boeken.vers.week || '?') + ' · ' + S.boeken.vers.artikelen.length + ' artikelen' : 'nog niet geüpload'}</b>
  <span>Bestelboek KW</span><b>${S.boeken.kw ? (S.boeken.kw.datum ? C.fmtDag(S.boeken.kw.datum) : '') + ' · ' + S.boeken.kw.artikelen.length + ' artikelen' : 'nog niet geüpload'}</b>
  <span>Bestelboeken</span><b>${boekenMissen()}</b>
  <span>Collo-lijst</span><b>${(c => c.datum.split('-').reverse().map(Number).join('-') + ' · ' + Object.keys(c.items).length + ' artikelen')(colloLijst())}</b>
  <span>Acties</span><b>${S.acties.length ? S.acties.map(a => 'wk ' + a.week).join(', ') : 'nog geen'}</b></div>
  ${gaten.length ? `<p class="small" style="color:var(--red)">Ontbrekende dagen (laatste 60): ${gaten.map(C.fmtDag).join(', ')}</p>` : ''}
  ${dagen.length < 56 ? `<p class="small">Tip: upload minstens 8 weken aan dag-exports voor een betrouwbaar gemiddelde.</p>` : ''}</div>
  <div class="blk" data-sec="auto"><h2>Automatisch uploaden</h2><p class="small">Een computer in de winkel stuurt de dag-export dan zelf naar de app. CasPos zet de export elke dag in een map; een klein script op die computer kijkt elke 5 minuten en stuurt nieuwe bestanden door.</p><div id="autoIn"><p class="small">Laden…</p></div></div>
  <div class="blk" data-sec="verwijderen"><h2>Uploads verwijderen</h2><p class="small">Alleen nodig als je per ongeluk een verkeerd bestand hebt geüpload. Je krijgt eerst de vraag of je het zeker weet.</p><h3>Acties</h3><div class="list">${S.acties.map(a => `<div class="it"><span>Week ${a.week} · ${C.fmtDag(a.van)} t/m ${C.fmtDag(a.tm)} · ${a.items.length} artikelen</span><button class="btn sm sec" data-delac="${a.id}" aria-label="Verwijderen">🗑️</button></div>`).join('') || '<div class="small">Geen</div>'}</div>
  <h3>Dag-exports (laatste 21)</h3><div class="list">${dagen.slice(-21).reverse().map(d => `<div class="it"><span>${C.fmtDag(d)} ${d.slice(0, 4)}</span><button class="btn sm sec" data-deldag="${d}" aria-label="Verwijderen">🗑️</button></div>`).join('') || '<div class="small">Geen</div>'}</div></div>` : ''}
  ${kI ? `<div class="blk" data-sec="advies"><h2>Advies-instellingen</h2><p class="small">Voor gevorderden. Meestal hoef je hier niets aan te veranderen.</p><div class="form">
  <div class="f"><label>Waarschuwen als iemand veel meer bestelt dan het advies</label><select id="iWaar">${[[0, 'Uit'], [1.5, 'Bij 1,5× het advies'], [2, 'Bij 2× het advies'], [3, 'Bij 3× het advies']].map(([n, t]) => `<option value="${n}" ${n === waarschuwF() ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
  <div class="f"><label>Even tellen: aantal per besteldag (0 = uit)</label><select id="iTel">${[0, 3, 5, 10, 15].map(n => `<option value="${n}" ${n === telMax() ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
  <div class="f"><label>Weken voor gemiddelde</label><input type="number" id="iW" min="3" max="26" value="${st.weken}"></div>
  <div class="f"><label>Buffer Vers (%)</label><input type="number" id="iBV" min="0" max="100" value="${st.buffer.vers}"></div>
  <div class="f"><label>Buffer KW (%)</label><input type="number" id="iBK" min="0" max="100" value="${st.buffer.kw}"></div>
  <div class="f"><label>Actie-effect folder bij 50% korting (×)</label><input type="number" step="0.1" id="iAF" value="${st.actieFactor.folder}"></div>
  <div class="f"><label>Actie-effect instore bij 50% korting (×)</label><input type="number" step="0.1" id="iAI" value="${st.actieFactor.instore}"></div>
  <div class="f"><label>Actievoorraad vooraf (levering vóór de actiemaandag dekt ook maandag)</label><input type="checkbox" id="iVo" ${st.vooraf ? 'checked' : ''} style="width:auto"></div>
  <p class="small">Geleerd uit je eigen acties: folder ${M.slope.folder.length >= 5 ? `×${C.fmt(1 + M.slopeF * 0.5)} bij 50% (${M.slope.folder.length} acties)` : 'nog te weinig acties, standaard gebruikt'} · instore ${M.slope.instore.length >= 5 ? `×${C.fmt(1 + M.slopeI * 0.5)} (${M.slope.instore.length} acties)` : 'nog te weinig acties'}.</p>
  <button class="btn" data-isave>Opslaan</button></div></div>
  ${kI ? advies115() : ''}
  <div class="blk" data-sec="advies"><h2>Derving schatten</h2><p class="small">Voor groepen met korte houdbaarheid. Is er bij een artikel geen derving ingevuld, dan schat de app die uit besteld min verkocht over de laatste 4 weken (minstens 3 leveringen). Ingevulde derving gaat altijd voor.</p>
  ${BESTEL_OD.filter(od => odGroepen(od).length).map(od => { const gs = odGroepen(od); const aan = new Set((S.inst || {}).dervSchat || []); return `<h3 style="display:flex;justify-content:space-between;align-items:center">${odNaam(od)}<button type="button" class="btn sm sec" data-dsod="${od}">${gs.every(g => aan.has(g)) ? 'Alles uit' : 'Alles aan'}</button></h3><div class="list">${gs.map(g => `<label class="it"><span style="flex:1">${esc(g)}</span><input type="checkbox" class="schak" data-dsg="${esc(g)}" ${aan.has(g) ? 'checked' : ''}></label>`).join('')}</div>`; }).join('')}</div>
  <div class="blk" data-sec="dagen"><h2>Besteldagen en deadlines</h2><p class="small">Per onderdeel op welke dag je bestelt en wanneer het geleverd wordt.</p><div class="form">
  ${BESTEL_OD.map(o => `<h3>Bestelschema ${odNaam(o)}</h3>${schemaVan(o).map((r, i) => schemaRij(o, r, i)).join('')}<button class="btn sm sec" data-schadd="${o}">+ besteldag</button>`).join('')}
  <h3>Besteldeadline</h3><p class="small">Tot hoe laat je bij de leverancier kunt bestellen. Op Home zie je hoe lang je nog hebt; een half uur ervoor komt er een melding als er nog iets open staat. Leeg = geen deadline.</p><div class="f"><label style="width:90px">Versunie</label><input type="time" id="dlV" value="${((S.inst || {}).deadline || {}).versunie || ''}" style="width:110px"></div><div class="f"><label style="width:90px">Van Tol</label><input type="time" id="dlT" value="${((S.inst || {}).deadline || {}).vantol || ''}" style="width:110px"></div><p class="small">Deze tijd geldt op de besteldag zelf.</p>
  <h3>Andere deadline per groep</h3><p class="small">Bijvoorbeeld als melk later besteld kan worden dan vlees. De groep krijgt dan een eigen deadline en een eigen melding.</p>
  <div class="list">${dlRegels().map(r => `<div class="it"><span style="flex:1"><b>${esc(regelNaam(r))}</b><br><span class="small">${LEV_NAAM[r.lev]} · ${dlRegelTekst(r)}</span></span><button type="button" class="btn sm sec" data-dlr="${((S.inst || {}).dlRegels || []).indexOf(r)}">Wijzig</button></div>`).join('') || '<div class="small">Nog geen. Alle groepen volgen de deadline hierboven.</div>'}</div>
  <button type="button" class="btn sm sec" id="dlAdd">+ Groep met eigen deadline</button>
  <button class="btn" data-isave>Opslaan</button></div></div>
  <div class="blk" data-sec="open"><h2>Openingstijden</h2><div class="form">${C.DAGNAAM.map((d, i) => `<div class="f"><label style="width:90px">${d}</label><input type="time" data-op="${i}" data-f="0" value="${st.open[i][0]}" style="width:110px"><input type="time" data-op="${i}" data-f="1" value="${st.open[i][1]}" style="width:110px"></div>`).join('')}<p class="small">Laat beide tijden leeg als de winkel die dag dicht is.</p>
  <button class="btn" data-isave>Opslaan</button></div></div>
  <div class="blk" data-sec="open"><h2>Feestdagen en bijzondere dagen</h2><p class="small">Komend jaar. Het effect op de verkoop wordt elk jaar onthouden en de volgende keer gebruikt.</p><div class="list">
  ${bz.map(d => { const b = M.bijz[d]; return `<div class="it" style="flex-wrap:wrap"><span style="flex:1 1 180px"><b>${esc(b.naam)}</b><br><span class="small">${C.fmtDag(d)} ${d.slice(0, 4)}${effTxt(b.naam)}${voorEff(b.naam)}</span></span>
  <select data-ag="${d}" data-f="soort"><option value="normaal" ${b.soort === 'normaal' ? 'selected' : ''}>Normaal open</option><option value="aangepast" ${b.soort === 'aangepast' ? 'selected' : ''}>Aangepaste tijden</option><option value="gesloten" ${b.soort === 'gesloten' ? 'selected' : ''}>Gesloten</option></select>
  ${b.soort === 'aangepast' ? `<input type="time" data-ag="${d}" data-f="open" value="${b.open || ''}" style="width:105px"><input type="time" data-ag="${d}" data-f="dicht" value="${b.dicht || ''}" style="width:105px">` : ''}</div>`; }).join('')}</div>
  <h3>Eigen bijzondere dag toevoegen</h3><div class="row"><input type="date" id="agD"><input type="text" id="agN" placeholder="Naam (bijv. Braderie)" style="flex:1"><button class="btn sm" id="agAdd">Toevoegen</button></div></div>
  ${boBeheerHtml()}
  <div class="blk" data-sec="onderdelen"><h2>Afdelingen</h2><p class="small">Bij welke afdeling elke groep uit het Versunie-boek hoort. Een nieuwe groep komt automatisch bij het onderdeel van de groep ervoor.</p><div class="list">${vg.map(g => `<div class="it"><span style="flex:1">${esc(g)}</span><select data-odg="${esc(g)}">${['agf', 'vers', 'brood', 'diep'].map(o => `<option value="${o}" ${odVan(g) === o ? 'selected' : ''}>${odNaam(o)}</option>`).join('')}</select></div>`).join('') || '<div class="small">Upload eerst het Versunie-boek.</div>'}</div></div>` + volgordeHtml() : ''}
  ${kU ? `<div class="blk" data-sec="controle"><h2>Niet gekoppeld (${onbekendLijst().length})</h2><p class="small">Verkocht via Versunie of Van Tol, maar het bestelnummer staat niet in het bestelboek. Meestal nieuw of uit het assortiment.</p><p class="small">Tik op een artikel om het te koppelen, als eigen artikel toe te voegen of te negeren. Meest verkocht staat bovenaan.</p><input type="search" id="onbQ" placeholder="🔍 Zoek naam of nummer" value="${esc(ui.onbQ || '')}" style="width:100%;margin-bottom:8px"><div class="list">${onbekendLijst().filter(o => !ui.onbQ || zoekScore(ui.onbQ, o.n) > 0 || String(o.b).includes(ui.onbQ) || o.eans.some(e => e.includes(ui.onbQ))).slice(0, 200).map(o => `<button class="it rijtik" data-onb="${esc(o.id)}"><span style="flex:1;text-align:left">${esc(o.n)} <span class="small">· ${esc(o.l)} · bestelnr ${esc(o.b)} · ${esc(o.eans.join(', '))}${o.tot ? ` · ${C.fmt(o.tot)} verkocht` : ''}</span></span><span class="pijl">›</span></button>`).join('') || '<div class="small">Alles gekoppeld.</div>'}</div>
  ${(() => { const kp = Object.entries((S.inst || {}).koppel || {}), ng = (S.inst || {}).negeer || []; if (!kp.length && !ng.length) return ''; return `<h3>Gekoppeld of genegeerd</h3><div class="list">${kp.map(([k, d]) => `<div class="it"><span style="flex:1">${esc(k.split(':')[1])} → <b>${esc((M.art[d] || {}).naam || d)}</b></span><button type="button" class="btn sm sec" data-ontk="${esc(k)}">Ontkoppelen</button></div>`).join('')}${ng.map(k => `<div class="it"><span style="flex:1">${esc(k.split(':')[1])} <span class="small">· genegeerd</span></span><button type="button" class="btn sm sec" data-ontk="${esc(k)}">Terugzetten</button></div>`).join('')}</div>`; })()}</div>
  ${controle115()}
  <div class="blk" data-sec="controle"><h2>Besteleenheid controleren (${chk.length})</h2><p class="small">Bij deze artikelen is de besteleenheid uit de naam afgeleid. Pas aan als het niet klopt.</p><div class="list">${chk.map(a => `<div class="it" style="flex-wrap:wrap"><span style="flex:1 1 200px">${esc(a.naam)} <span class="small">${a.nr} · ${a.eh}</span></span><label class="small">per doos <input type="checkbox" data-he="${a.key}" data-f="perHE" ${a.perHE ? 'checked' : ''}></label><input type="number" step="0.1" data-he="${a.key}" data-f="he" value="${a.he}" style="width:80px"><button class="btn sm sec" data-heok="${a.key}">Klopt</button></div>`).join('') || '<div class="small">Niets te controleren.</div>'}</div></div>` : ''}`;
  // events
  const ul = $('#upLink'); if (ul) ul.onclick = linkPlakken;
  const upI = $('#up'); if (upI) upI.onchange = e => { if (OEFEN) return toast('Uploaden kan niet tijdens oefenen'); uploads([...e.target.files]); };
  v.querySelectorAll('[data-delac]').forEach(b => b.onclick = async () => { if (!await bevestig('Weet je het zeker?', 'Deze actieweek wordt verwijderd.', 'Verwijderen', 'Annuleren')) return; await adminDo(async () => { if (!DEMO) await remove('acties', `id=eq.${b.dataset.delac}&winkel_id=eq.${W}`); S.acties = S.acties.filter(a => a.id !== b.dataset.delac); }); });
  v.querySelectorAll('[data-deldag]').forEach(b => b.onclick = async () => { if (!await bevestig('Weet je het zeker?', 'De dag-export van ' + C.fmtDag(b.dataset.deldag) + ' wordt verwijderd.', 'Verwijderen', 'Annuleren')) return; await adminDo(async () => { const d = b.dataset.deldag; if (!DEMO) await remove('dagverkoop', `dag=eq.${d}&winkel_id=eq.${W}`); delete S.dagen[d]; delete S.dagMeta[d]; await idel('d:' + W + ':' + d); }); });
  const inst = () => JSON.parse(JSON.stringify(Object.assign({}, S.inst || {}, { weken: st.weken, buffer: st.buffer, actieFactor: st.actieFactor, vooraf: st.vooraf, schema: Object.fromEntries(BESTEL_OD.map(o => [o, schemaVan(o)])), open: st.open, he: st.he })));
  const work = inst();
  v.querySelectorAll('[data-sch]').forEach(s => s.onchange = () => { work.schema[s.dataset.sch][+s.dataset.i][s.dataset.f] = +s.value; });
  v.querySelectorAll('[data-schdel]').forEach(b => b.onclick = async () => { if (!await bevestig('Besteldag verwijderen?', 'Deze besteldag en levering verdwijnen uit het schema.', 'Verwijderen')) return; work.schema[b.dataset.schdel].splice(+b.dataset.i, 1); saveInst(work); });
  v.querySelectorAll('[data-schadd]').forEach(b => b.onclick = () => { work.schema[b.dataset.schadd].push({ b: 0, l: 2 }); saveInst(work); });
  if ($('#volgOd')) volgordeEvents(v);
  v.querySelectorAll('[data-dlr]').forEach(b => b.onclick = () => dlRegelBewerk(work, +b.dataset.dlr));
  const dla = $('#dlAdd'); if (dla) dla.onclick = () => dlRegelBewerk(work, -1);
  v.querySelectorAll('[data-hbg]').forEach(c => c.onchange = () => { work.houdb = Object.assign({}, work.houdb || {}); const n = +c.value; if (n) work.houdb[c.dataset.hbg] = n; else delete work.houdb[c.dataset.hbg]; saveInst(work); });
  v.querySelectorAll('[data-wg]').forEach(c => c.onchange = () => { const l = new Set(work.weerUit || []); if (c.checked) l.delete(c.dataset.wg); else l.add(c.dataset.wg); work.weerUit = [...l]; saveInst(work); });
  const ld2 = $('#lcAfw'); if (ld2) ld2.onclick = async () => { const t = window.__afwTekst || ''; window.__laatsteDeel = t; try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); toast('Gekopieerd'); } } catch (e) { } };
  v.querySelectorAll('[data-dsg]').forEach(c => c.onchange = () => { const l = new Set(work.dervSchat || []); if (c.checked) l.add(c.dataset.dsg); else l.delete(c.dataset.dsg); work.dervSchat = [...l]; saveInst(work); });
  v.querySelectorAll('[data-dsod]').forEach(b => b.onclick = () => { const l = new Set(work.dervSchat || []); const gs = odGroepen(b.dataset.dsod); const alle = gs.every(g => l.has(g)); gs.forEach(g => alle ? l.delete(g) : l.add(g)); work.dervSchat = [...l]; saveInst(work); });
  v.querySelectorAll('[data-onb]').forEach(b => b.onclick = () => onbekendKies(work, b.dataset.onb));
  const oq = $('#onbQ'); if (oq) oq.oninput = () => { ui.onbQ = oq.value.trim(); clearTimeout(oq._t); oq._t = setTimeout(() => { render(); const n = $('#onbQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  v.querySelectorAll('[data-ontk]').forEach(b => b.onclick = () => { const k = b.dataset.ontk; work.koppel = Object.assign({}, work.koppel || {}); delete work.koppel[k]; work.negeer = (work.negeer || []).filter(x => x !== k); saveInst(work); });
  v.querySelectorAll('[data-odg]').forEach(s => s.onchange = () => { work.onderdelen = Object.assign({}, work.onderdelen || {}, { [s.dataset.odg]: s.value }); odCache = null; saveInst(work); });
  boBeheerEvents(v);
  if (!v.querySelector('[data-isave]')) { beheerMenu(v, chk); return; }
  v.querySelectorAll('[data-op]').forEach(i => i.onchange = () => { work.open[+i.dataset.op][+i.dataset.f] = i.value; });
  const opslaanInst = () => { work.weken = Math.max(3, Math.min(26, +$('#iW').value || 8)); work.buffer = { vers: +$('#iBV').value || 0, kw: +$('#iBK').value || 0 }; work.actieFactor = { folder: C.num($('#iAF').value) || 3, instore: C.num($('#iAI').value) || 1.5 }; work.vooraf = $('#iVo').checked; if ($('#iTel')) work.telMax = +$('#iTel').value; if ($('#iWaar')) work.waarschuw = +$('#iWaar').value; work.deadline = { versunie: $('#dlV').value || '', vantol: $('#dlT').value || '' }; saveInst(work); };
  v.querySelectorAll('[data-isave]').forEach(b => b.onclick = opslaanInst);
  v.querySelectorAll('[data-ag]').forEach(i => i.onchange = () => { const d = i.dataset.ag; const b = M.bijz[d]; const row = Object.assign({ dag: d, naam: b.naam, soort: b.soort || 'normaal', open: b.open || null, dicht: b.dicht || null }, S.agenda.find(x => x.dag === d) || {}); row[i.dataset.f] = i.value || null; if (row.soort === 'aangepast' && !row.open) { row.open = M.st.open[C.wd(d)][0] || '08:00'; row.dicht = '16:00'; } saveAgenda(row); });
  $('#agAdd').onclick = () => { const d = $('#agD').value, n = $('#agN').value.trim(); if (!d || !n) return toast('Vul datum en naam in'); saveAgenda({ dag: d, naam: n, soort: 'normaal', open: null, dicht: null }); };
  v.querySelectorAll('[data-heok]').forEach(b => b.onclick = () => { const key = b.dataset.heok; const row = b.closest('.it'); const he = C.num(row.querySelector('[data-f="he"]').value) || 1; const perHE = row.querySelector('[data-f="perHE"]').checked; work.he[key] = { he, perHE, check: false }; saveInst(work); });
  beheerMenu(v, chk);
}
const BSUB_GROEP = { brood: 'geav', upload: 'data', auto: 'geav', controle: 'data', verwijderen: 'data', dagen: 'bestellen', advies: 'bestellen', open: 'winkel', onderdelen: 'winkel' };
const BEHEER_SEC = [['upload', '📤', 'Bestanden uploaden', 'Dag-exports, bestelboeken en acties · status'], ['auto', '📡', 'Automatisch uploaden', 'Dag-export elke dag vanzelf vanaf een computer'], ['dagen', '🗓️', 'Besteldagen en deadlines', 'Wanneer je bestelt en tot hoe laat'], ['open', '🕘', 'Openingstijden en feestdagen', 'Ook aangepaste tijden en gesloten dagen'], ['onderdelen', '🗂️', 'Afdelingen en volgorde', 'Welke groep bij welke afdeling, en in welke volgorde'], ['controle', '🔍', 'Controleren', 'Niet gekoppelde artikelen en besteleenheden'], ['advies', '⚙️', 'Advies-instellingen', 'Voor gevorderden'], ['verwijderen', '🗑️', 'Uploads verwijderen', 'Als je per ongeluk een verkeerd bestand hebt geüpload']];
function beheerMenu(v, chk) {
  const blks = [...v.querySelectorAll('[data-sec]')]; const er = new Set(blks.map(b => b.dataset.sec));
  if (ui.bsub && er.has(ui.bsub)) { blks.forEach(b => b.classList.toggle('hide', b.dataset.sec !== ui.bsub)); if (ui.bsub === 'auto') autoLaad(); return; }
  ui.meerG = 'data'; return ga('meer');

}
async function adminDo(fn) {
  try { if (OEFEN) throw new Error('niet tijdens oefenen'); if (!DEMO && !navigator.onLine) throw new Error('Je bent offline'); await fn(); await saveCache(); rebuild(); render(); toast('Opgeslagen'); }
  catch (e) { toast('Mislukt: ' + e.message, 5000); }
}
function saveInst(data) { return adminDo(async () => { if (!DEMO) await upW('instellingen', [{ data }]); S.inst = data; odCache = null; }); }
function saveAgenda(row) { return adminDo(async () => { if (!DEMO) await upW('agenda', [row]); S.agenda = S.agenda.filter(a => a.dag !== row.dag).concat([row]); }); }

/* ---------- uploads ---------- */
const libs = {};
function loadScript(src) { return libs[src] || (libs[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Kon onderdeel niet laden (offline?)')); document.head.appendChild(s); })); }
async function pdfjs() { await loadScript(LIB.pdf); const p = window.pdfjsLib; if (!p.GlobalWorkerOptions.workerSrc) p.GlobalWorkerOptions.workerSrc = LIB.pdfw; return p; }
async function uploads(files) {
  const ulog = $('#upLog'); ulog.classList.remove('hide'); ulog.innerHTML = '';
  const L = (t, c = '') => { ulog.insertAdjacentHTML('beforeend', `<div class="${c}">${esc(t)}</div>`); ulog.scrollTop = 1e9; };
  if (!DEMO && !navigator.onLine) return L('Je bent offline. Uploaden kan alleen met internet.', 'err');
  files.sort((a, b) => (/\.pdf$/i.test(a.name) ? 0 : 1) - (/\.pdf$/i.test(b.name) ? 0 : 1) || a.name.localeCompare(b.name));
  let n = 0;
  for (const f of files) {
    try {
      const buf = await f.arrayBuffer();
      if (/\.xlsx?$/i.test(f.name)) {
        await loadScript(LIB.xlsx);
        const wb = XLSX.read(buf, { type: 'array' }); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
        const r = C.parseCaspos(rows, f.name);
        if (!DEMO) {
          await upW('dagverkoop', [{ dag: r.dag, data: r.data, bestand: f.name, geupload: new Date().toISOString() }]);
          const krows = Object.entries(r.meta).map(([ean, m]) => Object.assign({ ean, gezien: r.dag }, m));
          for (let i = 0; i < krows.length; i += 500) await upW('kassa', krows.slice(i, i + 500));
        }
        S.dagen[r.dag] = r.data; S.dagMeta[r.dag] = new Date().toISOString(); await iset('d:' + W + ':' + r.dag, r.data);
        for (const [ean, m] of Object.entries(r.meta)) S.kassa[ean] = Object.assign({ ean, gezien: r.dag }, m);
        L(`✓ Verkoop ${C.fmtDag(r.dag)} ${r.dag.slice(0, 4)}: ${r.n} artikelen`, 'ok'); n++;
      } else if (/\.pdf$/i.test(f.name)) {
        L(`… ${f.name} lezen`);
        const pages = await C.pdfPages(await pdfjs(), buf.slice(0)); const soort = C.detectPdf(pages);
        if (soort === 'voorkoop') { const r = await kwPdfLezen(buf, f.name); L(r.tekst); continue; }
        if (soort === 'folder') { const r = await kwPdfLezen(buf, f.name); L(r.tekst, 'ok'); n++; continue; }
        if (soort === 'vers' || soort === 'kw') {
          const b = soort === 'vers' ? C.parseVers(pages) : C.parseKw(pages);
          if (b.artikelen.length < 50) throw new Error('Te weinig artikelen gevonden – is dit het juiste bestelboek?');
          if (soort === 'vers') { const iw = C.isoWeek(C.today()); let y = iw.y; if (b.week > iw.w + 26) y--; if (b.week < iw.w - 26) y++; b.datum = C.mondayOf(y, b.week); }
          const oud = S.boeken[soort];
          if (oud && oud.datum && b.datum && b.datum < oud.datum && !ask(`Dit bestelboek (${b.datum}) is ouder dan het huidige (${oud.datum}). Toch gebruiken?`)) { L('Overgeslagen: ouder bestelboek', 'err'); continue; }
          const cmp = oud && (!oud.datum || !b.datum || b.datum !== oud.datum) ? C.vergelijk(oud, b, S.schapOk) : { nieuw: oud ? (oud.nieuw || []) : [], uit: oud ? (oud.uit || []) : [] };
          const nieuwBoek = oud && (!oud.datum || !b.datum || b.datum !== oud.datum);
          const prijs = nieuwBoek ? (() => { const o = new Map(oud.artikelen.map(x => [x.nr, x])); return b.artikelen.filter(x => o.has(x.nr) && +o.get(x.nr).cons > 0 && +x.cons > 0 && Math.abs(+o.get(x.nr).cons - +x.cons) > 0.004).map(x => ({ nr: x.nr, oud: +o.get(x.nr).cons, nieuw: +x.cons })); })() : (oud && oud.prijs) || [];
          const row = { bron: soort, datum: b.datum, week: b.week || C.isoWeek(b.datum).w, artikelen: b.artikelen, nieuw: cmp.nieuw, uit: cmp.uit, prijs, bestand: f.name, geupload: new Date().toISOString() };
          if (!DEMO) await upW('boeken', [row]);
          S.boeken[soort] = row;
          if (cmp.nieuw.length || cmp.uit.length) pushBoek(soort, cmp.nieuw.length, cmp.uit.length);
          L(`✓ Bestelboek ${soort === 'vers' ? 'Vers' : 'KW'}: ${b.artikelen.length} artikelen · ${cmp.nieuw.length} nieuw · ${cmp.uit.length} uit assortiment${prijs.length ? ` · ${prijs.length} prijswijzigingen` : ''}`, 'ok'); n++;
        } else if (soort === 'actie') { const a = await bewaarActie(pages, f.name, buf); L(`✓ Acties week ${a.week}: ${a.items.length} artikelen (${a.items.filter(i => i.folder).length} folder, ${a.items.filter(i => !i.folder).length} instore)`, 'ok'); n++;
        } else if (soort === 'collo') { const c = C.parseCollo(pages); const nn = Object.keys(c).length; if (!nn) throw new Error('Geen collo-artikelen gevonden'); const w = JSON.parse(JSON.stringify(S.inst || {})); w.collo = { datum: C.today(), items: c }; await saveInst(w); L(`✓ Collo-lijst: ${nn} AGF-artikelen`, 'ok'); n++;
        } else throw new Error('Onbekende pdf – geen bestelboek of actie-pdf');
      } else throw new Error('Bestandstype niet ondersteund');
    } catch (e) { L(`✗ ${f.name}: ${e.message}`, 'err'); }
  }
  if (n) { await saveCache(); rebuild(); log('upload', `${n} bestand(en) geüpload: ${files.map(f => f.name).join(', ')}`); L(`Klaar: ${n} bestand(en) verwerkt.`, 'ok'); if (ui.tab === 'beheer') { const keep = ulog.innerHTML; renderBeheer(); const l2 = $('#upLog'); if (l2) { l2.classList.remove('hide'); l2.innerHTML = keep; } } else render(); }
}



/* ---------- 1.13: telvragen ---------- */
function telMax() { const n = (S.inst || {}).telMax; return n === undefined || n === null ? 5 : +n; }
function telKeuze(od, lv) {
  const leeg = { alle: [], open: [] }; const max = telMax(); if (!lv || !max || !mag('tellen')) return leeg;
  const vandaag = C.today(); if (!(lv.besteldag === vandaag || lv.besteldag === C.add(vandaag, 1))) return leeg;
  const lsk = `cba-tel-${W}-${od}-${lv.besteldag}`; const c0 = ls.get(lsk); let alle = c0 && c0.max === max && Array.isArray(c0.alle) ? c0.alle : null;
  if (!alle) {
    const kand = [];
    for (const a of lijstArtikelen(od)) {
      if (a.uit || assStatus(a) !== 'in') continue; const sr = M.keys[a.key]; if (!sr) continue;
      let v = 0; for (let i = Math.max(0, M.N - 28); i < M.N; i++) v += sr.v[i]; const pw = v / 4; if (!(pw > 0)) continue;
      const vr = S.voorraad[a.key]; const oud = vr && vr.dag ? C.diff(vr.dag, vandaag) : 99; if (oud <= 2) continue;
      const derv = M.derv && M.derv[a.key] ? Math.min(1, M.derv[a.key] / Math.max(1, v)) * 2 : 0;
      const he = a.perHE && a.he > 0 ? a.he : 1, onzeker = oud > 7 ? (schatVoorraad(a.key) ? 0.5 : 1) : 0, duur = Math.min(1, he / Math.max(1, pw * 2));
      const score = Math.min(oud, 14) / 14 * 2 + Math.log1p(pw) / 2 + derv + (C.actieLabel(M, a.key) ? 0.5 : 0) + onzeker + duur + (M.boInfo && M.boInfo[a.key] && !boVr(a.key) ? 3 : 0);
      kand.push([a.key, score]);
    }
    const bo = kand.filter(x => M.boInfo && M.boInfo[x[0]] && !boVr(x[0])).sort((x, y) => y[1] - x[1]).slice(0, 15).map(x => x[0]);
    alle = [...new Set([...bo, ...kand.sort((x, y) => y[1] - x[1]).slice(0, max).map(x => x[0])])]; ls.set(lsk, { max, alle });
  }
  const open = alle.filter(k => { const vr = S.voorraad[k]; return M.art[k] && !(vr && vr.dag === vandaag); });
  return { alle, open };
}
function telVraagHtml(od, lv) {
  const t = telKeuze(od, lv); if (!t.alle.length) return '';
  if (!t.open.length) return '';
  return `<button class="telvraag" id="telV"><span style="flex:1;text-align:left">🔢 Tel ${t.open.length} ${t.open.length === 1 ? 'artikel' : 'artikelen'} voor een beter advies</span><span class="pijl">›</span></button>`;
}
/* ---------- 1.13: niet gekoppeld, deadline-regels ---------- */
function boekenMissen() {
  const w = C.isoWeek(C.today()).w, mis = [];
  const vw = S.boeken.vers && +S.boeken.vers.week; if (!vw) mis.push('Vers'); else if ((w - vw + 53) % 53 >= 1 && (w - vw + 53) % 53 < 40) mis.push(`Vers week ${vw + 1 > 53 ? 1 : vw + 1}${(w - vw + 53) % 53 > 1 ? ' t/m ' + w : ''}`);
  const kd = S.boeken.kw && S.boeken.kw.datum; if (!kd) mis.push('KW'); else if (C.monday(kd) < C.monday(C.today())) mis.push(`KW van ma ${C.fmtDag(C.monday(C.today())).split(' ')[1]}`);
  return mis.length ? `<span class="rood">⚠️ ontbreekt: ${mis.join(' · ')}</span>` : '<span class="groen">✓ actueel</span>';
}
function onbekendLijst() {
  const m = {}; for (const o of M.onbekend || []) { const id = o.bron + ':' + o.b; const x = m[id] || (m[id] = Object.assign({}, o, { id, eans: [] })); if (!x.eans.includes(o.ean)) x.eans.push(o.ean); }
  const tot = o => { const k = M.keys['o:' + o.id]; return k ? k.q.reduce((a, b) => a + b, 0) : 0; }; return Object.values(m).map(o => Object.assign(o, { tot: tot(o) })).sort((a, b) => b.tot - a.tot);
}
function onbekendKies(work, id) {
  const o = onbekendLijst().find(x => x.id === id); if (!o) return;
  if (!mag('instellingen') && !mag('saneren')) return toast('Je hebt hier geen recht voor');
  const ov = sheet(`<h2 style="margin:0">${esc(o.n)}</h2><p class="small">${esc(o.l)} · bestelnr ${esc(o.b)} · EAN ${esc(o.eans.join(', '))}</p>
  ${mag('instellingen') ? `<button class="belrij" data-ok="kop"><span class="ic">🔗</span><span><b>Koppelen aan artikel</b><small>Als het bestelnummer is veranderd. De verkoop telt mee bij dat artikel.</small></span><span class="pijl">›</span></button>` : ''}
  ${mag('saneren') ? `<button class="belrij" data-ok="eig"><span class="ic">➕</span><span><b>Eigen artikel maken</b><small>Naam, bestelnummer en EAN zijn al ingevuld.</small></span><span class="pijl">›</span></button>` : ''}
  ${mag('instellingen') ? `<button class="belrij" data-ok="neg"><span class="ic">🙈</span><span><b>Negeren</b><small>Weg uit de lijst. Staat het later in een bestelboek, dan wordt het vanzelf gekoppeld.</small></span><span class="pijl">›</span></button>` : ''}
  <button class="btn sec" data-x style="margin-top:10px;width:100%">Sluiten</button>`, (e, o2) => {
    const b = e.target.closest('[data-ok]'); if (!b) return; const k = b.dataset.ok;
    if (k === 'neg') { o2.remove(); work.negeer = [...new Set((work.negeer || []).concat([id]))]; saveInst(work); log('instellingen', `Niet gekoppeld genegeerd: ${o.n}`); }
    if (k === 'eig') { o2.remove(); eigenBewerk(null, o.bron === 'kw' ? 'kw' : (S.inst && S.inst.onderdelen && S.inst.onderdelen[o.so]) || (/brood|bake/i.test(o.so || o.a || '') ? 'brood' : 'vers'), { naam: mooiGroep(o.n), nr: String(o.b || '').replace(/\D/g, ''), ean: o.eans.join(', '), groep: mooiGroep(o.so || ''), lev: o.bron === 'kw' ? 'vantol' : 'versunie' }); }
    if (k === 'kop') koppelKies(o2, work, o);
  });
}
function koppelKies(ov, work, o) {
  const bron = o.bron; const kies = Object.values(M.art).filter(a => a.bron === bron && !a.uit && !a.eigen);
  const woord = (o.n || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
  const score = a => woord.filter(w => a.naam.toLowerCase().includes(w)).length;
  const lijst = q => { q = (q || '').toLowerCase().trim(); return (q ? kies.filter(a => a.naam.toLowerCase().includes(q) || a.nr.includes(q)) : kies.map(a => [a, score(a)]).filter(x => x[1]).sort((x, y) => y[1] - x[1]).map(x => x[0])).slice(0, 30); };
  const toon = q => { $('#kkL').innerHTML = lijst(q).map(a => `<button class="it rijtik" data-kk="${esc(a.key)}"><span style="flex:1;text-align:left"><b>${esc(a.naam)}</b><br><span class="small">${esc(a.nr)} · ${esc(groepVan(a))}</span></span><span class="pijl">›</span></button>`).join('') || '<div class="small" style="padding:8px">Zoek op naam of bestelnummer.</div>'; };
  ov.querySelector('.sheetIn').innerHTML = `<h2 style="margin:0">Koppelen</h2><p class="small">Aan welk artikel uit het bestelboek hoort <b>${esc(o.n)}</b>?</p><input type="search" id="kkQ" placeholder="🔍 Zoek naam of bestelnummer" style="width:100%"><div class="list" id="kkL" style="margin-top:8px"></div><button class="btn sec" data-x style="margin-top:10px;width:100%">Annuleren</button>`;
  toon(''); $('#kkQ').oninput = e => toon(e.target.value);
  $('#kkL').onclick = e => { const b = e.target.closest('[data-kk]'); if (!b) return; ov.remove(); work.koppel = Object.assign({}, work.koppel || {}, { [o.id]: b.dataset.kk }); saveInst(work); log('instellingen', `Gekoppeld: ${o.n} → ${(M.art[b.dataset.kk] || {}).naam}`); };
}
function dlRegelTekst(r) { const d = +r.d || 0; return `${d === 0 ? 'op de besteldag' : d === 1 ? '1 dag na de besteldag' : d + ' dagen na de besteldag'} om ${r.t}`; }
function dlVoorbeeld(lev, d, t) {
  const od = DL_ODS[lev][0]; const sch = (M.st.schema[od] || M.st.schema.vers || []); if (!sch.length || !t) return '';
  return sch.map(x => { let L = x.l; let dd = x.b + d; const tot = (L - x.b + 7) % 7 || 7; if (d >= tot) dd = x.b + tot - 1; return `${C.DAGEN[x.b]} → ${C.DAGEN[L]}: uiterlijk ${C.DAGEN[dd % 7]} ${t}`; }).join(' · ');
}
function dlRegelBewerk(work, i) {
  const alle = (work.dlRegels || []).slice(); const r = i >= 0 ? Object.assign({}, alle[i]) : { lev: 'versunie', groepen: [], d: 1, t: '09:00', naam: '' };
  const anders = new Set(alle.filter((x, j) => j !== i && x.lev === r.lev).flatMap(x => x.groepen || []));
  const ov = sheet('<div id="dlr"></div>');
  const teken = () => {
    const ods = DL_ODS[r.lev];
    ov.querySelector('#dlr').innerHTML = `<h2 style="margin:0">${i >= 0 ? 'Deadline wijzigen' : 'Eigen deadline voor groepen'}</h2><div class="form">
    <label>Leverancier</label><div class="chips2" id="dlrL">${['versunie', 'vantol'].map(k => `<button type="button" class="${r.lev === k ? 'aan' : ''}" data-k="${k}">${LEV_NAAM[k]}</button>`).join('')}</div>
    <label>Uiterlijk bestellen</label><div class="chips2" id="dlrD">${[[0, 'Op de besteldag'], [1, '1 dag later'], [2, '2 dagen later']].map(([k, l]) => `<button type="button" class="${(+r.d || 0) === k ? 'aan' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="f"><label>Om</label><input type="time" id="dlrT" value="${esc(r.t || '')}" style="width:120px"></div>
    <p class="small" id="dlrV">${dlVoorbeeld(r.lev, +r.d || 0, r.t)}</p>
    <label>Naam (optioneel)</label><input type="text" id="dlrN" value="${esc(r.naam || '')}" placeholder="Bijv. Melk">
    <label>Groepen${r.groepen.length ? ` (${r.groepen.length} gekozen)` : ''}</label><input type="search" id="dlrQ" placeholder="🔍 Zoek groep, bijv. melk">${ods.map(od => { const gs = odGroepen(od); return gs.length ? `<h3 data-dlh>${odNaam(od)}</h3><div class="list">${gs.map(g => `<label class="it"><span style="flex:1">${esc(g)}${anders.has(g) ? ' <span class="small">· al bij een andere deadline</span>' : ''}</span><input type="checkbox" class="schak" data-dg="${esc(g)}" ${r.groepen.includes(g) ? 'checked' : ''} ${anders.has(g) ? 'disabled' : ''}></label>`).join('')}</div>` : ''; }).join('') || '<p class="small">Upload eerst het bestelboek.</p>'}
    <div class="msg" id="dlrM"></div>
    <div class="row"><button type="button" class="btn sec" data-x style="flex:1">Annuleren</button><button type="button" class="btn" id="dlrS" style="flex:1">Opslaan</button></div>
    ${i >= 0 ? '<button type="button" class="btn sec" id="dlrW" style="margin-top:6px;color:#d32f2f;border-color:#d32f2f">Verwijderen</button>' : ''}</div>`;
    const q = s2 => ov.querySelector(s2);
    q('#dlrL').onclick = e => { const b = e.target.closest('[data-k]'); if (!b || b.dataset.k === r.lev) return; r.lev = b.dataset.k; r.groepen = []; teken(); };
    q('#dlrD').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; r.d = +b.dataset.k; r.t = q('#dlrT').value; r.naam = q('#dlrN').value; teken(); };
    q('#dlrT').oninput = () => { q('#dlrV').textContent = dlVoorbeeld(r.lev, +r.d || 0, q('#dlrT').value); };
    q('#dlrQ').oninput = e => { const t = e.target.value.toLowerCase().trim(); ov.querySelectorAll('[data-dg]').forEach(c => { c.closest('.it').style.display = !t || c.dataset.dg.toLowerCase().includes(t) ? '' : 'none'; }); ov.querySelectorAll('[data-dlh]').forEach(h => { const l = h.nextElementSibling; h.style.display = [...l.children].some(x => x.style.display !== 'none') ? '' : 'none'; }); };
    ov.querySelectorAll('[data-dg]').forEach(c => c.onchange = () => { const s2 = new Set(r.groepen); if (c.checked) s2.add(c.dataset.dg); else s2.delete(c.dataset.dg); r.groepen = [...s2]; });
    q('#dlrS').onclick = () => { r.t = q('#dlrT').value; r.naam = q('#dlrN').value.trim(); if (!r.t) return (q('#dlrM').textContent = 'Vul een tijd in.'); if (!r.groepen.length) return (q('#dlrM').textContent = 'Kies minstens één groep.'); if (i >= 0) alle[i] = r; else alle.push(r); work.dlRegels = alle; ov.remove(); saveInst(work); log('instellingen', `Deadline ${regelNaam(r)}: ${dlRegelTekst(r)}`); };
    const w = q('#dlrW'); if (w) w.onclick = () => { alle.splice(i, 1); work.dlRegels = alle; ov.remove(); saveInst(work); };
  };
  teken();
}
