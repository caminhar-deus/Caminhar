# Use image sprites where appropriate

> Small images and icons use sprites or SVG to reduce HTTP requests.

**Priority:** low · **Difficulty:** intermediate · **Time:** 20 min

---
Sprites reduce HTTP requests by combining multiple images, though modern alternatives often work better.

## Code Example

```css
/* Sprite image: icons.png (contains multiple icons in a grid) */
.icon {
  display: inline-block;
  width: 24px;
  height: 24px;
  background-image: url('icons.png');
  background-repeat: no-repeat;
}

.icon-home {
  background-position: 0 0;
}

.icon-settings {
  background-position: -24px 0;
}

.icon-user {
  background-position: -48px 0;
}

.icon-search {
  background-position: 0 -24px;
}
```

## Why It Matters

Each image is an HTTP request—combining many small images into one sprite reduces requests, though modern HTTP/2 and SVG icons have reduced this need.

## When to Use Sprites vs Alternatives

| Use Case | Recommended Approach |
|----------|---------------------|
| UI icons | SVG sprite or icon font |
| Social media icons | SVG sprite |
| Small decorative images | CSS sprite |
| Complex illustrations | Individual SVG files |
| Photographic thumbnails | Individual images with lazy loading |

## SVG Sprite (Modern Approach)

```html
<!-- SVG sprite file (icons.svg) -->
<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
  <symbol id="icon-home" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </symbol>
  <symbol id="icon-settings" viewBox="0 0 24 24">
    <path d="M19.14 12.94c.04-.31..."/>
  </symbol>
  <symbol id="icon-user" viewBox="0 0 24 24">
    <path d="M12 12c2.21 0 4-1.79..."/>
  </symbol>
</svg>

<!-- Usage -->
<svg class="icon" aria-hidden="true">
  <use href="icons.svg#icon-home"></use>
</svg>
```

## React SVG Icon Component

```tsx
interface IconProps {
  name: string
  size?: number
  className?: string
  title?: string
}

function Icon({ name, size = 24, className, title }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={`icon icon-${name} ${className || ''}`}
      aria-hidden={!title}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <use href={`/icons.svg#icon-${name}`} />
    </svg>
  )
}

// Usage

```

## Generating CSS Sprites

```javascript
// Using spritesmith
const Spritesmith = require('spritesmith')
const fs = require('fs')
const glob = require('glob')

const sprites = glob.sync('icons/*.png')

Spritesmith.run({ src: sprites }, (err, result) => {
  if (err) throw err

  // Save sprite image
  fs.writeFileSync('sprite.png', result.image)

  // Generate CSS
  let css = ''
  for (const [name, coords] of Object.entries(result.coordinates)) {
    const className = name.replace('icons/', '').replace('.png', '')
    css += `.icon-${className} {
  background-position: -${coords.x}px -${coords.y}px;
  width: ${coords.width}px;
  height: ${coords.height}px;
}\n`
  }
  fs.writeFileSync('sprite.css', css)
})
```

## Inline SVG Sprite in HTML

```tsx
// Include sprite in document (usually in layout)
function SvgSprite() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', width: 0, height: 0 }}
      aria-hidden="true"
    >
      <defs>
        <symbol id="icon-home" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </symbol>
        {/* More symbols */}
      </defs>
    </svg>
  )
}

// Then use anywhere
<svg className="icon">
  <use xlinkHref="#icon-home" />
</svg>
```

## Retina CSS Sprites

```css
/* 2x sprite for retina displays */
.icon {
  background-image: url('sprite.png');
  background-size: 200px 200px; /* Half of actual sprite size */
}

@media (-webkit-min-device-pixel-ratio: 2),
       (min-resolution: 192dpi) {
  .icon {
    background-image: url('sprite@2x.png');
  }
}
```

## When NOT to Use Sprites

| Scenario | Better Alternative |
|----------|-------------------|
| Large images | Individual files with lazy loading |
| Frequently changing icons | Individual SVG files |
| Icons needing color changes | Inline SVG or icon font |
| Simple shapes | CSS-only (borders, shadows) |

## Support Notes

- Image format and delivery behavior can vary by browser, CDN, and device characteristics, so verify the final bytes and rendered output on the supported browser matrix.
- Add a fallback note when a modern format or loading behavior is not available for every required target browser.

## Verification

1. Check Network tab—sprite should load as single request
2. Verify all icon positions display correctly
3. Test retina sprite on high-DPI displays
4. Compare load time vs individual images
5. Check that SVG sprites scale properly at different sizes

HTTP/2 multiplexing reduces the benefit of sprites for reducing requests. For new projects, consider SVG icon systems which offer better flexibility, accessibility, and styling options.