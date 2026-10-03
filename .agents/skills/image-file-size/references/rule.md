# Keep image file sizes within recommended limits

> Individual image files are compressed to reasonable sizes to avoid wasted bandwidth and slow load times, especially on mobile networks.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Image file size is the biggest single contributor to page weight. Keeping file sizes in check directly improves load time, LCP, and bandwidth costs.

## Code Example

```bash
# Using Sharp (Node.js) — recommended settings

# WebP (photos)
sharp('input.jpg').webp({ quality: 80 }).toFile('output.webp')

# AVIF (photos, highest compression)
sharp('input.jpg').avif({ quality: 60, effort: 6 }).toFile('output.avif')

# JPEG (legacy fallback)
sharp('input.jpg').jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile('output.jpg')

# PNG (lossless with metadata stripping)
sharp('input.png').png({ compressionLevel: 9, effort: 10 }).toFile('output.png')
```

## Why It Matters

Images account for over 50% of average page weight according to HTTP Archive data. Oversized images waste user bandwidth (costly on mobile data plans), delay Largest Contentful Paint (LCP), and increase bounce rates. A 1-second delay in mobile page load can reduce conversions by up to 20% according to Google research.

## Recommended Size Thresholds

| Image Type | Max Recommended Size | Format |
|-----------|---------------------|--------|
| Hero / full-bleed banner | 400KB | WebP or AVIF |
| Content photo (article, blog) | 200KB | WebP or AVIF |
| Product image (e-commerce) | 150KB | WebP or AVIF |
| Thumbnail | 30KB | WebP or AVIF |
| Icon / logo | 10KB | SVG or WebP |
| PNG with transparency | 100KB | WebP (with alpha) or PNG |

These are targets, not hard limits—an image serving 40% of users at 1600px width may reasonably exceed 200KB if optimised correctly.

## Format Compression Comparison

According to [web.dev](https://web.dev/articles/serve-images-webp):
- **WebP** produces files ~25-35% smaller than equivalent-quality JPEG
- **AVIF** produces files ~40-50% smaller than equivalent-quality JPEG

```html
<!-- Use <picture> to serve the smallest supported format -->
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
    loading="lazy"
  >
</picture>
```

## Batch Optimisation Script

```javascript
// scripts/optimise-images.mjs

const THRESHOLDS = {
  '.jpg': 200 * 1024,   // 200KB
  '.jpeg': 200 * 1024,
  '.png': 100 * 1024,
  '.webp': 200 * 1024,
}

const images = globSync('public/images/**/*.{jpg,jpeg,png,webp}')

for (const imgPath of images) {
  const ext = path.extname(imgPath).toLowerCase()
  const threshold = THRESHOLDS[ext]
  const size = statSync(imgPath).size

  if (size > threshold) {
    console.warn(`Oversized: ${imgPath} (${Math.round(size / 1024)}KB, threshold ${Math.round(threshold / 1024)}KB)`)

    // Generate WebP version
    const webpPath = imgPath.replace(ext, '.webp')
    await sharp(imgPath)
      .webp({ quality: 80 })
      .toFile(webpPath)

    const webpSize = statSync(webpPath).size
    const saving = Math.round((1 - webpSize / size) * 100)
    console.log(`  → WebP: ${Math.round(webpSize / 1024)}KB (${saving}% smaller)`)
  }
}
```

## Lighthouse CI Integration

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    assert: {
      assertions: {
        // Fail if any image could be reduced by more than 4KB
        'uses-optimized-images': ['error', { minScore: 0.9 }],
        // Fail if any image is significantly larger than its display size
        'uses-responsive-images': ['error', { minScore: 0.9 }],
      }
    }
  }
}
```

## Stripping EXIF Metadata

Camera images embed EXIF metadata (GPS location, camera model, timestamps) that adds unnecessary bytes. Strip it before serving.

```javascript
// Sharp strips metadata by default when converting format
// For JPEG-to-JPEG, use withMetadata(false)
await sharp('input.jpg')
  .jpeg({ quality: 80 })
  // metadata is stripped by default; use .withMetadata() to preserve it
  .toFile('output.jpg')
```

## Testing

1. Open Chrome DevTools → Network tab → filter by Img → check Transfer Size column
2. Run Lighthouse — look for "Properly size images" and "Efficiently encode images" opportunities
3. Use WebPageTest waterfall view to identify large image requests
4. Run the batch optimisation script above in CI to flag regressions

## Verification

### Automated Checks

- Compare before/after transfer sizes in DevTools or your CDN logs to ensure the optimised asset is actually being served in production.
- Review a few images visually on real devices to avoid introducing visible artefacts while chasing byte savings.

### Manual Checks

- Confirm photos stay under roughly `200KB`, hero images under `400KB`, and thumbnails under `30KB` unless there is a documented exception.
- Re-check LCP after compression work because the largest image often dominates the metric.