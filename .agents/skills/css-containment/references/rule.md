# Use CSS containment to limit repaint scope

> Apply the contain property to components to tell the browser they are independent from the rest of the page, enabling rendering optimizations that reduce repaint and reflow scope.

**Priority:** medium · **Difficulty:** advanced · **Time:** 20 min

---
CSS containment is a performance optimization hint — you tell the browser "this element is isolated," and the browser can skip rendering work for the rest of the page when something inside it changes.

## Code Example

```css
contain: none;         /* Default — no containment */
contain: layout;       /* Internal layout doesn't affect external */
contain: style;        /* CSS counters don't escape this element */
contain: paint;        /* Content clipped to border box, creates stacking context */
contain: size;         /* Element size is independent of children */
contain: inline-size;  /* Inline size is independent (for container queries) */

/* Shorthand combinations */
contain: layout paint;
contain: content;  /* layout + paint + style */
contain: strict;   /* layout + paint + style + size */
```

## Why It Matters

By default, a CSS change anywhere on the page can potentially affect any other element's layout. CSS containment declares that certain elements are isolated — changes inside them don't affect the outside world. This lets browsers skip large portions of the rendering pipeline for unchanged content, which is especially valuable for pages with many independent components.

## Practical Use Cases

### Independent Widgets

```css
/* A widget that doesn't overflow and doesn't interact with page layout */
.chat-widget {
  contain: layout paint;
  /* Changes inside .chat-widget only repaint within its bounds */
}

/* A fixed-size advertisement */
.ad-unit {
  contain: strict;
  width: 300px;
  height: 250px;
}
```

### Repeated List Items

```css
/* Each item in a long list is independent */
.feed-item {
  contain: content; /* layout + paint + style */
}
/* Rerendering one feed item doesn't affect others */
```

## content-visibility for Off-Screen Content

```css
/* Skip rendering content that's not visible */
.article-section {
  content-visibility: auto;
  /* Browser skips layout, paint, and compositing for off-screen sections */
  /* Automatically re-renders when it enters the viewport */
}
```

This is especially impactful for long pages — the browser only renders what's near the viewport.

```css
/* Provide a contain-intrinsic-size hint to prevent scroll jumps */
.article-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 800px; /* Estimated height */
}
```

## Container Queries with Containment

```css
/* Container queries require containment on the parent */
.card-container {
  container-type: inline-size; /* Implicitly sets inline-size containment */
  container-name: card;
}

@container card (min-width: 400px) {
  .card__content {
    display: flex;
  }
}
```

## Measuring Impact

Use Chrome DevTools' Performance panel to measure:
1. Open DevTools → Performance
2. Record a scroll or interaction
3. Look for "Layout" entries — their scope shows how containment helped

## Support Notes

- Containment can change layout, sizing, or paint behavior differently across engines, so verify both performance gains and layout correctness in target browsers.
- Use a fallback note when a containment mode is unsupported or changes intrinsic sizing in ways your layout cannot tolerate.

## Verification

1. Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
2. Confirm the computed styles match the intended fix in DevTools.
3. Test at least one mobile and one desktop viewport before shipping.
4. If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.