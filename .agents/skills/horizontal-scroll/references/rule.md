# Prevent horizontal scrolling

> Web pages must not require horizontal scrolling at standard viewport widths. Horizontal overflow breaks responsive layouts and makes content inaccessible to low-vision users who zoom in.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Pages should not require horizontal scrolling at any standard viewport width. Horizontal overflow is especially harmful for users who rely on browser zoom or screen magnification software.

## Code Examples

### Fixed-width containers

```css
/* ❌ Problem: fixed width causes overflow on small screens */
.container {
  width: 1200px;
}

/* ✅ Fix: max-width with full fluid width */
.container {
  max-width: 1200px;
  width: 100%;
}
```

### Images and media without max-width

```css
/* ❌ Problem: intrinsic image width overflows container */
img {
  /* no width constraints */
}

/* ✅ Fix: images constrained to their container */
img, video, iframe, embed, object {
  max-width: 100%;
  height: auto;
}
```

### Long unbreakable strings

```css
/* ❌ Problem: long URLs or code strings overflow text containers */
.content {
  /* no word-break rules */
}

/* ✅ Fix: allow breaking of long words */
.content {
  overflow-wrap: break-word;
  word-break: break-word; /* fallback for older browsers */
}
```

### width: 100vw causes overflow

```css
/* ❌ Problem: 100vw includes scrollbar width, causing horizontal overflow */
.hero {
  width: 100vw;
}

/* ✅ Fix: use 100% relative to the parent */
.hero {
  width: 100%;
}
```

### Data tables

```html
<!-- ✅ Correct: table wrapped in scrollable container -->
<div style="overflow-x: auto;" role="region" aria-label="Sales data">
  <table>
    <!-- wide table content -->
  </table>
</div>
```

## Why It Matters

- **Screen Magnification**: ZoomText, Magnifier, and browser zoom at 200–400% effectively shrinks the viewport to 320–640px — fixed-width layouts break completely.
- **Mobile Devices**: 320px CSS width is the iPhone SE viewport — a real device, not just an edge case.
- **WCAG 2.1 AA Compliance**: SC 1.4.10 (Reflow) is a Level AA requirement — failures block certification.
- **Cognitive Load**: Horizontal scrolling disrupts reading flow and causes disorientation for all users.

## Verification

1. Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
2. Confirm the computed styles match the intended fix in DevTools.
3. Test at least one mobile and one desktop viewport before shipping.
4. If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.