# Use CSS Grid for two-dimensional layouts

> Use CSS Grid when you need to control both rows and columns simultaneously, such as page layouts, card grids, and complex component arrangements.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 25 min

---
CSS Grid is the most powerful layout system in CSS, designed specifically for two-dimensional layouts where you need to control placement across both rows and columns.

## Code Example

```css
/* ✅ Simple 3-column grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

/* ✅ Responsive without media queries */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
/* Creates as many 280px+ columns as fit — automatically responsive */
```

## Why It Matters

CSS Grid solves layout problems that previously required JavaScript or complex CSS hacks — aligning items across both axes simultaneously, creating named layout areas, and building responsive grids that adapt to content. Using Flexbox for two-dimensional layouts results in workarounds like fixed widths that break responsiveness.

## Named Template Areas

```css
/* ✅ Visual layout declaration */
.page-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
  min-height: 100vh;
}

.page-header { grid-area: header; }
.page-sidebar { grid-area: sidebar; }
.page-main { grid-area: main; }
.page-footer { grid-area: footer; }

/* Responsive: single column on mobile */
@media (max-width: 768px) {
  .page-layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "footer";
  }
}
```

## minmax() and fr Units

```css
.layout {
  display: grid;
  /* First column: 200px to 300px; second: fills remaining space */
  grid-template-columns: minmax(200px, 300px) 1fr;

  /* Three equal columns, minimum 150px each */
  grid-template-columns: repeat(3, minmax(150px, 1fr));
}
```

## Explicit Placement

```css
.featured-card {
  /* Span across 2 columns and 2 rows */
  grid-column: 1 / 3;
  grid-row: 1 / 3;
}

/* Named lines */
.container {
  grid-template-columns: [start] 1fr [center] 1fr [end];
}

.full-bleed {
  grid-column: start / end;
}
```

## Subgrid for Nested Alignment

```css
/* Cards align their internal elements to the parent grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto auto 1fr auto;
}

.card {
  display: grid;
  grid-row: span 4;
  grid-template-rows: subgrid; /* Inherit parent's row tracks */
}
/* Now all card titles, descriptions, and CTAs align across cards */
```

## Grid vs Flexbox: When to Use Which

```
Grid:
- Full page layouts
- Card grids where row height matters
- Any 2D alignment requirement
- Holy grail layouts

Flexbox:
- Navigation bars
- Button groups
- Single rows/columns
- Centering a single element
```

## Support Notes

- Core CSS Grid is broadly supported, but related features such as subgrid may require progressive enhancement or a simpler fallback for some target browsers.
- Validate the actual rendered layout across the project browser matrix, not only in one evergreen browser.

## Verification

### Automated Checks

- Confirm the computed styles match the intended fix in DevTools.
- If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.

### Manual Checks

- Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
- Test at least one mobile and one desktop viewport before shipping.