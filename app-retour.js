/* ---------- 1.83: retourbonnen Van Tol (karren- en krattensaldo) ---------- */
/* velden in de volgorde van de bon: [sleutel, tekst, statiegeld €] */
const RB_V = [['k', 'Containers totaal', 100], ['bk', 'Bierkrat + 16/24 fles', 3.9], ['b12', 'Bierkrat + 12 fles', 1.95], ['fk', 'Friskrat + 24/28 fles', 5], ['bl', 'Leeg krat bier 24 fles', 1.5], ['fl', 'Bierfles los', 0.1], ['bb', 'Bigbag', 0], ['pl', 'Plank Van Tol', 12.5], ['ep', 'Euro pallet', 7.5], ['rad', 'RAD', 30],
  /* 2.14: overige regels van de bon (onder "+ Meer soorten") */
  ['dpb', 'DPB KST', 22.5], ['chep', 'CHEP pallet', 0], ['cbl', 'CBL krat', 3.86], ['lb16', 'Leeg krat beugels 16 × 0,45', 0.7], ['lb12', 'Leeg krat bier 12 fles', 0.75], ['lf12', 'Leeg krat fris 12 fles', 2], ['lf28', 'Leeg krat fris 28 fles', 2.2], ['lh', 'Leeg krat Hero/Coca Cola 24 × 0,2', 2.6], ['fg', 'Fles Grolsch 0,45 ltr', 0.2], ['fp', 'Fles glas + pet 1,0/1,5 ltr', 0.25]];
const RB_N = 10;
/* kolommen C t/m L van de Excel */
const RB_X = [['k', 'karren retour'], ['bb', 'bigbags retour'], ['bk', 'bierkratten'], ['bl', 'bierkrat leeg'], ['fk', 'friskratten'], ['rad', 'RAD'], ['pl', 'plank'], ['ep', 'euro pallet'], ['b12', 'bierkrat 12 flessen'], ['fl', 'bierfles los']];
LIB.ocr = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let RB = null, rbRij = [], rbOcr = null, rbTel = { n: 0, tot: 0 }, rbBezig = null;
/* 1.92: wachtrij van gelezen scans blijft op het toestel bewaard (ook na sluiten of update) */
const rbRijBewaar = () => { iset('rbrij', rbRij); ls.set('cba-rbtel', rbTel); };
const RB_P = Object.fromEntries(RB_V.map(([k, , p]) => [k, p]));
const rbEuro = x => '€ ' + (Math.round(x * 100) / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+,)/g, '.');
const rbSom = s => String(s ?? '').split(/[\s,;.+]+/).reduce((t, x) => t + (+x || 0), 0);
/* 2.16: prijs per soort kan wijzigen; RB.prijs = { soort: [[vanaf, prijs], …] } (oplopend) */
const rbP = (k, d) => { let p = RB_P[k]; for (const [v, x] of ((RB && RB.prijs) || {})[k] || []) if (!d || v <= d) p = x; return p; };
const rbWaarde = b => RB_V.reduce((t, [k]) => t + (+b[k] || 0) * rbP(k, b.datum), 0);
function rbPrijsCheck() { const e = {}; Object.values(rbRet().bonnen || {}).forEach(f => (f.regels || []).forEach(r => { const k = rbSoort(r), n = Math.abs(+r.n || 0); if (k && n && f.d && RB_P[k]) (e[k] = e[k] || []).push([f.d, Math.round(Math.abs(+r.eur || 0) / n * 100) / 100]); }));
  return Object.entries(e).map(([k, l]) => { l.sort((a, b) => a[0].localeCompare(b[0])); const nw = l[l.length - 1][1]; let i = l.length - 1; while (i > 0 && l[i - 1][1] === nw) i--; return { k, nw, oud: rbP(k, l[i][0]), vanaf: l[i][0], naam: (RB_V.find(x => x[0] === k) || [])[1] }; })
    .filter(x => Math.abs(x.nw - x.oud) > 0.005 && !((RB.prijsNee || []).includes(x.k + ':' + x.nw))); }
/* 2.13: bedragen alleen voor de beheerder; een bonnummer heeft 9 cijfers en begint met 20 */
const rbGeld = () => isBeheer(), rbNrOk = nr => /^20\d{7}$/.test(rbKey(nr)), rbFout = s => s.st === 'verschil' || s.st === 'mist';
const rbVt = f => { const n = {}; ((f && f.regels) || []).forEach(r => { const k = rbSoort(r); if (k) n[k] = (n[k] || 0) + Math.abs(+r.n || 0); }); return n; };
function rbVaak(L) { const t = {}; L.forEach(([b, s]) => { const vt = rbVt(s.f); RB_V.forEach(([k, n]) => { if (k !== 'bb' && (+b[k] || 0) > (vt[k] || 0)) t[n] = (t[n] || 0) + 1; }); }); return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, x]) => `${n} ${x}×`).join(', '); }
/* 2.13: scans ook veilig in Supabase (privé bucket 'retour', map per winkel, geen publieke link) */
const rbWolkPad = nr => `${W}/${rbKey(nr)}.jpg`, rbWolkH = async () => ({ apikey: SB_KEY, Authorization: 'Bearer ' + await token() });
async function rbWolkOp(nr, img) { if (DEMO || OEFEN || !W || !img || !navigator.onLine) return false; try { const bl = await (await fetch(img)).blob(); return (await fetch(`${SB_URL}/storage/v1/object/retour/${rbWolkPad(nr)}`, { method: 'POST', headers: Object.assign(await rbWolkH(), { 'Content-Type': 'image/jpeg', 'x-upsert': isBeheer() ? 'true' : 'false' }), body: bl }).then(r => r.ok || (!isBeheer() && r.status === 409 || /exists|Duplicate/i.test(r.statusText)) ? { ok: true } : r)).ok; } catch (e) { return false; } }
async function rbWolkHaal(nr) { if (!isBeheer() || DEMO || OEFEN || !W || !navigator.onLine) return null; try { const r = await fetch(`${SB_URL}/storage/v1/object/authenticated/retour/${rbWolkPad(nr)}`, { headers: await rbWolkH() }); if (!r.ok) return null; const bl = await r.blob(), u = await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(bl); }); iset('rbscan:' + nr, u); return u; } catch (e) { return null; } }
function rbWolkWeg(nr) { if (!DEMO && !OEFEN && W) rbWolkH().then(h => fetch(`${SB_URL}/storage/v1/object/retour/${rbWolkPad(nr)}`, { method: 'DELETE', headers: h })).catch(() => { }); }
async function rbWolkSync() { if (rbWolkSync.bezig || DEMO || OEFEN || !RB) return; rbWolkSync.bezig = 1; let n = 0;
  try { for (const b of RB.bonnen) { if (!b.scan || b.wolk) continue; const img = await iget('rbscan:' + b.nr); if (!img) continue; if (!await rbWolkOp(b.nr, img)) { rbWolkSync.fout = 1; break; } b.wolk = 1; n++; rbWolkSync.fout = 0; } } finally { rbWolkSync.bezig = 0; }
  if (n) { rbBewaar(); if (ui.tab === 'retour' && !ui.rbEdit) renderRetour(); } }
const rbScan = async nr => (await iget('rbscan:' + nr)) || rbWolkHaal(nr);
async function rbLaad() {
  if (RB) return; RB = ls.get('cba-retour') || { bonnen: [] }; try { rbRij = (await iget('rbrij')) || []; rbTel = ls.get('cba-rbtel') || { n: 0, tot: rbRij.length }; } catch (e) { }
  if (!DEMO && navigator.onLine) try { const r = await rest(wq('voorkeuren?wie=eq.retour')); if (r[0] && r[0].data && r[0].data.bonnen) { RB = r[0].data; ls.set('cba-retour', RB); } } catch (e) { }
}
/* 1.86: lijst per weekstaat (nieuwste eerst), binnen een groep eerst de verschillen, dan op bonnummer */
function rbGroepen(B, ST, gekop, I = B.map((b, i) => i)) {
  const g = {}, rang = x => ({ verschil: 0, mist: 0, wacht: x[0].ok ? 1.5 : 1, ok: 2, leeg: 3 }[x[2].st]); I.forEach(i => { const b = B[i], k = ST[i].st === 'leeg' ? '~leeg' : ST[i].f ? ST[i].f.ws : ''; (g[k] = g[k] || []).push([b, i, ST[i]]); });
  return Object.keys(g).sort((x, y) => (x === '~leeg') - (y === '~leeg') || (!x ? 1 : !y ? -1 : rbOud() ? x.localeCompare(y) : y.localeCompare(x))).map(k => { const l = g[k].sort((x, y) => rang(x) - rang(y) || rbKey(x[0].nr).localeCompare(rbKey(y[0].nr))), dv = l.reduce((t, x) => t + (x[2].st === 'verschil' || x[2].st === 'mist' ? x[2].v : 0), 0), n = `${l.length} ${l.length === 1 ? 'bon' : 'bonnen'}`;
    return [k === '~leeg' ? `Leeg · niets retour · ${n}` : k ? `Weekstaat ${esc(k)} · ${n} · ${Math.abs(dv) >= 0.01 ? `<span class="rood">${rbGeld() ? rbEuro(Math.abs(dv)) + ' ' : ''}verschil</span>` : '✓ klopt'}` : `${gekop ? 'Nog niet op een weekstaat' : 'Bonnen'} · ${n}${dv ? ` · <span class="rood">${rbGeld() ? rbEuro(dv) + ' ' : ''}mist</span>` : ''}`, l]; });
}
/* 2.02: zoeken en sorteren op weekstaat of datum */
const rbSort = () => ls.get('cba-rbsort') || 'ws', rbOud = () => ls.get('cba-rbvolg') === 'oud', rbFil = () => ls.get('cba-rbfil') || '';
const rbSoortSt = (b, s) => rbFout(s) ? (b.cl ? 'gecl' : 'fout') : rbGec(b, s) ? 'goed' : 'open';
function rbBalk(B, ST) { const n = { '': B.length, fout: 0, gecl: 0, open: 0, goed: 0 }; B.forEach((b, i) => n[rbSoortSt(b, ST[i])]++);
  return `<div class="segment licht rbseg">${[['ws', 'Weekstaat'], ['dat', 'Datum'], ['eur', 'Bedrag'], ['nr', 'Nummer']].filter(([k]) => k !== 'eur' || rbGeld()).map(([k, t]) => `<button class="${rbSort() === k ? 'aan' : ''}" data-rbs="${k}">${t}</button>`).join('')}</div>
  <div class="rbfil">${[['', 'Alles'], ['fout', '✕ Fout'], ['gecl', '📨 Geclaimd'], ['open', 'Open'], ['goed', '✓ Goed']].filter(([k]) => k !== 'gecl' || n.gecl).map(([k, t]) => `<button class="${rbFil() === k ? 'aan' : ''} ${k}" data-rbf="${k}">${t} ${n[k]}</button>`).join('')}<button class="${ls.get('cba-rbzs') ? 'aan' : ''}" data-rbzs>📷 Zonder scan ${B.filter(b => !b.scan && rbStatus(b).st !== 'leeg').length}</button><button data-rbv>⇅ ${rbSort() === 'eur' || rbSort() === 'nr' ? (rbOud() ? 'Laag → hoog' : 'Hoog → laag') : rbOud() ? 'Oud → nieuw' : 'Nieuw → oud'}</button></div>`; }
function rbLijst(B, ST, gekop) {
  const q = (ui.rbZoek || '').toLowerCase().replace(/[\s.-]/g, ''), I = B.map((b, i) => i).filter(i => !q || [B[i].nr, B[i].rb, ST[i].f && ST[i].f.ws, B[i].opm, B[i].datum && C.fmtDag(B[i].datum)].join('|').toLowerCase().replace(/[\s.-]/g, '').includes(q)).filter(i => !rbFil() || rbSoortSt(B[i], ST[i]) === rbFil()).filter(i => !ls.get('cba-rbzs') || (!B[i].scan && ST[i].st !== 'leeg'));
  if (!I.length) return '<p class="small">Niets gevonden.</p>';
  const G = rbSort() === 'eur' && !rbGeld() ? rbGroepen(B, ST, gekop, I) : rbSort() === 'dat' ? rbPerDatum(B, ST, I) : rbSort() === 'eur' ? rbPerBedrag(B, ST, I) : rbSort() === 'nr' ? rbPerNr(B, ST, I) : rbGroepen(B, ST, gekop, I);
  return G.map(([kop, l]) => `<h3 class="rbgrp">${kop}</h3>` + l.map(([b, i, s]) => `<div class="rbrij ${s.st}"><span class="rbok ${s.st === 'ok' || s.st === 'leeg' ? 'on' : s.st === 'verschil' || s.st === 'mist' ? 'fout' : b.ok ? 'xl' : ''}" aria-label="${rbGec(b, s) ? 'Gecontroleerd' : s.st === 'wacht' ? 'Nog niet gecontroleerd' : 'Klopt niet'}">${rbGec(b, s) ? '✓' : s.st === 'verschil' || s.st === 'mist' ? '✕' : ''}</span><button class="rbtx" data-rb="${i}"><b>${esc(b.nr || 'Zonder nummer')}</b><small>${[b.datum ? C.fmtDag(b.datum) : '', b.k ? b.k + ' karren' : '', b.bk ? b.bk + ' bierkratten' : '', b.fk ? b.fk + ' friskratten' : '', b.rb ? (rbRbs(b.rb).length > 1 ? 'retourbonnen ' : 'retourbon ') + rbRbs(b.rb).join(' · ') : ''].filter(Boolean).join(' · ')}</small>
      <small class="rbst">${s.st === 'ok' ? (b.cl ? `✓ opgelost · geclaimd ${C.fmtDag(b.cl)}` : '✓ klopt') : s.st === 'verschil' ? (rbGeld() ? `${s.v > 0 ? rbEuro(s.v) + ' te weinig' : rbEuro(-s.v) + ' te veel'} gecrediteerd` : 'klopt niet met de weekstaat') : s.st === 'mist' ? (rbGeld() ? `${rbEuro(s.v)} · mist op de weekstaten` : 'mist op de weekstaten') : s.st === 'leeg' ? 'leeg · niets retour' : b.ok ? 'gecontroleerd in je Excel' : ''}${rbFout(s) && (b.cl || b.vt) ? ` · ${b.cl ? '📨 geclaimd ' + C.fmtDag(b.cl) : '✓ nagekeken'}` : ''}</small>${b.wsnr ? `<small class="rbscanl ja">🔗 bij Van Tol ${esc(b.wsnr)}</small> ` : ''}${s.st !== 'leeg' ? `<small class="rbscanl${b.scan ? ' ja' : ''}">📷 ${b.scan ? 'scan' : 'geen scan'}</small>` : ''}${b.nr && !rbNrOk(b.nr) ? '<small class="rood">⚠ bonnummer lijkt niet te kloppen</small>' : ''}${b.opm ? `<small class="rood">${esc(b.opm)}</small>` : ''}</button></div>`).join('')).join('');
}
function rbPerDatum(B, ST, I) { const g = {}; I.forEach(i => { const k = (B[i].datum || '').slice(0, 7); (g[k] = g[k] || []).push([B[i], i, ST[i]]); });
  return Object.keys(g).sort((x, y) => !x ? 1 : !y ? -1 : rbOud() ? x.localeCompare(y) : y.localeCompare(x)).map(k => { const l = g[k], n = `${l.length} ${l.length === 1 ? 'bon' : 'bonnen'}`; return [k ? `${new Date(k + '-15').toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })} · ${n}` : `Zonder datum · ${n}`, l.sort((x, y) => ((y[0].datum || '').localeCompare(x[0].datum || '') || rbKey(y[0].nr).localeCompare(rbKey(x[0].nr))) * (rbOud() ? -1 : 1))]; }); }
function rbPerNr(B, ST, I) { const l = I.map(i => [B[i], i, ST[i]]).sort((x, y) => (+rbKey(y[0].nr) - +rbKey(x[0].nr)) * (rbOud() ? -1 : 1)); return [[`Op bonnummer · ${l.length} ${l.length === 1 ? 'bon' : 'bonnen'}`, l]]; }
function rbPerBedrag(B, ST, I) { const w = x => x[2].st === 'verschil' || x[2].st === 'mist' ? Math.abs(x[2].v) : rbWaarde(x[0]), l = I.map(i => [B[i], i, ST[i]]).sort((x, y) => (w(y) - w(x)) * (rbOud() ? -1 : 1)); return [[`${rbOud() ? 'Laag → hoog' : 'Hoog → laag'} · ${l.length} ${l.length === 1 ? 'bon' : 'bonnen'}`, l]]; }
/* 2.02: nummers gelijk maken (BGR + cijfers) en dubbele bonnen samenvoegen */
async function rbOpschonen() {
  const m = {}, uit = []; let w = 0;
  for (const b of RB.bonnen) { const k = rbKey(b.nr), nr = k ? 'BGR ' + k : b.nr, a = k && m[k];
    if (nr !== b.nr) { w = 1; delete b.wolk; if (b.scan) { const x = await iget('rbscan:' + b.nr); idel('rbscan:' + b.nr); if (x && !(a && a.scan)) await iset('rbscan:' + nr, x); else if (!x) b.scan = false; } b.nr = nr; }
    if (!a) { if (k) m[k] = b; uit.push(b); continue; } w = 1;
    const dif = RB_V.filter(([f]) => +a[f] && +b[f] && +a[f] !== +b[f]);
    if (dif.length && !await bevestig(`${esc(nr)} staat dubbel`, dif.map(([f, t]) => `${t}: <b>${a[f]}</b> of <b>${b[f]}</b>`).join('<br>'), `Houd ${dif.map(([f]) => a[f]).join(' / ')}`, `Houd ${dif.map(([f]) => b[f]).join(' / ')}`)) RB_V.forEach(([f]) => +b[f] ? a[f] = b[f] : delete a[f]);
    RB_V.forEach(([f]) => { if (+b[f] && !+a[f]) a[f] = b[f]; }); for (const f of ['datum', 'opm']) if (!a[f] && b[f]) a[f] = b[f];
    a.rb = [...new Set(rbRbs(a.rb).concat(rbRbs(b.rb)))].join(', '); a.ok = a.ok || b.ok; a.scan = a.scan || b.scan; for (const f of ['vt', 'cl', 'wsnr']) if (!a[f] && b[f]) a[f] = b[f]; if (a.bags || b.bags) a.bags = rbBags((a.bags || []).concat(b.bags || []));
  }
  if (w) { RB.bonnen = uit; rbBewaar(); }
}
/* 1.84: controle tegen de Van Tol-weekstaten (via Brood Opzet: S.bo.retour) */
const rbRbs = x => String(x || '').split(/[^0-9]+/).filter(Boolean);
/* 1.94: weekstaten komen uit Brood Opzet (S.bo.retour) én uit eigen upload (RB.ws, plaatjes lokaal 'rbws:'+ref) */
const rbRet = () => { const bo = (S.bo || {}).retour || {}, d1 = bo.dragers, d2 = RB && RB.dr; return { bonnen: Object.assign({}, bo.bonnen, RB && RB.ws), dragers: d1 && d2 ? (d2.d > d1.d ? d2 : d1) : d1 || d2 }; }, rbKey = nr => String(nr || '').replace(/\D/g, '');
const RB_ART = { 101: 'k', 39: 'b12', 67: 'bk', 19: 'bk', 68: 'fk', 20: 'fk', 6: 'bl', 1: 'fl', 102: 'pl', 103: 'ep', 112: 'rad', 105: 'dpb', 104: 'chep', 110: 'cbl', 51: 'lb16', 33: 'lb12', 57: 'lf12', 9: 'lf28', 13: 'lh', 2: 'fg', 3: 'fp' }, rbSoort = r => RB_ART[+r.art] || (RB_OMS.find(([re]) => re.test(r.oms || '')) || [])[1];
const RB_OMS = [[/DPB/i, 'dpb'], [/CHEP/i, 'chep'], [/CBL/i, 'cbl'], [/BEUGEL/i, 'lb16'], [/HERO|COCA/i, 'lh'], [/GROLSCH/i, 'fg'], [/PET\b/i, 'fp'], [/CONTAINER/i, 'k'], [/PLANK/i, 'pl'], [/PALLET/i, 'ep'], [/\bRAD\b/i, 'rad'], [/BIG ?BAG/i, 'bb'], [/FRIS/i, 'fk'], [/LEEG/i, 'bl'], [/12/, 'b12'], [/KRAT/i, 'bk'], [/FLES/i, 'fl']];
/* 2.17: een bon kan bij Van Tol onder een ander nummer staan (b.wsnr, door jou gekoppeld) */
const rbWk = b => b.wsnr || rbKey(b.nr);
function rbStatus(b) {
  if (!RB_V.some(([k]) => +b[k])) return { v: 0, st: 'leeg' };
  const f = (rbRet().bonnen || {})[rbWk(b)], w = rbWaarde(b);
  if (f) { const v = Math.round((w - Math.abs(+f.eur || 0)) * 100) / 100, n = {}; (f.regels || []).forEach(r => { const k = rbSoort(r); if (k) n[k] = (n[k] || 0) + Math.abs(+r.n || 0); });
    const dif = RB_V.filter(([k]) => k !== 'bb' && (+b[k] || 0) !== (n[k] || 0)).map(([k, t]) => `${t}: bon ${+b[k] || 0}, weekstaat ${n[k] || 0}`); return { f, v, dif, st: Math.abs(v) < 0.01 ? 'ok' : 'verschil' }; }
  const dr = rbRet().dragers; return { v: w, st: w > 0 && b.datum && dr && dr.d && C.diff(b.datum, dr.d) >= 14 ? 'mist' : 'wacht' };
}
/* 1.85: ontbrekende bonnen: op de weekstaat maar niet in de lijst, en gaten in de nummering */
function rbMist(B) {
  const ken = new Set(B.flatMap(b => [rbKey(b.nr), b.wsnr].filter(Boolean))), neg = new Set(RB.neg || []), ws = Object.entries(rbRet().bonnen || {}).filter(([k]) => !ken.has(k) && !neg.has(k));
  const nrs = [...ken].filter(k => k.length >= 8).map(Number).sort((a, b) => a - b), gat = [];
  for (let i = 1; i < nrs.length; i++) { const d = nrs[i] - nrs[i - 1]; if (d > 1 && d <= 4) for (let x = nrs[i - 1] + 1; x < nrs[i]; x++) if (!neg.has(String(x)) && !(rbRet().bonnen || {})[x]) gat.push(String(x)); }
  return { ws, gat };
}
/* 2.17/2.18: opnieuw vergelijken: bonnen die missen naast weekstaat-regels die bij geen bon horen: zelfde bedrag binnen 14 dagen, of 1 cijfer anders + evenveel karren + hooguit € 12,50 verschil */
function rbVoorstel(B) { const W = rbMist(B).ws, uit = [], bez = new Set(), dg = (a, b) => a && b ? Math.abs(C.diff(a, b)) : 99;
  const kand = B.map((b, i) => [b, i, rbStatus(b)]).filter(([, , s]) => !s.f && s.st !== 'leeg').flatMap(([b, i]) => W.map(([k, f]) => { const n = rbKey(b.nr), d = n.length === k.length ? [...n].filter((c, j) => c !== k[j]).length : 9, eur = Math.abs(rbWaarde(b) - Math.abs(+f.eur || 0)) < 0.01, dd = dg(b.datum, f.d);
    const nv = rbVt(f), dv = Math.abs(rbWaarde(b) - Math.abs(+f.eur || 0)); if ((b.wsNee || []).includes(k) || !((eur && dd <= 14) || (d <= 1 && (+b.k || 0) === (nv.k || 0) && dv <= 12.5 && dd <= 21))) return null; return { i, k, f, sc: d * 10 + (eur ? 0 : 5) + Math.min(dd, 30) / 10, r: [d <= 2 ? `${d} ${d === 1 ? 'cijfer' : 'cijfers'} anders` : '', eur ? 'zelfde bedrag' : '', dd < 99 ? `${dd} ${dd === 1 ? 'dag' : 'dagen'} verschil` : ''].filter(Boolean).join(', ') }; }).filter(Boolean));
  kand.sort((a, b) => a.sc - b.sc).forEach(x => { if (!bez.has(x.k) && !uit.some(y => y.i === x.i)) { bez.add(x.k); uit.push(x); } }); return uit; }
function rbVoorstelSheet() { const l = rbVoorstel(RB.bonnen); let j = 0, n = 0; if (!l.length) return toast('Geen nieuwe voorstellen');
  const inh = o => RB_V.filter(([k]) => k !== 'bb' && +o[k]).map(([k, t]) => `${+o[k]} × ${t}`).join(' · '), ov = sheet('<div id="vsI"></div>', (e, o) => { const k = e.target.closest('[data-vs]'); if (!k) return; const x = l[j], b = RB.bonnen[x.i];
    if (k.dataset.vs === 'ja') { b.wsnr = x.k; n++; } else if (k.dataset.vs === 'nee') (b.wsNee = b.wsNee || []).push(x.k); else { o.remove(); return klaar(); } rbBewaar(); j++; if (j >= l.length) { o.remove(); return klaar(); } toon(); });
  const klaar = () => { if (n) toast(`🔗 ${n} ${n === 1 ? 'bon' : 'bonnen'} gekoppeld`); if (ui.tab === 'retour' && !ui.rbEdit) renderRetour(); };
  const toon = () => { const x = l[j], b = RB.bonnen[x.i], f = x.f, g = rbGeld(), nv = {}; (f.regels || []).forEach(r => { const k = rbSoort(r); if (k) nv[k] = (nv[k] || 0) + Math.abs(+r.n || 0); });
    ov.querySelector('#vsI').innerHTML = `<h2 style="margin:0">🔎 Voorstel ${j + 1} van ${l.length}</h2><p class="small">${esc(x.r)}</p>
      <div class="rbws"><b>Jouw bon ${esc(b.nr)}</b><small>${b.datum ? C.fmtDag(b.datum) : 'zonder datum'}${g ? ' · ' + rbEuro(rbWaarde(b)) : ''}</small><small>${inh(b)}</small></div>
      <div class="rbws"><b>Weekstaat ${esc(f.ws || '')}: ${esc(x.k)}</b><small>${f.d ? C.fmtDag(f.d) : ''}${g ? ' · ' + rbEuro(Math.abs(+f.eur || 0)) : ''}</small><small>${inh(nv)}</small></div>
      <p class="small">Is dit dezelfde bon? Bij koppelen blijft jouw nummer staan; het nummer van Van Tol wordt erbij bewaard.</p>
      <div class="row"><button class="btn" data-vs="ja" style="flex:1">🔗 Koppelen</button><button class="btn sec" data-vs="nee" style="flex:1">Nee</button></div><button class="btn sec" data-vs="stop" style="width:100%;margin-top:8px">Stoppen</button>`; };
  toon(); }
function rbBoTekst() { const R = rbRet(), bn = Object.values(R.bonnen || {}), ws = [...new Set(bn.map(x => x.ws).filter(Boolean))].sort(), eig = Object.keys(RB.ws || {}).length;
  if (eig && !(S.bo && S.bo.retour)) return `${bn.length} retourbonnen uit ${ws.length} weekstaten (${ws[0]} t/m ${ws[ws.length - 1]}) · zelf geüpload`;
  if (!S.bo) return 'Nog niet opgehaald van Brood Opzet.'; if (!S.bo.retour) return '⚠️ Brood Opzet geeft nog geen retourgegevens door: tik in Supabase op Deploy bij brood-export (Brood Opzet-project) en lees de weekstaten in Brood Opzet in.';
  return `Van Brood Opzet: ${bn.length} retourbonnen uit ${ws.length} weekstaten${ws.length ? ` (${ws[0]} t/m ${ws[ws.length - 1]})` : ''} · opgehaald ${new Date(S.bo.t || Date.now()).toTimeString().slice(0, 5)}`; }
/* 1.89: gecontroleerd = weekstaat klopt, of leeg, of (zonder weekstaat) aangevinkt in je Excel */
const rbGec = (b, s = rbStatus(b)) => s.st === 'ok' || s.st === 'leeg' || (s.st === 'wacht' && !!b.ok);
function rbKeuze(nr) { return new Promise(res => { const ov = sheet(`<h2 style="margin:0">Bon staat er al</h2><div class="hulptekst">${esc(nr)} staat al in de lijst.<br><b>Samenvoegen</b>: de scan, datum en lege vakjes komen erbij. <b>Vervangen</b>: wat je nu invult komt ervoor in de plaats.</div><button class="btn" data-k="samen" style="width:100%">Samenvoegen</button><div class="row"><button class="btn sec" data-k="vervang" style="flex:1">Vervangen</button><button class="btn sec" data-k="over" style="flex:1">Overslaan</button></div>`, (e, o) => { const k = e.target.dataset && e.target.dataset.k; if (k) { o.remove(); res(k); } }); }); }
function rbBewaar() { ls.set('cba-retour', RB); write('voorkeuren', [{ wie: 'retour', data: RB }], true); }

async function renderRetour() {
  const v = $('#view'); if (!RB) { v.innerHTML = '<div class="empty">Laden…</div>'; await rbLaad(); if (ui.tab !== 'retour') return; }
  if (ui.rbEdit) return rbForm(v);
  if (!rbOpschonen.ok) { rbOpschonen.ok = 1; await rbOpschonen(); if (ui.tab !== 'retour' || ui.rbEdit) return; }
  if (!rbLaad.bo && boInst().url && boInst().code) { rbLaad.bo = 1; boHaal(true).then(() => ui.tab === 'retour' && !ui.rbEdit && renderRetour()).catch(() => { }); }
  const B = RB.bonnen, tot = Object.fromEntries(RB_V.map(([k]) => [k, B.reduce((t, b) => t + (+b[k] || 0), 0)])), ST = B.map(rbStatus), dr = rbRet().dragers, gekop = !!(boInst().url && boInst().code) || !!Object.keys(RB.ws || {}).length;
  if (ST.reduce((w, s, i) => !B[i].datum && s.f && s.f.d ? (B[i].datum = s.f.d, 1) : w, 0)) rbBewaar();
  const MI = rbMist(B);
  const vst = rbVoorstel(B), geld = rbGeld(), RL = B.map((b, i) => [b, ST[i]]).filter(([, s]) => rbFout(s)), klaar = RL.filter(([b, s]) => b.vt && s.v > 0.005), vaak = rbVaak(RL), nScan = B.filter(b => b.scan).length, nWolk = B.filter(b => b.scan && b.wolk).length, oudCl = B.filter((b, i) => b.cl && rbFout(ST[i]) && C.diff(b.cl, C.today()) >= 28).length;
  const rood = ST.filter(x => x.st === 'verschil' || x.st === 'mist'), tegoed = rood.reduce((t, x) => t + Math.max(0, x.v), 0), teveel = rood.reduce((t, x) => t + Math.min(0, x.v), 0), wacht = ST.filter((x, i) => x.st === 'wacht' && !B[i].ok).length;
  v.innerHTML = `<div class="blk"><h2>Van Tol</h2>${gekop ? `${geld ? `<p class="rbsom">Nog te ontvangen <b>${rbEuro(tegoed)}</b></p>` : ''}<p class="small">${rood.length ? `${rood.length} ${rood.length === 1 ? 'bon klopt' : 'bonnen kloppen'} niet met de weekstaat` : '✓ Alle gecontroleerde bonnen kloppen'}${geld && teveel < 0 ? ` · ${rbEuro(-teveel)} te veel gecrediteerd` : ''}${wacht ? ` · ${wacht} nog niet op een ingelezen weekstaat` : ''}</p>
    ${geld ? rbPrijsCheck().map(x => `<div class="rbprijs"><p class="small">⚠ Van Tol rekent sinds ${C.fmtDag(x.vanaf)} <b>${rbEuro(x.nw)}</b> voor ${esc(x.naam)} (in de app ${rbEuro(x.oud)}). Overnemen vanaf die datum?</p><div class="row"><button class="btn" data-pz="${x.k}|${x.nw}|${x.vanaf}">Overnemen</button><button class="btn sec" data-pn="${x.k}:${x.nw}">Klopt niet</button></div></div>`).join('') : ''}${geld && vaak ? `<p class="small">Vaakst niet goed gecrediteerd: <b>${esc(vaak)}</b></p>` : ''}${geld && oudCl ? `<p class="small rood">📨 ${oudCl} geclaimde ${oudCl === 1 ? 'bon is' : 'bonnen zijn'} na 4 weken nog niet opgelost: vraag Van Tol na</p>` : ''}
    ${geld && rood.length ? `<button class="btn" id="rbClaim" style="width:100%;margin:6px 0">📄 Claimrapport voor Van Tol${klaar.length ? ` · ${klaar.length} ${klaar.length === 1 ? 'bon' : 'bonnen'}` : ''}</button><p class="small">${klaar.length < rood.length ? `Alleen nagekeken bonnen gaan mee: open een bon met ✕ en tik <b>✓ Bon klopt, Van Tol fout</b>. ${rood.length - klaar.length} nog na te kijken.` : '✓ Alle foute bonnen zijn nagekeken'}</p>` : ''}
    <p class="small">${rbBoTekst()}</p>
    ${vst.length ? `<button class="btn sec" id="rbVs" style="width:100%;margin:6px 0">🔎 Opnieuw vergelijken · ${vst.length} ${vst.length === 1 ? 'voorstel' : 'voorstellen'}</button>` : ''}
    <button class="btn sec" id="rbKar" style="width:100%;margin:6px 0">🛒 Karren en planken tellen</button>
    ${dr ? `<p class="rbsom">Karren volgens Van Tol <b>${Object.entries(dr.items || {}).map(([n, a]) => `${a} ${/CONTAINER/i.test(n) ? 'karren' : n.toLowerCase()}`).join(' · ')}</b></p><p class="small">Weekstaat ${esc(dr.ws)}${dr.d ? ' · ' + C.fmtDag(dr.d) : ''}</p>` : ''}`
    : '<p class="small">Koppel Brood Opzet (Kantoor › Brood Opzet) en lees daar de weekstaten in: dan controleert de app elke bon tegen Van Tol.</p>'}</div>
    ${MI.ws.length || MI.gat.length ? `<details class="blk rbmist" id="rbMi"${localStorage.getItem('cba-rbmist') ? ' open' : ''}><summary><b>⚠ Ontbrekende bonnen · ${MI.ws.length + MI.gat.length}</b>${MI.ws.length && geld ? ` · ${rbEuro(MI.ws.reduce((t, [, f]) => t + Math.abs(+f.eur || 0), 0))}` : ''}</summary>${MI.ws.length ? `<p class="small">Wel gecrediteerd op een weekstaat, maar niet in je lijst:</p>${MI.ws.map(([k, f]) => `<div class="rbrij"><span class="rbtx"><b>BGR ${esc(k)}</b><small>${(f.regels || []).map(r => `${r.n} × ${esc(r.oms)}`).join(' · ')}${geld ? ' · ' + rbEuro(Math.abs(+f.eur || 0)) : ''} · weekstaat ${esc(f.ws)}</small></span><button class="btn sm" data-rbws="${esc(k)}">+ Toevoegen</button><button class="btn sm sec" data-rbneg="${esc(k)}" aria-label="Negeren">✕</button></div>`).join('')}` : ''}
      ${MI.gat.length ? `<p class="small">Gat in de nummering (zoek de bon op of tik ✕ als hij niet van jou is):</p>${MI.gat.map(k => `<div class="rbrij"><span class="rbtx"><b>BGR ${k}</b><small>tussen je andere bonnen in, nog niet ingevoerd</small></span><button class="btn sm sec" data-rbneg="${k}" aria-label="Negeren">✕</button></div>`).join('')}` : ''}</details>` : ''}
    <div class="blk"><h2>Retour · ${B.length} bonnen</h2><div class="rbtot">${RB_V.filter(([k]) => tot[k]).map(([k, t]) => `<div><b>${C.fmt(tot[k])}</b><small>${t}</small></div>`).join('') || '<p class="small">Nog geen bonnen.</p>'}</div>${nScan ? `<p class="small${nWolk < nScan && rbWolkSync.fout ? ' rood' : ''}">☁️ ${nWolk === nScan ? `Alle ${nScan} scans staan veilig in de opslag` : `${nWolk} van ${nScan} scans veilig opgeslagen${rbWolkSync.fout ? ' · opslaan lukt niet: doe eerst de Supabase-stap (opslag "retour")' : ' · bezig…'}`}</p>` : ''}</div>
    ${rbBezig ? `<div class="blk rbvg"><b>${rbBezig.ws ? 'Weekstaten' : 'Scans'} inlezen…</b><div class="gmbalk"><i id="rbVgB" style="width:${Math.round(rbBezig.n / Math.max(1, rbBezig.tot) * 100)}%"></i></div><p class="small" id="rbVgT">${rbVgTekst()}</p></div>` : rbRij.length ? `<button class="btn" id="rbVerder" style="width:100%;margin-bottom:10px">✏️ Controleer bonnen (${rbTel.n ? 'nog ' : ''}${rbRij.length})</button>` : ''}
    <div class="rbknop"><label class="btn">📄 Scans uploaden<input type="file" id="rbUp" multiple accept=".pdf,image/*" class="hide"></label><label class="btn sec">🧾 Weekstaten<input type="file" id="rbWs" multiple accept=".pdf" class="hide"></label></div>
    <div class="rbknop"><button class="btn sec" id="rbNieuw">+ Zonder scan</button><label class="btn sec">Excel importeren<input type="file" id="rbImp" accept=".xlsx,.xls" class="hide"></label>${geld ? '<button class="btn sec" id="rbExp">Excel maken</button>' : ''}</div>
    <div class="blk">${B.length ? `<input type="search" id="rbQ" placeholder="🔍 Bonnummer, retourbon of weekstaat" value="${esc(ui.rbZoek || '')}" style="width:100%"><div id="rbL">${rbBalk(B, ST)}${rbLijst(B, ST, gekop)}</div>` : '<p class="small">Upload je scans of importeer je Excel.</p>'}</div>`;
  if ($('#rbMi')) $('#rbMi').ontoggle = e => e.target.open ? localStorage.setItem('cba-rbmist', 1) : localStorage.removeItem('cba-rbmist');
  if ($('#rbQ')) { const L = () => { $('#rbL').innerHTML = rbBalk(B, ST) + rbLijst(B, ST, gekop); rbKlik(); }; $('#rbQ').oninput = e => { ui.rbZoek = e.target.value; L(); };
    $('#rbL').onclick = e => { const x = e.target.closest('[data-rbs],[data-rbf],[data-rbv],[data-rbzs]'); if (!x) return; if ('rbzs' in x.dataset) ls.get('cba-rbzs') ? ls.del('cba-rbzs') : ls.set('cba-rbzs', 1); else if (x.dataset.rbs) ls.set('cba-rbsort', x.dataset.rbs); else if ('rbf' in x.dataset) ls.set('cba-rbfil', x.dataset.rbf); else ls.set('cba-rbvolg', rbOud() ? 'nieuw' : 'oud'); L(); }; }
  $('#rbUp').onchange = e => rbUpload([...e.target.files]);
  $('#rbWs').onchange = e => rbWsUpload([...e.target.files]);
  $('#rbImp').onchange = e => rbImport(e.target.files[0]);
  v.querySelectorAll('[data-pz]').forEach(x => x.onclick = () => { const [k, p, d] = x.dataset.pz.split('|'); RB.prijs = RB.prijs || {}; RB.prijs[k] = (RB.prijs[k] || []).filter(y => y[0] !== d).concat([[d, +p]]).sort((a, b) => a[0].localeCompare(b[0])); rbBewaar(); toast('✓ Nieuwe prijs overgenomen'); renderRetour(); });
  v.querySelectorAll('[data-pn]').forEach(x => x.onclick = () => { (RB.prijsNee = RB.prijsNee || []).push(x.dataset.pn); rbBewaar(); renderRetour(); });
  if ($('#rbExp')) $('#rbExp').onclick = rbExport; if ($('#rbVs')) $('#rbVs').onclick = rbVoorstelSheet; if ($('#rbClaim')) $('#rbClaim').onclick = rbClaim; if ($('#rbKar')) $('#rbKar').onclick = () => { ui.karT = null; ga('karren'); };
  if (!rbWolkSync.ok) { rbWolkSync.ok = 1; setTimeout(rbWolkSync, 2500); }
  $('#rbNieuw').onclick = () => { ui.rbEdit = { b: {}, i: -1 }; renderRetour(); };
  if ($('#rbVerder')) $('#rbVerder').onclick = () => { ui.rbEdit = Object.assign({ i: -1 }, rbRij[0], { rij: 1 }); renderRetour(); };
  v.querySelectorAll('[data-rbneg]').forEach(x => x.onclick = () => { (RB.neg = RB.neg || []).push(x.dataset.rbneg); rbBewaar(); renderRetour(); });
  v.querySelectorAll('[data-rbws]').forEach(x => x.onclick = () => { const k = x.dataset.rbws, f = rbRet().bonnen[k], b = { nr: 'BGR ' + k, datum: f.d || '' };
    (f.regels || []).forEach(r => { const k = rbSoort(r); if (k) b[k] = (b[k] || 0) + Math.abs(+r.n || 0); }); ui.rbEdit = { b, i: -1 }; renderRetour(); window.scrollTo(0, 0); });
  const rbKlik = () => v.querySelectorAll('[data-rb]').forEach(x => x.onclick = async () => { const i = +x.dataset.rb, b = B[i]; ui.rbEdit = { b: Object.assign({}, b), i, img: b.scan ? await rbScan(b.nr) : null }; renderRetour(); }); rbKlik();
}

function rbForm(v) {
  const e = ui.rbEdit, b = e.b, veld = (k, t, x = '') => `<div class="f"><label>${t}${rbGeld() ? `<small class="rbpr">${RB_P[k] ? rbEuro(rbP(k, b.datum)) + ' per stuk' : 'geen statiegeld'}</small>` : ''}</label><input data-rf="${k}" type="text" inputmode="decimal" value="${esc(b['_' + k] ?? (b[k] || ''))}" ${x}><span class="rbis" data-ris="${k}"></span></div>`;
  const ex = RB_V.slice(RB_N), blok2 = RB_V.slice(1, RB_N).concat(ex.filter(([k]) => +b[k])).map(([k, t]) => veld(k, t)).join('') + (ex.some(([k]) => !+b[k]) ? `<details class="rbmeer"><summary>+ Meer soorten (DPB KST, CHEP, CBL, lege kratten, flessen)</summary>${ex.filter(([k]) => !+b[k]).map(([k, t]) => veld(k, t)).join('')}<p class="small">Leeg krat Nutricia 24 fles vul je in bij Leeg krat bier 24 fles: Van Tol gebruikt daarvoor dezelfde code.</p></details>` : '');
  v.innerHTML = `${e.img ? `<div class="rbkop" style="background-image:url(${e.img})" role="img" aria-label="Kop van de bon met het bonnummer"></div>` : ''}
    <div class="blk form rbf">${e.rij ? `<p class="small">Bon ${rbTel.n + 1} van ${rbTel.tot}</p>` : ''}${e.fout ? `<p class="small rood">⚠️ ${esc(e.fout)}</p>` : ''}
    <label class="rbnrl" for="rbNr">Bonnummer</label><input id="rbNr" class="rbnr" type="text" inputmode="numeric" value="${esc(b.nr || 'BGR ')}" placeholder="BGR 202606941"><p class="small rood" id="rbNrW"></p>
    <div class="f"><label>Datum</label><input id="rbDat" type="date" value="${esc(b.datum || '')}"></div>
    ${veld('k', 'Containers totaal')}
    <div class="f"><label>Retourbon (producten)</label><input id="rbRb" type="text" inputmode="decimal" value="${esc(b.rb || '')}" placeholder="bv. 60226399,60226433"></div></div>
    ${e.img ? `<div class="rbscan"><img src="${e.img}" alt="Scan van de bon"></div><p class="small" style="text-align:center">Tik op de scan om in of uit te zoomen</p>` : ''}
    <div class="blk form rbf"><p class="small">Meer kolommen op de bon? Typ ze achter elkaar met een komma: <b>18,11,17</b> wordt 46.</p>
    ${blok2}${rbGeld() ? '<p class="rbtotaal">Totaal statiegeld <b id="rbTotS"></b></p>' : '<b id="rbTotS" hidden></b>'}${b.bags && b.bags.length ? `<p class="small">Bag-ID: ${b.bags.map(esc).join(' · ')}</p>` : ''}
    <div class="f"><label>Opmerking</label><input id="rbOpm" type="text" value="${esc(b.opm || '')}" placeholder="bv. mist op factuur"></div>
    ${e.i >= 0 ? rbWsHtml(b) + rbVtHtml(RB.bonnen[e.i] || b) + (rbVoorstel(RB.bonnen).some(x => x.i === e.i) ? '<button class="btn sec" id="rbVsB" style="width:100%;margin-top:8px">🔎 Mogelijk staat deze bon onder een ander nummer: bekijken</button>' : '') : ''}
</div>
    <button class="btn" id="rbSla" style="width:100%">${e.rij && rbRij.length > 1 ? 'Opslaan → volgende bon' : 'Opslaan'}</button>
    <div class="rbknop">${e.rij ? '<button class="btn sec" id="rbSkip">Scan overslaan</button>' : ''}<button class="btn sec" id="rbTerug">Annuleren</button>${e.i >= 0 ? '<button class="btn sec rood" id="rbDel">Verwijderen</button>' : ''}</div>`;
  /* 2.13: zodra je een vakje invult, zie je of het klopt met de weekstaat (pas ná het invullen, zodat je het getal van Van Tol niet overneemt) */
  const toon = i => { const k = i.dataset.rf, n = rbSom(i.value), f = (rbRet().bonnen || {})[rbKey($('#rbNr').value)], vt = f && rbVt(f)[k] || 0; $(`[data-ris="${k}"]`).innerHTML = (/[\s,;.+]/.test(i.value.trim()) ? '= ' + n : '') + (f && k !== 'bb' && i.value.trim() !== '' ? (n === vt ? '<em class="rbgoed">✓</em>' : `<em class="rood">Van Tol: ${vt}</em>`) : '') + (n && RB_P[k] && rbGeld() ? `<small>${rbEuro(n * rbP(k, b.datum))}</small>` : ''); $('#rbTotS').textContent = rbEuro([...v.querySelectorAll('[data-rf]')].reduce((t, x) => t + rbSom(x.value) * (rbP(x.dataset.rf, b.datum) || 0), 0)); };
  v.querySelectorAll('[data-rf]').forEach(i => { toon(i); i.oninput = () => toon(i); });
  const nrW = () => { const x = rbKey($('#rbNr').value); $('#rbNrW').textContent = x.length >= 6 && !rbNrOk(x) ? `⚠ Bonnummer lijkt niet te kloppen: ${x.length} cijfers. Een bonnummer heeft er 9 en begint met 20.` : ''; v.querySelectorAll('[data-rf]').forEach(toon); };
  nrW(); $('#rbNr').oninput = nrW;
  if ($('#rbVsB')) $('#rbVsB').onclick = () => { ui.rbEdit = null; renderRetour(); rbVoorstelSheet(); };
  if ($('#rbOntk')) $('#rbOntk').onclick = () => { const x = RB.bonnen[e.i]; if (!x) return; (x.wsNee = x.wsNee || []).push(x.wsnr); delete x.wsnr; delete e.b.wsnr; rbBewaar(); toast('Ontkoppeld'); renderRetour(); };
  const vtK = () => { const x = RB.bonnen[e.i]; if (!x) return; if (x.vt) delete x.vt; else x.vt = C.today(); rbBewaar(); $('#rbVt').outerHTML = rbVtKnop(x); $('#rbVt').onclick = vtK; toast(x.vt ? '✓ Nagekeken: gaat mee in het claimrapport' : 'Niet meer nagekeken'); }; if ($('#rbVt')) $('#rbVt').onclick = vtK;
  $('#rbNr').onfocus = ev => setTimeout(() => { const x = ev.target; x.setSelectionRange(x.value.length, x.value.length); }, 0);
  if ($('.rbscan')) $('.rbscan').onclick = () => $('.rbscan').classList.toggle('groot');
  v.querySelectorAll('[data-wsimg]').forEach(async im => { const k = 'rbws:' + im.dataset.wsimg, f = rbRet().bonnen[im.dataset.wsimg]; im.onclick = () => im.classList.toggle('groot');
    let u = await iget(k); /* 1.95: plaatje van Brood Opzet (tijdelijke link) één keer ophalen en op het toestel bewaren */
    if (!u && typeof f.img === 'string') try { const bl = await (await fetch(f.img)).blob(); if (/image/.test(bl.type)) { u = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(bl); }); iset(k, u); } } catch (e) { }
    if (u) im.src = u; else im.remove(); });
  const klaar = () => { if (e.rij) { rbRij.shift(); rbTel.n++; if (!rbRij.length) rbTel = { n: 0, tot: 0 }; rbRijBewaar(); } ui.rbEdit = e.rij && rbRij.length ? Object.assign({ i: -1 }, rbRij[0], { rij: 1 }) : null; renderRetour(); window.scrollTo(0, 0); };
  $('#rbTerug').onclick = () => { ui.rbEdit = null; renderRetour(); };
  if ($('#rbSkip')) $('#rbSkip').onclick = klaar;
  if ($('#rbDel')) $('#rbDel').onclick = async () => { if (!await bevestig('Bon verwijderen?', `${esc(b.nr || 'Deze bon')} verdwijnt uit de lijst.`, 'Verwijderen')) return; RB.bonnen.splice(e.i, 1); if (b.nr) { idel('rbscan:' + b.nr); if (b.wolk) rbWolkWeg(b.nr); } rbBewaar(); ui.rbEdit = null; renderRetour(); };
  $('#rbSla').onclick = async () => {
    const n = Object.assign({}, e.i >= 0 ? RB.bonnen[e.i] : {}, { nr: $('#rbNr').value.replace(/\D/g, '') ? 'BGR ' + $('#rbNr').value.replace(/\D/g, '') : '', datum: $('#rbDat').value, rb: rbRbs($('#rbRb').value).join(', '), opm: $('#rbOpm').value.trim() });
    v.querySelectorAll('[data-rf]').forEach(i => { const k = i.dataset.rf, s = rbSom(i.value); if (s) n[k] = s; else delete n[k]; });
    if (b.bags) n.bags = rbBags((n.bags || []).concat(b.bags));
    if (!n.nr) return toast('Vul het bonnummer in');
    if (!rbNrOk(n.nr) && !await bevestig('Bonnummer klopt niet?', `${esc(n.nr)} heeft ${rbKey(n.nr).length} cijfers. Een bonnummer heeft er 9 en begint met 20.`, 'Toch opslaan', 'Verbeteren')) return $('#rbNr').focus();
    let i = e.i; const j = RB.bonnen.findIndex((x, y) => y !== e.i && x.nr === n.nr), tk = [];
    if (j >= 0) { const k = await rbKeuze(n.nr); if (!k) return; if (k === 'over') return klaar(); const x = RB.bonnen[j];
      if (k === 'samen') { const m = Object.assign({}, x); for (const f of ['datum', 'opm', 'vt', 'cl', 'wsnr']) if (!m[f] && n[f]) m[f] = n[f]; m.rb = [...new Set(rbRbs(m.rb).concat(rbRbs(n.rb)))].join(', '); if (n.bags || m.bags) m.bags = rbBags((m.bags || []).concat(n.bags || []));
        const dif = RB_V.filter(([f]) => n[f] && m[f] && +n[f] !== +m[f]); RB_V.forEach(([f]) => { if (n[f] && !m[f]) m[f] = n[f]; });
        if (dif.length && await bevestig('Aantallen wijken af', dif.map(([f, t]) => `${t}: in de lijst <b>${m[f]}</b>, op deze bon <b>${n[f]}</b>`).join('<br>'), 'Bon gebruiken', 'Lijst houden')) dif.forEach(([f]) => m[f] = n[f]);
        Object.assign(n, m); } else n.ok = x.ok;
      if (e.i >= 0) RB.bonnen.splice(e.i, 1); i = RB.bonnen.findIndex(x => x.nr === n.nr); }
    if (e.img) { await iset('rbscan:' + n.nr, e.img); n.scan = true; if (e.i < 0 || (RB.bonnen[e.i] || {}).nr !== n.nr) delete n.wolk; }
    if (i >= 0) RB.bonnen[i] = n; else RB.bonnen.push(n); rbBewaar(); toast('✓ ' + n.nr + ' opgeslagen'); klaar(); rbWolkSync();
  };
}

function rbWsHtml(b) { const s = rbStatus(b); if (s.st === 'leeg') return '<p class="small">Lege bon: er ging niets retour.</p>'; if (!s.f) return `<p class="small">${s.st === 'mist' ? 'Deze bon staat niet op de ingelezen weekstaten.' : 'Nog niet op een ingelezen weekstaat.'}</p>`;
  return `<div class="rbws ${s.st}"><b>Weekstaat ${esc(s.f.ws)}${s.f.fnr ? ' · factuur ' + esc(s.f.fnr) : ''}</b><small>${s.f.eigen || (RB.ws || {})[rbWk(b)] ? 'Uit je eigen upload' : 'Uit Brood Opzet'}</small>${b.wsnr ? `<small>🔗 Bij Van Tol als <b>${esc(b.wsnr)}</b> <button class="lnk" id="rbOntk">ontkoppelen</button></small>` : ''}${s.f.img ? `<img class="rbwsimg" data-wsimg="${esc(rbWk(b))}" alt="Bladzijde Retouremballage van de weekstaat">` : ''}${(s.f.regels || []).map(r => `<small>${r.n} × ${esc(r.oms)}${rbGeld() ? ' · ' + rbEuro(Math.abs(r.eur)) : ''}</small>`).join('')}${rbGeld() ? `<small>Gecrediteerd ${rbEuro(Math.abs(s.f.eur))} · bon ${rbEuro(rbWaarde(b))}</small>` : ''}${s.st === 'verschil' ? `<small class="rood"><b>${rbGeld() ? (s.v > 0 ? rbEuro(s.v) + ' te weinig' : rbEuro(-s.v) + ' te veel') : 'Klopt niet'}</b>${s.dif.length ? ' · ' + s.dif.map(esc).join(' · ') : ''}</small>` : '<small>✓ Klopt</small>'}</div>`; }
/* 2.13: nakijken vóór het claimen: alleen bonnen die jij hebt nagekeken gaan mee naar Van Tol */
const rbVtKnop = b => `<button class="btn ${b.vt ? '' : 'sec'}" id="rbVt" style="width:100%;margin-top:8px">${b.vt ? '✓ Nagekeken: bon klopt, Van Tol fout' : '✓ Bon klopt, Van Tol fout'}</button>`;
function rbVtHtml(b) { const s = rbStatus(b); if (!rbGeld() || !rbFout(s) || s.v <= 0.005) return ''; return `${rbVtKnop(b)}<p class="small">${b.cl ? `📨 Geclaimd op ${C.fmtDag(b.cl)}` : 'Leg de scan naast de cijfers. Klopt de bon, tik dan hierboven: dan gaat hij mee in het claimrapport.'}</p>`; }
async function rbWsUpload(files) {
  if (!files.length || rbBezig) return; RB.ws = RB.ws || {}; const B = rbBezig = { ws: 1, n: 0, tot: files.length, nb: 0, al: 0, weg: 0 }; if (ui.tab === 'retour' && !ui.rbEdit) renderRetour();
  const pj = await pdfjs();
  for (const f of files) { let doc = null; /* 1.96: één keer openen, bladzijde voor bladzijde, daarna opruimen (iPhone-geheugen) */
    try { doc = await pj.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise; let ws = (f.name.match(/(\d{4}\.\d{2}\.\d{2})/) || [])[1] || ''; const nieuw = {};
      for (let i = 1; i <= doc.numPages; i++) { const pg = await doc.getPage(i), L = C.lines((await pg.getTextContent()).items.filter(x => x.str && x.str.trim()).map(x => ({ s: x.str, x: x.transform[4], y: x.transform[5] }))).map(l => l.txt), t = L.join('\n');
        const wn = t.match(/Weekstaatnummer\s*:\s*([\d.]+\d)/); if (wn) ws = wn[1];
        const bl = C.wsRetour(L); if (Object.keys(bl).length) { const vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 1100 / vp0.width }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; const img = c.toDataURL('image/jpeg', 0.6); c.width = c.height = 0;
          for (const k in bl) { await iset('rbws:' + k, img); nieuw[k] = Object.assign(bl[k], { img: 1, eigen: 1 }); } }
        const gi = L.findIndex(x => /SALDO GOEDERENDRAGERS/i.test(x)); if (gi >= 0) { const items = {}; for (const x of L.slice(gi + 1)) { const m = x.match(/^([A-Z][A-Z .\/]+?)\s+(-?\d+)$/); if (!m) break; items[m[1]] = +m[2]; }
          const d = L[gi].match(/(\d\d)\.(\d\d)\.(\d{4})/) || []; const dr = { d: d[3] ? `${d[3]}-${d[2]}-${d[1]}` : '', ws: ws || f.name, items }; if (!RB.dr || dr.d >= RB.dr.d) RB.dr = dr; }
        pg.cleanup(); }
      for (const k in nieuw) { nieuw[k].ws = ws || f.name; RB.ws[k] = nieuw[k]; B.nb++; }
    } catch (e) { toast(`${f.name}: kon niet lezen (${e.message})`, 6000); } finally { if (doc) doc.destroy(); }
    B.n++; rbVg(); }
  rbBezig = null; rbBewaar(); toast(`${B.n} ${B.n === 1 ? 'weekstaat' : 'weekstaten'} gelezen · ${B.nb} retourbonnen gevonden`, 5000); if (ui.tab === 'retour' && !ui.rbEdit) renderRetour();
}
/* scans (pdf van de iPhone-scanner of foto's) → per bladzijde een plaatje + gedrukte tekst lezen */
function rbVgTekst() { const b = rbBezig; if (b.ws) return `Weekstaat ${b.n} van ${b.tot} gelezen · ${b.nb} retourbonnen`; return `Scan ${b.n} van ${b.tot} gelezen${b.al + b.weg ? ` · ${b.al + b.weg} overgeslagen` : ''}`; }
function rbVg() { const b = rbBezig; if (!b || ui.tab !== 'retour' || ui.rbEdit) return; const x = $('#rbVgB'), t = $('#rbVgT'); if (x) x.style.width = Math.round(b.n / Math.max(1, b.tot) * 100) + '%'; if (t) t.textContent = rbVgTekst(); }
async function rbUpload(files) {
  if (!files.length || rbBezig) return; if (!rbRij.length) rbTel = { n: 0, tot: 0 };
  const B = rbBezig = { n: 0, tot: 0, al: 0, weg: 0 }, bron = [];
  try { for (const f of files) if (/pdf/i.test(f.type) || /\.pdf$/i.test(f.name)) { const d = await (await pdfjs()).getDocument({ data: await f.arrayBuffer() }).promise; bron.push(d); B.tot += d.numPages; } else { bron.push(f); B.tot++; } }
  catch (e) { rbBezig = null; return toast('Kon de scan niet openen: ' + e.message, 6000); }
  rbTel.tot += B.tot; if (ui.tab === 'retour' && !ui.rbEdit) renderRetour();
  const klaar = r => { B.n++; const x = r.b.nr && RB.bonnen.find(b => rbKey(b.nr) === rbKey(r.b.nr));
    if (r.leeg) { B.weg++; rbTel.tot--; } else if (x && rbGec(x)) { iset('rbscan:' + x.nr, r.img); x.scan = true; delete x.wolk; B.al++; rbTel.tot--; } else rbRij.push(r);
    rbRijBewaar(); rbVg(); };
  try { for (const d of bron) {
    if (d.numPages) for (let i = 1; i <= d.numPages; i++) { const pg = await d.getPage(i), tx = (await pg.getTextContent()).items.map(x => x.str).join(' '), vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 2400 / vp0.width }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; const r = await rbLees(c, tx); c.width = c.height = 0; pg.cleanup(); klaar(r); }
    else { const bm = await createImageBitmap(d), sc = Math.min(1, 2400 / bm.width), c = document.createElement('canvas'); c.width = bm.width * sc; c.height = bm.height * sc; c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height); bm.close && bm.close(); const r = await rbLees(c, ''); c.width = c.height = 0; klaar(r); }
  } } catch (e) { toast('Inlezen gestopt: ' + e.message, 6000); }
  rbBezig = null; if (B.al) { rbBewaar(); rbWolkSync(); } rbRijBewaar();
  toast(`Klaar: ${rbRij.length} ${rbRij.length === 1 ? 'bon' : 'bonnen'} om te controleren${B.al ? ` · ${B.al} al gecontroleerd` : ''}${B.weg ? ` · ${B.weg} leeg` : ''}`, 5000);
  if (ui.tab === 'retour' && !ui.rbEdit) renderRetour();
}
/* 1.86: één bladzijde tegelijk (iPhone-geheugen); eerst de tekst in de pdf zelf, anders tekstherkenning op twee stroken */
// 2.12: Bag-ID's opschonen. Eén sticker wordt vaak gelezen; een leesfout (≤2 cijfers anders, niet in de laatste 2, of maar 1× gelezen naast een vaker gelezen nummer) is dezelfde sticker
function rbBags(l) { const n = {}; l.forEach(x => n[x] = (n[x] || 0) + 1);
  return Object.keys(n).sort((a, b) => n[b] - n[a]).reduce((a, x) => a.some(y => { const d = [...y].map((c, i) => c !== x[i] ? i : -1).filter(i => i >= 0); return !d.length || (d.length <= 2 && (d.every(i => i < 6) || (n[x] === 1 && n[y] > 1))); }) ? a : a.concat(x), []); }
async function rbLees(c, tx) {
  const kl = document.createElement('canvas'), fz = Math.min(1, 1400 / c.width); kl.width = c.width * fz; kl.height = c.height * fz; kl.getContext('2d').drawImage(c, 0, 0, kl.width, kl.height);
  const r = { img: kl.toDataURL('image/jpeg', 0.6), b: {} }; { const d = kl.getContext('2d').getImageData(0, 0, kl.width, kl.height).data; let z = 0; for (let p = 0; p < d.length; p += 16) if (d[p] + d[p + 1] + d[p + 2] < 300) z++; r.inkt = z / (d.length / 16); } kl.width = kl.height = 0;
  const zoek = (t, o) => { const t2 = t.replace(/BGR\s*([0-9OoIl|]{8,10})/gi, (x, y) => 'BGR ' + y.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1')), m = t2.match(/BGR\s*(\d{6,10})/i) || t2.match(/\b(20\d{7})\b/), d = t.match(/(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(20\d\d)/);
    if (m) r.b.nr = 'BGR ' + m[1]; if (d) r.b.datum = `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}`; const ids = rbBags([...o.matchAll(/Bag\W{0,2}[I1l|]?\W{0,2}D\W{0,3}(\d{8})(?!\d)/gi)].map(x => x[1])), lab = Math.max(0, ...o.split(/[\f\v]/).map(x => (x.match(/KLANT\s*LABEL/gi) || []).length)), bb = ids.length ? Math.max(lab, ids.length) : Math.max(lab, /KLANT|LABEL|Bag\W?[I1l|]?\W?D|Klant\W?[I1l|]D/i.test(o) ? 1 : 0);
    if (bb) { r.b.bb = bb; r.b._bb = String(bb); } if (ids.length) r.b.bags = ids; };
  if (/BGR\s*\d{6}/i.test(tx || '')) { zoek(tx, tx); return r; }
  if (!rbOcr) try { await loadScript(LIB.ocr); rbOcr = await window.Tesseract.createWorker('eng'); } catch (e) { r.fout = 'Tekst lezen kon niet laden (offline?): vul het bonnummer zelf in'; return r; }
  try { const strook = (x0, y0, x1, y1, bw = 1440) => { const k = document.createElement('canvas'), sw = (x1 - x0) * c.width, sh = (y1 - y0) * c.height, f = Math.max(1, bw / sw); k.width = sw * f; k.height = sh * f; const g = k.getContext('2d'); g.drawImage(c, x0 * c.width, y0 * c.height, sw, sh, 0, 0, k.width, k.height);
      const im = g.getImageData(0, 0, k.width, k.height), d = im.data, hs = new Array(256).fill(0); for (let p = 0; p < d.length; p += 4) { d[p] = d[p + 1] = d[p + 2] = (d[p] * 3 + d[p + 1] * 6 + d[p + 2]) / 10 | 0; hs[d[p]]++; }
      let lo = 0, hi = 255, n = 0, z = d.length / 4 * 0.02; while ((n += hs[lo]) < z) lo++; n = 0; while ((n += hs[hi]) < z) hi--; const sc = 255 / Math.max(1, hi - lo); for (let p = 0; p < d.length; p += 4) d[p] = d[p + 1] = d[p + 2] = Math.max(0, Math.min(255, (d[p] - lo) * sc)); g.putImageData(im, 0, 0); return k; };
    const k1 = strook(0.4, 0, 1, 0.22); let t = '';
    const BG = /BGR\s*[0-9OoIl|]{8}/i; for (const psm of ['6', '4', '12', '3']) { await rbOcr.setParameters({ tessedit_pageseg_mode: psm }); const x = (await rbOcr.recognize(k1)).data.text; t += '\n' + x; if (BG.test(x)) break; }
    k1.width = k1.height = 0; if (!BG.test(t)) { const k3 = strook(0.5, 0.03, 1, 0.3); for (const psm of ['4', '6']) { await rbOcr.setParameters({ tessedit_pageseg_mode: psm }); const x = (await rbOcr.recognize(k3)).data.text; t += '\n' + x; if (BG.test(x)) break; } k3.width = k3.height = 0; } await rbOcr.setParameters({ tessedit_pageseg_mode: '6' }); const k2 = strook(0.08, 0.62, 0.96, 0.96), k4 = strook(0.18, 0.64, 0.82, 0.92, 2600), lees = async (k, m) => { await rbOcr.setParameters({ tessedit_pageseg_mode: m }); return (await rbOcr.recognize(k)).data.text; };
    const kr = document.createElement('canvas'); kr.width = k4.width; kr.height = k4.height; const gr = kr.getContext('2d'); gr.translate(kr.width, kr.height); gr.rotate(Math.PI); gr.drawImage(k4, 0, 0);
    const o = [await lees(k2, '6'), await lees(k2, '11'), await lees(k4, '11'), await lees(kr, '11')].join('\f'); await rbOcr.setParameters({ tessedit_pageseg_mode: '6' }); k2.width = k2.height = k4.width = k4.height = kr.width = kr.height = 0;
    zoek(t, o); if (!r.b.nr) r.fout = 'Bonnummer niet gevonden op deze scan: vul het zelf in'; } catch (e) { r.fout = 'Tekst lezen mislukt: ' + (e.message || e); }
  if (!r.b.nr && r.inkt < 0.01) r.leeg = true;
  return r;
}

async function rbImport(f) {
  if (!f) return; try { await loadScript(LIB.xlsx); } catch (e) { return toast(e.message); }
  const wb = XLSX.read(await f.arrayBuffer()), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
  let n = 0, dub = 0;
  for (const r of rows.slice(1)) {
    const k = String(r[1] ?? '').trim(), nr = 'BGR ' + rbKey(k); if (!/^(BGR\W*)?\d{6,}$/i.test(k)) continue;
    if (RB.bonnen.some(x => rbKey(x.nr) === rbKey(nr))) { dub++; continue; }
    const b = { nr, ok: r[0] === true || /^(true|waar|ja|x|1)$/i.test(String(r[0] ?? '')) }; RB_X.forEach(([k], j) => { const x = +r[2 + j]; if (x) b[k] = x; });
    const opm = r.slice(12).filter(x => x !== null && x !== '' && typeof x !== 'number').join(' · '); if (opm) b.opm = opm;
    RB.bonnen.push(b); n++;
  }
  rbOpschonen.ok = 0; rbBewaar(); toast(`${n} bonnen geïmporteerd${dub ? ` · ${dub} stonden er al in` : ''}`, 5000); renderRetour();
}

async function rbExport() {
  try { await loadScript(LIB.xlsx); } catch (e) { return toast(e.message); }
  const B = RB.bonnen, L = 'CDEFGHIJKL', n = B.length + 1, prijs = Object.fromEntries(RB_V.map(([k]) => [k, rbP(k)]));
  const aoa = [['gecontroleerd', 'retourbon nummer', ...RB_X.map(x => x[1]), 'opmerking', 'datum', 'retourbon producten', 'gecrediteerd €', 'verschil €', 'weekstaat', ...RB_V.slice(RB_N).map(x => x[1]), 'nagekeken', 'geclaimd op']].concat(B.map(b => { const s = rbStatus(b); return [rbGec(b, s), b.nr, ...RB_X.map(([k]) => b[k] || null), b.opm || null, b.datum || null, b.rb || null, s.f ? Math.abs(+s.f.eur || 0) : null, ['wacht', 'ok', 'leeg'].includes(s.st) ? null : s.v, s.f ? s.f.ws : null, ...RB_V.slice(RB_N).map(([k]) => b[k] || null), b.vt || null, b.cl || null]; }));
  const ws = XLSX.utils.aoa_to_sheet(aoa), cel = (a, v) => ws[a] = v;
  cel('B' + (n + 2), { t: 's', v: 'totaal' }); cel('B' + (n + 3), { t: 's', v: 'waarde €' }); cel('B' + (n + 5), { t: 's', v: 'totale waarde €' });
  RB_X.forEach(([k], j) => { const c = L[j]; cel(c + (n + 2), { t: 'n', f: `SUM(${c}2:${c}${n})` }); if (prijs[k]) cel(c + (n + 3), { t: 'n', f: `${c}${n + 2}*${prijs[k]}` }); });
  cel('C' + (n + 5), { t: 'n', f: RB_X.map(([k], j) => prijs[k] ? L[j] + (n + 3) : '').filter(Boolean).join('+') });
  cel('P' + (n + 2), { t: 's', v: 'nog te ontvangen' }); cel('Q' + (n + 2), { t: 'n', f: `SUMIF(Q2:Q${n},">0")` });
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: n + 4, c: 19 + RB_V.length - RB_N } }); ws['!cols'] = [{ wch: 13 }, { wch: 17 }, ...RB_X.map(() => ({ wch: 11 })), { wch: 30 }, { wch: 11 }, { wch: 14 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'bonnen');
  const file = new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], 'retourbonnen van tol.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) try { return await navigator.share({ files: [file], title: 'Retourbonnen Van Tol' }); } catch (e) { return; }
  const u = URL.createObjectURL(file), l = document.createElement('a'); l.href = u; l.download = file.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
  window.__rbExport = aoa.length - 1;
}

/* 2.13: claimrapport voor Van Tol: pdf op de iPhone gemaakt en gedeeld (geen publieke link) */
async function rbClaim() {
  const B = RB.bonnen, A = B.map(b => [b, rbStatus(b)]).filter(([, s]) => rbFout(s) && s.v > 0.005), L = A.filter(([b]) => b.vt), nw = L.filter(([b]) => !b.cl), od = L.filter(([b]) => b.cl), nk = A.length - L.length, som = l => l.reduce((t, [, s]) => t + s.v, 0);
  if (!L.length) return sheet(`<h2 style="margin:0">📄 Claimrapport</h2><p class="hulptekst">Kijk eerst de foute bonnen na: open een bon met ✕, leg de scan naast de cijfers en tik <b>✓ Bon klopt, Van Tol fout</b>. Alleen nagekeken bonnen gaan mee.${nk ? `<br>Nog na te kijken: <b>${nk}</b>.` : ''}</p><button class="btn" data-x style="width:100%">Begrepen</button>`);
  sheet(`<h2 style="margin:0 0 6px">📄 Claimrapport voor Van Tol</h2><p class="small">${nw.length ? `<b>${nw.length}</b> nieuwe ${nw.length === 1 ? 'bon' : 'bonnen'} · <b>${rbEuro(som(nw))}</b>` : 'Geen nieuwe bonnen'}${od.length ? `<br>${od.length} eerder geclaimd, nog niet opgelost · ${rbEuro(som(od))}` : ''}${nk ? `<br>${nk} foute ${nk === 1 ? 'bon' : 'bonnen'} nog niet nagekeken: ${nk === 1 ? 'gaat' : 'gaan'} niet mee` : ''}</p>
    <div class="f"><label>Klantnummer</label><input id="rcK" type="text" inputmode="numeric" value="${esc(RB.klant || '8924')}"></div>
    ${od.length ? `<label class="belrij"><input type="checkbox" id="rcOud" ${nw.length ? '' : 'checked'} style="width:24px;height:24px;flex:none"><span>Eerder geclaimde bonnen opnieuw meesturen</span></label>` : ''}
    <label class="belrij"><input type="checkbox" id="rcScan" checked style="width:24px;height:24px;flex:none"><span>Scans van de bonnen erbij</span></label>
    <button class="btn" id="rcGo" style="width:100%;margin-top:8px">Rapport maken en delen</button><button class="btn sec" data-x style="width:100%;margin-top:8px">Annuleren</button>`, async (ev, o) => {
    if (ev.target.id !== 'rcGo') return; const mee = nw.concat(o.querySelector('#rcOud') && o.querySelector('#rcOud').checked ? od : []); if (!mee.length) return toast('Vink de eerder geclaimde bonnen aan');
    RB.klant = o.querySelector('#rcK').value.trim(); const sc = o.querySelector('#rcScan').checked, k = ev.target; k.disabled = true; k.textContent = 'Rapport maken…';
    try { const f = await rbClaimPdf(mee, sc, rbVaak(A)); o.remove(); const mk = () => { const nu = C.today(); mee.forEach(([b]) => b.cl = nu); rbBewaar(); if (ui.tab === 'retour') renderRetour(); toast(`📨 ${mee.length} ${mee.length === 1 ? 'bon' : 'bonnen'} op geclaimd gezet`); };
      window.__rbClaim = f;
      if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: f.name }); mk(); } catch (e) { if (e.name !== 'AbortError') toast('Delen lukte niet: ' + e.message); } return; }
      const u = URL.createObjectURL(f), l = document.createElement('a'); l.href = u; l.download = f.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); mk();
    } catch (e) { k.disabled = false; k.textContent = 'Rapport maken en delen'; toast('Rapport maken mislukt: ' + e.message, 6000); } });
}
async function rbClaimPdf(L, sc, vaak) {
  await loadScript(LIB.jspdf); const { jsPDF } = window.jspdf, d = new jsPDF({ unit: 'mm', format: 'a4' }), M = 15, BR = 180, dat = x => x ? x.split('-').reverse().join('-') : 'zonder datum'; let y = M;
  const tx = (t, o = {}) => { const z = o.s || 10, r = d.splitTextToSize(String(t), BR); d.setFont('helvetica', o.b ? 'bold' : 'normal'); d.setFontSize(z); d.setTextColor(o.c || '#000000'); if (y + r.length * z * 0.42 > 297 - M) { d.addPage(); y = M; } d.text(r, M, y + z * 0.35); y += r.length * z * 0.42 + (o.na ?? 1.5); };
  const lijn = () => { d.setDrawColor('#cccccc'); d.line(M, y, M + BR, y); y += 3; };
  const ds = L.map(([b]) => b.datum).filter(Boolean).sort(), tot = L.reduce((t, [, s]) => t + s.v, 0), V = L.filter(([, s]) => s.st === 'verschil'), N = L.filter(([, s]) => s.st === 'mist');
  tx('Claim retouremballage', { s: 18, b: 1, na: 3 }); tx(`${(WINKEL && WINKEL.naam) || 'Coop Vogelenzang'}${RB.klant ? ' · klantnummer ' + RB.klant : ''}`, { s: 11 });
  tx(`Datum ${dat(C.today())}${ds.length ? ` · retourbonnen van ${dat(ds[0])} t/m ${dat(ds[ds.length - 1])}` : ''}`, { s: 11, na: 4 });
  tx(`Te weinig gecrediteerd: ${rbEuro(tot)} (${L.length} ${L.length === 1 ? 'retourbon' : 'retourbonnen'})`, { s: 14, b: 1, na: 2 });
  if (vaak) tx(`Vaakst niet goed gecrediteerd: ${vaak}`, { na: 4 }); lijn();
  const inh = b => RB_V.filter(([k]) => k !== 'bb' && +b[k]).map(([k, t]) => `${+b[k]} × ${t}`).join(', ');
  if (V.length) { tx(`Verkeerd gecrediteerd op de weekstaat (${V.length})`, { s: 12, b: 1, na: 2 });
    V.forEach(([b, s]) => { tx(`${b.nr}${b.wsnr ? ' (bij Van Tol ' + b.wsnr + ')' : ''} · ${dat(b.datum)} · weekstaat ${s.f.ws}${s.f.fnr ? ' · factuur ' + s.f.fnr : ''} · ${rbEuro(s.v)} te weinig${b.scan ? '' : ' · scan niet beschikbaar'}`, { b: 1, na: 0.5 }); tx(s.dif.join(' · ') || `Bon ${rbEuro(rbWaarde(b))}, gecrediteerd ${rbEuro(Math.abs(+s.f.eur || 0))}`, { c: '#444444', na: 3 }); }); lijn(); }
  if (N.length) { tx(`Niet gecrediteerd: staat op geen enkele weekstaat (${N.length})`, { s: 12, b: 1, na: 2 });
    N.forEach(([b, s]) => { tx(`${b.nr} · ${dat(b.datum)} · ${rbEuro(s.v)}${b.scan ? '' : ' · scan niet beschikbaar'}`, { b: 1, na: 0.5 }); tx(inh(b), { c: '#444444', na: 3 }); }); lijn(); }
  const T = ((await karLaad()).tel || [])[0]; if (T && (T.vk != null || T.vp != null)) { tx('Eigen telling in de winkel', { s: 12, b: 1, na: 2 });
    tx(`${dat(T.d)}: ${T.k} karren${T.vk != null ? ` (saldo Van Tol ${T.vk})` : ''} · ${T.pl} planken${T.vp != null ? ` (saldo Van Tol ${T.vp})` : ''}`, { na: 3 }); }
  if (sc) for (const [b, s] of L) { const img = await rbScan(b.nr); if (!img) continue; d.addPage(); y = M; tx(`${b.nr} · ${dat(b.datum)} · ${rbEuro(s.v)} te weinig`, { s: 12, b: 1, na: 3 });
    const im = new Image(); im.src = img; await im.decode(); let w = BR, h = BR * im.height / im.width; if (h > 297 - y - M) { h = 297 - y - M; w = h * im.width / im.height; } d.addImage(img, 'JPEG', M, y, w, h); }
  return new File([d.output('blob')], `Claim retouremballage ${((WINKEL && WINKEL.naam) || 'Coop Vogelenzang')} ${C.today()}.pdf`, { type: 'application/pdf' });
}

/* 2.13: karren en planken tellen en vergelijken met het saldo van Van Tol (alleen karren en planken houdt Van Tol bij) */
function rbSaldo(k) { const dr = rbRet().dragers; if (!dr) return null; const e = Object.entries(dr.items || {}).find(([n]) => k === 'k' ? /CONTAINER|KAR/i.test(n) : /PLANK/i.test(n)); return e ? +e[1] : null; }
/* 2.23: karrentellingen los van de retourbonnen (voorkeuren wie='karren'); de retourbonnen zijn in de database alleen voor de beheerder */
let KT = null;
async function karLaad() { if (KT) return KT; KT = ls.get('cba-karren') || { tel: [] };
  if (!DEMO && navigator.onLine) try { const r = await rest(wq('voorkeuren?wie=eq.karren')); if (r[0] && r[0].data && r[0].data.tel) KT = r[0].data; } catch (e) { }
  if (!KT.tel.length && RB && (RB.tel || []).length) { KT.tel = RB.tel; karBewaar(); } ls.set('cba-karren', KT); return KT; }
function karBewaar() { ls.set('cba-karren', KT); write('voorkeuren', [{ wie: 'karren', data: KT }], true); }
async function renderKarren() {
  const v = $('#view'); if (!RB || !KT) { v.innerHTML = '<div class="empty">Laden…</div>'; if (isBeheer()) await rbLaad(); else RB = RB || { bonnen: [] }; await karLaad(); if (ui.tab !== 'karren') return; }
  const T = KT.tel || [], dr = rbRet().dragers, t = ui.karT || (ui.karT = { k: '', pl: '' }), geld = rbGeld(), oud = dr && dr.d ? C.diff(dr.d, C.today()) : 0;
  const rij = (k, nm, p) => { const vt = rbSaldo(k), n = t[k] === '' ? null : +t[k], vs = vt !== null && n !== null ? vt - n : null;
    return `<div class="blk"><h2>${nm}</h2><div class="karrij"><button class="btn sec" data-km="${k}" aria-label="Eén minder">−</button><input type="text" inputmode="numeric" data-kv="${k}" value="${t[k]}" placeholder="0" aria-label="Aantal ${nm.toLowerCase()}"><button class="btn sec" data-kp="${k}" aria-label="Eén meer">+</button></div>
      <p class="small">${vt === null ? 'Saldo Van Tol nog niet bekend' : `Van Tol: <b>${vt}</b>${vs === null ? '' : vs === 0 ? ' · <span class="rbgoed">✓ klopt</span>' : ` · <span class="rood">verschil ${Math.abs(vs)}${geld ? ` × ${rbEuro(p)} = ${rbEuro(Math.abs(vs) * p)}` : ''} ${vs > 0 ? 'te veel op je saldo' : 'te weinig op je saldo'}</span>`}`}</p></div>`; };
  v.innerHTML = `<p class="small">${dr ? `Saldo Van Tol op ${dr.d ? C.fmtDag(dr.d) : '?'} (weekstaat ${esc(dr.ws)})${oud > 7 ? ` · <span class="rood">${oud} dagen oud: tel het liefst op de dag dat de weekstaat binnenkomt</span>` : ''}` : isBeheer() ? 'Nog geen saldo van Van Tol: lees een weekstaat in bij Retourbonnen.' : 'Tel de karren en planken en tik Telling opslaan. Het saldo van Van Tol ziet alleen de beheerder.'}</p>
    ${rij('k', 'Karren', rbP('k'))}${rij('pl', 'Planken', rbP('pl'))}
    <button class="btn" id="karSla" style="width:100%">Telling opslaan</button>
    ${T.length ? `<div class="blk"><h2>Eerdere tellingen</h2>${T.slice(0, 10).map(x => `<div class="rbrij"><span class="rbtx"><b>${C.fmtDag(x.d)}</b><small>${x.k} karren${x.vk != null ? ` (Van Tol ${x.vk})` : ''} · ${x.pl} planken${x.vp != null ? ` (Van Tol ${x.vp})` : ''} · ${esc(x.wie || '')}</small></span></div>`).join('')}</div>` : ''}`;
  const zet = (k, n) => { t[k] = n === '' ? '' : Math.max(0, +n || 0); renderKarren(); };
  v.querySelectorAll('[data-km]').forEach(b => b.onclick = () => zet(b.dataset.km, (+t[b.dataset.km] || 0) - 1));
  v.querySelectorAll('[data-kp]').forEach(b => b.onclick = () => zet(b.dataset.kp, (+t[b.dataset.kp] || 0) + 1));
  v.querySelectorAll('[data-kv]').forEach(i => i.onchange = () => zet(i.dataset.kv, i.value.replace(/\D/g, '')));
  $('#karSla').onclick = () => { if (t.k === '' && t.pl === '') return toast('Tel eerst de karren of planken'); (KT.tel = KT.tel || []).unshift({ d: C.today(), k: +t.k || 0, pl: +t.pl || 0, wie: mijnNaam(), vk: rbSaldo('k'), vp: rbSaldo('pl') }); KT.tel = KT.tel.slice(0, 30); karBewaar(); ui.karT = null; toast('✓ Telling opgeslagen'); renderKarren(); };
}
