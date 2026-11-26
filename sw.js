// Service worker: simpan fail app supaya boleh guna tanpa internet.
// Tukar nombor versi ini setiap kali anda kemas kini fail app.
const VERSION = "skl-pb-v3";
const ASSETS = [
  "./", "./index.html", "./styles.css", "./app.js", "./config.js", "./manifest.json",
  "./frames/ungu_potret.webp", "./frames/ungu_landskap.webp",
  "./frames/biru_potret.webp", "./frames/biru_landskap.webp",
  "./icons/logo.png", "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                       // upload ke Drive tak disentuh
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // config.js & halaman utama: cuba internet dulu (supaya perubahan link cepat sampai)
  const networkFirst = req.mode === "navigate" || url.pathname.endsWith("/config.js");
  if (networkFirst) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
    );
    return;
  }
  // Fail lain: ambil dari simpanan, kemas kini di belakang tabir
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
