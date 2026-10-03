# Use container queries for component-level responsiveness

> Use CSS container queries to make components respond to their own container's size rather than the viewport, enabling truly reusable responsive components.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
Container queries allow a component to adapt its layout based on the size of its containing element rather than the viewport. This makes components genuinely portable.

## Code Example

```css
/* 1. Define the container on the PARENT */
.card-container {
  container-type: inline-size;
  /* Optionally name it */
  container-name: card;
  /* Shorthand */
  container: card / inline-size;
}

/* 2. Query the container from the CHILD */
@container (min-width: 400px) {
  .card {
    display: flex;
    gap: 1.5rem;
  }

  .card__image {
    flex: 0 0 200px;
  }
}
```

## Why It Matters

Media queries respond to viewport width, which makes components context-dependent — a card designed for a 3-column grid might break when placed in a 2-column grid or a sidebar. Container queries solve this: a card can layout itself based on how much space its container gives it, making the component genuinely reusable in any layout context.

## Named Containers

```css
/* Name containers to target specific ancestors */
.sidebar {
  container: sidebar / inline-size;
}

.main-content {
  container: main / inline-size;
}

/* Target the sidebar container specifically */
@container sidebar (max-width: 300px) {
  .widget {
    font-size: 0.875rem;
  }
}

@container main (min-width: 800px) {
  .article {
    column-count: 2;
  }
}
```

## Real-World Card Component

```css
/* The card works anywhere — sidebar, grid, full-width */
.card-wrapper {
  container-type: inline-size;
}

.card {
  /* Stacked layout by default (narrow context) */
  display: grid;
  gap: 1rem;
}

.card__image {
  aspect-ratio: 16 / 9;
}

/* Side-by-side layout when there's enough room */
@container (min-width: 480px) {
  .card {
    grid-template-columns: 200px 1fr;
    align-items: start;
  }

  .card__image {
    aspect-ratio: 1;
  }
}

/* Richer layout at wide sizes */
@container (min-width: 720px) {
  .card {
    grid-template-columns: 320px 1fr;
  }

  .card__meta {
    display: flex;
    gap: 1rem;
  }
}
```

## container-type Values

```css
container-type: normal;       /* Default — not a container */
container-type: inline-size;  /* Queries based on inline (usually width) dimension */
container-type: size;         /* Queries based on both inline and block dimensions */
```

## Container Units

```css
/* Relative to the nearest container */
.responsive-text {
  font-size: clamp(1rem, 4cqi, 2rem);
  /* cqi = 1% of container's inline size */
  /* cqb = 1% of container's block size */
  /* cqw, cqh = same but always width/height */
  /* cqmin, cqmax = minimum/maximum of the two */
}
```

## Support Notes

- The feature is supported across the current project browser matrix.
- Baseline-compatible minimums: chrome 115, edge 115, firefox 116, safari 16.4, safari_ios 16.4.
- Add a fallback or progressive-enhancement note when a required project target falls outside that support range.

## Verification

1. Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
2. Confirm the computed styles match the intended fix in DevTools.
3. Test at least one mobile and one desktop viewport before shipping.
4. If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.