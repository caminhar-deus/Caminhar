# Serve images from a CDN

> Images are served from a CDN with automatic optimization, resizing, and format conversion.

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
Image CDNs automatically optimize images and deliver them from edge locations worldwide.

## Code Example

```html
<!-- Cloudinary: resize, format, quality -->
<img src="https://res.cloudinary.com/demo/image/upload/w_400,h_300,c_fill,f_auto,q_auto/sample.jpg">

<!-- Imgix: responsive with fit and format -->
<img src="https://example.imgix.net/image.jpg?w=400&h=300&fit=crop&auto=format,compress">

<!-- Cloudflare Images: variants -->
<img src="https://imagedelivery.net/account/image-id/public">
```

## Why It Matters

Image CDNs automatically optimize, resize, and convert images on-the-fly—delivering the smallest file in the best format without manual processing.

## Popular Image CDNs

| Provider | Key Features |
|----------|-------------|
| Cloudinary | AI-based optimization, extensive transformations |
| Imgix | URL-based API, real-time processing |
| Cloudflare Images | Low cost, global network |
| Vercel/Next.js Image | Built-in for Next.js projects |
| Bunny.net | Budget-friendly, simple API |

## Next.js Image Optimization

```tsx

// next.config.js configures remote domains
function ProductImage({ product }: { product: Product }) {
  return (
    
  )
}
```

```javascript
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      { hostname: 'res.cloudinary.com' },
      { hostname: 'images.example.com' }
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  }
}
```

## Cloudinary Integration

```tsx

function HeroImage() {
  return (
    
  )
}

// Generate URL programmatically
function getCloudinaryUrl(publicId: string, options: TransformOptions) {
  const { width, height, format = 'auto', quality = 'auto' } = options
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_${width},h_${height},c_fill,f_${format},q_${quality}/${publicId}`
}
```

## Responsive Images with CDN

```tsx
function ResponsiveCdnImage({ src, alt }: { src: string; alt: string }) {
  const sizes = [320, 640, 960, 1280, 1920]

  const srcSet = sizes
    .map(w => `${getCdnUrl(src, { width: w })} ${w}w`)
    .join(', ')

  return (
    <img
      src={getCdnUrl(src, { width: 960 })}
      srcSet={srcSet}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      alt={alt}
      loading="lazy"
    />
  )
}

function getCdnUrl(src: string, options: { width: number }) {
  // Cloudinary example
  return `https://res.cloudinary.com/demo/image/upload/w_${options.width},f_auto,q_auto/${src}`
}
```

## React Component for CDN Images

```tsx
interface CdnImageProps {
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
  className?: string
}

function CdnImage({ src, alt, width, height, priority, className }: CdnImageProps) {
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_CDN_URL

  // Build CDN URL with transformations
  const cdnSrc = `${baseUrl}/w_${width},h_${height},c_fill,f_auto,q_auto/${src}`

  // 2x for retina
  const cdnSrc2x = `${baseUrl}/w_${width * 2},h_${height * 2},c_fill,f_auto,q_auto/${src}`

  return (
    <img
      src={cdnSrc}
      srcSet={`${cdnSrc} 1x, ${cdnSrc2x} 2x`}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      className={className}
    />
  )
}
```

## Benefits of Image CDNs

| Feature | Benefit |
|---------|---------|
| Auto format | Serve WebP/AVIF based on browser |
| On-demand resize | No need to pre-generate sizes |
| Edge caching | Fast delivery worldwide |
| Bandwidth savings | 40-80% smaller files |
| No build step | Dynamic processing via URL |

## Support Notes

- Image format and delivery behavior can vary by browser, CDN, and device characteristics, so verify the final bytes and rendered output on the supported browser matrix.
- Add a fallback note when a modern format or loading behavior is not available for every required target browser.

## Verification

1. Check image URLs—should point to CDN domain
2. Verify format negotiation (check Accept header response)
3. Test from different locations (use VPN or online tools)
4. Compare file sizes vs original images
5. Check cache headers for proper CDN caching

Self-hosting images requires manual optimization and doesn't adapt to browser capabilities. Image CDNs handle all optimization automatically but add a dependency on external services.