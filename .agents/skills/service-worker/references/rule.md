# Register a service worker for caching and offline support

> A service worker is registered to intercept network requests, cache critical assets, and enable offline functionality for your web application.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 60 min

---
A service worker is a JavaScript file that runs in a background thread separate from the main page. It can intercept every network request the page makes and decide whether to serve a cached response, fetch from the network, or do both.

## Code Example

```
Registration → Download → Install (pre-cache) → Activate (cleanup) → Fetch (intercept)
```

Each time the service worker file changes, the browser downloads the new version, runs its `install` event, and waits until all pages controlled by the old version are closed before running `activate`.

## Why It Matters

Service workers act as a programmable network proxy between the browser and the network. They eliminate repeated server round-trips for static assets, cut load times on repeat visits by 50–90 %, and allow the app to function at all on flaky or offline networks — which is critical for users on mobile or low-bandwidth connections.

## Basic Registration

Register the service worker as early as possible — typically in your main entry file:

```typescript
// main.ts (or _app.tsx, layout.tsx, etc.)
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // A new version is waiting — notify the user
          console.info('New version available. Refresh to update.')
        }
      })
    })
  } catch (error) {
    console.error('Service worker registration failed:', error)
  }
}

// Register after the page has loaded to not compete with critical resources
if (document.readyState === 'complete') {
  registerServiceWorker()
} else {
  window.addEventListener('load', registerServiceWorker)
}
```

## Service Worker File

```typescript
// public/sw.js  (or sw.ts if you use a build tool)

const CACHE_VERSION = 'v2'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`

// Assets to pre-cache during install
const PRECACHE_URLS: string[] = [
  '/',
  '/offline',
  '/styles/main.css',
  '/scripts/app.js',
  '/fonts/inter.woff2',
]

// ─── Install: pre-cache static assets ────────────────────────────────────────
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => (self as ServiceWorkerGlobalScope).skipWaiting())
  )
})

// ─── Activate: remove old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event: ExtendableEvent) => {
  const allowedCaches = [STATIC_CACHE, DYNAMIC_CACHE]

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => !allowedCaches.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => (self as ServiceWorkerGlobalScope).clients.claim())
  )
})

// ─── Fetch: serve from cache, fall back to network ───────────────────────────
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event
  const url = new URL(request.url)

  // Only intercept same-origin GET requests
  if (request.method !== 'GET' || url.origin !== location.origin) return

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request))
  } else if (isNavigationRequest(request)) {
    event.respondWith(networkFirstWithOfflineFallback(request))
  } else {
    event.respondWith(staleWhileRevalidate(request))
  }
})

function isStaticAsset(pathname: string): boolean {
  return /\.(js|css|woff2?|png|jpg|webp|avif|svg|ico)$/.test(pathname)
}

function isNavigationRequest(request: Request): boolean {
  return request.mode === 'navigate'
}
```

## Caching Strategies

#

## Cache-First (static assets)

Serve from cache immediately; only hit the network if the asset is not cached. Best for versioned/hashed files that never change once deployed.

```typescript
async function cacheFirst(request: Request): Promise {
  try {
    const response = await fetch(request)
    const cache = await caches.open(DYNAMIC_CACHE)
    cache.put(request, response.clone())
    return response
  } catch {
    const cached = await caches.match(request)
    return cached ?? (await caches.match('/offline'))!
  }
}
```

### Stale-While-Revalidate (API/dynamic content)

Serve cached immediately for speed, then update the cache in the background.

```typescript
async function staleWhileRevalidate(request: Request): Promise {
    cache.put(request, response.clone())
    return response
  })

  return cached ?? fetchPromise
}
```

## Using Workbox (recommended for production)

[Workbox](https://developer.chrome.com/docs/workbox) eliminates boilerplate and handles cache versioning, expiration, and background sync automatically.

```typescript
// sw.ts (processed by workbox-webpack-plugin or vite-plugin-pwa)

  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
} from 'workbox-strategies'

// Inject the precache manifest from the build tool
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown[] }
precacheAndRoute(self.__WB_MANIFEST)

// Cache static assets for 30 days
registerRoute(
  ({ request }) =>
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
)

// Network-first for API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-responses' })
)

// Stale-while-revalidate for pages
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({ cacheName: 'pages' })
)
```

### Next.js + Workbox via `next-pwa`

```javascript
// next.config.js

const config = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'google-fonts-stylesheets' },
    },
  ],
})

```

## Cache Versioning

Bump `CACHE_VERSION` whenever you deploy breaking changes to your cached assets. Without versioning, users may receive a mix of old and new files.

```typescript
// Automated versioning using build timestamp
const CACHE_VERSION = process.env.BUILD_ID ?? Date.now().toString()
```

Service workers intercept all matching requests. Caching responses that contain user-specific data or mutations can cause data leaks between users, especially in shared-device environments. Always scope caching to idempotent, non-sensitive GET requests.

## Standards

- Use MDN: Service Worker API as the standard for measuring the final production behavior, not just local synthetic output.
- Use web.dev: Service worker overview as the standard for measuring the final production behavior, not just local synthetic output.
- Use web.dev: Offline cookbook as the standard for measuring the final production behavior, not just local synthetic output.

## Support Notes

- The feature is supported across the current project browser matrix.
- Baseline-compatible minimums: chrome 115, edge 115, firefox 116, safari 16.4, safari_ios 16.4.
- Add a fallback or progressive-enhancement note when a required project target falls outside that support range.

## Verification

### Automated Checks

- Open DevTools → **Application** → **Service Workers** and confirm the worker shows **Status: activated and running**.
- Switch to **Offline** mode in the Network panel and reload the page — the app should load from cache or show the offline fallback.
- Use **Lighthouse** → PWA audit and confirm the "Uses a service worker" check passes.

### Manual Checks

- In the **Cache Storage** panel, verify your pre-cached assets appear under the correct cache name.