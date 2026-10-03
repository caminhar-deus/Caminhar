# Optimize largest contentful paint

> The largest content element loads within 2.5 seconds for a good user experience.

**Priority:** critical · **Difficulty:** intermediate · **Time:** 25 min

---
Largest Contentful Paint is the best single metric for whether the page feels ready. A good score usually depends on getting one important element discovered, transferred, and rendered without delay.
## Code Examples

#

## Discover the LCP Resource Early

```html
<head>
  <link
    rel="preload"
    href="/hero.webp"
    as="image"
    type="image/webp"
    fetchpriority="high"
  >
</head>
```

```tsx

function Hero() {
  return (
    
  )
}
```

### Avoid Client-Rendered LCP Delays

```tsx
// Bad: no LCP candidate until client fetch completes
function BadPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/hero').then((response) => response.json()).then(setData)
  }, [])

  if (!data) return null
  return <img src={data.heroImage} alt="Hero" />
}

// Better: route renders the LCP content from the server
async function GoodPage() {
  const data = await getHeroData()

  return (
    
  )
}
```

### Text LCP Needs Fast Fonts and Minimal Blocking CSS

```tsx

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})
```

## Why It Matters

LCP is the most important Core Web Vital for perceived load speed—it measures when the main content becomes visible, directly impacting user perception and SEO rankings.

## LCP Score Thresholds

| Score | Rating | User perception |
|-------|--------|-----------------|
| `<= 2.5s` | Good | The page feels ready quickly |
| `2.5s-4s` | Needs improvement | The main content arrives late |
| `> 4s` | Poor | The page feels slow |

## Common LCP Candidates

- Hero image
- Hero heading or text block
- Video poster
- Large background image

## Troubleshooting Flow

When LCP is slow, identify the LCP element first and then classify the delay:

1. **Slow TTFB**: the HTML itself arrives late.
2. **Late discovery**: the browser does not learn about the LCP resource early enough.
3. **Heavy transfer**: the image, font, or CSS is simply too large.
4. **Render delay**: the asset arrives, but CSS, JavaScript, or client rendering prevents paint.
5. **Incorrect prioritization**: the LCP candidate is lazy-loaded or competing with too many other "important" assets.

## Common Causes and Fixes

| Cause | Fix |
|-------|-----|
| Slow HTML response | cache more aggressively, reduce origin work, use edge delivery where appropriate |
| Late-discovered hero media | preload the current-route LCP asset and avoid lazy loading |
| Oversized images or posters | serve responsive formats and sizes, compress appropriately |
| Background-image LCP | preload the image and avoid burying discovery behind non-critical CSS |
| Client-side rendering delays | render the LCP candidate on the server where possible |
| Too many competing priorities | avoid over-preloading fonts, scripts, and secondary images |

## Anti-Patterns

- **Lazy-loading the LCP candidate**
- **Preloading the wrong asset variant**
- **Marking multiple images `fetchpriority="high"`**
- **Rendering the hero only after client-side fetches or hydration**
- **Hiding the LCP candidate behind heavy CSS or blocking JavaScript**

## Verification

Start with [PageSpeed Insights](https://pagespeed.web.dev/) or a field trace to identify the real LCP candidate, because the wrong fix is easy to apply when the largest element is not the one you expected.

### Automated Checks

- Run Lighthouse or PageSpeed Insights and confirm `Largest Contentful Paint <= 2.5s` on the target route.
- Use the Performance panel or `web-vitals` instrumentation to identify the actual LCP element and confirm it matches your expectation.
- Inspect the waterfall and confirm the LCP resource is discovered early, requested with the right priority, and not lazy-loaded.

### Manual Checks

- Re-test on a throttled mobile profile after each fix so you can tell whether the bottleneck was TTFB, discovery, transfer, or render delay.
- If the LCP candidate is text, verify fonts and critical CSS do not delay paint; if it is media, verify bytes and sizing are appropriate.