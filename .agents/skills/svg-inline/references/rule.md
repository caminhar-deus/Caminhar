# Manage inline SVG size and complexity

> Large or complex SVGs inlined in HTML are extracted to external files or components, preventing them from bloating the HTML document and blocking parsing.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
Inline SVG enables powerful CSS and JavaScript interactivity but adds directly to HTML document weight. The choice between inline SVG and external references depends on whether interactivity is needed.
## Code Example

```html
<!-- ❌ Bad: Unoptimised inline SVG with editor artefacts -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  xml:space="preserve" version="1.1" id="Layer_1"
  style="enable-background:new 0 0 24 24" viewBox="0 0 24 24">
  <!-- Generator: Adobe Illustrator 28.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
  <g>
    <path style="fill:#000000;" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10..."/>
  </g>
</svg>

<!-- ✅ Good: SVGO-optimised inline SVG -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10..."/>
</svg>
```

## Why It Matters

A complex illustration exported from Figma can easily be 50-200KB of SVG markup. Inlined in HTML, it blocks the HTML parser until it is processed, cannot be cached independently, and balloons every page response. Extracting it to an external file allows browser caching and deferred loading. For icon systems, SVG sprites or component libraries avoid duplicating path data across every page.

## When to Inline vs When Not To

| SVG Use Case | Recommendation | Reason |
|---|---|---|
| Icon with hover/focus colour change | Inline or component | CSS `fill`/`stroke` needs DOM access |
| Animated illustration (CSS/GSAP) | Inline | JS/CSS must target individual paths |
| Static decorative illustration | `<img src="file.svg">` | Cacheable, doesn't block parser |
| Logo (no colour theming) | `<img src="logo.svg">` | Cacheable, simpler |
| Repeated icon (e.g., in a list) | SVG sprite or component | Avoid duplicating path data |
| Background decoration | `background-image: url()` | CSS handles it; no DOM pollution |

## Static SVGs: Use img Instead

```html
<!-- ✅ For static SVG illustrations or logos: external file -->
<img
  src="/images/hero-illustration.svg"
  alt="Illustration showing a developer working at a computer"
  width="600"
  height="400"
  loading="lazy"
>

<!-- ✅ For logos without colour theming -->
<img
  src="/images/company-logo.svg"
  alt="Acme Corp"
  width="120"
  height="40"
>
```

External SVG files are cached by the browser independently of the HTML document. A 200KB illustration included via `<img>` is downloaded once and cached; the same content inlined is re-sent with every page response.

## SVG Sprites for Icon Systems

```html
<!-- sprites.svg — referenced once, hidden from view -->
<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
  <symbol id="icon-search" viewBox="0 0 24 24">
    <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
  </symbol>
  <symbol id="icon-close" viewBox="0 0 24 24">
    <path d="M18 6L6 18M6 6l12 12"/>
  </symbol>
</svg>

<!-- Use icons via <use> — no path data duplication -->
<button aria-label="Search">
  <svg width="24" height="24" aria-hidden="true" focusable="false">
    <use href="/sprites.svg#icon-search"/>
  </svg>
</button>
```

## React: SVG as Component (SVGR)

```tsx
// Using SVGR — imports SVG as a React component
// Configure in vite.config.js: import svgr from 'vite-plugin-svgr'

// SVG component receives className for CSS theming
function Toolbar() {
  return (
    <nav>
      <button aria-label="Search">
        
      </button>
      <button aria-label="Close">
        
      </button>
    </nav>
  )
}
```

```javascript
// vite.config.js — SVGR plugin

  plugins: [
    react(),
    svgr({
      svgrOptions: {
        // SVGO optimisation applied automatically
        icon: true,
        svgoConfig: {
          plugins: [
            { name: 'removeViewBox', active: false },
          ]
        }
      }
    })
  ]
})
```

## Optimising SVG with SVGO

Run SVGO before inlining or committing SVG files to remove editor metadata.

```bash
# Single file
npx svgo icon.svg -o icon.min.svg

# Directory
npx svgo --folder src/icons/

# Check reduction (before committing)
wc -c src/icons/hero.svg       # Before
npx svgo src/icons/hero.svg -o /tmp/hero.min.svg
wc -c /tmp/hero.min.svg         # After
```

## Accessibility for Inline SVG

```html
<!-- Decorative inline SVG — hide from assistive technology -->
<svg aria-hidden="true" focusable="false" ...>
  ...
</svg>

<!-- Informative inline SVG — provide a title -->
<svg role="img" aria-labelledby="icon-title">
  <title id="icon-title">Search</title>
  <path d="..."/>
</svg>

<!-- Icon button — accessibility on the button, not the SVG -->
<button aria-label="Search">
  <svg aria-hidden="true" focusable="false" width="24" height="24">
    <path d="..."/>
  </svg>
</button>
```

## Verification

1. Open Chrome DevTools → Elements — search for `<svg` and examine sizes of inline SVGs
2. View Page Source and use Ctrl+F to find `<svg` — count them and eyeball their complexity
3. Run SVGO on each inline SVG and compare before/after byte counts
4. Use Chrome DevTools → Network → Document — check total HTML transfer size; large inlined SVGs inflate this number