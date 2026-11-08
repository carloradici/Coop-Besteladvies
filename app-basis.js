const VERSIE = '1.31';
const VAPID_PUB = 'BOChxPqkP4LeLJb1ALruz2OGohK0RhAU2neR_tluJxKv6A85Snt5-e6hhmMZKdGTddp0aXpxcer8vqLOiyWIHYU';
const SB_URL = 'https://qgrexmttlceegavnkmkx.supabase.co';
const SB_KEY = 'sb_publishable_X_oyYWBNmGl1_tMI-R3wnw_LAi45_me';
const LIB = {
  pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfw: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  zxing: 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js',
  h2c: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
};
const DEMO = !!window.DEMO_DATA;
const LOGO = 'data:image/png;base64,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';
const $ = (s, el = document) => el.querySelector(s);
const ask = m => DEMO ? true : confirm(m);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- opslag (IndexedDB met fallback) ---------- */
const mem = {};
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise(res => {
    try {
      const r = indexedDB.open('coop-besteladvies', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
  return dbp;
}
async function iget(k) { const d = await db(); if (!d) return mem[k]; return new Promise(res => { try { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(mem[k]); } catch (e) { res(mem[k]); } }); }
async function iset(k, v) { mem[k] = v; const d = await db(); if (!d) return; return new Promise(res => { try { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = res; } catch (e) { res(); } }); }
async function idel(k) { delete mem[k]; const d = await db(); if (!d) return; return new Promise(res => { try { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = res; t.onerror = res; } catch (e) { res(); } }); }
const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };

/* ---------- Supabase ---------- */
let sess = ls.get('cba-sess');
async function authCall(grant, body) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=${grant}`, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.msg || j.message || 'Inloggen mislukt');
  sess = { at: j.access_token, rt: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, email: (j.user && j.user.email) || body.email || (sess && sess.email) || '', kind: grant === 'refresh_token' ? (sess && sess.kind) || 'email' : 'email' };
  ls.set('cba-sess', sess); return sess;
}
async function anoniem() {
  const r = await fetch(`${SB_URL}/auth/v1/signup`, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: {} }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(/anonymous/i.test(j.msg || j.message || '') ? 'Koppelen staat nog niet aan in Supabase (anoniem inloggen).' : (j.msg || j.message || 'Koppelen mislukt'));
  sess = { at: j.access_token, rt: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, email: '', kind: 'anon' };
  ls.set('cba-sess', sess); return sess;
}
const rpc = (fn, body) => rest('rpc/' + fn, { method: 'POST', body: body || {} });
async function token() {
  if (!sess) throw new Error('niet ingelogd');
  if (Date.now() > sess.exp - 60000) await authCall('refresh_token', { refresh_token: sess.rt });
  return sess.at;
}
async function rest(path, opt = {}) {
  const h = { apikey: SB_KEY, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' };
  Object.assign(h, opt.headers || {});
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { method: opt.method || 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined });
  if (!r.ok) { const t = await r.text(); throw new Error(`${r.status}: ${t.slice(0, 200)}`); }
  if (r.status === 204 || opt.noBody) return null;
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
async function getAll(path) {
  const out = []; let from = 0; const step = 1000;
  for (;;) { const part = await rest(path, { headers: { 'Range-Unit': 'items', Range: `${from}-${from + step - 1}` } }); out.push(...part); if (part.length < step) break; from += step; }
  return out;
}
const upsert = (table, rows, conflict) => rest(`${table}?on_conflict=${conflict}`, { method: 'POST', body: rows, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, noBody: true });
const remove = (table, q) => rest(`${table}?${q}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' }, noBody: true });
const PK = { push_abos: 'endpoint', voorraad: 'winkel_id,bron,nr', bestellingen: 'winkel_id,bron,nr,besteldag', schap_ok: 'winkel_id,bron,nr', inout: 'winkel_id,ean', instellingen: 'winkel_id', agenda: 'winkel_id,dag', kassa: 'winkel_id,ean', dagverkoop: 'winkel_id,dag', boeken: 'winkel_id,bron', acties: 'winkel_id,id', assortiment: 'winkel_id,bron,nr', notities: 'winkel_id,sleutel', voorkeuren: 'winkel_id,wie', eigen_artikelen: 'winkel_id,id', schap_min: 'winkel_id,bron,nr', overdracht: 'winkel_id,id', levercheck: 'winkel_id,bron,nr,lever', derving: 'winkel_id,id', prijs_ok: 'winkel_id,bron,nr', tafels: 'winkel_id,id', tafel_indeling: 'winkel_id,week,tafel_id', leeg: 'winkel_id,bron,nr,dag', kw_acties: 'winkel_id,week', activiteit: null };
let W = ls.get('cba-w'); let WINKEL = null; let winkels = []; let eigenaar = false; let OEFEN = false;
let OPEN = false; let VERS_IN = false; let kiestBestand = false; let verborgen = 0;
const isMail = () => !!(sess && sess.kind === 'email');
const wq = p => p + (p.includes('?') ? '&' : '?') + 'winkel_id=eq.' + W;
const metW = rows => rows.map(r => Object.assign({ winkel_id: W }, r));
const upW = (t, rows) => upsert(t, metW(rows), PK[t]);

/* ---------- toestand ---------- */
const S = { leeg: {}, kwplan: {}, dagen: {}, dagMeta: {}, kassa: {}, boeken: {}, acties: [], agenda: [], inst: null, voorraad: {}, bestel: {}, schapOk: new Set(), inout: {}, medewerkers: [], winkel: null, assort: {}, notities: {}, act: [], pref: {}, eigen: {}, min: {}, overdracht: {}, lever: {}, derving: {}, prijsOk: {}, tafels: {}, indeling: {} };
let mw = ls.get('cba-mw');
let M = null;
let rol = 'winkel';
let online = navigator.onLine;
let outbox = [];
const ui = Object.assign({ tab: 'home', fOpen: false, bd: {}, q: '', groep: '', fAdv: false, fActie: false, fAlles: false }, ls.get('cba-ui') || {});
ui.q = ''; ui.tab = 'home'; const saveUi = () => ls.set('cba-ui', { fAdv: ui.fAdv, fActie: ui.fActie, fAlles: ui.fAlles, fOpen: ui.fOpen });

function toast(t, ms = 2600) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), ms); }
