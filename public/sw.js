// Minimal offline-first service worker for the Mnemo PWA shell.
const CACHE = "mnemo-shell-v1"
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  // Network-first for navigations so updates are picked up, falling back to cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")))
    return
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)))
})
