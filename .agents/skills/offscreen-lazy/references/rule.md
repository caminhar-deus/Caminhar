# Lazy load offscreen images

> Images below the visible viewport use loading="lazy" to defer download until the user scrolls near them, reducing initial page load time.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
Native browser lazy loading (`loading="lazy"`) defers image downloads until the user scrolls near them, reducing initial page weight with a single attribute.

## Code Example

```html
<!-- ❌ Bad: All images load immediately regardless of position -->
<img src="product-1.jpg" alt="Product 1" width="400" height="300">
<img src="product-2.jpg" alt="Product 2" width="400" height="300">
<!-- ... 20 more product images -->

<!-- ✅ Good: Above-fold hero loads eagerly, rest defer -->
<!-- Hero image — above fold, must load immediately -->
<img
  src="hero.jpg"
  alt="Hero image"
  width="1200"
  height="600"
  fetchpriority="high"
>

<!-- Below-fold product images — defer until near viewport -->
<img src="product-1.jpg" alt="Product 1" width="400" height="300" loading="lazy">
<img src="product-2.jpg" alt="Product 2" width="400" height="300" loading="lazy">
```

## Why It Matters

Lazy loading eliminates unnecessary image downloads on initial page load. A page with 20 images below the fold may transfer several megabytes of data that users who don't scroll will never see. Deferring these downloads reduces Time to Interactive, improves LCP for above-fold content, and saves bandwidth—particularly impactful for users on metered mobile connections.

## Critical: Do Not Lazy-Load the LCP Image

The Largest Contentful Paint (LCP) element is usually the first large image visible on the page. Lazy-loading it delays the most important metric.

```html
<!-- ❌ Bad: Lazy-loading the LCP image hurts LCP score -->
<img
  src="hero.jpg"
  alt="Hero image"
  loading="lazy"
  width="1200"
  height="600"
>

<!-- ✅ Good: LCP image loads immediately with high priority -->
<img
  src="hero.jpg"
  alt="Hero image"
  width="1200"
  height="600"
  fetchpriority="high"
  decoding="async"
>
```

## Pair with Explicit Dimensions

Without `width` and `height`, lazy-loaded images cause layout shift (CLS) when they eventually load.

```html
<!-- ❌ Bad: No dimensions → layout shifts when image loads into view -->
<img src="article-photo.jpg" alt="Article photo" loading="lazy">

<!-- ✅ Good: Dimensions reserved, no shift when loading triggers -->
<img
  src="article-photo.jpg"
  alt="Article photo"
  width="800"
  height="450"
  loading="lazy"
>
```

## picture Element with Lazy Loading

Add `loading="lazy"` to the `<img>` element inside `<picture>`, not the `<source>` elements.

```html
<picture>
  <source
    type="image/avif"
    srcset="photo-400.avif 400w, photo-800.avif 800w"
    sizes="(max-width: 600px) 100vw, 50vw"
  >
  <source
    type="image/webp"
    srcset="photo-400.webp 400w, photo-800.webp 800w"
    sizes="(max-width: 600px) 100vw, 50vw"
  >
  <img
    src="photo-800.jpg"
    srcset="photo-400.jpg 400w, photo-800.jpg 800w"
    sizes="(max-width: 600px) 100vw, 50vw"
    alt="Photo description"
    width="800"
    height="600"
    loading="lazy"       <!-- Goes on the <img>, not <source> -->
    decoding="async"
  >
</picture>
```

## Framework Examples

  

```tsx
interface ImageProps {
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
}

function OptimizedImage({ src, alt, width, height, priority = false }: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      // priority images load eagerly with high fetchpriority
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
    />
  )
}

// Usage

```

  
  

```tsx

// next/image applies loading="lazy" by default
// Use priority prop to disable lazy loading for LCP images
function Gallery({ images }) {
  return (
    <div>
      {images.map((img, index) => (
        
      ))}
    </div>
  )
}
```

  

## How the Browser Determines "Near Viewport"

The browser uses a distance threshold based on network speed. On a slow connection, the threshold is larger (loading starts sooner) to compensate for slower download speeds.

Per the [HTML spec](https://html.spec.whatwg.org/multipage/embedded-content.html#attr-img-loading), the exact threshold is implementation-defined. Chromium's thresholds range from 1250px on a slow connection to 2500px on a fast connection.

## Intersection Observer (Legacy Fallback)

For environments that need custom lazy loading behaviour (e.g., custom intersection margins), use the Intersection Observer API. For most modern use cases, the native `loading="lazy"` attribute is sufficient.

```javascript
// Only needed if you need custom lazy loading behaviour
// Native loading="lazy" is preferred for standard use cases
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target
        img.src = img.dataset.src
        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset
        }
        observer.unobserve(img)
      }
    })
  },
  { rootMargin: '200px' } // Start loading 200px before entering viewport
)

document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img))
```

## Support Notes

- Image format and delivery behavior can vary by browser, CDN, and device characteristics, so verify the final bytes and rendered output on the supported browser matrix.
- Add a fallback note when a modern format or loading behavior is not available for every required target browser.

## Verification

### Automated Checks

- Open Chrome DevTools → Network → filter by "Img" → reload and scroll down—images should only appear in the Network waterfall as they enter the viewport
- Run Lighthouse — the "Defer offscreen images" audit flags lazy-loadable images
- Use the Coverage tab in DevTools to see how much data is deferred
- Verify the LCP image is NOT marked `loading="lazy"` in the Lighthouse report

### Manual Checks

- Verify the rendered or user-facing behavior manually in a representative browser or runtime flow.