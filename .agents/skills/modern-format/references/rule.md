# Use modern image formats (WebP, AVIF)

> Images are served in modern formats (WebP or AVIF) instead of legacy JPEG/PNG where browser support allows, reducing file size without visible quality loss.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
WebP and AVIF are modern image formats that achieve smaller file sizes than JPEG and PNG at equivalent visual quality. Using them with proper fallbacks is safe and impactful.

## Code Example

```html
<!-- ❌ Bad: Legacy JPEG only -->
<img src="photo.jpg" alt="Mountain landscape">

<!-- ✅ Good: AVIF → WebP → JPEG fallback chain -->
<picture>
  <!-- Best compression, modern browsers -->
  <source
    type="image/avif"
    srcset="photo.avif"
  >
  <!-- Good compression, broad support -->
  <source
    type="image/webp"
    srcset="photo.webp"
  >
  <!-- Universal fallback -->
  <img
    src="photo.jpg"
    alt="Mountain landscape"
    width="800"
    height="600"
    loading="lazy"
  >
</picture>
```

## Why It Matters

Images are typically 50%+ of page weight. Switching from JPEG to WebP alone reduces transfer sizes by 25-35% with no visible quality change, directly improving Largest Contentful Paint (LCP) and saving bandwidth for users on mobile data plans. These savings compound across every visitor and every image on the site.

## Format Overview

| Format | Best For | vs JPEG | Browser Support |
|--------|----------|---------|-----------------|
| **AVIF** | Photos, graphics | ~40-50% smaller | Chrome 85+, Firefox 93+, Safari 16.4+ |
| **WebP** | Photos, graphics, transparent | ~25-35% smaller | 97%+ global (Chrome, Firefox, Safari, Edge) |
| **JPEG** | Photos (legacy fallback) | Baseline | Universal |
| **PNG** | Transparency (legacy fallback) | Larger | Universal |
| **SVG** | Icons, illustrations | N/A — vector | Universal |

Source: [web.dev — Serve images in modern formats](https://web.dev/articles/serve-images-webp)

## Responsive + Modern Format Combined

Combine format selection with responsive sizes for maximum efficiency.

```html
<picture>
  <source
    type="image/avif"
    srcset="
      photo-400.avif  400w,
      photo-800.avif  800w,
      photo-1200.avif 1200w
    "
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 600px"
  >
  <source
    type="image/webp"
    srcset="
      photo-400.webp  400w,
      photo-800.webp  800w,
      photo-1200.webp 1200w
    "
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 600px"
  >
  <img
    src="photo-800.jpg"
    srcset="
      photo-400.jpg  400w,
      photo-800.jpg  800w,
      photo-1200.jpg 1200w
    "
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 600px"
    alt="Mountain landscape"
    width="1200"
    height="800"
    loading="lazy"
  >
</picture>
```

## Converting Images with Sharp

```javascript
// scripts/convert-to-modern-formats.mjs

const images = globSync('public/images/**/*.{jpg,jpeg,png}')

for (const imgPath of images) {
  const { dir, name } = path.parse(imgPath)

  // Generate WebP
  await sharp(imgPath)
    .webp({ quality: 80 })
    .toFile(path.join(dir, `${name}.webp`))

  // Generate AVIF (slower to encode but smallest output)
  await sharp(imgPath)
    .avif({ quality: 60, effort: 6 })
    .toFile(path.join(dir, `${name}.avif`))

  console.log(`Converted: ${name}`)
}
```

## CSS Background Images

```css
/* ❌ No format negotiation — JPEG served to all browsers */
.hero {
  background-image: url('/images/hero.jpg');
}

/* ✅ WebP for supporting browsers, JPEG fallback */
.hero {
  background-image: url('/images/hero.jpg'); /* Fallback */
}

@supports (background-image: url('test.webp')) {
  .hero {
    background-image: url('/images/hero.webp');
  }
}
```

For CSS background images, a CDN like Cloudflare, Imgix, or Cloudinary can serve the optimal format automatically based on the `Accept` header, eliminating the need for `@supports` queries entirely.

## Next.js

Next.js `` automatically serves WebP and AVIF to supported browsers without any extra markup.

```tsx

// next/image serves WebP/AVIF automatically based on browser Accept header
function Hero() {
  return (
    
  )
}

// Configure quality in next.config.js
// module.exports = {
//   images: {
//     formats: ['image/avif', 'image/webp'],
//     qualities: [60, 75, 85, 90, 95],
//   }
// }
```

## Verifying Format Delivery

```javascript
// Check which format browsers are actually receiving
// In Chrome DevTools → Network → filter "Img" → check "Type" column
// Should show "webp" or "avif", not "jpeg"

// Or check the Content-Type response header:
// Content-Type: image/webp
// Content-Type: image/avif
```

## Support Notes

- Image format and delivery behavior can vary by browser, CDN, and device characteristics, so verify the final bytes and rendered output on the supported browser matrix.
- Add a fallback note when a modern format or loading behavior is not available for every required target browser.

## Verification

### Automated Checks

- Open Chrome DevTools → Network → filter by "Img" → check the "Type" column—it should show "webp" or "avif"
- Run Lighthouse — the "Serve images in modern formats" audit flags JPEG/PNG images that could be WebP
- Test in Safari (to verify JPEG fallback works) by checking Network tab for image format

### Manual Checks

- Use Squoosh to compare file sizes visually at the same quality setting