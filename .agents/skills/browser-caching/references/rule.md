# Enable browser caching

> Cache-Control and ETag headers are properly configured for static resources.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Browser caching stores resources locally to eliminate repeated downloads.

## Code Example

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        // Hashed static assets
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Images
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // HTML pages - always revalidate
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}
```

## Why It Matters

Proper caching eliminates redundant downloads on repeat visits—returning users see near-instant page loads when assets are served from browser cache.

## Cache Header Strategy

| Resource Type | Cache-Control | Duration |
|---------------|---------------|----------|
| Hashed assets (CSS, JS) | `public, max-age=31536000, immutable` | 1 year |
| Images | `public, max-age=2592000` | 30 days |
| Fonts | `public, max-age=31536000, immutable` | 1 year |
| HTML pages | `public, max-age=0, must-revalidate` | Always check |
| API responses | `private, max-age=0, no-store` | No cache |

## Cache-Control Directives

| Directive | Purpose |
|-----------|---------|
| `public` | Can be cached by browsers and CDNs |
| `private` | Only browser can cache (sensitive data) |
| `max-age=N` | Cache valid for N seconds |
| `immutable` | Resource won't change (use with hashed filenames) |
| `must-revalidate` | Check with server when stale |
| `no-cache` | Always revalidate before using |
| `no-store` | Never cache (sensitive data) |
| `stale-while-revalidate=N` | Serve stale, fetch fresh in background |

## Nginx Configuration

```nginx
# Static assets with hash in filename
location ~* \.[a-f0-9]{8,}\.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# Images
location ~* \.(jpg|jpeg|png|gif|webp|avif|svg|ico)$ {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000, stale-while-revalidate=86400";
}

# Fonts
location ~* \.(woff2?|ttf|otf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# HTML - always revalidate
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "public, max-age=0, must-revalidate";
}
```

## Express.js Configuration

```javascript

const app = express()

// Serve static files with caching
app.use('/static', express.static('public', {
  maxAge: '1y',
  immutable: true,
  etag: true,
  lastModified: true,
}))

// Custom middleware for fine-grained control
app.use((req, res, next) => {
  // Set cache headers based on file type
  const ext = req.path.split('.').pop()

  if (['js', 'css'].includes(ext) && req.path.includes('.')) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (['jpg', 'png', 'webp', 'svg'].includes(ext)) {
    res.set('Cache-Control', 'public, max-age=2592000')
  }

  next()
})
```

## ETags for Cache Validation

```javascript
// Express.js ETag configuration

const app = express()

// Enable strong ETags
app.set('etag', 'strong')

// How ETags work:
// 1. Server sends: ETag: "abc123"
// 2. Browser caches response
// 3. On next request, browser sends: If-None-Match: "abc123"
// 4. If resource unchanged, server responds: 304 Not Modified
// 5. Browser uses cached version (no body transferred)
```

## Service Worker Caching

```javascript
// sw.js - Advanced caching strategies
const CACHE_NAME = 'v1'
const STATIC_ASSETS = ['/app.js', '/styles.css', '/logo.svg']

// Cache on install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
})

// Stale-while-revalidate strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        // Update cache
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone())
        })
        return response
      })

      // Return cached immediately, update in background
      return cached || fetchPromise
    })
  )
})
```

## Verifying Cache Headers

```javascript
// Check cache headers in browser
async function verifyCaching(url) {
  const response = await fetch(url, { method: 'HEAD' })

  const headers = {
    'cache-control': response.headers.get('cache-control'),
    'etag': response.headers.get('etag'),
    'last-modified': response.headers.get('last-modified'),
    'expires': response.headers.get('expires'),
  }

  console.table(headers)
  return headers
}

// In DevTools Network tab:
// - Size column shows "(disk cache)" or "(memory cache)" for cached resources
// - Time column shows fast load times for cached resources
```

## Standards

- Use web.dev: Learn Performance as the standard for measuring the final production behavior, not just local synthetic output.
- Use Chrome Developers: Lighthouse overview as the standard for measuring the final production behavior, not just local synthetic output.

## Support Notes

- Caching behavior depends on real cache headers, intermediary caches, and revalidation paths, so confirm the final network behavior in production-like conditions.
- Do not assume origin configuration equals browser behavior when a CDN or service worker can change the effective caching path.

## Verification

### Automated Checks

- Check Network tab—look for "(disk cache)" or "(memory cache)"
- Verify Cache-Control headers in response
- Use WebPageTest to compare first vs repeat view

### Manual Checks

- Test repeat visits—assets should load instantly
- Check service worker caching in Application tab