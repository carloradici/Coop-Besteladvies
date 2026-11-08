/* Coop Besteladvies – rekenkern en inleesfuncties (gedeeld door app en tests) */
(function (root) {
'use strict';
const C = {};

/* ---------- datums ---------- */
const pad = (n, l = 2) => String(n).padStart(l, '0');
C.ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
C.date = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
C.add = (s, n) => { const d = C.date(s); d.setDate(d.getDate() + n); return C.ymd(d); };
C.diff = (a, b) => Math.round((C.date(b) - C.date(a)) / 864e5);
C.wd = s => (C.date(s).getDay() + 6) % 7; // 0=ma..6=zo
C.today = () => C.ymd(new Date());
C.isoWeek = s => {
  const d = C.date(s); const t = new Date(d); t.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const y = t.getFullYear(); const j4 = new Date(y, 0, 4, 12);
  return { y, w: 1 + Math.round(((t - j4) / 864e5 - 3 + ((j4.getDay() + 6) % 7)) / 7) };
};
C.mondayOf = (y, w) => { const j4 = new Date(y, 0, 4, 12); const m = new Date(j4); m.setDate(j4.getDate() - ((j4.getDay() + 6) % 7) + (w - 1) * 7); return C.ymd(m); };
C.monday = s => C.add(s, -C.wd(s));
C.DAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
C.DAGNAAM = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
C.fmtDag = s => { const d = C.date(s); return `${C.DAGEN[C.wd(s)]} ${d.getDate()}-${d.getMonth() + 1}`; };

/* ---------- getallen ---------- */
C.num = v => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v).trim().replace(/[€\s]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s); return isFinite(n) ? n : 0;
};
C.r = (n, d = 1) => { const f = 10 ** d; return Math.round(n * f) / f; };
C.fmt = (n, d = 1) => { if (n === null || n === undefined || !isFinite(n)) return ''; const v = C.r(n, d); return (Number.isInteger(v) ? String(v) : v.toFixed(d)).replace('.', ','); };
C.eur = n => n ? '€ ' + n.toFixed(2).replace('.', ',') : '';
C.nr6 = s => { s = String(s ?? '').trim(); if (/^\d+$/.test(s) && s.length < 6) s = s.padStart(6, '0'); return s; };

/* ---------- PDF: tekstregels ---------- */
C.pdfPages = async (pdfjs, buf) => {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableFontFace: true, isEvalSupported: false }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    pages.push(tc.items.filter(i => i.str && i.str.trim()).map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5] })));
  }
  return pages;
};
C.lines = items => {
  const its = items.slice().sort((a, b) => b.y - a.y || a.x - b.x);
  const out = []; let cur = null;
  for (const t of its) {
    if (!cur || Math.abs(t.y - cur.y) > 2) { cur = { y: t.y, it: [] }; out.push(cur); }
    cur.it.push(t);
  }
  out.forEach(l => { l.it.sort((a, b) => a.x - b.x); l.txt = l.it.map(i => i.s).join(' ').replace(/\s+/g, ' ').trim(); });
  return out;
};
C.detectPdf = pages => {
  const t = pages.slice(0, 9).flat().map(i => i.s).join(' ');
  if (/VOORKOOPLIJST/i.test(t)) return 'voorkoop';
  if (/Collo inhoud/i.test(t)) return 'collo';
  if (/looptijd/i.test(t) && /CAP/.test(t)) return 'actie';
  if (/Folderplanning week/i.test(t)) return 'folder';
  if (/ART\.NR/.test(t) && /VERP\./.test(t)) return 'kw';
  if (/Bst\.nr\./.test(t) && /Cons\.prijs/.test(t)) return 'vers';
  return null;
};

/* ---------- Bestelboek Versunie (vers) ---------- */
C.parseVers = pages => {
  const arts = []; let groep = '', week = null, i = 0, prev = null;
  for (const pg of pages) {
    for (const ln of C.lines(pg)) {
      const f = ln.it[0];
      if (/Bst\.nr\.|Artikelomschrijving|Cons\.prijs|^Pagina/.test(ln.txt)) {
        if (week === null) { const m = ln.it.filter(t => /^\d{2}$/.test(t.s.trim()) && t.x > 380); if (m.length) week = +m[0].s; }
        continue;
      }
      if (f.x > 20 && f.x < 45 && ln.it.length === 1 && !/^\d/.test(ln.txt)) { groep = ln.txt.trim(); prev = null; continue; }
      if (f.x < 20 && /^\d{6}$/.test(f.s.trim())) {
        const naam = ln.it.filter(t => t.x > 40 && t.x < 330).map(t => t.s).join(' ').trim();
        const bst = (ln.it.find(t => t.x > 330 && t.x < 380) || {}).s || '';
        prev = { nr: f.s.trim(), naam, bst: bst.trim(), eh: '', cons: 0, ink: 0, groep, i: i++ };
        arts.push(prev); continue;
      }
      if (prev && f.x < 20 && /^[A-Z]{2}$/.test(f.s.trim())) {
        prev.eh = f.s.trim();
        const nums = ln.it.filter(t => t.x > 140).map(t => C.num(t.s));
        if (nums.length >= 1) prev.cons = nums[0]; if (nums.length >= 2) prev.ink = nums[1];
        prev = null;
      }
    }
  }
  arts.forEach(a => Object.assign(a, C.eenheidVers(a)));
  return { bron: 'vers', week, artikelen: arts.filter(a => a.groep !== 'Aanvraag documenten') };
};
C.eenheidVers = a => {
  const n = a.naam.toLowerCase().replace(',', '.');
  let he = 1, kg = 0, perHE = a.eh !== 'ST', check = false;
  const mx = n.match(/(\d+)\s*x\s*([\d.]+)\s*(kg|gr|g|st|lt|l|ml|cl)?/);
  const los = n.match(/\blos\b.*?([\d.]+)\s*kg/) || (a.eh !== 'ST' && n.match(/([\d.]+)\s*kg\b(?!.*\d+\s*x)/));
  if (mx && +mx[1] > 1) { he = +mx[1]; }
  else if (los) { kg = parseFloat(los[1]); he = kg; }
  else if (a.eh !== 'ST') { const st = n.match(/(\d+)\s*st\b/); if (st) he = +st[1]; else check = true; }
  if (a.eh === 'ST') { if (mx && +mx[1] >= 4) { perHE = true; check = true; } else { he = 1; kg = 0; perHE = false; } }
  return { he, kg, perHE, check };
};

/* ---------- Bestelboek Van Tol (kw) ---------- */
C.parseKw = pages => {
  const arts = []; let datum = null, i = 0, prev = null, stack = ['', '', ''], run = [];
  const flushRun = () => { if (!run.length) return; const n = Math.min(run.length, 3); stack = stack.slice(0, 3 - n).concat(run.slice(-n)); run = []; };
  for (const pg of pages) {
    for (const ln of C.lines(pg)) {
      const f = ln.it[0];
      if (!datum) { const m = ln.txt.match(/(\d{2})\.(\d{2})\.(\d{4})\s+\d+\/\d+/); if (m) datum = `${m[3]}-${m[2]}-${m[1]}`; }
      if (/^VERP\.|^ART\.NR/.test(ln.txt) || /^\d{2}\.\d{2}\.\d{4}\s+\d+\/\d+$/.test(ln.txt) || /^\d{2}\/\d{2}$/.test(ln.txt)) continue;
      if (f.x > 88 && f.x < 100 && ln.it.length === 1) { run.push(ln.txt.trim()); prev = null; continue; }
      const m1 = ln.txt.match(/^(\d+)\s+([A-Z]{1,3})\s+(.+?)(?:\s+(K[A-Z]))?$/);
      if (f.x > 51 && f.x < 62 && m1 && ln.it.some(t => t.x > 80 && t.x < 100)) {
        flushRun();
        const naam = ln.it.filter(t => t.x > 80 && t.x < 340).map(t => t.s).join(' ').trim();
        const kl = (ln.it.find(t => t.x > 340) || {}).s || '';
        prev = { he: +m1[1], eh: m1[2], naam, kl: kl.trim() }; continue;
      }
      if (prev && f.x < 50 && /^\d{6}$/.test(f.s.trim())) {
        const merk = (ln.it.find(t => t.x > 80 && t.x < 140) || {}).s || '';
        const rest = ln.it.filter(t => t.x > 160 && t.x < 250).map(t => t.s).join(' ');
        const nums = (rest.match(/\d+\.\d+/g) || []).map(Number);
        const a = { nr: f.s.trim(), naam: prev.naam, merk: merk.trim(), eh: prev.eh, he: prev.he, kg: 0, perHE: prev.he > 1, check: false,
          cons: nums[0] || 0, ink: nums[1] || 0, kl: prev.kl, afd: stack[0], groep: [stack[1], stack[2]].filter(Boolean).join(' › '), i: i++ };
        arts.push(a); prev = null;
      }
    }
  }
  return { bron: 'kw', datum, artikelen: arts };
};

/* ---------- Actie-pdf ---------- */
C.parseActie = pages => {
  let van = null, tm = null, week = null; const items = [];
  for (const pg of pages) {
    const ls = C.lines(pg);
    for (const ln of ls) { const m = ln.txt.match(/week\s+(\d+)\s+looptijd\s+(\d{2})-(\d{2})-(\d{4})\s+tot en met\s+(\d{2})-(\d{2})-(\d{4})/i); if (m) { week = +m[1]; van = `${m[4]}-${m[3]}-${m[2]}`; tm = `${m[7]}-${m[6]}-${m[5]}`; } }
    const anchors = ls.filter(l => l.it.some(t => t.x > 78 && t.x < 100 && /^\d{6}$/.test(t.s.trim())));
    const rows = anchors.map(a => ({ y: a.y, ln: a, parts: [] }));
    for (const ln of ls) {
      if (anchors.includes(ln) || !rows.length) continue;
      if (/looptijd|Art nr|Aanwezig|Instore actie|Pagina/.test(ln.txt)) continue;
      let best = rows[0]; for (const r of rows) if (Math.abs(r.y - ln.y) < Math.abs(best.y - ln.y)) best = r;
      if (Math.abs(best.y - ln.y) > 14) continue;
      for (const t of ln.it) best.parts.push({ y: ln.y, x: t.x, s: t.s });
    }
    for (const r of rows) {
      const it = r.ln.it;
      const nr = it.find(t => t.x > 78 && t.x < 100).s.trim();
      const folder = it.some(t => t.x < 40 && /X/i.test(t.s));
      const all = r.parts.concat(it.map(t => ({ y: r.y, x: t.x, s: t.s }))).sort((a, b) => b.y - a.y || a.x - b.x);
      const naam = all.filter(t => t.x > 120 && t.x < 300).map(t => t.s.trim()).join(' ').replace(/\s+/g, ' ').trim();
      const opm = all.filter(t => t.x > 475).map(t => t.s.trim()).join(' ').replace(/\s+/g, ' ').trim();
      const eh = (it.find(t => t.x > 300 && t.x < 335) || {}).s || '';
      const nums = it.filter(t => t.x > 340 && t.x < 475 && /\d/.test(t.s)).map(t => C.num(t.s));
      items.push({ nr, naam, eh: eh.trim(), van: nums[0] || 0, voor: nums[1] || 0, cap: nums[2] || 0, opm, folder });
    }
  }
  items.forEach(a => { a.dag = C.dagActie(a.opm); });
  return { week, van, tm, items };
};
C.pdfVlakken = async (pdfjs, buf) => {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableFontFace: true, isEvalSupported: false }).promise; const O = pdfjs.OPS; const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pg = await doc.getPage(p); const tc = await pg.getTextContent(); const ol = await pg.getOperatorList();
    const items = tc.items.filter(i => i.str && i.str.trim()).map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5] }));
    const rects = []; let fill = '0,0,0', ctm = [1, 0, 0, 1, 0, 0]; const st = [];
    for (let i = 0; i < ol.fnArray.length; i++) {
      const f = ol.fnArray[i], a = ol.argsArray[i];
      if (f === O.setFillRGBColor) fill = typeof a[0] === 'string' ? a[0] : Array.from(a).join(',');
      else if (f === O.save) st.push(ctm.slice()); else if (f === O.restore) ctm = st.pop() || ctm;
      else if (f === O.transform) { const m = ctm; ctm = [m[0] * a[0] + m[2] * a[1], m[1] * a[0] + m[3] * a[1], m[0] * a[2] + m[2] * a[3], m[1] * a[2] + m[3] * a[3], m[0] * a[4] + m[2] * a[5] + m[4], m[1] * a[4] + m[3] * a[5] + m[5]]; }
      else if (f === O.constructPath) { const ops = a[0], ar = a[1]; let k = 0; for (const op of ops) { if (op === O.rectangle) { rects.push({ x: ctm[0] * ar[k] + ctm[4], y: ctm[3] * ar[k + 1] + ctm[5], w: ar[k + 2] * ctm[0], h: ar[k + 3] * ctm[3], c: fill }); k += 4; } else if (op === O.moveTo || op === O.lineTo) k += 2; else if (op === O.curveTo) k += 6; else if (op === O.curveTo2 || op === O.curveTo3) k += 4; } }
    }
    out.push({ items, rects });
  }
  return out;
};
C.kleurRgb = c => { if (/^#/.test(c)) return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); return String(c).split(',').map(Number); };
C.folderSoort = c => { const [r, g, b] = C.kleurRgb(c); if (r > 240 && g > 240 && b < 60) return 'vers'; if (r < 40 && g > 150 && b > 200) return 'diep'; if (r > 230 && g > 160 && g < 220 && b > 110 && b < 170) return 'brood'; if (r > 180 && g < 110 && b < 110) return 'vers'; return null; };
C.parseFolder = pages => {
  const MND = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  let week = null, van = null, tm = null, thema = ''; const rijen = []; let pag = '';
  for (const pg of pages) {
    const ls = C.lines(pg.items);
    for (const ln of ls) {
      const m = ln.txt.match(/Folderplanning week\s+(\d+)/i); if (m) week = +m[1];
    }
    { const alles = ls.slice(0, 12).map(l => l.txt).join(' '); const g = alles.match(/van\s+\w+\s+(\d+)\s+(\w+)\s+(\d{4})\s+tot en met\s+\w+\s+(\d+)\s+(\w+)\s+(\d{4})/i);
      if (g && !van) { const d = (dd, mm, yy) => `${yy}-${String(MND.indexOf(mm.toLowerCase()) + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`; van = d(g[1], g[2], g[3]); tm = d(g[4], g[5], g[6]); }
    }
    for (const ln of ls) { const t = ln.txt.match(/^Thema\s+(.*)/i); if (t) thema = t[1]; }
    const kop = ls.find(l => /Merk \+ artikelomschrijving/.test(l.txt)); const kopY = kop ? kop.y : 9999;
    const leg = ls.find(l => /^Kruidenierswaren$/.test(l.txt) || /Er wordt voor elke aanbieding/.test(l.txt)); const legY = leg ? leg.y : -1;
    const kol = n => { const it = kop ? kop.it.filter(i => i.s.trim() === n) : []; return it.map(i => i.x); };
    const nx = (kop && (kop.it.find(i => /^Merk/.test(i.s.trim())) || {}).x) || 46.8;
    const X = { variant: (kol('Variant')[0] || 145) - 1, afb: (kol('Afbeelding(en)')[0] || 224) - 1, inhoud: (kol('Inhoud')[0] || 263) - 1, svan: (kol('VAN')[0] || 302) - 1, tekst: (kol('Tekst')[0] || 341) - 1, avan: (kol('VAN')[1] || 366) - 1, cp: (kol('CP')[0] || 401) - 1, cpx: (kol('CP Extra')[0] || 422) - 1, bijz: (kol('Bijzonderheden')[0] || 441) - 1, rp: (kol('RP')[0] || 480) - 1, klein: (kol('Kleine plek')[0] || 486) - 1, groot: (kol('Grote plek')[0] || 504) - 1 };
    const vlak = pg.rects.filter(r => r.w > 200 && r.h > 3.5 && r.h < 120 && r.x > nx - 3 && r.x < nx + 2);
    const marker = pg.rects.filter(r => r.x < nx - 2 && r.x > nx - 14 && r.w > 3 && r.w < 10 && r.h > 3.5 && r.h < 120);
    let cur = null;
    for (const ln of ls) {
      if (ln.y >= kopY - 1 || ln.y <= legY + 1) continue;
      const pgm = ln.txt.match(/^Pg\s*([\d+]+)\s*(.*)$/i); if (pgm) { pag = pgm[1] + (pgm[2] ? ' ' + pgm[2].trim() : ''); cur = null; continue; }
      const naamIt = ln.it.filter(i => i.x >= nx - 1.5 && i.x < X.variant);
      const dagIt = ln.it.filter(i => i.x < nx - 1.5);
      if (naamIt.length) {
        const midY = ln.y + 1; const v = vlak.find(r => midY >= r.y - 0.5 && midY <= r.y + r.h + 0.5); const mk = marker.find(r => midY >= r.y - 0.5 && midY <= r.y + r.h + 0.5);
        cur = { naam: naamIt.map(i => i.s.trim()).join(' '), dag: dagIt.map(i => i.s.trim()).join(''), variant: '', nrs: [], inhoud: '', svan: [], tekst: '', prijs: [], cp: '', cpx: '', bijz: '', rp: '', klein: false, groot: false, pag, soort: v ? (C.folderSoort(v.c) || 'kw') : 'kw', extra: !!(mk && C.kleurRgb(mk.c)[0] > 200 && C.kleurRgb(mk.c)[1] < 60) };
        rijen.push(cur);
      }
      if (!cur) continue;
      for (const i of ln.it) {
        const s = i.s.trim(); if (!s || i.x < X.variant) continue;
        if (i.x < X.afb) cur.variant += (cur.variant ? ' ' : '') + s;
        else if (i.x < X.inhoud) { const n = s.match(/\d{13}|\d{6}/g); if (n) cur.nrs.push(...n); }
        else if (i.x < X.svan) cur.inhoud += (cur.inhoud ? ' ' : '') + s;
        else if (i.x < X.tekst) { if (/\d/.test(s)) cur.svan.push(C.num(s)); }
        else if (i.x < X.avan) cur.tekst += (cur.tekst ? ' ' : '') + s;
        else if (i.x < X.cp) { if (/\d/.test(s)) cur.prijs.push(C.num(s)); }
        else if (i.x < X.bijz) { if (/^\d+,\d{2}$/.test(s)) cur.prijs.push(C.num(s)); else if (/^\d+\s*%$/.test(s)) cur.cp += (cur.cp ? ' ' : '') + s + ' korting'; else cur.cp += (cur.cp ? ' ' : '') + s; }
        else if (i.x < X.rp) cur.bijz += (cur.bijz ? ' ' : '') + s;
        else if (i.x < X.klein) cur.rp += s;
        else if (i.x < X.groot) { if (/x/i.test(s)) cur.klein = true; }
        else if (/x/i.test(s)) cur.groot = true;
      }
    }
  }
  const items = rijen.filter(r => r.naam && !/^Zelfde als vorig jaar/i.test(r.naam)).map((r, i) => {
    const mech = r.cp.replace(/\s+/g, ' ').replace(/korting KORTING/i, 'korting').trim();
    let prijs = r.prijs.filter(x => x > 0), m2 = mech; const pc = prijs.length > 1 && /korting/i.test(mech) ? prijs[prijs.length - 1] : 0; if (pc >= 5 && pc <= 70 && Number.isInteger(pc)) { prijs = prijs.slice(0, -1); m2 = pc + '% korting'; }
    return { id: 'f' + (i + 1), naam: r.naam.replace(/\s+/g, ' '), variant: r.variant, nrs: [...new Set(r.nrs)], inhoud: r.inhoud, streep: r.svan.filter(x => x > 0), prijs, mech: m2, tekst: r.tekst, bijz: r.bijz.replace(/\s+/g, ' '), pag: r.pag, soort: r.soort, extra: r.extra, klein: r.klein, groot: r.groot, dag: r.dag || '' };
  });
  return { week, van, tm, thema, items };
};
C.folderNaarActie = (f, id) => ({ id, week: f.week, van: f.van, tm: f.tm, folder: true, items: f.items.flatMap(it => it.nrs.filter(n => /^\d{6}$/.test(n)).map(nr => ({ nr, naam: it.naam, eh: '', van: it.streep[0] || 0, voor: it.prijs[0] || 0, cap: it.prijs.length === 1 && !/STUKS/i.test(it.mech || '') ? it.prijs[0] : 0, opm: (() => { const st = (it.mech || '').match(/(\d+)\s*STUKS/i); return st && it.prijs.length === 1 ? `${st[1]} voor ${String(it.prijs[0].toFixed(2)).replace('.', ',')}` : it.mech || ''; })(), folder: true, dag: null }))) });
/* ---------- 1.23: voorkooplijst Van Tol ---------- */
C.mooiNaam = s => { s = String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
C.parseVoorkoop = pages => {
  let week = null, uit = null, tot = null, x0 = 130, sec = 'folder', mech = ''; const arts = []; let cur = null;
  const dmy = t => { const m = String(t).match(/(\d{2})\.(\d{2})\.(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
  for (const pg of pages) for (const ln of C.lines(pg)) {
    const txt = ln.txt; const it = ln.it;
    const om = it.find(i => /^Omschrijving$/i.test(i.s.trim())); if (om) { x0 = om.x; continue; }
    if (/PAGINA|ARTNR\.|^EAN\b|klantnummer|^klant:/i.test(txt)) continue;
    { const m = txt.match(/VOORKOOPLIJST:?\s*FOLDER\s*(\d{1,2})/i); if (m) { week = +m[1]; continue; } }
    if (/^Uitlevering/i.test(txt)) { uit = dmy(txt); continue; }
    if (/^Uiterste/i.test(txt)) { tot = dmy(txt); continue; }
    if (/^Bestellen/i.test(txt)) continue;
    const verp = it.find(i => i.x >= x0 + 190 && i.x < x0 + 245 && /^\d+\s+[A-Z]{2}$/.test(i.s.trim()));
    if (verp) {
      const naam = it.filter(i => i.x >= x0 - 8 && i.x < x0 + 150).map(i => i.s.trim()).join(' ');
      const merk = (it.find(i => i.x >= x0 + 150 && i.x < x0 + 190) || {}).s || '';
      cur = { naam, merk: merk.trim(), verp: verp.s.trim(), ean: '', nr: '', cvan: null, cvoor: null, sec, mech }; arts.push(cur); continue;
    }
    if (it[0].x < x0 - 30 && !/^\d{8,14}$/.test(it[0].s.trim())) {
      if (/^Artikelen die op alle/i.test(txt)) { sec = 'folder'; mech = ''; }
      else if (/^Artikelen die alleen/i.test(txt)) { sec = 'instore'; mech = ''; }
      else if (/^Instore\b/i.test(txt)) { sec = 'instore'; mech = ''; }
      else if (!/^overige afnemers/i.test(txt)) mech = txt.replace(/\s*zie info\s*$/i, '').trim();
      continue;
    }
    if (!cur) continue;
    for (const i of it) {
      const s = i.s.trim();
      if (i.x < x0 - 30 && /^\d{8,14}$/.test(s)) { if (!cur.ean) cur.ean = s; continue; }
      if (i.x >= x0 - 8 && i.x < x0 + 40) { if (/^\d{2,7}$/.test(s)) { if (!cur.nr) cur.nr = s.padStart(6, '0'); } else if (!/^\(/.test(s) && !/^[\d.,]+$/.test(s)) cur.naam += ' ' + s; continue; }
      if (i.x >= x0 + 40 && i.x < x0 + 95 && /^\d+,\d{2}$/.test(s) && cur.cvan === null) { cur.cvan = C.num(s); continue; }
      if (i.x >= x0 + 95 && i.x < x0 + 150 && /^\d+,\d{2}$/.test(s) && cur.cvoor === null) { cur.cvoor = C.num(s); continue; }
    }
  }
  if (!week || !arts.length) return null;
  let y = uit ? +uit.slice(0, 4) : C.isoWeek(C.today()).y; if (uit && week < C.isoWeek(uit).w - 20) y++;
  const van = C.mondayOf(y, week);
  const groepen = [];
  for (const a of arts) { const g = groepen[groepen.length - 1]; if (g && g.sec === a.sec && g.mech === a.mech && g.merk === a.merk && g.cvoor === a.cvoor) g.arts.push(a); else groepen.push({ sec: a.sec, mech: a.mech, merk: a.merk, cvoor: a.cvoor, arts: [a] }); }
  const STOP = /^(\d.*|gr\.?|ml\.?|ltr\.?|l|cl\.?|kg|st\.?|x|st|stuks|\+|&|en|de|het|met)$/i;
  const woorden = n => n.toLowerCase().replace(/[^a-zà-ÿ0-9&+%\/ .-]/g, ' ').split(/[\s\/+.]+/).map(w => w.replace(/\.$/, '')).filter(w => w.length >= 3 && !STOP.test(w));
  const items = groepen.map((g, i) => {
    let naam;
    if (g.arts.length === 1) naam = C.mooiNaam(g.arts[0].naam);
    else { const ws = g.arts.map(a => woorden(a.naam)); const gem = ws[0].find(w => ws.every(x => x.includes(w))); const tel = {}; ws.forEach(x => [...new Set(x)].forEach(w => tel[w] = (tel[w] || 0) + 1)); const vaak = Object.keys(tel).sort((a, b) => tel[b] - tel[a])[0]; naam = gem ? `${C.mooiNaam(gem)} · ${g.arts.length} soorten` : vaak && tel[vaak] * 2 >= g.arts.length && g.arts.length > 3 ? `${C.mooiNaam(vaak)} e.a. · ${g.arts.length} soorten` : g.arts.slice(0, g.arts.length === 3 ? 3 : 2).map((a, j) => { const w = woorden(a.naam).slice(0, 2).join(' ') || a.naam; return j ? w : C.mooiNaam(w); }).join(' / ') + (g.arts.length > 3 ? ` +${g.arts.length - 2}` : ''); }
    const nrs = [...new Set(g.arts.flatMap(a => [a.nr, a.ean]).filter(Boolean))];
    return { id: 'v' + (i + 1), naam, variant: g.arts.length > 1 ? g.arts.map(a => C.mooiNaam(a.naam)).join(', ') : '', merk: g.merk, nrs, inhoud: g.arts[0].verp, streep: [...new Set(g.arts.map(a => a.cvan).filter(x => x && x !== g.cvoor))], prijs: g.cvoor ? [g.cvoor] : [], mech: g.mech, bijz: '', pag: '', soort: 'kw', instore: g.sec === 'instore', bron: 'voorkoop', arts: g.arts.map(a => ({ naam: C.mooiNaam(a.naam), nr: a.nr, ean: a.ean, cvan: a.cvan, cvoor: a.cvoor, verp: a.verp })) };
  });
  return { week, van, tm: C.add(van, 6), thema: '', items, bron: 'voorkoop', uitlevering: uit, besteltot: tot };
};
C.parseCollo = pages => { const uit = {}; for (const pg of pages) for (const ln of C.lines(pg)) { const m = ln.txt.match(/^\s*(\d{6})\s+(.+?)\s+(\d+)\s*x\s*([\d.,]+\s*\w*)\s*$/i); if (m) uit[m[1]] = { n: +m[3], inh: m[4].trim(), naam: m[2].trim() }; else { const e = ln.txt.match(/^\s*(\d{6})\s+(.+?)\s+([\d.,]+\s*(?:kg|gr|st|stuks))\s*$/i); if (e) uit[e[1]] = { n: 1, inh: e[3].trim(), naam: e[2].trim() }; } } return uit; };
C.parseLijst = pages => {
  const out = []; const gezien = new Set();
  for (const pg of pages) for (const ln of C.lines(pg)) {
    const m = ln.txt.match(/^(\d{8,14})\s+(\d{1,6})\s+(.+?)\s+€\s*([\d.,]+)\s*$/); if (!m) continue;
    const nr = m[2].padStart(6, '0'); if (gezien.has(nr)) continue; gezien.add(nr);
    out.push({ ean: m[1], nr, naam: m[3].replace(/\s+/g, ' ').trim(), prijs: C.num(m[4]) });
  }
  return out;
};
C.dagActie = opm => { const m = (opm || '').toLowerCase().match(/^(maandag|dinsdag|woensdag|donderd+ag|vrijdag|zaterdag|zondag)/); if (!m) return null; return C.DAGNAAM.indexOf(m[1].replace(/donderd+ag/, 'donderdag')); };
C.actieKorting = (a, cons) => {
  const o = (a.opm || '').toLowerCase();
  if (cons > 0 && a.cap > 0 && a.cap < cons * 0.98) return Math.min(0.8, 1 - a.cap / cons);
  if (/1\s*\+\s*1|2e gratis|tweede gratis/.test(o)) return 0.5;
  if (/2e halve|tweede halve/.test(o)) return 0.25;
  const m = o.match(/(\d+)\s*voor\s*€?\s*([\d.,]+)/);
  if (m && cons > 0) { const p = C.num(m[2]) / +m[1]; if (p < cons) return 1 - p / cons; }
  const pc = o.match(/(\d+)\s*%/); if (pc) return +pc[1] / 100;
  return null;
};

/* ---------- CasPos dag-export ---------- */
C.parseCaspos = (rows, filename) => {
  const m = (filename || '').match(/van_(\d{8})_tm_(\d{8})/i);
  if (!m) throw new Error('Geen datum in de bestandsnaam (verwacht ..._van_jjjjmmdd_tm_jjjjmmdd)');
  if (m[1] !== m[2]) throw new Error('Dit bestand bevat meerdere dagen. Exporteer één dag per bestand.');
  const dag = `${m[2].slice(0, 4)}-${m[2].slice(4, 6)}-${m[2].slice(6)}`;
  const h = (rows[0] || []).map(x => String(x || '').trim().toLowerCase());
  const col = (...names) => h.findIndex(x => names.includes(x));
  const ix = { afd: col('afd'), lev: col('leverancier'), art: col('artikel'), bnr: col('bestelnr.', 'bestelnr', 'bestelnummer'), sg: col('subgr.', 'subgr'), sgo: col('subgroep omschrijving'), o1: col('omschrijving1'), o2: col('omschrijving2'), omzet: col('omzet incl'), aant: col('aantallen', 'aantal'), gew: col('gewicht') };
  if (ix.art < 0 || ix.aant < 0) throw new Error('Kolommen Artikel/Aantallen niet gevonden – is dit een CasPos artikelen-export?');
  const data = {}, meta = {}; let n = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]; if (!row) continue;
    const ean = String(row[ix.art] ?? '').trim(); if (!ean || ean === '0' || /^totaal/i.test(String(row[0] || ''))) continue;
    const q = C.num(row[ix.aant]), g = ix.gew >= 0 ? C.num(row[ix.gew]) : 0, o = ix.omzet >= 0 ? C.num(row[ix.omzet]) : 0;
    const prevQ = data[ean] || [0, 0, 0];
    data[ean] = [C.r(prevQ[0] + q, 3), C.r(prevQ[1] + g, 3), C.r(prevQ[2] + o, 2)];
    let bnr = String(row[ix.bnr] ?? '').trim(); if (/^8{6,}$/.test(bnr)) bnr = '888888'; else bnr = C.nr6(bnr);
    meta[ean] = { b: bnr, l: String(row[ix.lev] ?? '').trim(), a: String(row[ix.afd] ?? '').trim(), s: String(row[ix.sg] ?? '').trim(), so: String(row[ix.sgo] ?? '').trim(), n: String(row[ix.o1] ?? '').trim(), m: String(row[ix.o2] ?? '').trim() };
    n++;
  }
  return { dag, data, meta, n };
};

/* ---------- indeling kassa-artikelen ---------- */
const SKIP_AFD = /emballage|post, tickets|winkelmaterialen|div\. artikelen onbek/i;
C.klasse = k => {
  if (!k) return null;
  if (SKIP_AFD.test(k.a || '')) return null;
  const l = (k.l || '').toLowerCase();
  const bron = /versunie/.test(l) ? 'vers' : /van tol/.test(l) ? 'kw' : null;
  if (bron && !k.b) return null;
  if (bron && k.b === '888888') return { tab: 'overig', soort: 'inout', bron };
  if (bron) return { tab: bron, soort: 'normaal', bron };
  return { tab: 'overig', soort: 'ander', bron: null };
};

/* ---------- feestdagen ---------- */
C.pasen = y => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return `${y}-${pad(mo)}-${pad(da)}`; };
C.feestdagen = y => {
  const p = C.pasen(y); let kd = `${y}-04-27`; if (C.wd(kd) === 6) kd = `${y}-04-26`;
  const l = [[`${y}-01-01`, 'Nieuwjaarsdag'], [C.add(p, -2), 'Goede Vrijdag'], [p, 'Eerste Paasdag'], [C.add(p, 1), 'Tweede Paasdag'], [kd, 'Koningsdag'], [`${y}-05-05`, 'Bevrijdingsdag'], [C.add(p, 39), 'Hemelvaartsdag'], [C.add(p, 49), 'Eerste Pinksterdag'], [C.add(p, 50), 'Tweede Pinksterdag'], [`${y}-12-05`, 'Pakjesavond'], [`${y}-12-24`, 'Kerstavond'], [`${y}-12-25`, 'Eerste Kerstdag'], [`${y}-12-26`, 'Tweede Kerstdag'], [`${y}-12-31`, 'Oudjaarsdag']];
  return l.map(([dag, naam]) => ({ dag, naam }));
};
C.bijzonder = (agenda, from, to) => {
  const m = {}; const y1 = +from.slice(0, 4), y2 = +to.slice(0, 4);
  for (let y = y1; y <= y2 + 1; y++) for (const f of C.feestdagen(y)) { m[f.dag] = { naam: f.naam, soort: 'normaal' }; const v = C.add(f.dag, -1); if (!m[v]) m[v] = { naam: 'Dag voor ' + f.naam, soort: 'normaal', voor: true }; }
  for (const a of agenda || []) m[a.dag] = Object.assign({}, m[a.dag] || {}, { naam: a.naam || (m[a.dag] || {}).naam || 'Bijzondere dag', soort: a.soort || 'normaal', open: a.open, dicht: a.dicht, eigen: true });
  return m;
};
const uren = (o, d) => { if (!o || !d) return 0; const [a, b] = o.split(':').map(Number), [c, e] = d.split(':').map(Number); return Math.max(0, (c * 60 + e - a * 60 - b) / 60); };

/* ---------- standaardinstellingen ---------- */
C.STD = {
  weken: 8, buffer: { vers: 0, kw: 0 }, actieFactor: { folder: 3, instore: 1.5 }, vooraf: true,
  schema: { vers: [{ b: 0, l: 2 }, { b: 2, l: 4 }, { b: 4, l: 0 }], kw: [{ b: 0, l: 2 }, { b: 2, l: 4 }, { b: 3, l: 0 }] },
  open: [['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['', '']],
  he: {}
};
C.settings = s => { const o = JSON.parse(JSON.stringify(C.STD)); if (s) for (const k in s) o[k] = s[k]; return o; };

/* ---------- model ---------- */
C.buildModel = (S) => {
  // S: {dagen:{dag:{ean:[q,g,o]}}, kassa:{ean:meta}, boeken:{vers,kw}, acties:[...], agenda:[], inst, vandaag}
  const st = C.settings(S.inst);
  const vandaag = S.vandaag || C.today();
  const dagLijst = Object.keys(S.dagen).sort();
  const M = { st, vandaag, dagLijst, keys: {}, art: {}, kassa: S.kassa, boeken: S.boeken, onbekend: [], acties: [] };
  if (!dagLijst.length) { M.start = vandaag; } else M.start = dagLijst[0];
  M.N = C.diff(M.start, vandaag) + 1;
  M.heeftData = new Uint8Array(Math.max(M.N, 1)); dagLijst.forEach(d => { const i = C.diff(M.start, d); if (i >= 0 && i < M.N) M.heeftData[i] = 1; });
  // artikelen uit boeken
  for (const bron of ['vers', 'kw']) {
    const b = S.boeken[bron]; if (!b) continue;
    for (const a of b.artikelen) { const key = bron + ':' + a.nr; const ov = st.he[key]; M.art[key] = Object.assign({ key, bron }, a, ov || {}); }
    for (const a of (b.uit || [])) { const key = bron + ':' + a.nr; if (!M.art[key]) M.art[key] = Object.assign({ key, bron, uit: true }, a); }
    for (const nr of (b.nieuw || [])) { const k = bron + ':' + nr; if (M.art[k]) M.art[k].nieuw = true; }
  }
  // eigen artikelen
  const eigenEan = {};
  for (const e of (S.eigen || [])) {
    if (!e || e.weg) continue; const key = 'eigen:' + e.id;
    const zelfde = Object.values(M.art).filter(x => !x.uit && x.groep === e.groep && x.i !== undefined);
    const i = zelfde.length ? Math.max(...zelfde.map(x => x.i)) + 0.001 * (1 + (Object.keys(M.art).length % 997) / 1000) : 1e8;
    M.art[key] = { key, bron: 'eigen', nr: e.id, bst: e.nr || '', naam: e.naam, groep: e.groep || 'Eigen artikelen', eh: e.perHE ? (e.ehNaam || 'HE') : 'ST', perHE: !!e.perHE, he: e.perHE ? (+e.he || 1) : 1, cons: +e.prijs || 0, eigen: true, od: e.od || 'vers', lev: e.lev || 'versunie', ean: e.ean || '', foto: e.foto || '', nieuw: !!e.volgen, i, artNr: e.nr || '' };
    for (const ean of String(e.ean || '').split(/[\s,;]+/).filter(Boolean)) eigenEan[ean] = key;
  }
  // verkoop koppelen
  const eanKey = {}; const koppel = (S.inst && S.inst.koppel) || {}; const negeer = new Set((S.inst && S.inst.negeer) || []);
  for (const ean in eigenEan) eanKey[ean] = { key: eigenEan[ean], kl: { soort: 'eigen', bron: 'eigen' } };
  for (const ean in S.kassa) {
    if (eigenEan[ean]) continue;
    const k = S.kassa[ean]; const kl = C.klasse(k); if (!kl) continue;
    let key;
    if (kl.soort === 'normaal') { key = kl.bron + ':' + k.b; if (!M.art[key] && koppel[key] && M.art[koppel[key]]) key = koppel[key]; if (!M.art[key]) { if (!negeer.has(key)) M.onbekend.push({ ean, ...k, bron: kl.bron }); key = 'o:' + kl.bron + ':' + k.b; } }
    else key = 'e:' + ean;
    eanKey[ean] = { key, kl };
  }
  const ser = M.keys;
  const getK = (key, info) => ser[key] || (ser[key] = { key, q: new Float32Array(M.N), g: new Float32Array(M.N), eans: [], info });
  dagLijst.forEach(d => {
    const i = C.diff(M.start, d); if (i < 0 || i >= M.N) return;
    const data = S.dagen[d];
    for (const ean in data) { const ek = eanKey[ean]; if (!ek) continue; const s = getK(ek.key, ek); s.q[i] += data[ean][0]; s.g[i] += data[ean][1]; if (!s.eans.includes(ean)) s.eans.push(ean); }
  });
  for (const key in ser) {
    const s = ser[key]; let first = -1; for (let i = 0; i < M.N; i++) if (s.q[i] || s.g[i]) { first = i; break; } s.first = first;
    const a = M.art[key];
    const kgMode = a ? (a.kg > 0 || /\bkg\b/i.test(a.eh || '')) && s.g.some(v => v > 0) : (s.g.some(v => v > 0) && s.q.reduce((x, y) => x + y, 0) > 0 && s.g.reduce((x, y) => x + y, 0) / s.q.reduce((x, y) => x + y, 0) > 0.1 && false);
    s.kg = !!kgMode; s.v = s.kg ? s.g : s.q;
  }
  // bijzondere dagen
  M.bijz = C.bijzonder(S.agenda, M.start, C.add(vandaag, 60));
  // acties -> per artikel periodes
  M.actieArt = {};
  for (const ac of (S.acties || [])) {
    const mon = C.mondayOf(+(ac.van || vandaag).slice(0, 4) + ((ac.week < 10 && (ac.van || '').slice(5, 7) === '12') ? 1 : 0), ac.week);
    const per = { id: ac.id, week: ac.week, van: ac.van, tm: ac.tm, mon, zon: C.add(mon, 6) };
    M.acties.push(per);
    for (const it of ac.items) {
      const key = M.art['vers:' + it.nr] ? 'vers:' + it.nr : M.art['kw:' + it.nr] ? 'kw:' + it.nr : null; if (!key) continue;
      const a = M.art[key];
      const disc = C.actieKorting(it, a.cons) ?? 0.25;
      (M.actieArt[key] = M.actieArt[key] || []).push(Object.assign({}, per, { folder: it.folder, cap: it.cap, opm: it.opm, dag: it.dag, disc, plekF: it.plekF, plek: it.plek }));
    }
  }
  // feestdag-effecten leren (winkeltotaal)
  const tot = new Float32Array(M.N); for (const k in ser) { const s = ser[k]; for (let i = 0; i < M.N; i++) tot[i] += s.q[i]; }
  M.tot = tot;
  const normaal = i => M.heeftData[i] && !M.bijz[C.add(M.start, i)];
  M.effect = {};
  for (const d in M.bijz) {
    const i = C.diff(M.start, d); if (i < 0 || i >= M.N || !M.heeftData[i]) continue;
    const vals = []; for (const off of [-28, -21, -14, -7, 7, 14, 21, 28]) { const j = i + off; if (j >= 0 && j < M.N && normaal(j)) vals.push(tot[j]); }
    if (vals.length < 2) continue; const base = vals.reduce((a, b) => a + b, 0) / vals.length; if (!base) continue;
    const naam = M.bijz[d].naam; (M.effect[naam] = M.effect[naam] || []).push({ dag: d, r: tot[i] / base });
  }
  // actie-effecten leren
  M.slope = { folder: [], instore: [] };
  for (const key in M.actieArt) {
    const s = ser[key]; if (!s) continue;
    for (const p of M.actieArt[key]) {
      if (p.zon >= vandaag) continue;
      const r = C.actieRatio(M, key, p); if (r === null) continue; p.r = r;
      if (p.disc > 0.05) M.slope[p.folder ? 'folder' : 'instore'].push((r - 1) / p.disc);
    }
  }
  const med = a => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  M.slopeF = M.slope.folder.length >= 5 ? med(M.slope.folder) : (st.actieFactor.folder - 1) / 0.5;
  M.slopeI = M.slope.instore.length >= 5 ? med(M.slope.instore) : (st.actieFactor.instore - 1) / 0.5;
  return M;
};
C.idx = (M, d) => C.diff(M.start, d);
C.actieOp = (M, key, d) => { const l = M.actieArt[key]; if (!l) return null; for (const p of l) { if (d >= p.mon && d <= p.zon && (p.dag === null || p.dag === undefined || C.wd(d) === p.dag)) return p; } return null; };
C.actieRatio = (M, key, p) => {
  const s = M.keys[key]; let act = 0, base = 0, n = 0;
  for (let d = p.mon; d <= p.zon; d = C.add(d, 1)) {
    if (p.dag !== null && p.dag !== undefined && C.wd(d) !== p.dag) continue;
    const i = C.idx(M, d); if (i < 0 || i >= M.N || !M.heeftData[i]) continue;
    const b = C.basis(M, key, C.wd(d), d); if (b === null) continue; act += s.v[i]; base += b; n++;
  }
  if (n < (p.dag !== null && p.dag !== undefined ? 1 : 3) || base < 0.5) return null; return act / base;
};
// basis per weekdag: gemiddelde van laatste W gelijke weekdagen vóór 'voor', zonder acties/bijzondere dagen
C.basis = (M, key, wd, voor, wekenOverride) => {
  const s = M.keys[key]; if (!s) return M.startBasis ? M.startBasis(key, wd) : 0; const W = wekenOverride || M.st.weken;
  const cacheK = wd + '|' + voor + '|' + W; s.bc = s.bc || {}; if (cacheK in s.bc) return s.bc[cacheK];
  let i = C.idx(M, voor) - 1; while (i >= 0 && ((C.wd(C.add(M.start, i))) !== wd)) i--;
  const vals = []; let guard = 0;
  for (; i >= 0 && vals.length < W && guard < W * 3; i -= 7, guard++) {
    if (!M.heeftData[i]) continue; const d = C.add(M.start, i);
    if (s.first >= 0 && i < s.first) break;
    if (M.bijz[d] || C.actieOp(M, key, d) || (s.leeg && s.leeg.has(i))) continue;
    vals.push(s.v[i]);
  }
  let res;
  if (!vals.length) res = s.first >= 0 ? null : (M.startBasis ? M.startBasis(key, wd) : 0);
  else { const v = vals.slice().sort((a, b) => a - b); const t = v.length >= 6 ? v.slice(1, -1) : v; res = t.reduce((a, b) => a + b, 0) / t.length; }
  s.bc[cacheK] = res; return res;
};
C.dagFactor = (M, d) => {
  const bz = M.bijz[d]; const wd = C.wd(d); const o = M.st.open[wd] || ['', ''];
  const normUren = uren(o[0], o[1]);
  if (!bz) return 1;
  if (bz.soort === 'gesloten') return 0;
  const hist = (M.effect[bz.naam] || []).filter(e => e.dag < d);
  if (hist.length) return hist.reduce((a, e) => a + e.r, 0) / hist.length;
  if (bz.soort === 'aangepast' && normUren) return Math.min(1.5, uren(bz.open, bz.dicht) / normUren);
  return 1;
};
C.verwacht = (M, key, d) => {
  const ref = d <= M.vandaag ? d : M.vandaag;
  let b = C.basis(M, key, C.wd(d), ref); if (b === null) b = 0;
  let f = b * C.dagFactor(M, d);
  const p = C.actieOp(M, key, d);
  if (p) f *= C.actieUplift(M, key, p) * (p.plekF > 0 ? p.plekF : 1);
  if (M.weerFactor && d > M.vandaag) f *= M.weerFactor(key, d);
  return f;
};
C.actieUplift = (M, key, p) => {
  const prev = (M.actieArt[key] || []).filter(x => x.zon < p.mon && x.r != null).sort((a, b) => a.mon < b.mon ? 1 : -1)[0];
  let u;
  if (prev && prev.disc > 0.05) u = 1 + (prev.r - 1) * (p.disc / prev.disc);
  else u = 1 + (p.folder ? M.slopeF : M.slopeI) * p.disc;
  return Math.max(1, Math.min(8, u));
};
// leveringen voor een besteldag
C.levering = (M, bron, besteldag) => {
  const sch = M.st.schema[bron] || M.st.schema.vers || []; const wd = C.wd(besteldag);
  const r = sch.find(x => x.b === wd); if (!r) return null;
  let L = C.add(besteldag, 1); while (C.wd(L) !== r.l) L = C.add(L, 1);
  const lev = sch.map(x => x.l);
  let L2 = C.add(L, 1); while (!lev.includes(C.wd(L2))) L2 = C.add(L2, 1);
  let P = C.add(L, -1); while (!lev.includes(C.wd(P))) P = C.add(P, -1);
  return { besteldag, L, L2, P };
};
C.besteldagen = (M, bron, n = 4) => {
  const sch = M.st.schema[bron] || M.st.schema.vers || []; const out = []; let d = M.vandaag;
  for (let k = 0; k < 21 && out.length < n; k++, d = C.add(d, 1)) if (sch.some(x => x.b === C.wd(d))) out.push(C.levering(M, bron, d));
  return out;
};
C.dekking = (M, key, lv) => {
  const days = []; for (let d = lv.L; d < lv.L2; d = C.add(d, 1)) days.push(d);
  if (M.st.vooraf && M.actieArt[key]) {
    for (const p of M.actieArt[key]) {
      if (p.dag !== null && p.dag !== undefined) continue;
      if (lv.L < p.mon && lv.L2 === p.mon && lv.L >= (p.van || lv.L)) days.push(p.mon);
      if (lv.L === p.mon && lv.P >= (p.van || lv.P) && lv.P < p.mon) { const i = days.indexOf(p.mon); if (i >= 0) days.splice(i, 1); }
    }
  }
  return days;
};
C.advies = (M, key, lv, voorraad, bestellingen) => {
  const a = M.art[key]; const he = (a && a.perHE && a.he > 0) ? a.he : 1;
  let days = C.dekking(M, key, lv); const H = M.houdb ? M.houdb(key) : null; let houdb = 0;
  if (H && days.length > H) { days = days.slice(0, H); houdb = H; }
  let need = 0, zw = 0; for (const d of days) { const v = C.verwacht(M, key, d); need += v; const w = M.weerFactor && d > M.vandaag ? M.weerFactor(key, d) : 1; zw += w ? v / w : v; }
  const weer = zw > 0 ? need / zw - 1 : 0;
  const buf = (M.st.buffer[a ? a.bron : 'vers'] || 0) / 100; need *= 1 + buf;
  const leegN = M.leegN ? M.leegN[key] || 0 : 0; let leegBoost = 0; if (leegN >= 2) { leegBoost = Math.min(0.25, 0.075 * leegN); need *= 1 + leegBoost; }
  let derv = 0, dervKorting = 0;
  if (M.derv && M.derv[key] > 0) { derv = M.derv[key]; const sk = M.keys[key]; let v28 = 0; if (sk) for (let i = Math.max(0, M.N - 28); i < M.N; i++) v28 += sk.v[i]; const ratio = derv / (v28 + derv); if (ratio > 0.05) { dervKorting = Math.min(0.25, ratio * 0.5); need *= 1 - dervKorting; } }
  let stock = null;
  if (voorraad && voorraad.dag && C.diff(voorraad.dag, M.vandaag) <= 7) {
    stock = voorraad.aantal;
    for (let d = voorraad.dag; d < lv.L; d = C.add(d, 1)) stock -= C.verwacht(M, key, d) * (d === voorraad.dag ? 0.5 : 1);
    for (const b of bestellingen || []) if (b.lever > voorraad.dag && b.lever < lv.L) stock += b.aantal * he;
  }
  const min = M.min && M.min[key] > 0 ? +M.min[key] : 0;
  const netto = stock !== null ? Math.max(0, need + min - Math.max(0, stock)) : Math.max(need, min);
  const x = netto / he;
  const adv = x < 0.3 ? 0 : (a && a.perHE ? Math.max(1, Math.round(x)) : Math.max(1, Math.round(x)));
  return { need, stock, netto, adv, he, min, derv, dervKorting, perHE: !!(a && a.perHE), days, kg: !!(M.keys[key] && M.keys[key].kg), weer, houdb, leegN, leegBoost, start: (!M.keys[key] || M.keys[key].first < 0) && !!M.startBasis && need > 0 };
};
// weekoverzicht: laatste 3 volle weken + lopende week + Gd
C.weekTabel = (M, key) => {
  const s = M.keys[key]; const mon = C.monday(M.vandaag);
  const rows = [];
  for (let w = 3; w >= 0; w--) {
    const m = C.add(mon, -7 * w); const r = { week: C.isoWeek(m).w, cells: [] };
    for (let d = 0; d < 7; d++) {
      const dag = C.add(m, d); const i = C.idx(M, dag);
      const v = (s && i >= 0 && i < M.N && M.heeftData[i] && dag <= M.vandaag) ? s.v[i] : null;
      r.cells.push({ v, actie: !!C.actieOp(M, key, dag), dag, bijz: !!M.bijz[dag] });
    }
    rows.push(r);
  }
  const gd = []; for (let d = 0; d < 7; d++) { const b = s ? C.basis(M, key, d, M.vandaag) : 0; gd.push(b === null ? 0 : b); }
  return { rows, gd, gwt: gd.reduce((a, b) => a + b, 0) };
};
C.actieLabel = (M, key) => {
  const l = M.actieArt[key]; if (!l) return null; const mon = C.monday(M.vandaag); const res = [];
  for (const p of l) {
    const t = p.mon === mon ? 'deze' : p.mon === C.add(mon, -7) ? 'vorige' : p.mon === C.add(mon, 7) ? 'volgende' : null;
    if (t) res.push({ t, folder: p.folder, opm: p.opm, cap: p.cap, dag: p.dag, disc: p.disc });
  }
  const order = { deze: 0, volgende: 1, vorige: 2 }; res.sort((a, b) => order[a.t] - order[b.t]);
  return res.length ? res : null;
};
// in/out en andere leveranciers
C.overig = (M, key, io) => {
  const s = M.keys[key]; const out = { totaal: 0, start: null, perDag: 0, rest: null, dagenOp: null, melding: null };
  if (!s || s.first < 0) return out;
  const start = io && io.start ? io.start : C.add(M.start, s.first); out.start = start;
  let tot = 0; for (let i = Math.max(0, C.idx(M, start)); i < M.N; i++) tot += s.v[i]; out.totaal = tot;
  let n = 0, sum = 0; for (let i = M.N - 1; i >= 0 && n < 7; i--) if (M.heeftData[i]) { sum += s.v[i]; n++; } out.perDag = n ? sum / n : 0;
  if (io && io.ingekocht > 0) {
    out.rest = io.ingekocht - tot; out.dagenOp = out.perDag > 0 ? out.rest / out.perDag : null;
    const dagenTotEind = io.eind ? C.diff(M.vandaag, io.eind) : null;
    if (out.rest <= 0) out.melding = { t: 'op', txt: 'Op – telefonisch bijbestellen?' };
    else if (dagenTotEind !== null && out.dagenOp !== null && out.dagenOp < dagenTotEind) out.melding = { t: 'op', txt: `Bijna op (nog ±${Math.floor(out.dagenOp)} dagen) – telefonisch bijbestellen?` };
    else if (dagenTotEind === null && out.dagenOp !== null && out.dagenOp < 3) out.melding = { t: 'op', txt: `Bijna op (nog ±${Math.floor(out.dagenOp)} dagen) – telefonisch bijbestellen?` };
    else if (dagenTotEind !== null && dagenTotEind <= 7 && out.rest > out.perDag * Math.max(1, dagenTotEind) * 1.3) out.melding = { t: 'veel', txt: `Te veel (±${Math.round(out.rest - out.perDag * dagenTotEind)} over) – afprijzen?` };
  }
  return out;
};
// assortiment vergelijken
C.vergelijk = (oud, nieuw, ok) => {
  const o = new Map((oud ? oud.artikelen : []).map(a => [a.nr, a])); const n = new Set(nieuw.artikelen.map(a => a.nr));
  const nieuwL = oud ? nieuw.artikelen.filter(a => !o.has(a.nr)).map(a => a.nr) : [];
  const uit = [];
  if (oud) { for (const a of oud.artikelen) if (!n.has(a.nr)) uit.push(Object.assign({}, a, { uitSinds: nieuw.datum || null })); for (const a of (oud.uit || [])) if (!n.has(a.nr) && !uit.some(x => x.nr === a.nr) && !(ok && ok.has(nieuw.bron + ':' + a.nr))) uit.push(a); }
  return { nieuw: nieuwL, uit };
};

/* ---------- onderdelen van het Versunie-boek ---------- */
C.standaardOnderdelen = groepen => {
  const m = {}; let cur = 'agf'; const naarVers = /^panklare|rauwkost|maaltijdsalade|fruitsalade/i;
  const uniek = []; for (const g of groepen) if (!uniek.includes(g)) uniek.push(g);
  for (const g of uniek) {
    const l = g.toLowerCase();
    if (/^melk en karnemelk|^zuivel/.test(l)) cur = 'vers';
    else if (/^groot brood/.test(l)) cur = 'brood';
    else if (cur === 'brood' && /^(groenten|fruit|pizza|vis|frites|room en waterijs|schepijs|handijs)$/.test(l)) cur = 'diep';
    else if (cur === 'diep' && /dierenvoeding|grootverbruik/.test(l)) cur = 'vers';
    m[g] = cur === 'agf' && naarVers.test(l) ? 'vers' : cur;
  }
  return m;
};

/* ---------- Code128 (B) als SVG ---------- */
const C128 = ['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112'];
C.barcode = (txt, h = 34) => {
  txt = String(txt); const codes = [104]; for (const ch of txt) codes.push(ch.charCodeAt(0) - 32);
  let sum = 104; for (let i = 1; i < codes.length; i++) sum += codes[i] * i; codes.push(sum % 103); codes.push(106);
  let x = 10, bars = '';
  for (const c of codes) { const p = C128[c]; for (let i = 0; i < p.length; i++) { const w = +p[i]; if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="${h}"/>`; x += w; } }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + 10} ${h}" preserveAspectRatio="none" class="bc">${bars}</svg>`;
};

/* ---------- MSI Plessey met twee controlecijfers (mod 10/10), zoals in de bestelboeken ---------- */
C.mod10 = s => { let t = 0; [...String(s)].reverse().forEach((c, i) => { let d = +c; if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; } t += d; }); return String((10 - t % 10) % 10); };
C.msiCode = nr => { const s = String(nr).replace(/\D/g, ''); if (!s) return ''; const c1 = C.mod10(s); return s + c1 + C.mod10(s + c1); };
C.msi = (nr, h = 40, tekst = true) => {
  const code = C.msiCode(nr); if (!code) return '';
  const N = 3, B = 8, P = N + B; let x = 12, bars = '';
  const bar = (breed) => { const w = breed ? B : N; bars += `<rect x="${x}" y="0" width="${w}" height="${h}"/>`; x += P; };
  bar(true);
  for (const ch of code) { const d = +ch; for (let k = 3; k >= 0; k--) bar(((d >> k) & 1) === 1); }
  bar(false); bars += `<rect x="${x}" y="0" width="${N}" height="${h}"/>`; x += N + 12;
  const th = tekst ? 14 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} ${h + th}" class="msi">${bars}${tekst ? `<text x="${x / 2}" y="${h + th - 1}" font-size="13" text-anchor="middle" font-family="Arial,sans-serif">${String(nr)}</text>` : ''}</svg>`;
};

root.C = C;
if (typeof module !== 'undefined') module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
