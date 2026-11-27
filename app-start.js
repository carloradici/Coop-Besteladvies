/* ---------- start ---------- */
(f => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', f) : setTimeout(f))(() => {
  if ('serviceWorker' in navigator && !DEMO && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  if (DEMO) return showLogin();
  if (sess) start(); else showLogin();
});
window.__cba = { S, get M() { return M; }, ui, render, rebuild, meer: id => { const x = meerItems().find(y => y.id === id); if (x) x.go(); }, naar: sec => naarBeheer(sec), boArts: () => boArts().map(a => [a.key, a.naam]), hulpSleutel: () => hulpSleutel(), hulpHeeft: () => !!HULP[hulpSleutel()], t: { schoon, wisLokaal, DEMO_MW, pinZwak, xlsxRijen, boHaal: () => boHaal(true), upd: v => { nieuweVersie = v; toonUpdateBalk(); }, updOpen, vrVan, restant, weerModel, ontbrekend, C, boekArch, boekArchHaal, onbekendLijst, pdfjs, gmWaarde, belItemsBasis } };
// 2.20: plek-label met actieweek opent de actieplanning van die week
document.addEventListener('click', e => { const b = e.target.closest('[data-kwwk]'); if (!b) return; e.stopPropagation(); e.preventDefault(); const w = b.dataset.kwwk; if ((S.kwplan || {})[w]) { ui.kwWeek = w; ui.kwSel = null; ga('kwacties'); } else { ui.tafelWeek = w; ui.versStap = null; ga('tafels'); } }, true);
