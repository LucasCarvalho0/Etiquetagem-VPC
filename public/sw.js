// Service Worker — Sistema QR → Código de Barras (VPC)
const CACHE_NAME = "qr-barcode-vpc-v1";
const APP_SHELL = ["/", "/login", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((c) => c !== CACHE_NAME).map((c) => caches.delete(c)))
    )
  );
  self.clients.claim();
});

// Network-first para API e navegação; cache-first para estáticos.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return; // nunca cachear API (dados sempre frescos)

  event.respondWith(
    caches.match(request).then((cacheado) => {
      const fetchPromise = fetch(request)
        .then((resposta) => {
          if (resposta.ok) {
            const clone = resposta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return resposta;
        })
        .catch(() => cacheado);
      return cacheado || fetchPromise;
    })
  );
});
