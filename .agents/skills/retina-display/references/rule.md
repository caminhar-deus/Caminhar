# Support high-DPI retina displays

> High-resolution images (2x, 3x) are provided for retina and high-DPI displays.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
High-DPI displays need higher resolution images to appear sharp.

## Code Example

```html
<!-- For images displayed at fixed pixel size -->
<img
  src="logo.png"
  srcset="
    logo.png 1x,
    logo@2x.png 2x,
    logo@3x.png 3x
  "
  alt="Logo"
  width="200"
  height="50"
>
```

## Why It Matters

Standard images look blurry on retina displays (2x, 3x pixel density)—high-resolution assets ensure sharp visuals on modern devices.

## Understanding Pixel Density

| Device | Pixel Ratio | Image Needed |
|--------|-------------|--------------|
| Standard displays | 1x | 100px image for 100px element |
| Retina (most phones) | 2x | 200px image for 100px element |
| iPhone Pro, high-end Android | 3x | 300px image for 100px element |

## srcset with w Descriptors (Responsive)

```html
<!-- For responsive images, w descriptors are preferred -->
<img
  src="hero-800.jpg"
  srcset="
    hero-400.jpg 400w,
    hero-800.jpg 800w,
    hero-1200.jpg 1200w,
    hero-1600.jpg 1600w
  "
  sizes="(max-width: 600px) 100vw, 50vw"
  alt="Hero image"
>
<!-- Browser calculates based on viewport AND pixel density -->
```

## CSS Background Images

```css
/* Using image-set() */
.hero {
  background-image: url('hero.jpg');
  background-image: image-set(
    url('hero.jpg') 1x,
    url('hero@2x.jpg') 2x,
    url('hero@3x.jpg') 3x
  );
}

/* Using media queries (broader support) */
.logo {
  background-image: url('logo.png');
}

@media (-webkit-min-device-pixel-ratio: 2),
       (min-resolution: 192dpi) {
  .logo {
    background-image: url('logo@2x.png');
    background-size: 200px 50px; /* Original dimensions */
  }
}

@media (-webkit-min-device-pixel-ratio: 3),
       (min-resolution: 288dpi) {
  .logo {
    background-image: url('logo@3x.png');
    background-size: 200px 50px;
  }
}
```

## React Retina Image Component

```tsx
interface RetinaImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
}

function RetinaImage({ src, alt, width, height, className }: RetinaImageProps) {
  // Generate retina versions from base path
  const basePath = src.replace(/\.[^.]+$/, '')
  const extension = src.match(/\.[^.]+$/)?.[0] || '.png'

  return (
    <img
      src={src}
      srcSet={`
        ${src} 1x,
        ${basePath}@2x${extension} 2x,
        ${basePath}@3x${extension} 3x
      `}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  )
}
```

## Next.js Automatic Retina Support

```tsx

// Next.js automatically generates srcset for different DPRs
function Logo() {
  return (
    
  )
}
```

## Generating Retina Assets

```javascript
// Sharp script to generate 1x, 2x, 3x versions
const sharp = require('sharp')

async function generateRetinaVersions(inputPath, baseName) {
  const sizes = [
    { suffix: '', scale: 1 },
    { suffix: '@2x', scale: 2 },
    { suffix: '@3x', scale: 3 }
  ]

  const metadata = await sharp(inputPath).metadata()
  const baseWidth = metadata.width / 3 // Assume input is 3x

  for (const { suffix, scale } of sizes) {
    await sharp(inputPath)
      .resize(Math.round(baseWidth * scale))
      .toFile(`${baseName}${suffix}.png`)
  }
}
```

## SVG for Resolution Independence

```html
<!-- SVG scales perfectly to any DPR -->
<img src="logo.svg" alt="Logo" width="200" height="50">

<!-- Inline SVG also scales -->
<svg width="200" height="50" viewBox="0 0 200 50">
  <!-- Vector content -->
</svg>
```

## Icon Fonts and SVG Icons

```tsx
// SVG icons are naturally resolution-independent
function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} aria-hidden="true">
      <use href={`/icons.svg#${name}`} />
    </svg>
  )
}
```

## Verification

1. Toggle device pixel ratio in Chrome DevTools (Settings → Experiments → Device)
2. Use Responsive Design Mode in Safari (Retina option)
3. Test on actual retina devices
4. Verify correct image loads in Network tab
5. Check that images appear sharp, not blurry

3x images are 9x the pixels of 1x images. Consider whether 3x is necessary—2x often provides sufficient sharpness while saving significant bandwidth.