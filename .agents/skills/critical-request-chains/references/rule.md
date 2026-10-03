# Minimize critical request chains

> Reduce the number and depth of dependent resource requests that block the initial rendering of the page.

**Priority:** high · **Difficulty:** advanced · **Time:** 20 min

---
A critical request chain is a series of dependent network requests that are required for the browser to start rendering the page. For example, an HTML file loads a CSS file, which in turn loads a web font.

## Code Examples

#

## The Problem: A Long Chain
1. `index.html`
2. `└── styles.css` (discovered in HTML)
3. `    └── font.woff2` (discovered in CSS via `@font-face`)

### The Solution: Preloading and Inlining

#### 1. Preload Deep Resources
Tell the browser about the font early in the `index.html`.

```html
<head>
  <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
</head>
```

#### 2. Inline Critical CSS
Avoid the first network request for CSS by inlining the styles needed for the above-the-fold content.

```html
<head>
  <style>
    /* Critical CSS here */
    body { font-family: 'Inter', sans-serif; }
    .hero { height: 100vh; background: #000; }
  </style>
</head>
```

#### 3. Avoid CSS `@import`
Never use `@import` inside CSS files, as it creates another level of dependency. Use `<link>` tags in HTML instead.

```css
/* Bad: styles.css */
@import url("reset.css"); /* This creates a chain */
```

## Why It Matters

- **Rendering Delay**: Each "link" in the chain adds a network roundtrip, delaying the First Contentful Paint.
- **Network Bottlenecks**: Multiple dependent requests can saturate the browser's request limit for a single domain.
- **Increased Latency**: On mobile networks with high latency, each additional request in a chain significantly compounds the delay.
- **Resource Priority**: Deeply nested resources are often discovered late by the browser, missing out on early download opportunities.

## Best Practices

Use a real request waterfall in [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/) or WebPageTest to verify that critical assets are discovered earlier after the change, because this rule is about dependency order, not just total byte count.

✅ **Limit Chain Depth**: Aim for a maximum depth of 2 or 3 for critical resources.
✅ **Inline Small Assets**: If a script or stylesheet is very small (e.g., < 2KB), consider inlining it directly in the HTML.
✅ **Use HTTP/2 or HTTP/3**: These protocols allow for better multiplexing, but minimizing dependencies is still crucial.
✅ **Audit Third-Party Scripts**: Third-party libraries often introduce long, hidden request chains.

❌ **Don't Use `@import`**: It's one of the most common causes of deep request chains.
❌ **Avoid Chained Redirects**: Ensure that critical resources don't involve multiple server-side redirects.

## Tools & Validation

- [Lighthouse](https://developers.google.com/web/tools/lighthouse): Specifically lists "Critical Request Chains" in the Performance report.
- [WebPageTest](https://www.webpagetest.org/): Use the "Request Waterfall" to visually identify chains.
- **Chrome DevTools**: The "Network" tab shows the initiator for each request, helping you trace the chain.

## Support Notes

- Network waterfalls differ by browser and connection profile, so evaluate critical request chains on throttled target browsers, not only on local desktop.
- Framework preloading and CDN behavior can reduce or hide chains in some environments; verify the live path before treating a static dependency graph as final.

## Verification

### Automated Checks

- Measure the affected page or flow in Lighthouse, PageSpeed Insights, or DevTools and confirm the targeted metric improves.
- Inspect the network waterfall or performance timeline to confirm the intended resource or execution change actually took effect.

### Manual Checks

- Verify the change on a throttled mobile profile, not just local desktop.
- If this rule maps to a budget or Web Vital, confirm the page now stays within that threshold.