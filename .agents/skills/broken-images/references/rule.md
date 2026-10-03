# Fix broken images

> No images return 404 errors or display broken-image icons to users.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
Broken images degrade user trust and harm Core Web Vitals. Prevent them with path validation at build time and runtime fallback handlers.

## Code Examples

Use browser DevTools to identify broken images quickly.

```bash
# Check for 404 responses in the Network tab
# Filter by type: Img — any red rows indicate broken images
```

```javascript
// Programmatically detect broken images in the page
const brokenImages = Array.from(document.querySelectorAll('img'))
  .filter(img => !img.complete || img.naturalWidth === 0)

console.log('Broken images:', brokenImages.map(img => img.src))
```

## Why It Matters

A broken image shows an ugly placeholder icon, breaks visual layouts, and communicates that the site is poorly maintained. If the broken image is the Largest Contentful Paint element, it also harms LCP scores. On e-commerce sites, a missing product image can directly reduce purchase intent.

## Runtime Fallback with onerror

```html
<!-- ❌ Bad: No fallback—shows broken-image icon -->
<img src="product.jpg" alt="Blue running shoes">

<!-- ✅ Good: Fallback image on error -->
<img
  src="product.jpg"
  alt="Blue running shoes"
  onerror="this.src='/images/product-placeholder.png'; this.onerror=null;"
>
```

Always set `this.onerror=null` after applying the fallback. Without it, if the fallback image itself is also missing, the browser fires the error event again and loops indefinitely.

## React Component with Error Handling

```tsx

interface ImageWithFallbackProps {
  src: string
  fallbackSrc?: string
  alt: string
  width?: number
  height?: number
}

function ImageWithFallback({
  src,
  fallbackSrc = '/images/placeholder.png',
  alt,
  width,
  height,
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [errored, setErrored] = useState(false)

  function handleError() {
    if (!errored) {
      setImgSrc(fallbackSrc)
      setErrored(true)
    }
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      onError={handleError}
    />
  )
}
```

## Build-Time Validation

Catch broken image paths before they reach production.

```javascript
// scripts/check-images.js — run as part of CI
const fs = require('fs')
const path = require('path')
const { globSync } = require('glob')

const htmlFiles = globSync('dist/**/*.html')
const imgSrcPattern = /<img[^>]+src="([^"]+)"/g

let broken = []

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8')
  let match

  while ((match = imgSrcPattern.exec(html)) !== null) {
    const src = match[1]
    // Only check local paths
    if (!src.startsWith('http') && !src.startsWith('data:')) {
      const localPath = path.join('dist', src)
      if (!fs.existsSync(localPath)) {
        broken.push({ file, src })
      }
    }
  }
}

if (broken.length > 0) {
  console.error('Broken images found:')
  broken.forEach(({ file, src }) => console.error(`  ${file}: ${src}`))
  process.exit(1)
}
```

## CSS Background Images

```css
/* ❌ Bad: No fallback colour if image fails */
.hero {
  background-image: url('/images/hero.jpg');
}

/* ✅ Good: Fallback colour ensures readable content if image fails */
.hero {
  background-color: #1a1a2e; /* Fallback if image doesn't load */
  background-image: url('/images/hero.jpg');
  background-size: cover;
  background-position: center;
}
```

## Monitoring Image Errors

```typescript
// Log image errors to an analytics service
function trackImageError(src: string) {
  // Replace with your analytics provider
  if (typeof window !== 'undefined' && 'analytics' in window) {
    (window as any).analytics.track('image_error', {
      src,
      page: window.location.pathname,
    })
  }
}

// Attach globally
document.addEventListener('error', (event) => {
  if (event.target instanceof HTMLImageElement) {
    trackImageError(event.target.src)
  }
}, true) // useCapture=true so the listener catches non-bubbling errors
```

## Verification

### Automated Checks

- Open Chrome DevTools → Network tab → filter by "Img"
- Run Lighthouse—"Image elements do not have explicit width and height" and network errors are flagged
- Include the build-time script above in CI to prevent regressions

### Manual Checks

- Look for any requests shown in red (HTTP 4xx/5xx)
- Use the "Block request URL" feature to simulate a broken image and verify your fallback appears