# Implement lazy loading for offscreen content

> Images and heavy resources below the fold are lazy loaded to improve initial performance.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
Lazy loading is a prioritization tool, not a blanket rule. [web.dev's performance guidance](https://web.dev/learn/performance) treats it as a way to defer genuinely offscreen work, and it pairs naturally with [import-on-visibility](/en/rules/performance/import-on-visibility) when whole sections need JavaScript deferral.

## Code Examples

#

## Native Lazy Loading for Media

```html
<!-- Good: below-the-fold image -->
<img
  src="product.jpg"
  alt="Product"
  width="400"
  height="300"
  loading="lazy"
>

<!-- Good: heavy embed kept off the critical path -->
<iframe
  src="https://www.youtube.com/embed/..."
  loading="lazy"
  width="560"
  height="315"
  title="Video"
></iframe>
```

### Keep First-Viewport Media Eager

```tsx

function ProductGrid({ products }) {
  return (
    <div className="grid">
      {products.map((product, index) => (
        
      ))}
    </div>
  )
}
```

### Use Intersection Observer for Section-Level Deferral

```tsx

function LazySection({ children, fallback, rootMargin = '300px' }) {
  const ref = useRef{isVisible ? children : fallback}</div>
}
```

## Why It Matters

- **Lower initial transfer**: offscreen images, embeds, and iframes stop competing with CSS, fonts, and hero media.
- **Better resource ordering**: the browser can spend its early bandwidth on current-route content instead of speculative content lower on the page.
- **Less wasted work**: many users never scroll to the bottom of the route.
- **Easy to misuse**: lazy-loading the wrong asset can make LCP worse instead of better, which is why [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/) and field measurements should confirm the change.

## When to Lazy Load

| Content | Lazy load? | Guidance |
|---------|------------|----------|
| Hero image or likely LCP media | No | Load it immediately and give it high priority |
| Images clearly below the fold | Yes | Native `loading="lazy"` is usually enough |
| Product grids and card feeds | Usually | Exclude the first visible row or roughly the first `2-4` images |
| Heavy iframes and video embeds | Yes | Prefer placeholders or facades plus lazy loading |
| Offscreen sections with expensive content | Sometimes | Use Intersection Observer only when native lazy loading is not enough |

## Native Lazy Loading vs Intersection Observer

- Use native `loading="lazy"` for standard images and iframes.
- Use Intersection Observer when you need custom placeholders, section-level deferral, or earlier loading before the user reaches the element.
- Start with a `rootMargin` around `200px-400px`; increase it only if fast scrolls outrun your placeholders.

## Common Mistakes

- **Lazy-loading the LCP element**: this is a direct regression for perceived load speed.
- **Marking every image lazy**: large desktop viewports can make several images visible immediately.
- **Skipping dimensions or placeholders**: deferred media must still reserve space to avoid CLS.
- **Using JavaScript for simple image lazy loading**: native browser support should be the default choice.
- **Loading offscreen sections too late**: users should not scroll into blank sections while the content catches up.

## Support Notes

- Native lazy-loading behavior varies by browser heuristics, so test the real scrolling and above-the-fold thresholds in the project target browsers.
- Use a fallback note when a browser ignores the attribute or when a framework changes the loading strategy under the hood.

## Verification

Validate the final scroll behavior in [PageSpeed Insights](https://pagespeed.web.dev/) or a throttled waterfall trace, because the goal is not just fewer initial requests but offscreen media that still appears ready when users reach it.

### Automated Checks

- Inspect the network waterfall and verify below-the-fold images and embeds start after critical CSS, fonts, and hero assets.
- Check that deferred content reserves space with explicit dimensions or placeholders so CLS remains low.

### Manual Checks

- Confirm the LCP image and any clearly above-the-fold media do not use `loading="lazy"`.
- Scroll through the page on a throttled mobile profile and confirm sections are ready before users reach them.
- If you add Intersection Observer, confirm it solves a real gap that native lazy loading could not handle cleanly.