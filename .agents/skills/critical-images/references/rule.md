# Prioritize loading critical images

> Hero and above-the-fold images are preloaded with high fetch priority for LCP.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
Critical images should load before non-essential content to optimize LCP.

## Code Example

```html
<head>
  <!-- Preload hero image for fastest loading -->
  <link
    rel="preload"
    as="image"
    href="/images/hero.webp"
    type="image/webp"
    fetchpriority="high"
  >

  <!-- With responsive images -->
  <link
    rel="preload"
    as="image"
    href="/images/hero-mobile.webp"
    media="(max-width: 768px)"
    type="image/webp"
  >
  <link
    rel="preload"
    as="image"
    href="/images/hero-desktop.webp"
    media="(min-width: 769px)"
    type="image/webp"
  >
</head>
```

## Why It Matters

The Largest Contentful Paint (LCP) is often an image—prioritizing its load can improve LCP by 20-40%, directly impacting Core Web Vitals and SEO.

## Identifying Critical Images

| Location | Priority | Action |
|----------|----------|--------|
| Hero/banner | Highest | Preload + fetchpriority="high" |
| Above the fold | High | fetchpriority="high", no lazy loading |
| Below the fold | Normal | loading="lazy" |
| Footer images | Low | loading="lazy", decoding="async" |

## Fetch Priority Attribute

```html
<!-- ❌ Bad: LCP image loads with normal priority -->
<img src="hero.webp" alt="Hero image">

<!-- ✅ Good: LCP image loads with high priority -->
<img
  src="hero.webp"
  alt="Hero image"
  fetchpriority="high"
  width="1200"
  height="600"
>

<!-- ❌ Bad: Critical image lazy loaded -->
<img src="hero.webp" alt="Hero" loading="lazy">

<!-- ✅ Good: Critical image loads eagerly (default) -->
<img src="hero.webp" alt="Hero" loading="eager" fetchpriority="high">
```

## Next.js Image Priority

```tsx

function HeroSection() {
  return (
    <section>
      {/* priority prop adds fetchpriority and disables lazy loading */}
      
    </section>
  )
}

// Below-the-fold images use default lazy loading
function ContentSection() {
  return (
    
  )
}
```

## React Component with Priority

```tsx
interface OptimizedImageProps {
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
}

function OptimizedImage({ src, alt, width, height, priority }: OptimizedImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
    />
  )
}
```

## Background Images

```css
/* Preload critical background image */
.hero {
  background-image: url('/hero.webp');
}
```

```html
<head>
  <!-- Preload background image -->
  <link rel="preload" as="image" href="/hero.webp">
</head>
```

## Measuring LCP

```javascript
// Identify LCP element
new PerformanceObserver((entryList) => {
  const entries = entryList.getEntries()
  const lastEntry = entries[entries.length - 1]
  console.log('LCP element:', lastEntry.element)
  console.log('LCP time:', lastEntry.startTime)
}).observe({ type: 'largest-contentful-paint', buffered: true })
```

## Verification

### Automated Checks

- Run Lighthouse—check LCP time and element
- Use Chrome DevTools Network tab with "Priority" column visible

### Manual Checks

- Verify hero image loads before below-fold content
- Check preload hints appear in document head
- Confirm critical images don't have `loading="lazy"`