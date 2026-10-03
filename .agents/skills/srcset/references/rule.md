# Use srcset for responsive images

> Images wider than 100px use the srcset attribute to offer multiple resolution variants, letting the browser download the optimal size for the user's viewport and device pixel ratio.

**Priority:** high · **Difficulty:** intermediate · **Time:** 15 min

---
`srcset` lets browsers choose the best image size for the user's viewport and screen density. Combined with `sizes`, it is the standard HTML mechanism for responsive images.

## Code Examples

#

## Width Descriptors (w) — for variable-size images

Use when the image's display size varies with the viewport width. Requires a `sizes` attribute.

```html
<img
  src="photo-800w.jpg"
  srcset="
    photo-400w.jpg   400w,
    photo-800w.jpg   800w,
    photo-1200w.jpg 1200w,
    photo-1600w.jpg 1600w
  "
  sizes="(max-width: 600px) 100vw,
         (max-width: 1200px) 50vw,
         800px"
  alt="Mountain landscape"
  width="1600"
  height="1067"
  loading="lazy"
>
```

### Density Descriptors (x) — for fixed-size images

Use for images that are always the same CSS size but should be sharp on high-DPI screens.

```html
<!-- Fixed 48px avatar — sharp on Retina displays -->
<img
  src="avatar.jpg"
  srcset="
    avatar.jpg    1x,
    avatar-2x.jpg 2x,
    avatar-3x.jpg 3x
  "
  alt="Jane Doe"
  width="48"
  height="48"
>
```

## Why It Matters

Without `srcset`, every user—regardless of their device—downloads the same large image. A 1600px hero image served to a 375px mobile display downloads 4x the data needed. The `srcset` attribute lets browsers choose the optimal file automatically, reducing bandwidth by 50-80% for mobile users with no change to visual quality.

## The sizes Attribute in Detail

`sizes` is a comma-separated list of media condition + size pairs. The browser uses the first matching condition.

```html
<!-- Pattern: (media-condition) size, ..., default-size -->
<img
  srcset="photo-400w.jpg 400w, photo-800w.jpg 800w, photo-1200w.jpg 1200w"
  sizes="
    (max-width: 480px) calc(100vw - 32px),
    (max-width: 768px) calc(50vw - 24px),
    (max-width: 1200px) 33vw,
    400px
  "
  src="photo-800w.jpg"
  alt="Gallery photo"
  width="1200"
  height="800"
  loading="lazy"
>
```

Inaccurate `sizes` values cause the browser to pick the wrong srcset candidate. If your layout changes via CSS (grid, flexbox, media queries), `sizes` must match. Use browser DevTools to verify the computed image width at each breakpoint.

## Common Layout Patterns

```html
<!-- Full-width banner -->
<img
  srcset="banner-800w.jpg 800w, banner-1200w.jpg 1200w, banner-1600w.jpg 1600w"
  sizes="100vw"
  src="banner-1200w.jpg"
  alt="Banner"
  width="1600"
  height="400"
>

<!-- 2-column grid: full-width mobile, half on desktop -->
<img
  srcset="card-400w.jpg 400w, card-800w.jpg 800w"
  sizes="(max-width: 768px) 100vw, 50vw"
  src="card-800w.jpg"
  alt="Card image"
  width="800"
  height="600"
  loading="lazy"
>

<!-- 3-column grid: full-width mobile, 1/3 on desktop (with gap) -->
<img
  srcset="thumb-300w.jpg 300w, thumb-600w.jpg 600w"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, calc(33.33vw - 16px)"
  src="thumb-600w.jpg"
  alt="Thumbnail"
  width="600"
  height="400"
  loading="lazy"
>
```

## picture + srcset for Format + Size

Combine `<picture>` for format selection with `srcset`/`sizes` for responsive sizing.

```html
<picture>
  <source
    type="image/avif"
    srcset="photo-400w.avif 400w, photo-800w.avif 800w, photo-1200w.avif 1200w"
    sizes="(max-width: 600px) 100vw, 50vw"
  >
  <source
    type="image/webp"
    srcset="photo-400w.webp 400w, photo-800w.webp 800w, photo-1200w.webp 1200w"
    sizes="(max-width: 600px) 100vw, 50vw"
  >
  <img
    src="photo-800w.jpg"
    srcset="photo-400w.jpg 400w, photo-800w.jpg 800w, photo-1200w.jpg 1200w"
    sizes="(max-width: 600px) 100vw, 50vw"
    alt="Photo description"
    width="1200"
    height="800"
    loading="lazy"
  >
</picture>
```

## How the Browser Selects a Candidate

The browser algorithm (simplified):

1. Parse `sizes` to find the first matching condition → compute effective display width (e.g., 600px)
2. Multiply by device pixel ratio (e.g., 2x Retina → 1200px needed)
3. Find the `srcset` candidate closest to 1200px without going significantly under
4. Download that candidate

```javascript
// Simulate browser candidate selection (for debugging)
function selectCandidate(srcset, sizes, viewportWidth, dpr = 1) {
  // Parse sizes to find effective width
  const effectiveWidth = viewportWidth // Simplified; real implementation parses media conditions

  // Target pixel width
  const targetPx = effectiveWidth * dpr

  // Parse srcset candidates
  const candidates = srcset.trim().split(',').map(s => {
    const [url, width] = s.trim().split(/\s+/)
    return { url, width: parseInt(width) }
  })

  // Pick closest candidate >= targetPx
  const sorted = candidates.sort((a, b) => a.width - b.width)
  return sorted.find(c => c.width >= targetPx) || sorted[sorted.length - 1]
}
```

## Verification

### Automated Checks

- Run Lighthouse — "Use responsive images" and "Properly size images" audits flag missing srcset
- Use [RespImageLint](https://ausi.github.io/respimagelint/) bookmarklet — reports which srcset candidate the browser selected vs what was optimal
- Open Chrome DevTools → Network → filter Img → resize the viewport — observe which srcset candidate loads
- Test on a device with 2x pixel ratio — verify a 2x variant is selected when available

### Manual Checks

- Verify the rendered or user-facing behavior manually in a representative browser or runtime flow.