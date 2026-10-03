# Use relative units for responsive layouts

> Use rem, em, %, vw, vh, and clamp() instead of fixed px values to build layouts that scale with user font size preferences and viewport dimensions.

**Priority:** high · **Difficulty:** beginner · **Time:** 20 min

---
Different relative units serve different purposes. Choosing the right unit depends on what you want the value to be relative to.

## Code Example

```css
/* Assume browser default is 16px */
html { font-size: 100%; } /* Don't fix the root — let it inherit from browser */

/* ❌ Bad: px overrides user's browser preference */
body { font-size: 16px; }
h1 { font-size: 32px; }

/* ✅ Good: rem scales with browser preference */
body { font-size: 1rem; }      /* = browser default */
.text-sm { font-size: 0.875rem; }  /* 14px at 16px base */
.text-lg { font-size: 1.125rem; }  /* 18px at 16px base */
h1 { font-size: 2rem; }            /* 32px at 16px base */
```

## Why It Matters

Fixed pixel values override user browser preferences, making your site inaccessible to users who increase their default font size (a common accommodation for low vision). Relative units also reduce the number of breakpoints needed — elements naturally adapt to available space rather than requiring explicit overrides at every viewport width.

## Unit Reference

| Unit | Relative to | Best for |
|------|-------------|----------|
| `rem` | Root font size (html element) | Font sizes, consistent spacing |
| `em` | Parent element font size | Component-scoped spacing |
| `%` | Parent element dimension | Widths, heights in flex/grid |
| `vw` | Viewport width | Full-bleed sections, fluid widths |
| `vh` | Viewport height | Hero sections, modals |
| `ch` | Width of "0" character | Input widths, text containers |
| `clamp()` | Viewport-calculated range | Fluid typography |

## Fluid Typography with clamp()

```css
/* Font size that scales between 16px and 24px as viewport grows from 320px to 1280px */
h1 {
  font-size: clamp(1rem, 2.5vw + 0.5rem, 1.5rem);
}

/* No breakpoints needed — size smoothly interpolates */
```

## Component Spacing with em

```css
/* Button padding relative to the button's own font size */
.button {
  font-size: 1rem;
  padding: 0.5em 1em;  /* 8px 16px at 1rem */
}

.button--large {
  font-size: 1.25rem;
  /* padding auto-scales: 10px 20px — same proportions */
}
```

## Responsive Containers

```css
/* ✅ Percentage-based widths */
.container {
  width: 90%;
  max-width: 1200px;
  margin-inline: auto;
}

/* ✅ min/max for sensible constraints */
.card {
  width: min(100%, 400px);   /* never wider than parent or 400px */
  min-height: max(200px, 30vh);
}

/* ✅ Full viewport sections */
.hero {
  min-height: 100svh; /* svh = small viewport height, safer than vh on mobile */
}
```

## When px Is Appropriate

```css
/* Fixed-size UI chrome that should NOT scale: borders, box-shadows, 1px lines */
.divider { border-top: 1px solid var(--color-border); }
.avatar { width: 40px; height: 40px; } /* Fixed icon sizes */
```

## Verification

1. Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
2. Confirm the computed styles match the intended fix in DevTools.
3. Test at least one mobile and one desktop viewport before shipping.
4. If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.