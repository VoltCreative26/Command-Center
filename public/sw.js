const CACHE = 'volt-cc-v1'
const STATIC_EXTS = /\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ttf)(\?.*)?$/

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== location.origin) return

  if (STATIC_EXTS.test(url.pathname)) {
    // Cache-first for static assets
    e.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
          return res
        })
      )
    )
  } else {
    // Network-first for HTML / API
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (request.headers.get('accept')?.includes('text/html')) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(request, clone))
          }
          return res
        })
        .catch(() => caches.match(request))
    )
  }
})
