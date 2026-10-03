# Load non-critical code when content approaches the viewport

> Use viewport-aware loading to fetch components, embeds, and feature code shortly before they become visible instead of shipping them on first load.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Import-on-visibility starts loading code when an offscreen section is close enough to matter. [Patterns.dev's import-on-visibility pattern](https://www.patterns.dev/vanilla/import-on-visibility/) and [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) make it a practical way to keep the initial page lean without making later sections feel unfinished.

## Code Examples

#

## Plain JavaScript with Intersection Observer

```javascript
const mountPoint = document.querySelector('#reviews')
let loaded = false

const observer = new IntersectionObserver(
  async ([entry]) => {
    if (!entry.isIntersecting || loaded) return

    loaded = true
    observer.disconnect()

    const { mountReviews } = await import('./reviews.js')
    mountReviews(mountPoint)
  },
  { rootMargin: '400px 0px' }
)

observer.observe(mountPoint)
```

### React Example

```tsx

  const containerRef = useRef {
        if (!entry.isIntersecting) return

        observer.disconnect()
        const mod = await import('./sales-chart')
        setChart(() => mod.SalesChart)
      },
      { rootMargin: '500px 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} style={{ minHeight: 320 }}>
      {Chart ?  : }
    </div>
  )
}
```

## Why It Matters

- **Reduced first-load cost**: Offscreen components do not compete with critical content during the initial route load.
- **Better scroll journeys**: Heavy sections can load just before the user reaches them instead of blocking first paint.
- **Controlled timing**: `rootMargin` lets you decide how early to fetch based on the weight of the deferred component, which is why this pattern complements [lazy loading](/en/rules/performance/lazy-loading) instead of replacing it.
- **Better fit for long pages**: Marketing pages, dashboards, feeds, and article templates often contain expensive sections well below the fold.

## Implementation Guidance

- Use a placeholder or skeleton with reserved height so the section does not shift layout when it loads.
- Start with a `rootMargin` between `300px` and `1000px` for heavier modules, then tune it based on asset weight and scroll speed.
- Disconnect the observer after loading so the import runs once.
- Keep accessibility intact: headings, landmarks, and focus order should still make sense before the module hydrates, and [PageSpeed Insights](https://pagespeed.web.dev/) is a good way to verify the route-level impact afterward.

## Verification

Use the [Chrome DevTools Performance panel](https://developer.chrome.com/docs/devtools/performance/) or a throttled waterfall trace to confirm the deferred code leaves the initial path and then arrives early enough during scroll.

1. Confirm the deferred section's code is not part of the initial route bundle or first-load request set.
2. Scroll through the page on a throttled mobile profile and verify the module request starts before the section enters the viewport.
3. Check that the placeholder reserves space so the section loads without causing CLS.
4. Tune `rootMargin` until the section appears ready when reached, typically somewhere between `300px` and `1000px` before visibility for heavier modules.
5. Re-measure the route and confirm initial JS cost, main-thread work, or page weight improves without introducing visible loading jank later in the scroll.