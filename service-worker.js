// Service Worker priekš "Mūsu Ģimenes Uzdevumi"
// Ļauj lietotnei ielādēties arī bez interneta (pamata izskats un darbība).
// Datu sinhronizācija (Firestore) prasa internetu, bet pati lietotne atveras vienmēr.

const CACHE_VERSION = "v1.0.1";
const CACHE_NAME = "gimenes-uzdevumi-" + CACHE_VERSION;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/db.js",
  "./js/tasks.js",
  "./js/learning.js",
  "./js/shop.js",
  "./js/parent.js",
  "./js/stats.js",
  "./js/firebase-config.js",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Neko nekešojam no Firebase/Google API pieprasījumiem - tiem vienmēr jāiet uz tīklu.
  if (req.url.includes("googleapis.com") || req.url.includes("firebaseio.com") || req.url.includes("gstatic.com")) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
