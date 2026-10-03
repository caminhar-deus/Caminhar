# Set explicit width and height on images

> All <img> elements have explicit width and height attributes so browsers can reserve space before the image loads, preventing layout shift.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
Browsers need to know an image's dimensions before it downloads so they can reserve the correct space in the layout. Without `width` and `height` attributes, the page jumps when images load—this is measured as Cumulative Layout Shift (CLS).
## Code Examples

```html
<!-- ❌ Bad: Browser reserves 0 height until image loads, then shifts layout -->
<img src="product.jpg" alt="Red running shoes">

<!-- ✅ Good: Browser reserves 600×400 space immediately -->
<img
  src="product.jpg"
  alt="Red running shoes"
  width="600"
  height="400"
>
```

Add CSS to keep the image responsive while the HTML attributes reserve space:

```css
img {
  max-width: 100%;
  height: auto; /* Overrides the height attribute for responsive scaling */
}
```

## Why It Matters

Images without explicit dimensions are the most common cause of Cumulative Layout Shift (CLS), a Core Web Vitals metric. When images load and cause layout jumps, users accidentally click the wrong element—a frustrating experience that Google penalises in search rankings. A CLS score above 0.1 is considered 'needs improvement'; above 0.25 is 'poor'.

## How Browsers Use These Attributes

Modern browsers (Chrome 79+, Firefox 71+, Safari 15+) automatically derive the `aspect-ratio` from the HTML `width` and `height` attributes:

```css
/* The browser internally applies this rule when width/height are present */
img {
  aspect-ratio: attr(width) / attr(height);
}
```

This means reserving space works even before the CSS loads, provided the HTML attributes are present.

## Responsive Images with Correct Dimensions

For responsive images using `srcset`, set dimensions matching the largest intrinsic size (or the 1x size). The browser will scale down using CSS but reserve space proportionally.

```html
<!-- ✅ Dimensions on the <img>, not on <source> elements -->
<picture>
  <source
    type="image/avif"
    srcset="hero-800.avif 800w, hero-1600.avif 1600w"
    sizes="(max-width: 800px) 100vw, 800px"
  >
  <source
    type="image/webp"
    srcset="hero-800.webp 800w, hero-1600.webp 1600w"
    sizes="(max-width: 800px) 100vw, 800px"
  >
  <img
    src="hero-800.jpg"
    srcset="hero-800.jpg 800w, hero-1600.jpg 1600w"
    sizes="(max-width: 800px) 100vw, 800px"
    alt="Hero image"
    width="1600"
    height="900"
  >
</picture>
```

## Dynamic Images

For images with dynamic dimensions, calculate from the known aspect ratio.

```tsx
// React: Preserve aspect ratio from known values
interface AspectImageProps {
  src: string
  alt: string
  aspectRatio: '16/9' | '4/3' | '1/1'
}

const ASPECT_DIMENSIONS = {
  '16/9': { width: 1600, height: 900 },
  '4/3': { width: 800, height: 600 },
  '1/1': { width: 800, height: 800 },
}

function AspectImage({ src, alt, aspectRatio }: AspectImageProps) {
  const { width, height } = ASPECT_DIMENSIONS[aspectRatio]

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  )
}
```

## Next.js

Next.js `` requires `width` and `height` props (or `fill`) and handles layout shift prevention automatically.

```tsx

// next/image enforces dimensions at compile time
function ProductCard({ product }) {
  return (
    
  )
}
```

## Implementation Notes

When intrinsic dimensions are not known at author time, reserve space with a stable aspect ratio instead of letting the image collapse.

```css
.image-frame {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
}

.image-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

Background images need the same reservation strategy on the container:

```css
.hero {
  aspect-ratio: 21 / 9;
  background: center / cover no-repeat url('/hero.jpg');
}
```

## Measuring CLS Impact

```javascript
// Measure CLS using the web-vitals library

onCLS(metric => {
  console.log('CLS score:', metric.value)

  // Log which elements caused the shift
  metric.entries.forEach(entry => {
    console.log('Shift sources:', entry.sources)
  })
})
```

## Tools & Validation

```javascript
document.querySelectorAll('img').forEach(img => {
  if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
    console.warn('Image missing dimensions:', img.currentSrc || img.src)
  }
})
```

- Use Lighthouse or PageSpeed Insights to confirm missing dimensions show up as real CLS contributors.
- In Chrome DevTools, enable Layout Shift Regions in the Rendering panel to verify the fix stops movement rather than only changing markup.

## Verification

### Automated Checks

- Run Lighthouse — the "Image elements do not have explicit width and height" audit flags missing attributes
- Run PageSpeed Insights — CLS is reported from real user data
- Use Chrome DevTools → Performance panel → record page load, look for layout shift markers

### Manual Checks

- Install the Web Vitals Chrome extension to see CLS scores in real time
- **CSS background images** — dimensions are controlled via `background-size` and container sizing; HTML attributes do not apply
- **SVG icons** inline or as `<img>` where width/height CSS is set absolutely (e.g., `width: 24px; height: 24px`)—layout shift risk is negligible
- **Tiny decorative SVG dividers or ornaments** where the snippet already shows stable CSS sizing and the asset carries no content meaning
- **Images in fixed-height containers** where overflow is hidden—the container already reserves space regardless of image dimensions