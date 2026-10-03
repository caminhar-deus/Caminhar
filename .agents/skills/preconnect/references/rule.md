# Use preconnect for critical third-party origins

> Checks for preconnect hints to critical third-party origins to reduce connection latency

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Preconnect is a narrow optimization. It only helps when an external origin is definitely needed soon and its connection setup would otherwise sit on the critical path.

## Code Examples

#

## Preconnect Origins Required Early

```html
<!-- Good: first-screen fonts rely on these origins -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Good: hero media comes from a third-party CDN -->
<link rel="preconnect" href="https://images.example-cdn.com" crossorigin>
```

### Use `dns-prefetch` for Lower-Confidence Origins

```html
<!-- Better than full preconnect when the origin may be used later -->
<link rel="dns-prefetch" href="https://analytics.example.com">
<link rel="dns-prefetch" href="https://chat.example.com">
```

### Anti-Pattern: Speculative Preconnects

```html
<!-- Bad: too many early sockets for vendors not needed in the first view -->
<link rel="preconnect" href="https://chat.example.com">
<link rel="preconnect" href="https://reviews.example.com">
<link rel="preconnect" href="https://ads.example.com">
<link rel="preconnect" href="https://social.example.com">
```

## Why It Matters

- **Connection warm-up can remove latency**: DNS lookup, TCP handshake, and TLS negotiation finish before the resource request begins.
- **Best fit for third-party origins**: same-origin resources often benefit less because the browser already has a connection strategy.
- **Misuse wastes budget**: unnecessary early sockets spend bandwidth, battery, and connection budget without improving the visible result.

## Decision Rules

- Use `preconnect` only when the origin is definitely needed on the current route and likely before or around first paint.
- Prefer `dns-prefetch` when an origin is probable but not guaranteed.
- Keep preconnects to roughly `2-4` high-value origins per page.
- Include `crossorigin` for fonts and other CORS-fetched assets.

## Common Mistakes

- **Preconnecting every third-party domain**: this turns a targeted optimization into noise.
- **Preconnecting origins used only after interaction**: chat, reviews, and similar vendors usually do not belong on the first-screen critical path.
- **Duplicating hints without a reason**: layering preconnects everywhere can be redundant and wasteful.
- **Skipping measurement**: a preconnect is only worthwhile if the waterfall shows earlier setup for a resource that matters.

## Tools & Validation

- [Lighthouse](https://developers.google.com/web/tools/lighthouse) (check for "preconnect-to-required-origins")
- [PageSpeed Insights](https://pagespeed.web.dev/)
- Browser DevTools Performance panel (check for early socket connections)
- [WebPageTest](https://www.webpagetest.org/) (check the Waterfall chart for early DNS/TCP/TLS)

## Standards

- Use web.dev: Learn Performance as the standard for measuring the final production behavior, not just local synthetic output.
- Use Chrome Developers: Lighthouse overview as the standard for measuring the final production behavior, not just local synthetic output.

## Verification

### Automated Checks

- Measure the affected page or flow in Lighthouse, PageSpeed Insights, or DevTools and confirm the targeted metric improves.
- Inspect the network waterfall or performance timeline to confirm the intended resource or execution change actually took effect.

### Manual Checks

- Verify the change on a throttled mobile profile, not just local desktop.
- If this rule maps to a budget or Web Vital, confirm the page now stays within that threshold.