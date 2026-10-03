# Keep CSS specificity low and flat

> Write selectors at the lowest specificity that works, avoiding ID selectors and deep nesting, so styles can be overridden cleanly without resorting to !important.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Specificity determines which CSS rule wins when multiple rules target the same element. Keeping it low and predictable prevents the escalation that leads to `!important` everywhere.

## Code Example

```
Inline styles:          1,0,0,0  (always wins over stylesheets)
ID selectors:           0,1,0,0  (#header)
Class/pseudo-class:     0,0,1,0  (.button, :hover, :first-child)
Element/pseudo-element: 0,0,0,1  (div, h1, ::before)
Universal selector:     0,0,0,0  (*)
```

## Why It Matters

High specificity creates an escalation problem — once you use an ID selector, you need another ID to override it. Developers respond with !important, which escalates further. Flat, low-specificity CSS is predictable: later rules and more-specific selectors win cleanly, and the cascade works as intended.

## The Escalation Problem

```css
/* Step 1: Someone styles with an ID */
#sidebar .nav-item { color: blue; }      /* Specificity: 0,1,1,0 */

/* Step 2: Designer wants to override, needs higher specificity */
#sidebar #main-nav .nav-item { color: red; } /* 0,2,1,0 */

/* Step 3: Developer gives up and uses !important */
.nav-item { color: green !important; }

/* Step 4: Chaos */
```

## Low-Specificity Solutions

```css
/* ❌ High specificity — hard to override */
#main-navigation .nav-list .nav-item .nav-link { color: blue; }

/* ✅ Single class — easy to override, predictable */
.nav-link { color: blue; }
.nav-link--active { color: var(--color-primary); }
```

## :where() for Zero-Specificity Styles

```css
/* :where() has zero specificity — perfect for base/reset styles */
:where(h1, h2, h3, h4) {
  font-weight: 600;
  line-height: 1.3;
}

/* Any class rule will override it without specificity battle */
.hero-title {
  font-weight: 800; /* Wins over :where() regardless of order */
}
```

## :is() for Flat Multi-Selectors

```css
/* ❌ Verbose and repetitive */
header a,
main a,
footer a {
  text-decoration: underline;
}

/* ✅ :is() matches the highest specificity of its arguments */
:is(header, main, footer) a {
  text-decoration: underline;
}
```

## Nesting Depth

```css
/* ❌ 4-level nesting — specificity: 0,0,4,0 */
.card .card__header .card__title span { font-size: 1.25rem; }

/* ✅ Flat — specificity: 0,0,1,0 */
.card__title-text { font-size: 1.25rem; }
```

## Utility Classes and !important

```css
/* The one valid use of !important: utility classes that must always win */
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
}

.hidden { display: none !important; }
```

## Verification

### Automated Checks

- Confirm the computed styles match the intended fix in DevTools.
- If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.

### Manual Checks

- Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
- Test at least one mobile and one desktop viewport before shipping.