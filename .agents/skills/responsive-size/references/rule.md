# Serve images at the correct display size

> Images are not significantly larger than their display dimensions—serving a 2000px image for a 400px container wastes bandwidth and hurts LCP.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
"Responsive size" means the image's pixel dimensions match how large it actually renders in the browser. Serving a 2000px image for a 300px thumbnail downloads ~44x unnecessary data.

## Code Example

```html
<!-- ❌ Bad: 2000px image rendered at 400px — 25x too much data -->
<img src="photo-2000w.jpg" alt="Product photo" style="width: 400px;">

<!-- The browser downloads a 2000×1500px image but only displays 400×300px -->
<!-- If photo-2000w.jpg is 800KB, photo-400w.jpg would be ~50KB -->
```

## Why It Matters

A single oversized hero image can add several megabytes to a page load unnecessarily. On mobile devices with 375px screens, serving a 1600px image downloads 4x the data users need. The 'Properly size images' Lighthouse audit consistently identifies this as one of the highest-impact performance opportunities on most websites.

## The Solution: srcset and sizes

```html
<!-- ✅ Good: Browser picks the appropriate size based on viewport and display density -->
<img
  src="photo-800w.jpg"
  srcset="
    photo-400w.jpg   400w,
    photo-800w.jpg   800w,
    photo-1200w.jpg 1200w,
    photo-1600w.jpg 1600w
  "
  sizes="(max-width: 480px) 100vw,
         (max-width: 900px) 50vw,
         400px"
  alt="Product photo"
  width="1600"
  height="1200"
  loading="lazy"
>
```

## Understanding the sizes Attribute

`sizes` tells the browser how wide the image will be rendered at each breakpoint. The browser uses this—combined with the viewport width and device pixel ratio—to pick the optimal `srcset` candidate.

```html
<!-- sizes examples for common layout patterns -->

<!-- Full-width image -->
<img sizes="100vw" ...>

<!-- Half-width grid on desktop, full-width on mobile -->
<img sizes="(max-width: 768px) 100vw, 50vw" ...>

<!-- Card in a 3-column grid with 24px gap, max 1200px container -->
<img sizes="(max-width: 768px) 100vw, (max-width: 1200px) calc(33vw - 24px), 376px" ...>

<!-- Sidebar image: fixed 300px on desktop, full-width on mobile -->
<img sizes="(max-width: 768px) 100vw, 300px" ...>
```

If you omit `sizes`, the browser assumes the image is 100% of viewport width and downloads the largest `srcset` candidate even on narrow mobile screens. Always include a `sizes` attribute when using `srcset`.

## Generating Multiple Sizes

```javascript
// scripts/generate-sizes.mjs

const WIDTHS = [400, 800, 1200, 1600]

async function generateSizes(inputPath) {
  const { dir, name, ext } = path.parse(inputPath)

  for (const width of WIDTHS) {
    const outputPath = path.join(dir, `${name}-${width}w${ext}`)

    await sharp(inputPath)
      .resize(width, null, {
        withoutEnlargement: true, // Don't upscale images smaller than the target width
        fit: 'inside',
      })
      .toFile(outputPath)

    console.log(`Generated: ${outputPath}`)
  }
}

// Usage
await generateSizes('public/images/hero.jpg')
```

## Checking Against Display Size

Use DevTools to compare intrinsic vs rendered dimensions.

```javascript
// Paste in DevTools console to find oversized images on the page
const oversized = Array.from(document.querySelectorAll('img'))
  .filter(img => img.complete && img.naturalWidth > 0)
  .map(img => {
    const rendered = img.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const renderedPx = rendered.width * dpr

    return {
      src: img.src.split('/').pop(),
      intrinsic: img.naturalWidth,
      rendered: Math.round(renderedPx),
      ratio: Math.round(img.naturalWidth / renderedPx),
    }
  })
  .filter(img => img.ratio > 2) // Flag anything more than 2x oversized

console.table(oversized)
```

## Framework Examples

  

```tsx
interface ResponsiveImageProps {
  baseSrc: string      // e.g., "/images/photo"
  ext?: string         // e.g., "jpg" (default)
  alt: string
  sizes: string
  aspectRatio?: string // e.g., "16/9"
  widths?: number[]
  priority?: boolean
}

function ResponsiveImage({
  baseSrc,
  ext = 'jpg',
  alt,
  sizes,
  widths = [400, 800, 1200, 1600],
  priority = false,
}: ResponsiveImageProps) {
  const srcset = widths.map(w => `${baseSrc}-${w}w.${ext} ${w}w`).join(', ')
  const [maxWidth, maxHeight] = [widths[widths.length - 1], undefined]

  return (
    <img
      src={`${baseSrc}-${widths[1]}w.${ext}`}
      srcSet={srcset}
      sizes={sizes}
      alt={alt}
      width={maxWidth}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  )
}

// Usage

```

  
  

```tsx

// next/image handles srcset and sizes automatically
function ProductCard({ product }) {
  return (
    
  )
}
```

  

## Verification

### Automated Checks

- Run Lighthouse — "Properly size images" audit shows potential savings per image
- In Chrome DevTools → Elements → hover over an image source to see intrinsic vs rendered size
- Run the DevTools console script above to find all oversized images on the current page
- Test on a mobile viewport (375px) and check the Network tab to verify small srcset candidates are chosen

### Manual Checks

- Verify the rendered or user-facing behavior manually in a representative browser or runtime flow.