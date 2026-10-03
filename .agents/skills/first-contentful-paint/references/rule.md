# Optimize first contentful paint

> First content renders within 1.8 seconds, providing quick visual feedback that the page is loading.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
First Contentful Paint marks when the browser renders the first piece of content.

## Code Example

```text
HTML → DOM → CSSOM → Render Tree → Paint

Blocking resources delay this path:
- Synchronous JavaScript
- Render-blocking CSS
- Large HTML documents
```

## Why It Matters

FCP is the first visual signal that a page is loading—fast FCP reassures users that the site is responding, reducing perceived wait time and bounce rates.

## FCP Score Thresholds

| Score | Rating | User Perception |
|-------|--------|-----------------|
| 0–1.8s | Good | Page is responsive |
| 1.8–3s | Needs improvement | Noticeable delay |
| > 3s | Poor | User may abandon |

## Eliminate Render-Blocking Resources

```html
<!-- Bad: Render-blocking -->
<head>
  <link rel="stylesheet" href="/all-styles.css">
  <script src="/app.js"></script>
</head>

<!-- Good: Non-blocking -->
<head>
  <!-- Inline critical CSS -->
  <style>
    /* Critical above-fold styles */
    body { margin: 0; font-family: system-ui; }
    .header { height: 60px; background: #fff; }
    .hero { min-height: 400px; }
  </style>

  <!-- Defer non-critical CSS -->
  <link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles.css"></noscript>

  <!-- Defer JavaScript -->
  <script src="/app.js" defer></script>
</head>
```

## Preconnect to Critical Origins

```html
<head>
  <!-- Establish early connections -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdn.example.com" crossorigin>

  <!-- DNS prefetch for less critical origins -->
  <link rel="dns-prefetch" href="https://analytics.example.com">
</head>
```

## Optimize Server Response Time

```javascript
// Next.js - reduce TTFB with caching
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
}
```

```typescript
// Use streaming for faster first byte
// app/page.tsx (Next.js App Router)

  return (
    <main>
      {/* Static content renders immediately */}
      
      

      {/* Dynamic content streams in */}
      }>
        
      
    </main>
  )
}
```

## Inline Critical CSS

```javascript
// Build tool to extract and inline critical CSS
// Using critical package
const critical = require('critical')

critical.generate({
  base: 'dist/',
  src: 'index.html',
  target: 'index-critical.html',
  inline: true,
  width: 1300,
  height: 900,
  penthouse: {
    blockJSRequests: false,
  },
})
```

## Font Loading Optimization

```html
<!-- Preload critical fonts -->
<link
  rel="preload"
  href="/fonts/main.woff2"
  as="font"
  type="font/woff2"
  crossorigin
>
```

```css
/* Use font-display to avoid blocking text */
@font-face {
  font-family: 'MainFont';
  src: url('/fonts/main.woff2') format('woff2');
  font-display: swap; /* Show fallback text immediately */
}
```

## React Server Components

```tsx
// Server components render faster - no client JS needed
// app/components/Hero.tsx

  // This component renders on server, no hydration delay
  return (
    <section className="hero">
      <h1>Welcome to Our Site</h1>
      <p>Content visible immediately</p>
    </section>
  )
}

// app/page.tsx

  return (
    <>
       {/* Fast FCP - server rendered */}
       {/* Client component, loads after */}
    </>
  )
}
```

## Measuring FCP

```javascript
// Using web-vitals library

onFCP(metric => {
  console.log('FCP:', metric.value, 'ms')

  // Report to analytics
  if (metric.value > 1800) {
    console.warn('FCP exceeds 1.8s threshold')
  }
})

// Using Performance API
const observer = new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    if (entry.name === 'first-contentful-paint') {
      console.log('FCP:', entry.startTime)
    }
  }
})
observer.observe({ type: 'paint', buffered: true })
```

## Verification

### Automated Checks

- Run Lighthouse—check FCP in Performance section
- Use Chrome DevTools Performance panel
- Test with network throttling (Slow 3G)
- Check PageSpeed Insights for field data
- Use WebPageTest for detailed waterfall analysis

### Manual Checks

- Confirm the user-facing outcome manually on a throttled target device or browser profile so the optimization still improves the real experience.