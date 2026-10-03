# Optimize all images for web

> Images are optimized with appropriate formats, compression, and modern techniques.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Image optimization is crucial for web performance. Properly optimized images can reduce page weight by 50-80% without visible quality loss, directly improving [Largest Contentful Paint (LCP)](https://web.dev/lcp/) and user experience.

Use the `<picture>` element with multiple sources to serve modern formats (AVIF, WebP) to supported browsers while providing JPEG/PNG fallbacks for older browsers.

## Code Example

Choose the right format based on image content and browser support.

```html
<!-- Modern format with fallbacks -->
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description" loading="lazy">
</picture>
```

#

## Format Comparison

| Format | Best For | Compression | Browser Support |
|--------|----------|-------------|-----------------|
| **AVIF** | All images | ~50% smaller than JPEG | Modern browsers |
| **WebP** | All images | ~30% smaller than JPEG | 95%+ browsers |
| **JPEG** | Photos | Good | Universal |
| **PNG** | Transparency, logos | Larger files | Universal |
| **SVG** | Icons, illustrations | Scalable | Universal |

Always provide fallbacks when using AVIF or WebP. Safari only added AVIF support in version 16.4 (2023), and some enterprise browsers may lack WebP support.

## Why It Matters

Images typically account for 50%+ of page weight. Unoptimized images cause slow load times, wasted bandwidth, poor Core Web Vitals scores, and frustrated users—especially on mobile networks.

## Responsive Images

Serve appropriately sized images for different screen sizes to avoid downloading unnecessarily large files.

```html
<!-- ✅ Good: Responsive with srcset -->
<img
  src="image-800w.jpg"
  srcset="
    image-400w.jpg 400w,
    image-800w.jpg 800w,
    image-1200w.jpg 1200w,
    image-1600w.jpg 1600w
  "
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px"
  alt="Responsive image"
  loading="lazy"
>

<!-- ❌ Bad: Single large image for all screens -->
<img src="image-1600w.jpg" alt="Large image">
```

### Art Direction

Use `<picture>` for different crops or aspect ratios at different breakpoints.

```html
<picture>
  <!-- Mobile: Square crop -->
  <source media="(max-width: 600px)" srcset="hero-square.webp">
  <!-- Tablet: 4:3 aspect -->
  <source media="(max-width: 1024px)" srcset="hero-4x3.webp">
  <!-- Desktop: Wide banner -->
  <img src="hero-wide.jpg" alt="Hero image">
</picture>
```

## Framework Examples

  

```jsx
function OptimizedImage({ src, alt, sizes = "100vw" }) {
  // Generate srcset for multiple sizes
  const widths = [400, 800, 1200, 1600]
  const srcset = widths
    .map(w => `${src}?w=${w} ${w}w`)
    .join(', ')

  return (
    <picture>
      {/* Modern formats */}
      <source
        type="image/avif"
        srcSet={srcset.replace(/\?w=/g, '?format=avif&w=')}
        sizes={sizes}
      />
      <source
        type="image/webp"
        srcSet={srcset.replace(/\?w=/g, '?format=webp&w=')}
        sizes={sizes}
      />
      {/* Fallback */}
      <img
        src={`${src}?w=800`}
        srcSet={srcset}
        sizes={sizes}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="w-full h-auto"
      />
    </picture>
  )
}

// Progressive loading with blur-up
function ProgressiveImage({ src, placeholder, alt }) {
  const [loaded, setLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(placeholder)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setCurrentSrc(src)
      setLoaded(true)
    }
    img.src = src
  }, [src])

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={`transition-all duration-300 ${
        loaded ? 'blur-0' : 'blur-sm'
      }`}
    />
  )
}
```

  
   (
        
      ))}
    </div>
  )
}

// For external images, configure next.config.js
// module.exports = {
//   images: {
//     remotePatterns: [{ hostname: 'cdn.example.com' }]
//   }
// }
```

  
  
    <source
      v-for="format in formats"
      :key="format"
      :type="`image/${format}`"
      :srcset="generateSrcset(format)"
      :sizes="sizes"
    />
    <img
      :src="fallbackSrc"
      :alt="alt"
      loading="lazy"
      decoding="async"
      @load="onLoad"
      :class="{ 'opacity-0': !loaded, 'opacity-100': loaded }"
      class="transition-opacity duration-300"
    />
  </picture>
</template>

<script setup>

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, required: true },
  sizes: { type: String, default: '100vw' },
  widths: { type: Array, default: () => [400, 800, 1200, 1600] }
})

const loaded = ref(false)
const formats = ['avif', 'webp']

const generateSrcset = (format) => {
  return props.widths
    .map(w => `${props.src}?format=${format}&w=${w} ${w}w`)
    .join(', ')
}

const fallbackSrc = computed(() => `${props.src}?w=800`)

const onLoad = () => {
  loaded.value = true
}
</script>
```

  

## Build Tool Integration

### Vite with Sharp

```javascript
// vite.config.js

  plugins: [
    viteImageOptimizer({
      jpg: { quality: 80, progressive: true },
      png: { quality: 80 },
      webp: { quality: 80, effort: 6 },
      avif: { quality: 60, effort: 6 }
    })
  ]
})
```

### Sharp Script for Batch Processing

```javascript
// scripts/optimize-images.js
const sharp = require('sharp')
const fs = require('fs').promises
const path = require('path')

const SIZES = [400, 800, 1200, 1600]
const FORMATS = ['webp', 'avif', 'jpeg']

async function optimizeImage(inputPath, outputDir) {
  const { name } = path.parse(inputPath)

  for (const width of SIZES) {
    for (const format of FORMATS) {
      const outputPath = path.join(outputDir, `${name}-${width}w.${format}`)

      await sharp(inputPath)
        .resize(width, null, { withoutEnlargement: true })
        .toFormat(format, {
          quality: format === 'avif' ? 60 : 80,
          effort: 6
        })
        .toFile(outputPath)
    }
  }

  console.log(`✅ Optimized: ${name}`)
}
```

Use a CDN with automatic image optimization like Cloudflare Images, Imgix, or Cloudinary. They handle format negotiation, resizing, and compression automatically based on the visitor's browser and device.

## Common Mistakes

- **Serving desktop images to mobile** — Use srcset and sizes for responsive images
- **Missing width/height attributes** — Causes layout shift (CLS issues)
- **Over-compressing** — Quality below 60% causes visible artifacts
- **Ignoring format fallbacks** — Not all browsers support AVIF/WebP
- **No lazy loading** — Loads all images immediately, blocking page render
- **Huge hero images** — Prioritize and optimize above-the-fold images

```html
<!-- ❌ Bad: Common mistakes -->
<img src="photo.png" alt="Photo"><!-- PNG for photos -->
<img src="hero-4000px.jpg"><!-- No responsive sizing -->
<img src="icon.jpg" width="20"><!-- JPEG for small icon -->

<!-- ✅ Good: Optimized versions -->
<picture>
  <source srcset="photo.avif" type="image/avif">
  <source srcset="photo.webp" type="image/webp">
  <img src="photo.jpg" alt="Photo" loading="lazy">
</picture>

<img
  srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
  sizes="100vw"
  src="hero-800.jpg"
  alt="Hero"
  width="1200"
  height="600"
>

<img src="icon.svg" alt="Icon" width="20" height="20"><!-- SVG for icons -->
```

- **SVG images** don't need format conversion—they're already optimized for web
- **Animated GIFs** may be better served as videos (MP4/WebM) for large animations
- **Tiny images** (< 1KB) can be inlined as base64 data URIs to avoid HTTP requests
- **User-uploaded content** may need server-side optimization pipelines rather than build-time processing

## Support Notes

- Image format and delivery behavior can vary by browser, CDN, and device characteristics, so verify the final bytes and rendered output on the supported browser matrix.
- Add a fallback note when a modern format or loading behavior is not available for every required target browser.

## Verification

### Automated Checks

- **Test on slow connections** — Use Chrome DevTools Network throttling (Slow 3G)
- **Measure LCP** — Use Lighthouse or Web Vitals extension to ensure LCP < 2.5s

### Manual Checks

- **Check file sizes** — Images should generally be under 200KB for photos, under 50KB for icons
- **Verify format negotiation** — Check Network tab to confirm WebP/AVIF is served