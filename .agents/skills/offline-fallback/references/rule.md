# Provide an offline fallback page

> When the network is unavailable, users are shown a custom offline fallback page rather than the browser's generic error screen.

**Priority:** low · **Difficulty:** beginner · **Time:** 20 min

---
When a user visits your site without a network connection, the browser normally shows its own generic error page. A custom [offline fallback page](https://web.dev/articles/offline-fallback-page) keeps users within your experience, and a [service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) is what lets you return it for failed navigations.
## Code Example

```html
<!-- public/offline.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>You're offline — Acme App</title>
    <style>
      /* All styles must be inline — no external stylesheets */
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: system-ui, -apple-system, sans-serif;
        background: #f8fafc;
        color: #1e293b;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 1.5rem;
      }

      .card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 1rem;
        padding: 2.5rem 2rem;
        max-width: 420px;
        width: 100%;
        text-align: center;
      }

      .icon { font-size: 3rem; margin-bottom: 1rem; }

      h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }

      p  { color: #64748b; line-height: 1.6; margin-bottom: 1.5rem; }

      button {
        background: #3b82f6;
        color: #fff;
        border: none;
        border-radius: 0.5rem;
        padding: 0.625rem 1.5rem;
        font-size: 0.95rem;
        cursor: pointer;
        transition: background 0.15s;
      }

      button:hover  { background: #2563eb; }
      button:active { background: #1d4ed8; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon" aria-hidden="true">📡</div>
      <h1>You're offline</h1>
      <p>
        It looks like you've lost your internet connection. Check your network
        settings and try again.
      </p>
      <button onclick="window.location.reload()">Try again</button>
    </div>
  </body>
</html>
```

## Why It Matters

The browser's default offline error screen ("No internet connection") is confusing and completely outside your brand. A custom offline page maintains the user experience, reinforces trust, and can surface cached content or useful actions — such as enabling users to continue reading a cached article or queuing a form submission for later.

## What the Offline Page Must Do

- **Load without any network requests** — all CSS, JavaScript, and images must be inline or already cached
- **Inform the user** — clearly explain they are offline
- **Offer actionable options** — a retry button, list of cached pages, or navigation to cached content
- **Match your brand** — consistent logo, fonts (pre-cached or system fonts), and colour scheme

## Step 2: Pre-cache the Offline Page

Add `/offline` (or `/offline.html`) to the list of URLs cached during the service worker `install` event:

```typescript
// public/sw.js

const CACHE_NAME = 'static-v1'

const PRECACHE_URLS = [
  '/',
  '/offline',          // ← the offline fallback page
  '/styles/main.css',
  '/scripts/app.js',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})
```

## Step 3: Serve the Fallback on Navigation Failure

In your fetch handler, catch network errors for navigation requests and return the cached offline page:

```typescript
// public/sw.js (fetch handler)

self.addEventListener('fetch', (event) => {
  // Only handle same-origin GET requests
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request))
  }
})

async function handleNavigationRequest(request) {
  try {
    // Always try the network first for navigation
    const networkResponse = await fetch(request)

    // Cache a copy for later
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, networkResponse.clone())

    return networkResponse
  } catch {
    // Network failed — serve cached page if available, otherwise offline page
    const cached = await caches.match(request)
    if (cached) return cached

    const offlinePage = await caches.match('/offline')
    return (
      offlinePage ??
      new Response('<h1>Offline</h1>', {
        headers: { 'Content-Type': 'text/html' },
      })
    )
  }
}
```

## Detecting Online/Offline State in the UI

You can also enhance the live page with an online/offline banner:

```typescript
// Notify users when connection is lost or restored
function setupConnectivityBanner() {
  const banner = document.createElement('div')
  banner.setAttribute('role', 'status')
  banner.setAttribute('aria-live', 'polite')
  banner.style.cssText = `
    position: fixed; bottom: 1rem; left: 50%; transform: translateX(-50%);
    background: #1e293b; color: #fff; padding: 0.5rem 1.25rem;
    border-radius: 2rem; font-size: 0.875rem; display: none; z-index: 9999;
  `
  document.body.appendChild(banner)

  function showBanner(message: string) {
    banner.textContent = message
    banner.style.display = 'block'
  }

  function hideBanner() {
    banner.style.display = 'none'
  }

  window.addEventListener('offline', () => showBanner('You are offline'))
  window.addEventListener('online', () => {
    showBanner('Back online')
    setTimeout(hideBanner, 3000)
  })
}

if (typeof window !== 'undefined') {
  setupConnectivityBanner()
}
```

## Using Workbox

If you use [Workbox](https://developer.chrome.com/docs/workbox), the `offlineFallback` plugin handles this automatically:

```typescript
// sw.ts

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown[] }
precacheAndRoute(self.__WB_MANIFEST)  // /offline must be in the manifest

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages' })
)

// Catch all failed navigation requests
setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    return (await caches.match('/offline'))!
  }
  return Response.error()
})
```

Any external resource referenced in the offline page (fonts, images, scripts) must itself be pre-cached or inlined. If the offline page makes network requests that fail, the browser may display a blank or broken page — which is worse than the browser's native error screen.

## Support Notes

- Offline behavior depends on actual browser support for service workers, cache storage, and installability, so validate on supported browsers and not only in one dev environment.
- Document the graceful fallback for unsupported browsers explicitly.

## Verification

### Automated Checks

- Register your service worker and confirm it is active in DevTools → **Application** → **Service Workers**.
- Set the Network panel to **Offline**, then navigate to a page not in the cache — you should see your custom offline page.
- Run a Lighthouse PWA audit and confirm the "Responds with a 200 when offline" check passes.

### Manual Checks

- Confirm `/offline` appears in **Cache Storage** under your cache name.