# Use fetchpriority to hint resource loading priority

> The fetchpriority attribute is applied to critical images, scripts, and preload links to help the browser prioritise the most important resources and defer lower-priority ones.

**Priority:** medium · **Difficulty:** beginner · **Time:** 15 min

---
The browser has a built-in priority queue for network requests. `fetchpriority` is a hint that lets you nudge the browser's scheduling when its default heuristics are suboptimal for your specific layout.
## Code Examples

The Largest Contentful Paint element is usually a hero image. The browser often assigns it a lower-than-ideal priority because it is discovered late (inside CSS or a JS-rendered component) or because many other resources are competing. One attribute can unlock significant LCP gains:

```html
<!-- ✅ Hero/LCP image — boost priority -->
<img
  src="/hero.webp"
  alt="Welcome to Acme"
  width="1200"
  height="600"
  fetchpriority="high"
/>
```

#

## In Next.js

```tsx

// next/image sets fetchpriority="high" automatically when priority={true}

  return (
    
  )
}
```

### In React (native img)

```tsx
// When you cannot use next/image or a framework Image component

  return (
    <img
      src="/hero.webp"
      alt="Welcome to Acme"
      width={1200}
      height={600}
      fetchPriority="high"   // Note: camelCase in JSX
      decoding="async"
    />
  )
}
```

## Why It Matters

Browsers use internal heuristics to guess resource priority, but they cannot know which image is your LCP candidate. Adding fetchpriority="high" to the LCP image has been shown to reduce LCP by 5–30 % in real-world tests, directly improving Core Web Vitals scores and user-perceived load speed. The attribute costs nothing to add and is the lowest-effort high-impact performance optimisation available today.

## Priority Values

| Value | Effect |
|---|---|
| `high` | Fetch before resources of the same type with default or low priority |
| `low` | Fetch after resources of the same type with default or high priority |
| `auto` (default) | Browser decides based on resource type and position in document |

## Below-the-Fold Images — Reduce Priority

Images that are not in the initial viewport should not compete with critical resources. Combine `fetchpriority="low"` with `loading="lazy"`:

```html
<!-- Images below the fold — defer and deprioritise -->
<img
  src="/product-3.webp"
  alt="Product 3"
  width="400"
  height="400"
  loading="lazy"
  fetchpriority="low"
/>
```

## Preload Links

When you use `<link rel="preload">` to fetch a critical font or stylesheet, add `fetchpriority="high"` to ensure it is fetched before lower-priority preloads:

```html
<head>
  <!-- Critical font — fetch at highest priority -->
  <link
    rel="preload"
    href="/fonts/inter-var.woff2"
    as="font"
    type="font/woff2"
    crossorigin
    fetchpriority="high"
  />

  <!-- Critical above-fold CSS -->
  <link
    rel="preload"
    href="/styles/critical.css"
    as="style"
    fetchpriority="high"
  />

  <!-- Non-critical prefetch — run at low priority -->
  <link
    rel="prefetch"
    href="/images/profile-picture.webp"
    as="image"
    fetchpriority="low"
  />
</head>
```

## Scripts

For third-party scripts that must execute before first paint (analytics initialisation, A/B testing), mark them high. For non-blocking scripts that can wait, mark them low:

```html
<!-- Non-critical analytics — load after critical resources -->
<script
  src="https://cdn.example.com/analytics.js"
  defer
  fetchpriority="low"
></script>

<!-- Critical A/B testing or personalisation that must run before render -->
<script
  src="/scripts/init.js"
  fetchpriority="high"
></script>
```

## Priority by Resource Type (Browser Defaults)

Understanding the browser's defaults helps you know when to override:

| Resource | Default priority |
|---|---|
| HTML document | Highest |
| CSS (render-blocking) | Highest |
| Fonts | High |
| Scripts in `<head>` | High |
| Scripts with `defer`/`async` | Low |
| Images above fold | High |
| Images below fold | Low |
| XHR/fetch calls | High |

Use `fetchpriority` to override only where the browser's guess is wrong.

## Measuring the Impact

```typescript
// Measure LCP before and after adding fetchpriority
new PerformanceObserver((list) => {
  const entries = list.getEntries()
  const lastEntry = entries[entries.length - 1]
  console.log('LCP:', lastEntry.startTime, 'ms')
  console.log('LCP element:', (lastEntry as LargestContentfulPaint).element)
}).observe({ type: 'largest-contentful-paint', buffered: true })
```

Marking more than one or two resources as `fetchpriority="high"` defeats the purpose — all resources end up at the same priority and the browser gains no useful hint. Reserve `high` for the single most critical resource per page (usually the LCP image) and use `low` liberally for non-critical resources.

## Standards

- Use web.dev: Optimise resource loading with the Fetch Priority API as the standard for measuring the final production behavior, not just local synthetic output.
- Use MDN: fetchpriority attribute as the standard for measuring the final production behavior, not just local synthetic output.

## Verification

Use [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/) or a real waterfall trace to confirm the hint changes request order, because `fetchpriority` only helps when the browser actually promotes the right resource.

### Automated Checks

- Open DevTools → **Network** tab, reload with throttling (Slow 3G), and verify the LCP image appears near the top of the waterfall with Priority: **Highest** or **High**.
- Run a **Lighthouse** performance audit before and after adding `fetchpriority="high"` to the LCP image and compare the LCP score.

### Manual Checks

- Use the **Performance** panel to record a page load and confirm the LCP candidate image is fetched before below-fold images.
- Check browser compatibility — `fetchpriority` is supported in Chromium 101+ and Safari 17.2+; it degrades gracefully (ignored) in unsupported browsers.