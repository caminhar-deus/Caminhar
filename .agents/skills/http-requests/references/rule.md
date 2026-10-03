# Minimize HTTP requests

> HTTP requests are minimized by combining files, using sprites, and HTTP/2.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Reducing HTTP requests minimizes network overhead and improves load times.

## Code Examples

#

## 1. Bundle Critical Resources

```javascript
// vite.config.js - bundle optimization

  build: {
    rollupOptions: {
      output: {
        // Create separate chunks for vendor code
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash', 'date-fns']
        }
      }
    }
  }
}
```

### 2. Inline Critical CSS

```html
<!-- Inline critical CSS to avoid extra request -->
<head>
  <style>
    /* Critical above-fold CSS */
    body { margin: 0; font-family: system-ui; }
    .hero { height: 100vh; display: flex; align-items: center; }
  </style>

  <!-- Load remaining CSS asynchronously -->
  <link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
</head>
```

### 3. SVG Sprite for Icons

```html
<!-- Single request for all icons -->
<svg style="display: none;">
  <symbol id="icon-home" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </symbol>
  <symbol id="icon-search" viewBox="0 0 24 24">
    <path d="M15.5 14h-.79l-.28-.27..."/>
  </symbol>
</svg>

<!-- Use icons without additional requests -->
<svg class="icon"><use href="#icon-home"/></svg>
<svg class="icon"><use href="#icon-search"/></svg>
```

### 4. Data URIs for Small Assets

```css
/* Inline small images as data URIs */
.icon-small {
  background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath d="M12 2L2 7l10 5 10-5-10-5z"/%3E%3C/svg%3E');
}
```

### 5. Font Subsetting

```css
/* Load only needed characters */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom-subset.woff2') format('woff2');
  unicode-range: U+0000-007F; /* Basic Latin only */
}
```

## Why It Matters

Each HTTP request incurs network overhead—DNS lookup, TCP connection, and TLS handshake add latency. Reducing requests significantly improves initial load time.

## Request Overhead Breakdown

| Phase | Time (ms) | Notes |
|-------|-----------|-------|
| DNS lookup | 20-120 | First request to new domain |
| TCP connection | 20-100 | Three-way handshake |
| TLS handshake | 30-100 | HTTPS connection setup |
| Time to first byte | 50-500 | Server processing + network |
| Content download | Varies | Based on file size |

## HTTP/1.1 vs HTTP/2

| Feature | HTTP/1.1 | HTTP/2 |
|---------|----------|--------|
| Connections per domain | 6 | 1 (multiplexed) |
| Request overhead | High | Lower |
| Bundling benefit | High | Moderate |
| Header compression | No | Yes (HPACK) |

## React Code Splitting

```tsx

// Split heavy components into separate chunks
const HeavyChart = lazy(() => import('./HeavyChart'))
const AdminPanel = lazy(() => import('./AdminPanel'))

function App() {
  return (
    }>
      {showChart && }
      {isAdmin && }
    
  )
}
```

## Next.js Automatic Optimization

```tsx
// Next.js automatically optimizes requests

// Images automatically optimized and served efficiently

// Scripts loaded efficiently with strategy

```

## Measuring Requests

```javascript
// Count and analyze requests
function analyzeRequests() {
  const resources = performance.getEntriesByType('resource')

  const breakdown = resources.reduce((acc, r) => {
    const type = r.initiatorType || 'other'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  console.table({
    total: resources.length,
    ...breakdown
  })

  // Flag excessive requests
  if (resources.length > 50) {
    console.warn('Consider reducing HTTP requests')
  }
}
```

## Support Notes

- The raw request count matters less than what the target browsers actually discover and prioritize, so validate on the rendered route and real protocol stack.
- Bundling, HTTP/2, and caching can change the effective cost of request counts across environments; document the live browser behavior, not only build output.

## Verification

### Automated Checks

- Check Network tab for total request count
- Compare waterfall before and after optimization
- Run Lighthouse—check "Minimize main-thread work"

### Manual Checks

- Verify HTTP/2 is enabled (Protocol column)
- Identify redundant or unused requests