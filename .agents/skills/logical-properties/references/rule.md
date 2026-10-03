# Use CSS logical properties for i18n and RTL support

> Use CSS logical properties (margin-inline, padding-block, border-inline-start) instead of physical properties (margin-left, padding-top) to support right-to-left languages automatically.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
Logical properties map layout directions to the document's writing mode rather than physical screen directions, making styles work correctly in any language.

## Code Examples

```css
/* ❌ Physical — breaks in RTL */
.nav-item + .nav-item {
  margin-left: 1rem;
}

/* ✅ Logical — works in both LTR and RTL */
.nav-item + .nav-item {
  margin-inline-start: 1rem;
}
```

```css
/* ❌ Physical icon spacing */
.button__icon {
  margin-right: 0.5rem;
}

/* ✅ Logical */
.button__icon {
  margin-inline-end: 0.5rem;
}
```

## Why It Matters

Physical CSS properties (margin-left, padding-right) are hardcoded to screen directions. In right-to-left languages (Arabic, Hebrew, Persian), what should be margin-left becomes margin-right. Without logical properties, supporting RTL requires maintaining duplicate stylesheets or complex overrides with [dir=rtl] selectors. Logical properties handle this automatically.

## Physical vs Logical Reference

| Physical | Logical | Meaning |
|----------|---------|---------|
| `margin-left` | `margin-inline-start` | Before text in reading direction |
| `margin-right` | `margin-inline-end` | After text in reading direction |
| `margin-top` | `margin-block-start` | Before block in flow direction |
| `margin-bottom` | `margin-block-end` | After block in flow direction |
| `padding-left` | `padding-inline-start` | — |
| `padding-right` | `padding-inline-end` | — |
| `border-left` | `border-inline-start` | — |
| `border-right` | `border-inline-end` | — |
| `left` (position) | `inset-inline-start` | — |
| `right` (position) | `inset-inline-end` | — |
| `width` | `inline-size` | Size in writing direction |
| `height` | `block-size` | Size perpendicular to writing direction |
| `min-width` | `min-inline-size` | — |
| `text-align: left` | `text-align: start` | — |

## Shorthands

```css
/* Inline shorthand: start | end */
margin-inline: 1rem 2rem;  /* start end */
margin-inline: auto;       /* both auto — centering */
padding-inline: 1.5rem;    /* both same */

/* Block shorthand */
margin-block: 1rem 2rem;   /* top | bottom */
padding-block: 2rem;       /* both same */

/* All sides */
margin: 1rem;     /* physical shorthand (still works) */
padding-block: 1rem;    /* top/bottom */
padding-inline: 1.5rem; /* left/right */
```

## Positioning

```css
/* ❌ Physical absolute positioning */
.tooltip {
  position: absolute;
  left: 0;
  top: 100%;
}

/* ✅ Logical */
.tooltip {
  position: absolute;
  inset-inline-start: 0;
  inset-block-start: 100%;
}

/* Shorthand: inset = top right bottom left */
.overlay {
  position: absolute;
  inset: 0; /* Covers all four sides */
}
```

## Borders

```css
/* Left border accent on a quote — should be reading-start in RTL */
blockquote {
  border-inline-start: 4px solid var(--color-primary);
  padding-inline-start: 1.5rem;
}
```

## Support Notes

- Logical properties depend on browser support and writing-mode behavior, so verify the rendered output in the supported browsers and directionality modes.
- Document any fallback physical properties only when a required browser target lacks the logical equivalent.

## Verification

1. Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
2. Confirm the computed styles match the intended fix in DevTools.
3. Test at least one mobile and one desktop viewport before shipping.
4. If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.