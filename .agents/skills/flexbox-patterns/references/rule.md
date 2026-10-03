# Apply Flexbox best practices

> Use Flexbox for one-dimensional layouts with the right properties, avoiding common mistakes like overusing flex:1, ignoring min-width:0, and misunderstanding flex-basis.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
Flexbox is purpose-built for one-dimensional layouts. Understanding its three core properties (flex-grow, flex-shrink, flex-basis) prevents the most common bugs.

## Code Example

```css
/* flex: grow shrink basis */
flex: 0 0 auto;    /* Don't grow, don't shrink, use content size (default) */
flex: 1 1 0;       /* Grow and shrink equally, start from 0 (shorthand: flex:1) */
flex: 1 1 auto;    /* Grow and shrink, start from content size */
flex: 0 1 auto;    /* Shrink only, start from content size (browser default) */
flex: none;        /* 0 0 auto — fixed size, no flex */
```

## Why It Matters

Flexbox is one of the most used CSS features, but its unintuitive default values (flex-shrink:1, min-width:auto) cause layout bugs that are hard to diagnose. Understanding the flex shorthand and the min-width:0 fix prevents the most common Flexbox breakage scenarios.

## Common Patterns

```css
/* Equal-width columns that fill the container */
.nav-items {
  display: flex;
  gap: 1rem;
}

.nav-item {
  flex: 1;  /* Equal widths */
}

/* Sidebar + main content */
.layout {
  display: flex;
  gap: 2rem;
}

.sidebar {
  flex: 0 0 280px;  /* Fixed 280px, no growing or shrinking */
}

.main-content {
  flex: 1;  /* Takes all remaining space */
}
```

## The min-width: 0 Fix

```css
/* ❌ Text in flex child doesn't truncate */
.card-container {
  display: flex;
}

.card-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* Doesn't work! Flex items default to min-width: auto */
}

/* ✅ Add min-width: 0 to allow shrinking below content size */
.card {
  flex: 1;
  min-width: 0;  /* Allows flex child to shrink below its content width */
}

.card-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* Now works correctly */
}
```

## gap vs margin

```css
/* ❌ Using margins for flex item spacing */
.button-group {
  display: flex;
}

.button-group > * + * {
  margin-left: 0.5rem;  /* Complex selectors, doesn't work for wrapping */
}

/* ✅ Use gap */
.button-group {
  display: flex;
  gap: 0.5rem;  /* Works for both row and column, handles wrapping correctly */
  flex-wrap: wrap;
}
```

## Centering

```css
/* Perfect centering */
.centered {
  display: flex;
  align-items: center;    /* Cross axis */
  justify-content: center; /* Main axis */
}

/* Space items evenly */
.spaced {
  display: flex;
  justify-content: space-between; /* Space between items */
  align-items: center;
}

/* Push last item to end */
.header {
  display: flex;
  align-items: center;
}

.header__actions {
  margin-left: auto; /* Pushes to the right */
}
```

## Wrapping for Responsive Grids

```css
/* Simple responsive grid without media queries */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  /* Tags take as much space as their content needs */
  flex: 0 0 auto;
}
```

## Verification

1. Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
2. Confirm the computed styles match the intended fix in DevTools.
3. Test at least one mobile and one desktop viewport before shipping.
4. If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.