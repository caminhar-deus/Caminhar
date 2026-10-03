# Disable lazy loading for above-the-fold content

> Detects lazy loading on likely above-fold images to improve Largest Contentful Paint (LCP)

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Lazy loading is a powerful technique for reducing initial page weight, but it should only be applied to images and resources that are *not* immediately visible in the viewport.

## Code Examples

#

## Avoid Lazy Loading for Hero Images
```html
<!-- ❌ Bad: Lazy loading an above-the-fold hero image -->
<img src="/hero.jpg" alt="Our Product" loading="lazy">

<!-- ✅ Good: Removing lazy loading and prioritizing the image -->
<img src="/hero.jpg" alt="Our Product" fetchpriority="high">
```

### Next.js Image Component
```jsx
// ❌ Bad: Hero image with lazy loading (default)

// ✅ Good: Hero image with priority

```

## Why It Matters

Use [PageSpeed Insights](https://pagespeed.web.dev/) or Lighthouse to confirm which image is actually the LCP element before removing lazy loading, because the first visible asset is not always the real bottleneck.

- **Largest Contentful Paint (LCP)**: The Largest Contentful Paint is usually the primary hero image. If the browser waits to discover if that image is in the viewport before loading it, LCP increases significantly.
- **Resource Prioritization**: By default, lazy-loaded images are assigned a lower priority by the browser, which delays their download.
- **Visual Stability**: If critical images load late, it can lead to layout shifts (CLS) or a poor user experience as content pops in late.
- **Browser Discovery**: Browsers can't pre-scan and start downloading lazy-loaded images as early as regular images.

## Best Practices

✅ **Identify the LCP Element**: Use Lighthouse or PageSpeed Insights to find which image is your LCP candidate.
✅ **Use `fetchpriority=\"high\"`**: For your LCP image, hint to the browser that it should be prioritized.
✅ **Exclude First X Images**: A common rule of thumb is to avoid lazy loading the first 2-3 images on a page.
✅ **Test Different Viewports**: Ensure images aren't lazy-loaded on mobile even if they might be below the fold on desktop.

## Tools & Validation

- [Web Vitals Chrome Extension](https://chrome.google.com/webstore/detail/web-vitals/ahmapmhookcmichpkccnnbabaccndpjg)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)

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