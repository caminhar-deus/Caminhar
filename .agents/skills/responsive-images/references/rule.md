# Implement responsive images with srcset

> Images use srcset and sizes attributes for responsive delivery across devices.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Responsive images deliver the right size image for each device, saving bandwidth and improving performance.

## Code Example

```html
<img
  src="image-800.jpg"
  srcset="
    image-400.jpg 400w,
    image-800.jpg 800w,
    image-1200.jpg 1200w,
    image-1600.jpg 1600w
  "
  sizes="(max-width: 600px) 100vw,
         (max-width: 1200px) 50vw,
         33vw"
  alt="Responsive image"
  width="800"
  height="600"
>
```

## Why It Matters

Serving a 2000px image to a 400px phone screen wastes bandwidth and slows loading—srcset lets the browser download only the size it needs.

## Understanding sizes Attribute

| sizes Value | Meaning |
|-------------|---------|
| `100vw` | Image takes full viewport width |
| `50vw` | Image takes half viewport width |
| `(max-width: 600px) 100vw` | Full width on screens up to 600px |
| `33vw` | Default when no condition matches |

## srcset with Pixel Density (x) Descriptors

```html
<!-- For fixed-size images (icons, logos) -->
<img
  src="logo.png"
  srcset="
    logo.png 1x,
    logo@2x.png 2x,
    logo@3x.png 3x
  "
  alt="Logo"
  width="200"
  height="50"
>
```

## Picture Element for Art Direction

```html
<picture>
  <!-- Different crop for mobile -->
  <source
    media="(max-width: 600px)"
    srcset="hero-mobile.webp 600w, hero-mobile-2x.webp 1200w"
    sizes="100vw"
    type="image/webp"
  >
  <!-- Desktop version -->
  <source
    media="(min-width: 601px)"
    srcset="hero-desktop.webp 1200w, hero-desktop-2x.webp 2400w"
    sizes="100vw"
    type="image/webp"
  >
  <!-- Fallback -->
  <img src="hero-desktop.jpg" alt="Hero" width="1200" height="600">
</picture>
```

## React Responsive Image Component

```tsx
interface ResponsiveImageProps {
  src: string
  alt: string
  sizes: string
  widths?: number[]
  className?: string
}

function ResponsiveImage({
  src,
  alt,
  sizes,
  widths = [400, 800, 1200, 1600],
  className
}: ResponsiveImageProps) {
  const srcSet = widths
    .map(w => `${getImageUrl(src, w)} ${w}w`)
    .join(', ')

  return (
    <img
      src={getImageUrl(src, widths[1])} // Default to medium size
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
    />
  )
}

function getImageUrl(src: string, width: number): string {
  // Example: append width parameter for CDN
  return `${src}?w=${width}`
}

// Usage

```

## Next.js Automatic Responsive Images

```tsx

function ProductCard({ product }: { product: Product }) {
  return (
    
  )
}
```

## Common sizes Patterns

```html
<!-- Full width hero -->
<img sizes="100vw" ...>

<!-- Two-column layout on desktop -->
<img sizes="(min-width: 1024px) 50vw, 100vw" ...>

<!-- Three-column grid -->
<img sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" ...>

<!-- Fixed sidebar, fluid main -->
<img sizes="(min-width: 1024px) calc(100vw - 300px), 100vw" ...>
```

## Generating Multiple Sizes

```javascript
// Build script to generate image sizes
const sharp = require('sharp')

const sizes = [400, 800, 1200, 1600, 2000]

async function generateSizes(inputPath, outputDir) {
  for (const width of sizes) {
    await sharp(inputPath)
      .resize(width)
      .webp({ quality: 80 })
      .toFile(`${outputDir}/image-${width}.webp`)
  }
}
```

## Browser Selection Logic

The browser considers:
1. Viewport width
2. Device pixel ratio (DPR)
3. `sizes` attribute value
4. Available `srcset` options

```text
Example: 400px viewport, 2x DPR, sizes="100vw"
- Needs: 400px × 2 = 800 CSS pixels worth of image data
- Browser selects: image-800.jpg (or next larger)
```

## Testing

1. Open DevTools Network tab, filter by Images
2. Resize viewport—different sizes should load
3. Check which srcset variant was selected in Network details
4. Test on real mobile devices (different DPRs)
5. Use Lighthouse to verify responsive images are implemented

## Verification

### Automated Checks

- Re-test key pages in DevTools or WebPageTest after deployment to confirm the CDN or image component preserves the responsive variants.

### Manual Checks

- Confirm the browser selects smaller image candidates on narrow viewports and higher-density variants on retina screens.
- Check that the `sizes` attribute matches the real CSS layout; if the layout changes, update `sizes` in the same PR.
- Verify you are not sending a `1600w` image to a viewport that only renders it at a few hundred CSS pixels.