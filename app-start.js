/* ---------- start ---------- */
(f => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', f) : setTimeout(f))(() => {
  if ('serviceWorker' in navigator && !DEMO && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  if (DEMO) return showLogin();
  if (sess) start(); else showLogin();
});
window.__cba = { S, get M() { return M; }, ui, render, rebuild, meer: id => { const x = meerItems().find(y => y.id === id); if (x) x.go(); }, naar: sec => naarBeheer(sec), boArts: () => boArts().map(a => [a.key, a.naam]), hulpSleutel: () => hulpSleutel(), hulpHeeft: () => !!HULP[hulpSleutel()], t: { vrVan, restant, weerModel, ontbrekend, C } };
