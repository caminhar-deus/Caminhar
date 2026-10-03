# Use <picture> with an <img> fallback

> Every <picture> element contains a required <img> fallback as its last child, ensuring images display in all browsers including those that don't support <picture>.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
The `<picture>` element provides two capabilities: serving different image formats to different browsers (format selection), and serving different image crops at different viewport sizes (art direction). In both cases, the `<img>` child is required.

## Code Example

```html
<!-- ❌ Bad: No <img> fallback — renders nothing if no <source> matches -->
<picture>
  <source type="image/avif" srcset="photo.avif">
  <source type="image/webp" srcset="photo.webp">
</picture>

<!-- ✅ Good: <img> is last child and carries alt, width, height -->
<picture>
  <source type="image/avif" srcset="photo.avif">
  <source type="image/webp" srcset="photo.webp">
  <img
    src="photo.jpg"
    alt="Mountain landscape at dawn"
    width="800"
    height="600"
    loading="lazy"
  >
</picture>
```

## Why It Matters

A `<picture>` without an `<img>` fallback renders nothing in browsers that don't support `<picture>` (IE11) or don't support any of the `<source>` formats. The `<img>` child is also where `alt`, `width`, `height`, `loading`, and `fetchpriority` attributes live—these apply regardless of which source the browser selects.

## Use Case 1: Format Selection

Serve the smallest supported format using the `type` attribute on `<source>`.

```html
<!-- Browser picks the first <source> whose type it supports -->
<picture>
  <!-- AVIF: best compression (~40-50% smaller than JPEG) -->
  <source type="image/avif" srcset="photo.avif">
  <!-- WebP: broad support (~25-35% smaller than JPEG) -->
  <source type="image/webp" srcset="photo.webp">
  <!-- JPEG: universal fallback -->
  <img src="photo.jpg" alt="Mountain landscape at dawn" width="800" height="600">
</picture>
```

## Use Case 2: Art Direction

Serve different crops or aspect ratios at different viewport sizes using the `media` attribute.

```html
<!-- Different image crops for different breakpoints -->
<picture>
  <!-- Mobile: portrait crop (1:1) -->
  <source
    media="(max-width: 480px)"
    srcset="hero-square-480.webp"
    type="image/webp"
  >
  <!-- Tablet: 4:3 crop -->
  <source
    media="(max-width: 1024px)"
    srcset="hero-4x3-1024.webp"
    type="image/webp"
  >
  <!-- Desktop: wide banner (16:9) -->
  <img
    src="hero-wide-1600.jpg"
    alt="Company team photo"
    width="1600"
    height="900"
    fetchpriority="high"
  >
</picture>
```

## Use Case 3: Format + Responsive Combined

Combine `type` and `srcset` with `sizes` for the most complete implementation.

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
    alt="Photo description"
    width="1200"
    height="800"
    loading="lazy"
  >
</picture>
```

## source Element Order

Browser evaluates `<source>` elements top-to-bottom and uses the first match. Always put the most preferred (smallest, best quality) format first.

```html
<picture>
  <!-- ✅ Correct order: AVIF first (smallest), then WebP, then <img> (JPEG) -->
  <source type="image/avif" srcset="photo.avif">
  <source type="image/webp" srcset="photo.webp">
  <img src="photo.jpg" alt="...">

  <!-- ❌ Wrong order: WebP before AVIF means AVIF-supporting browsers get WebP -->
  <!-- <source type="image/webp" srcset="photo.webp"> -->
  <!-- <source type="image/avif" srcset="photo.avif"> -->
  <!-- <img src="photo.jpg" alt="..."> -->
</picture>
```

## Attributes Belong on img, Not source

`alt`, `loading`, `fetchpriority`, `decoding`, `width`, and `height` must be on the `<img>` element.

```html
<!-- ❌ Bad: Attributes on <source> are ignored -->
<picture>
  <source type="image/webp" srcset="photo.webp" alt="Photo" loading="lazy">
  <img src="photo.jpg">
</picture>

<!-- ✅ Good: Attributes on <img> apply regardless of which source is used -->
<picture>
  <source type="image/webp" srcset="photo.webp">
  <img
    src="photo.jpg"
    alt="Photo description"
    width="800"
    height="600"
    loading="lazy"
    decoding="async"
  >
</picture>
```

## Support Notes

- Image format and delivery behavior can vary by browser, CDN, and device characteristics, so verify the final bytes and rendered output on the supported browser matrix.
- Add a fallback note when a modern format or loading behavior is not available for every required target browser.

## Verification

### Automated Checks

- Use the W3C Validator — a `<picture>` without an `<img>` child produces an error
- In Chrome DevTools → Network → filter by Img — verify the browser selected AVIF or WebP
- Test in Safari (format fallback): Safari added AVIF support in version 16.4; older versions should receive WebP or JPEG

### Manual Checks

- Disable JavaScript and reload — `<picture>` works entirely without JavaScript