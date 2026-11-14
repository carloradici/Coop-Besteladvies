const V = 'cba-1.54';
const APP = ['style.css', 'qrcode.min.js', 'rekenkern.js', 'app-basis.js', 'app-sync.js', 'app-login.js', 'app-home.js', 'app-deadlines.js', 'app-beheer.js', 'app-uploaden.js', 'app-pdf-print.js', 'app-extra.js', 'app-advies.js', 'app-acties.js', 'app-plekken.js', 'app-voorkoop.js', 'app-overig.js', 'app-brood.js', 'app-route.js', 'app-kantoor.js', 'app-start.js'].map(f => './' + f + '?b=' + V.split('-')[1]);
const SHELL = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png', ...APP];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname.endsWith('supabase.co')) return;
  if (u.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(caches.open(V).then(c => c.match(e.request).then(r => r || fetch(e.request).then(n => { c.put(e.request, n.clone()); return n; }))));
    return;
  }
  if (u.pathname.endsWith('version.json')) return;
  if (u.origin === location.origin) {
    e.respondWith(fetch(e.request).then(n => { const cl = n.clone(); caches.open(V).then(c => c.put(e.request, cl)); return n; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
  }
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch (x) { d = { titel: 'Besteladvies', tekst: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titel || 'Besteladvies', { body: d.tekst || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || undefined, data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => { for (const c of l) if ('focus' in c) return c.focus(); return clients.openWindow(e.notification.data && e.notification.data.url || './'); }));
});
