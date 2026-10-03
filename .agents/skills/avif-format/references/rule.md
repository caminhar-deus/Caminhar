# Use AVIF format for modern browsers

> Images support AVIF format for superior compression with proper browser fallbacks.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
AVIF is the most efficient image format available, offering superior compression for modern browsers.

## Code Example

```html
<picture>
  <!-- AVIF for modern browsers -->
  <source
    type="image/avif"
    srcset="
      image-400.avif 400w,
      image-800.avif 800w,
      image-1200.avif 1200w
    "
    sizes="(max-width: 600px) 100vw, 50vw"
  >

  <!-- WebP fallback -->
  <source
    type="image/webp"
    srcset="
      image-400.webp 400w,
      image-800.webp 800w,
      image-1200.webp 1200w
    "
    sizes="(max-width: 600px) 100vw, 50vw"
  >

  <!-- JPEG fallback for older browsers -->
  <img
    src="image-800.jpg"
    srcset="
      image-400.jpg 400w,
      image-800.jpg 800w,
      image-1200.jpg 1200w
    "
    sizes="(max-width: 600px) 100vw, 50vw"
    alt="Product image"
    width="800"
    height="600"
    loading="lazy"
  >
</picture>
```

## Why It Matters

AVIF provides the best compression available—50% smaller than JPEG and 20% smaller than WebP—dramatically reducing bandwidth and improving load times.

## Format Comparison

| Format | Compression | Browser Support | Best For |
|--------|-------------|-----------------|----------|
| AVIF | Excellent (best) | 93%+ | Photos, complex images |
| WebP | Very good | 97%+ | General use |
| JPEG | Good | 100% | Fallback |
| PNG | Moderate | 100% | Transparency, screenshots |

## Generating AVIF Images

```bash
# Using Sharp (Node.js)
npx sharp-cli input.jpg -o output.avif

# Using ImageMagick 7+
magick input.jpg output.avif

# Using avifenc (libavif)
avifenc input.png output.avif --min 20 --max 30
```

```javascript
// Sharp programmatic conversion
const sharp = require('sharp')

async function convertToAvif(input, output) {
  await sharp(input)
    .avif({
      quality: 60, // AVIF quality (lower = smaller, 60 is good balance)
      effort: 4    // Compression effort (0-9, higher = slower but smaller)
    })
    .toFile(output)
}
```

## Build Tool Integration

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
              avif: { quality: 60 },
              webp: { quality: 75 }
            }
          }
        },
        generator: [
          {
            preset: 'avif',
            implementation: ImageMinimizerPlugin.sharpGenerate,
            options: {
              encodeOptions: { avif: { quality: 60 } }
            }
          }
        ]
      })
    ]
  }
}
```

## Next.js Configuration

```javascript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    // Next.js automatically serves AVIF when supported
  }
}
```

## React Component with Format Negotiation

```tsx
interface ModernImageProps {
  src: string
  alt: string
  width: number
  height: number
  sizes?: string
}

function ModernImage({ src, alt, width, height, sizes = '100vw' }: ModernImageProps) {
  const basePath = src.replace(/\.[^/.]+$/, '') // Remove extension

  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`${basePath}.avif`}
      />
      <source
        type="image/webp"
        srcSet={`${basePath}.webp`}
      />
      <img
        src={`${basePath}.jpg`}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />
    </picture>
  )
}
```

## CDN Auto-Format Conversion

```html
<!-- Cloudinary auto format -->
<img src="https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg">
<!-- Serves AVIF to supported browsers automatically -->

<!-- Imgix auto format -->
<img src="https://example.imgix.net/image.jpg?auto=format">

<!-- Cloudflare Polish (automatic) -->
<!-- Enable in dashboard - serves best format automatically -->
```

## Quality Guidelines

| Use Case | AVIF Quality | Equivalent JPEG |
|----------|--------------|-----------------|
| Hero/large images | 50-60 | 80-85 |
| Product photos | 60-70 | 85-90 |
| Thumbnails | 40-50 | 75-80 |
| Icons/logos | Use SVG or PNG instead |

## Support Notes

- Image format and delivery behavior can vary by browser, CDN, and device characteristics, so verify the final bytes and rendered output on the supported browser matrix.
- Add a fallback note when a modern format or loading behavior is not available for every required target browser.

## Verification

1. Check browser DevTools Network tab—verify AVIF is served
2. Compare file sizes: AVIF vs WebP vs JPEG
3. Verify fallback works in Safari < 16 or older browsers
4. Check visual quality at different compression levels
5. Test encoding time for build process impact

AVIF encoding is slower than JPEG/WebP. Pre-generate AVIF images at build time rather than on-the-fly for large image sets.