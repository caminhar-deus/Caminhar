# Use resource hints for faster loading

> Implement preload, prefetch, and preconnect hints to optimize resource loading priority.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Resource hints are useful when the browser would otherwise discover something too late. [web.dev's performance guidance](https://web.dev/learn/performance) and [Patterns.dev preload/prefetch guidance](https://www.patterns.dev/vanilla/preload/) both make the same point: they help only when they accelerate the right asset at the right time.

## Code Examples

#

## Preload Assets Needed for the Current Route

```html
<head>
  <!-- Good: hero image is the likely LCP candidate -->
  <link
    rel="preload"
    href="/images/hero.webp"
    as="image"
    type="image/webp"
    fetchpriority="high"
  >

  <!-- Good: route-critical font discovered late through CSS -->
  <link
    rel="preload"
    href="/fonts/inter-latin.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  >
</head>
```

### Prefetch the Next Likely Step, Not the Current One

```html
<head>
  <!-- Good: likely next navigation -->
  <link rel="prefetch" href="/checkout">
  <link rel="prefetch" href="/static/checkout.js" as="script">

  <!-- Bad: current-route critical CSS should be loaded normally or preloaded -->
  <link rel="prefetch" href="/styles/home.css" as="style">
</head>
```

### Preconnect Only to Origins You Will Use Immediately

```html
<head>
  <!-- Good: fonts are used in the first viewport -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- Good: image CDN serves the hero media -->
  <link rel="preconnect" href="https://images.example-cdn.com" crossorigin>

  <!-- Better than preconnect for speculative vendors -->
  <link rel="dns-prefetch" href="https://analytics.example.com">
</head>
```

### Anti-Pattern: Too Much Too Soon

```html
<head>
  <!-- Bad: too many preloads compete with each other -->
  <link rel="preload" href="/fonts/a.woff2" as="font" crossorigin>
  <link rel="preload" href="/fonts/b.woff2" as="font" crossorigin>
  <link rel="preload" href="/fonts/c.woff2" as="font" crossorigin>
  <link rel="preload" href="/carousel.js" as="script">
  <link rel="preload" href="/reviews.js" as="script">
  <link rel="preload" href="/chat-widget.js" as="script">

  <!-- Bad: speculative origins do not deserve early socket setup -->
  <link rel="preconnect" href="https://chat.example.com">
  <link rel="preconnect" href="https://ads.example.com">
  <link rel="preconnect" href="https://social.example.com">
</head>
```

## Why It Matters

- **Earlier discovery of truly critical assets**: Preload can pull hero images, fonts, or route-critical CSS onto the network sooner.
- **Fewer wasted round-trips**: Preconnect can remove DNS, TCP, and TLS setup from the critical path for a small number of known external origins.
- **Smoother follow-up actions**: Prefetch can make the next likely route or interaction feel immediate.
- **Misuse is expensive**: Every unnecessary preload, prefetch, or preconnect competes with more important work for bandwidth, sockets, and parser attention, which is why [PageSpeed Insights](https://pagespeed.web.dev/) is worth checking after any hint changes.

## Resource Hint Decision Rules

The decision rules matter because [Patterns.dev's prefetch guidance](https://www.patterns.dev/vanilla/prefetch/) and real-world waterfall data both show that hinting the wrong asset early can be worse than adding no hint at all.

| Hint | Use it for | Avoid it for | Practical limit |
|------|------------|--------------|-----------------|
| `preload` | Current-route assets needed for first paint or LCP but discovered too late | Assets for future routes, low-priority widgets, or resources already found early enough | Usually `<= 3-5` preloads per route |
| `prefetch` | Next-route or next-interaction assets that are likely but not required yet | Current-route critical assets or bandwidth-sensitive users when the next step is uncertain | Keep it to the next most likely navigation targets |
| `preconnect` | Origins definitely needed soon, especially fonts, media CDNs, or APIs on the initial route | Speculative third parties or origins used much later | Usually `<= 2-4` origins |
| `dns-prefetch` | Low-confidence external origins where full connection setup is premature | Origins that are already on the critical path and deserve full `preconnect` | Use as a lightweight fallback, not as a blanket default |

## Framework Examples

  
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
</head>
```
  
  
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin>
</head>
```
  
  
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          href="/fonts/Inter.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```
  
  
      <link rel="prefetch" href="/signup" />
      <link rel="prefetch" href="/static/signup.js" as="script" />
    
  )
}
```
  

## Common Mistakes

- **Preloading assets that are not needed for the current route**: this steals bandwidth from CSS, fonts, and LCP resources.
- **Prefetching the page you are already on**: that does not improve discovery order and usually just adds noise.
- **Preconnecting too many origins**: opening sockets for every vendor wastes connection budget and battery.
- **Forgetting `as` or `crossorigin`**: incorrect attributes can reduce prioritization accuracy or trigger duplicate requests.
- **Skipping measurement**: resource hints are only useful if the waterfall actually changes in the expected way.

## Verification

### Automated Checks

- Measure the affected page or flow in Lighthouse, PageSpeed Insights, or DevTools and confirm the targeted metric improves.
- Inspect the network waterfall or performance timeline to confirm the intended resource or execution change actually took effect.

### Manual Checks

- Verify the change on a throttled mobile profile, not just local desktop.
- If this rule maps to a budget or Web Vital, confirm the page now stays within that threshold.