# Use the Speculation Rules API to prefetch and prerender navigations

> The Speculation Rules API is used to declaratively prefetch or prerender likely next pages, making navigation feel near-instant without the overhead of a full client-side router.

**Priority:** low · **Difficulty:** intermediate · **Time:** 20 min

---
The Speculation Rules API lets you declaratively tell the browser which pages to fetch or fully pre-render in the background. Unlike the legacy `<link rel="prefetch">`, it supports dynamic CSS-selector-based rules and reports speculation status in DevTools.
## Code Example

Speculation rules are declared as a JSON blob in a `<script type="speculationrules">` block:

```html
<script type="speculationrules">
{
  "prefetch": [
    {
      "where": { "href_matches": "/blog/*" },
      "eagerness": "moderate"
    }
  ],
  "prerender": [
    {
      "where": { "href_matches": "/checkout/confirm" },
      "eagerness": "eager"
    }
  ]
}
</script>
```

## Why It Matters

Navigation latency is one of the biggest contributors to poor Interaction to Next Paint (INP) and overall perceived performance. Prerendering the most likely next page eliminates all network and rendering latency — the user sees the new page in under 100 ms regardless of server response time. Google Search has used this API to deliver its "instant" results page experience.

## Prefetch vs Prerender

| Mode | What happens | User benefit | Cost |
|---|---|---|---|
| **prefetch** | Downloads the next page's HTML | Faster TTFB on navigation | Low bandwidth |
| **prerender** | Downloads + fully renders the page in a hidden tab | Near-instant navigation (~0 ms) | Higher CPU + bandwidth |

Start with **prefetch** — it is lower risk. Graduate to **prerender** only for pages where you have high confidence the user will navigate there (e.g., the single next step in a checkout flow).

## Document Rules (Recommended)

Document rules use CSS selectors to target links on the page — much easier to maintain than explicit URL lists:

```html
<script type="speculationrules">
{
  "prefetch": [
    {
      "source": "document",
      "where": {
        "and": [
          { "href_matches": "/*" },
          { "not": { "href_matches": "/logout" } },
          { "not": { "href_matches": "/admin/*" } },
          { "not": { "selector_matches": "[data-no-prefetch]" } }
        ]
      },
      "eagerness": "moderate"
    }
  ]
}
</script>
```

#

## Opt-out individual links

```html
<!-- This link will not be prefetched or prerendered -->
<a href="/sensitive-page" data-no-prefetch>Sensitive page</a>
```

## Eagerness Levels

| Level | When speculation fires |
|---|---|
| `immediate` | As soon as the rule is parsed — highest bandwidth cost |
| `eager` | Same as immediate in current implementations |
| `moderate` | When the user hovers over the link for ~200 ms |
| `conservative` | When the user starts to click (mousedown / touchstart) |

```html
<script type="speculationrules">
{
  "prerender": [
    {
      "source": "document",
      "where": { "href_matches": "/product/*" },
      "eagerness": "moderate"
    }
  ]
}
</script>
```

## Next.js Integration

In Next.js (App Router), inject the script tag in the root layout:

```tsx
// app/layout.tsx

  const speculationRules = {
    prefetch: [
      {
        source: 'document',
        where: {
          and: [
            { href_matches: '/*' },
            { not: { href_matches: '/api/*' } },
            { not: { selector_matches: '[data-no-prefetch]' } },
          ],
        },
        eagerness: 'moderate',
      },
    ],
  }

  return (
    <html lang="en">
      <head>
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(speculationRules),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

## URL List Rules (Explicit)

Use URL list rules when you know exactly which pages to target:

```html
<script type="speculationrules">
{
  "prerender": [
    {
      "urls": ["/checkout/confirm", "/checkout/success"],
      "eagerness": "moderate"
    }
  ]
}
</script>
```

Dynamic generation in JavaScript:

```typescript
function injectSpeculationRules(urls: string[]) {
  if (!HTMLScriptElement.supports?.('speculationrules')) return

  const script = document.createElement('script')
  script.type = 'speculationrules'
  script.textContent = JSON.stringify({
    prefetch: [{ urls, eagerness: 'moderate' }],
  })
  document.head.appendChild(script)
}

// Inject rules for the next step in a wizard
injectSpeculationRules(['/onboarding/step-2'])
```

## Feature Detection and Progressive Enhancement

Speculation Rules are supported in Chromium 109+ and ignored gracefully in all other browsers:

```typescript
function supportsSpeculationRules(): boolean {
  return (
    typeof HTMLScriptElement !== 'undefined' &&
    HTMLScriptElement.supports?.('speculationrules') === true
  )
}

// Safe to check before injecting — browsers without support simply ignore the script
if (supportsSpeculationRules()) {
  console.info('Speculation Rules supported — prerendering enabled')
}
```

## Debugging in DevTools

1. Open **DevTools** → **Application** → **Background services** → **Speculative loads**
2. Review the list of speculation candidates, their status (pending, fetching, ready, failed), and any blocking reasons

## What NOT to Prerender

Keep speculation conservative and follow [MDN's Speculation Rules API guidance](https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API), because prerendering the wrong destination can waste bandwidth or trigger side effects before the user commits.

| Scenario | Why to avoid |
|---|---|
| Logout / destructive actions | Could trigger state changes during prerender |
| Authenticated personalised pages | Might serve wrong content or consume rate-limited resources |
| Heavy server-side operations | Doubles the load on your server |
| External / third-party URLs | Browsers block cross-origin prerenders |
| Pages behind POST actions | Prerender only supports GET requests |

A prerendered page executes JavaScript, including analytics initialisation. If the user never completes navigation to the prerendered page, you may see inflated page view counts. Modern analytics libraries (GA4, Plausible) handle the `visibilitychange` event to suppress views for pages the user never saw. Verify your analytics implementation handles this before enabling prerender at scale.

## Support Notes

- Verify the effective browser and network behavior in the project target browsers before treating this optimization as universally active.
- Use a fallback note when protocol, preload, caching, or background execution behavior depends on browser or intermediary support.

## Verification

1. Add speculation rules and open DevTools → **Application** → **Speculative loads** — confirm the target URLs appear with status **Ready**.
2. Navigate to a speculated page and check the **Network** tab — the main document should be served from cache (size shown as "(prefetch cache)").
3. Confirm that `/logout`, `/api/*`, and any authenticated mutation pages are excluded from the rules.
4. Measure navigation performance with and without speculation rules using the **Performance** panel's LCP and FCP metrics.