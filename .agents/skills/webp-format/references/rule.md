# Use WebP format with fallbacks

> Images are served in WebP format with fallbacks for older browsers.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
WebP provides excellent compression with near-universal browser support.

## Code Example

```html
<picture>
  <source type="image/webp" srcset="image.webp">
  <img src="image.jpg" alt="Description" width="800" height="600">
</picture>
```

## Why It Matters

WebP is smaller than JPEG and PNG at similar quality—using it reduces page weight by 25-35% for images, improving load times on all devices.

## Format Comparison

| Format | Compression | Transparency | Animation | Browser Support |
|--------|-------------|--------------|-----------|-----------------|
| WebP | Excellent | Yes | Yes | 97%+ |
| JPEG | Good | No | No | 100% |
| PNG | Moderate | Yes | No | 100% |
| GIF | Poor | Yes | Yes | 100% |

## Responsive WebP with Fallback

```html
<picture>
  <!-- WebP for modern browsers -->
  <source
    type="image/webp"
    srcset="
      image-400.webp 400w,
      image-800.webp 800w,
      image-1200.webp 1200w
    "
    sizes="(max-width: 600px) 100vw, 50vw"
  >

  <!-- JPEG fallback -->
  <img
    src="image-800.jpg"
    srcset="
      image-400.jpg 400w,
      image-800.jpg 800w,
      image-1200.jpg 1200w
    "
    sizes="(max-width: 600px) 100vw, 50vw"
    alt="Description"
    width="800"
    height="600"
    loading="lazy"
  >
</picture>
```

## Converting to WebP

```bash
# Using cwebp (official tool)
cwebp -q 80 input.jpg -o output.webp

# Using Sharp
npx sharp-cli input.jpg -o output.webp --quality 80

# Using ImageMagick
convert input.jpg -quality 80 output.webp

# Batch convert all JPEGs
for f in *.jpg; do cwebp -q 80 "$f" -o "${f%.jpg}.webp"; done
```

## Sharp Node.js Conversion

```javascript
const sharp = require('sharp')

// Single image
async function convertToWebP(input, output, quality = 80) {
  await sharp(input)
    .webp({ quality })
    .toFile(output)
}

// With transparency (from PNG)
async function convertPngToWebP(input, output) {
  await sharp(input)
    .webp({
      quality: 80,
      lossless: false, // lossy compression
      alphaQuality: 90 // preserve transparency quality
    })
    .toFile(output)
}
```

## React Picture Component

```tsx
interface WebPImageProps {
  src: string
  alt: string
  width: number
  height: number
  sizes?: string
  className?: string
  priority?: boolean
}

function WebPImage({
  src,
  alt,
  width,
  height,
  sizes,
  className,
  priority
}: WebPImageProps) {
  // Generate WebP path from original
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp')

  return (
    <picture>
      <source type="image/webp" srcSet={webpSrc} />
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
      />
    </picture>
  )
}
```

## Next.js Configuration

```javascript
// next.config.js
module.exports = {
  images: {
    formats: ['image/webp'], // Prioritize WebP
    // Or include AVIF: ['image/avif', 'image/webp']
  }
}
```

## CSS Background Images

```css
/* Modernizr class approach */
.hero {
  background-image: url('hero.jpg');
}

.webp .hero {
  background-image: url('hero.webp');
}

/* Or use feature detection */
@supports (background-image: url('test.webp')) {
  .hero {
    background-image: url('hero.webp');
  }
}
```

## Server-Side Content Negotiation

```nginx
# Nginx configuration
map $http_accept $webp_suffix {
  default "";
  "~*webp" ".webp";
}

location ~* ^/images/.+\.(png|jpe?g)$ {
  add_header Vary Accept;
  try_files $uri$webp_suffix $uri =404;
}
```

## Build Pipeline Integration

```javascript
// Webpack with image-minimizer-webpack-plugin
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin')

module.exports = {
  optimization: {
    minimizer: [
      new ImageMinimizerPlugin({
        generator: [
          {
            preset: 'webp',
            implementation: ImageMinimizerPlugin.sharpGenerate,
            options: {
              encodeOptions: {
                webp: { quality: 80 }
              }
            }
          }
        ]
      })
    ]
  }
}
```

## Support Notes

- Image format and delivery behavior can vary by browser, CDN, and device characteristics, so verify the final bytes and rendered output on the supported browser matrix.
- Add a fallback note when a modern format or loading behavior is not available for every required target browser.

## Verification

### Automated Checks

- Test in Safari < 14 (if supporting)—should get JPEG/PNG fallback
- Run Lighthouse—check "Serve images in modern formats"

### Manual Checks

- Check Network tab—verify WebP is served to supporting browsers
- Compare file sizes: WebP should be 25-35% smaller
- Verify visual quality matches original