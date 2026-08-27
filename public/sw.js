const CACHE_NAME = 'ege-vinyl-v1.2.0';
const AUDIO_CACHE_NAME = 'ege-vinyl-audio-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old static caches while keeping AUDIO_CACHE_NAME untouched
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== AUDIO_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — Intercept requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Intercept offline audio and offline image requests from Cache API
  if (url.pathname.startsWith('/offline-audio/') || url.pathname.startsWith('/offline-image/')) {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then(async (cache) => {
        const match = await cache.match(url.pathname);
        if (match) return match;
        return new Response('Not found in offline audio cache', { status: 404 });
      })
    );
    return;
  }

  // Skip caching Vite dev server files, hot-reload, source files and node_modules
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@') ||
    url.search.includes('v=') ||
    url.search.includes('import') ||
    url.search.includes('t=')
  ) {
    return;
  }

  // HTML or same-origin Navigation requests — strictly Network-First with Cache fallback
  const isHtmlRequest = request.headers.get('accept')?.includes('text/html') || 
                        url.pathname === '/' || 
                        url.pathname === '/index.html' ||
                        request.mode === 'navigate';

  if (isHtmlRequest && url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // Audio API download requests
  if (url.pathname.startsWith('/api/audio-download') || url.pathname.startsWith('/api/stream')) {
    event.respondWith(
      fetch(request).catch(async () => {
        const id = url.searchParams.get('id') || url.searchParams.get('videoId');
        if (id) {
          const cache = await caches.open(AUDIO_CACHE_NAME);
          const cached = await cache.match(`/offline-audio/${id}`);
          if (cached) return cached;
        }
        return new Response('Offline audio not available', { status: 503 });
      })
    );
    return;
  }

  // Generic APIs — network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Static assets — cache first with network update
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Silent fallback for images/assets
        return new Response('', { status: 408 });
      });
    })
  );
});
