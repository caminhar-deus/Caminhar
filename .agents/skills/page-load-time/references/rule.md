# Keep page load time under 3 seconds

> Page fully loads in under 3 seconds on a standard connection.

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
Page load time directly impacts user engagement, conversions, and SEO.

## Code Examples

#

## 1. Optimize Critical Rendering Path

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Preconnect to critical origins -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://cdn.example.com" crossorigin>

  <!-- Preload critical resources -->
  <link rel="preload" href="/critical.css" as="style">
  <link rel="preload" href="/hero.webp" as="image">

  <!-- Inline critical CSS -->
  <style>/* Critical above-fold styles */</style>

  <!-- Defer non-critical CSS -->
  <link rel="stylesheet" href="/main.css" media="print" onload="this.media='all'">
</head>
</html>
```

### 2. Optimize JavaScript Loading

```html
<!-- Defer non-critical JavaScript -->
<script src="/app.js" defer></script>

<!-- Async for independent scripts -->
<script src="/analytics.js" async></script>

<!-- Module scripts are deferred by default -->
<script type="module" src="/module.js"></script>
```

### 3. Image Optimization

```tsx
// Next.js automatic image optimization

function Hero() {
  return (
    
  )
}
```

### 4. Server-Side Optimization

```javascript
// Enable compression
// Express.js

app.use(compression())

// Set caching headers
app.use('/static', express.static('public', {
  maxAge: '1y',
  immutable: true
}))
```

## Why It Matters

Studies show 53% of mobile users abandon sites that take longer than 3 seconds to load—slow pages directly hurt conversions, engagement, and SEO rankings.

## Load Time Impact

| Load Time | Bounce Rate | Conversion Impact |
|-----------|-------------|-------------------|
| 1-2s | ~9% | Baseline |
| 2-3s | ~13% | -7% conversions |
| 3-5s | ~25% | -16% conversions |
| 5-10s | ~38% | -35% conversions |
| 10s+ | ~50%+ | Severe impact |

## Key Metrics to Measure

| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| Time to First Byte | < 200ms | < 500ms | > 500ms |
| First Contentful Paint | < 1.8s | < 3s | > 3s |
| Largest Contentful Paint | < 2.5s | < 4s | > 4s |
| Time to Interactive | < 3.8s | < 7.3s | > 7.3s |
| Full Page Load | < 3s | < 5s | > 5s |

## React Performance Patterns

```tsx

// Code splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'))

// Memoize expensive components
const ExpensiveList = memo(function ExpensiveList({ items }) {
  return items.map(item => )
})

// Skeleton loading for perceived performance
function Page() {
  return (
    }>
      
    
  )
}
```

## Measuring Load Time

```javascript
// Performance API for precise measurements
function measureLoadTime() {
  const timing = performance.getEntriesByType('navigation')[0]

  return {
    dns: timing.domainLookupEnd - timing.domainLookupStart,
    tcp: timing.connectEnd - timing.connectStart,
    ttfb: timing.responseStart - timing.requestStart,
    domContentLoaded: timing.domContentLoadedEventEnd - timing.fetchStart,
    fullLoad: timing.loadEventEnd - timing.fetchStart
  }
}

// Report to analytics
window.addEventListener('load', () => {
  const metrics = measureLoadTime()
  if (metrics.fullLoad > 3000) {
    console.warn('Page load exceeded 3s target:', metrics)
  }
})
```

## Testing Tools

| Tool | Best For |
|------|----------|
| Lighthouse | Overall performance audit |
| WebPageTest | Detailed waterfall analysis |
| Chrome DevTools | Real-time debugging |
| PageSpeed Insights | Field data + lab data |
| GTmetrix | Historical tracking |

## Verification

### Automated Checks

- Run Lighthouse with throttled 3G simulation
- Test from WebPageTest with different locations
- Check PageSpeed Insights for real user data
- Set up performance budgets in CI/CD

### Manual Checks

- Monitor with Real User Monitoring (RUM)