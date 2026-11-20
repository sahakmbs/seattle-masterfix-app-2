// Seattle MasterFix app service worker: caches the app shell so it opens
// offline. It never caches Supabase or Formspree traffic (job data, logins).
const CACHE = "smf-shell-v2";
const BASE = self.registration.scope;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([BASE, `${BASE}manifest.webmanifest`, `${BASE}logo-192.png`])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin || !url.href.startsWith(BASE)) return;
  if (e.request.mode === "navigate") {
    // Network first for the page, fall back to the cached shell offline.
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(BASE, copy)); return r; }).catch(() => caches.match(BASE)));
    return;
  }
  if (url.pathname.includes("/assets/")) {
    // Hashed build files never change: cache first.
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })));
  }
});
