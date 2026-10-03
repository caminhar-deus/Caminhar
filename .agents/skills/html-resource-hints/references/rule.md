# Add resource hints (preload, prefetch, dns-prefetch)

> Use link rel=preload, prefetch, and dns-prefetch to help the browser prioritize and prepare critical resources before they're discovered in the normal parsing flow.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Resource hints give the browser advance notice about resources it will need, allowing it to start fetching before the resource is discovered during normal HTML parsing.

## Code Example

```html
<!-- preload: fetch NOW, high priority, needed for current page -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/images/hero.webp" as="image">
<link rel="preload" href="/critical.css" as="style">
<link rel="preload" href="/main.js" as="script">

<!-- preconnect: establish connection early (DNS + TCP + TLS) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://api.example.com" crossorigin>

<!-- dns-prefetch: DNS lookup only (lighter than preconnect) -->
<link rel="dns-prefetch" href="https://www.googletagmanager.com">
<link rel="dns-prefetch" href="https://cdn.example.com">

<!-- prefetch: fetch with low priority for next navigation -->
<link rel="prefetch" href="/dashboard" as="document">
<link rel="prefetch" href="/js/chart-library.js" as="script">
```

## Why It Matters

The browser's HTML parser discovers resources sequentially — a font referenced in a CSS file won't be fetched until the CSS is parsed. Resource hints break this dependency chain, allowing the browser to start fetching critical resources in parallel with parsing. A single preload directive for a critical font can eliminate a 100–300ms Flash of Invisible Text.

## Critical Font Preloading

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">

  <!-- Preload font BEFORE the stylesheet that uses it -->
  <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>

  <!-- Now load the stylesheet -->
  <link rel="stylesheet" href="/styles.css">
</head>
```

Without the preload, the browser discovers the font only after parsing the CSS, causing a Flash of Invisible Text (FOIT).

## Third-Party Origins

```html
<!-- Critical third-party resources: use preconnect -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Analytics and tag managers: dns-prefetch is enough -->
<link rel="dns-prefetch" href="https://www.googletagmanager.com">
<link rel="dns-prefetch" href="https://www.google-analytics.com">
```

## Hero Image

```html
<!-- Preload the LCP (Largest Contentful Paint) image -->
<link
  rel="preload"
  as="image"
  href="/images/hero-mobile.webp"
  imagesrcset="/images/hero-mobile.webp 800w, /images/hero-desktop.webp 1600w"
  imagesizes="(min-width: 800px) 1600px, 800px"
>
```

## Prefetch for Next Pages

```javascript
// Prefetch routes the user is likely to visit
// Can be triggered on hover for high confidence
navLinks.forEach(link => {
  link.addEventListener('mouseenter', () => {
    const prefetch = document.createElement('link')
    prefetch.rel = 'prefetch'
    prefetch.href = link.href
    document.head.appendChild(prefetch)
  }, { once: true })
})
```

## Common Mistakes

- **Over-preloading**: Only preload what's genuinely needed in the first 2 seconds — each preload competes for bandwidth
- **Missing as attribute**: Without `as`, preloaded resources don't get the right priority and won't be used from cache correctly
- **Missing crossorigin on fonts**: Font preloads without `crossorigin` result in double-fetching

## Verification

### Automated Checks

- Inspect the final rendered HTML in the browser or page source to confirm the rule is satisfied.
- Validate the affected markup with browser tooling or an HTML validator where appropriate.
- Test one representative route or template that uses the pattern.
- Re-check shared components that emit the same markup so the fix is consistent.

### Manual Checks

- Verify the rendered browser behavior manually on representative routes and supported browsers so the user-facing outcome matches the rule.