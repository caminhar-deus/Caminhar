# Use progressive JPEG encoding

> JPEG images use progressive format for better perceived loading performance.

**Priority:** low · **Difficulty:** beginner · **Time:** 10 min

---
Progressive JPEGs improve perceived performance by showing a preview immediately.

## Code Examples

```bash
# Using ImageMagick
identify -verbose image.jpg | grep Interlace
# Progressive: Interlace: JPEG
# Baseline: Interlace: None

# Using file command
file image.jpg
# Progressive shows "progressive"
```

```javascript
// Browser check using canvas
async function isProgressiveJPEG(url: string): Promise<boolean> {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // Check for progressive marker (0xFF 0xC2)
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0xFF && bytes[i + 1] === 0xC2) {
      return true
    }
  }
  return false
}
```

## Why It Matters

Progressive JPEGs display a low-quality preview immediately rather than loading line-by-line—users see something faster, improving perceived performance even if total load time is similar.

## Baseline vs Progressive JPEG

| Type | Loading Behavior | User Experience |
|------|-----------------|-----------------|
| Baseline | Top-to-bottom, line by line | Incomplete image visible |
| Progressive | Blurry → clear (multiple passes) | Full image visible immediately |

## Converting to Progressive

```bash
# ImageMagick
convert input.jpg -interlace JPEG output.jpg

# Sharp (Node.js)
sharp('input.jpg')
  .jpeg({ progressive: true, quality: 80 })
  .toFile('output.jpg')

# ImageOptim CLI
imageoptim --jpeg-encoding progressive input.jpg
```

## Build Tool Integration

```javascript
// sharp.config.js for build process
const sharp = require('sharp')

async function optimizeJpeg(inputPath, outputPath) {
  await sharp(inputPath)
    .jpeg({
      quality: 80,
      progressive: true,
      mozjpeg: true // Even better compression
    })
    .toFile(outputPath)
}
```

## Webpack Configuration

```javascript
// webpack.config.js with image-minimizer-webpack-plugin
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin')

module.exports = {
  optimization: {
    minimizer: [
      new ImageMinimizerPlugin({
        minimizer: {
          implementation: ImageMinimizerPlugin.sharpMinify,
          options: {
            encodeOptions: {
              jpeg: {
                quality: 80,
                progressive: true
              }
            }
          }
        }
      })
    ]
  }
}
```

## React Image Component

```tsx
// Ensure JPEG generation uses progressive encoding
function ProductImage({ src, alt }: { src: string; alt: string }) {
  // If using image CDN, request progressive format
  const progressiveSrc = src.includes('cloudinary')
    ? src.replace('/upload/', '/upload/fl_progressive/')
    : src

  return (
    <img
      src={progressiveSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  )
}
```

## CDN Progressive Flags

```html
<!-- Cloudinary -->
<img src="https://res.cloudinary.com/demo/image/upload/fl_progressive/sample.jpg">

<!-- Imgix -->
<img src="https://example.imgix.net/image.jpg?fm=pjpg">

<!-- Cloudflare -->
<!-- Progressive is typically default for JPEGs -->
```

## When to Use Progressive JPEG

| Scenario | Recommendation |
|----------|---------------|
| Large hero images | Use progressive |
| Thumbnails (small) | Baseline is fine |
| Above-the-fold | Progressive helps perceived LCP |
| WebP/AVIF available | Less important (use modern formats) |

## Standards

- Use these references as the standard for the final image format, delivery, accessibility, and rendering behavior.
- Check the implementation against MDN: Responsive images before treating the rule as satisfied.
- Check the implementation against web.dev: Image performance before treating the rule as satisfied.

## Verification

1. Use browser DevTools to observe image loading
2. Compare baseline vs progressive on slow connection (DevTools throttling)
3. Check file sizes—progressive should be similar or smaller
4. Verify with `identify -verbose` command

WebP and AVIF provide better compression and loading than progressive JPEG. Use progressive JPEG as a fallback for browsers that don't support modern formats.