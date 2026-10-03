# Use CSS subgrid to align nested grid items to parent tracks

> Use grid-template-columns: subgrid (or subgrid for rows) to make nested grid items participate in the parent grid's tracks, solving the card-content alignment problem without JavaScript height matching.

**Priority:** low · **Difficulty:** intermediate · **Time:** 25 min

---
[CSS subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid) allows a nested grid container to inherit the track definitions of its parent grid. The [web.dev subgrid guide](https://web.dev/articles/css-subgrid) is useful here because it shows the exact card-alignment problems that used to require JavaScript height matching.
## Code Example

```css
/* ❌ Without subgrid — each card creates its own grid context */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.card {
  display: grid;
  /* Each card has its own rows — they don't align across cards */
  grid-template-rows: auto 1fr auto;
}

/* Result: card titles, content, and footers are at different vertical positions
   because each card's row heights are independent */
```

## Why It Matters

Card grids are one of the most common UI patterns, but aligning content across cards — matching title heights, content areas, and footers — has historically required JavaScript height measurement or CSS hacks. Subgrid solves this at the layout engine level: nested items participate directly in the parent grid's tracks, so alignment is automatic, performant, and CSS-only.

## The Subgrid Solution

The key technique is to span the card across rows in the parent grid, then use `subgrid` on the card's own `grid-template-rows`:

```css
/* ✅ With subgrid — card items align to shared parent row tracks */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* Define 3 row slots per card: title, content, footer */
  grid-template-rows: repeat(auto-fill, auto 1fr auto);
  gap: 1.5rem;
  /* Or define named row tracks explicitly */
  row-gap: 0; /* gaps within cards managed by cards themselves */
}

.card {
  /* Span across the 3 row tracks the parent allocated */
  grid-row: span 3;
  /* Inherit those 3 row tracks from the parent */
  display: grid;
  grid-template-rows: subgrid;
}

/* Now .card__title, .card__content, .card__footer align across all cards */
.card__title { }        /* occupies row track 1 */
.card__content { }      /* occupies row track 2 — stretches to match siblings */
.card__footer { }       /* occupies row track 3 — always at the same height */
```

## Full Card Grid Example

```css
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  /* 4 row tracks per card: image, title, description, price+cta */
  grid-template-rows: repeat(auto-fill, 200px auto 1fr auto);
  gap: 1.5rem 1rem;
  align-items: start;
}

.product-card {
  grid-row: span 4;
  display: grid;
  grid-template-rows: subgrid;
  background: var(--color-surface);
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.product-card__image {
  /* Row track 1: fixed 200px from parent */
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-card__title {
  /* Row track 2: auto-height, but all titles in a row share the tallest height */
  padding: 1rem 1rem 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
}

.product-card__description {
  /* Row track 3: 1fr — stretches to fill remaining space */
  padding: 0 1rem;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.product-card__footer {
  /* Row track 4: auto-height, all footers align to the same baseline */
  padding: 0.75rem 1rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid var(--color-border);
}
```

## Subgrid on Columns

Subgrid works on columns too, enabling nested items to align with the parent's column tracks:

```css
/* Parent grid with named column areas */
.page-layout {
  display: grid;
  grid-template-columns:
    [full-start] 1rem
    [content-start] 1fr
    [content-end] 1rem
    [full-end];
}

/* A nested section participates in the parent's column tracks */
.full-width-section {
  grid-column: full-start / full-end;
  display: grid;
  grid-template-columns: subgrid; /* inherits the 4 parent column tracks */
}

/* Inner content respects the parent's content column */
.full-width-section .inner-content {
  grid-column: content-start / content-end;
}
```

## Subgrid with Named Lines

Named grid lines defined in the parent are available to subgrid children:

```css
.parent {
  display: grid;
  grid-template-columns:
    [sidebar-start] 250px
    [sidebar-end main-start] 1fr
    [main-end];
  grid-template-rows:
    [header-start] auto
    [header-end body-start] 1fr
    [body-end footer-start] auto
    [footer-end];
}

.child {
  grid-column: sidebar-start / main-end; /* spans all columns */
  grid-row: header-start / footer-end;   /* spans all rows */
  display: grid;
  grid-template-columns: subgrid; /* can use sidebar-start, main-start, etc. */
  grid-template-rows: subgrid;    /* can use header-start, body-start, etc. */
}
```

Gap values are not inherited by subgrid. The child grid uses the gaps defined by the parent grid for the inherited tracks, but any `gap` property on the child only applies to tracks the child itself creates (non-subgrid dimensions). If your card needs internal spacing, use padding on the card items rather than relying on gap within the subgrid dimension.

## Browser Support

Subgrid is supported across all major browsers:
- Firefox 71+ (first to ship, in 2019)
- Safari 16+ (2022)
- Chrome/Edge 117+ (2023)

Use [`Can I Use`](https://caniuse.com/css-subgrid) and `@supports` to provide a fallback for older environments if needed:

```css
/* Base layout — works everywhere */
.card {
  display: flex;
  flex-direction: column;
}

/* Enhanced layout with subgrid */
@supports (grid-template-rows: subgrid) {
  .card-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(auto-fill, auto 1fr auto);
  }

  .card {
    display: grid;
    grid-row: span 3;
    grid-template-rows: subgrid;
  }
}
```

## Verification

Use the [MDN subgrid guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid) and [`Can I Use`](https://caniuse.com/css-subgrid) as the baseline when checking alignment across browsers.

1. View the card grid at a breakpoint where multiple cards appear in the same row. Confirm that titles, content areas, and footers all align horizontally across cards of different content lengths.
2. Open DevTools Grid inspector and verify the card shows a subgrid indicator (not an independent grid) — in Chrome DevTools, the grid badge on the card should show it participating in the parent grid's tracks.
3. Add a card with an unusually long title or description and confirm the other cards in the same row adjust their corresponding sections to match, without any JavaScript.
4. Check in Firefox and Safari (the two browsers with the longest subgrid support) to confirm rendering matches Chrome — subgrid is stable across implementations.