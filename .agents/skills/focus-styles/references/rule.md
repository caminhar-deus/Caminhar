# Provide visible custom focus indicators

> Ensure all interactive elements have a clearly visible focus indicator for keyboard navigation — never just remove the default outline without providing a better alternative.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
Focus indicators are essential for keyboard navigation. Never remove them without providing a better alternative.

## Code Example

```css
/* ❌ Removes focus indicator — keyboard users can't see where they are */
* { outline: none; }
*:focus { outline: none; }
button:focus { outline: 0; }
```

## Why It Matters

Users who navigate by keyboard (people with motor disabilities, power users, people in assistive technology contexts) rely entirely on focus indicators to know where they are on the page. Removing outlines without replacement makes an entire site unusable for keyboard users. WCAG 2.4.7 requires a visible focus indicator, and WCAG 2.4.13 defines a stronger size-and-contrast target for custom indicators.

## :focus-visible (The Right Approach)

`:focus-visible` shows focus indicators only during keyboard navigation, not when clicking with a mouse. This satisfies both aesthetics (no ring on click) and accessibility (ring on keyboard).

```css
/* ❌ Old approach: shows ring on mouse click too */
button:focus {
  outline: 2px solid blue;
}

/* ✅ Modern approach: only during keyboard navigation */
button:focus { outline: none; } /* Hide default on mouse click */
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

## A High-Quality Focus Style

```css
/* Base reset for all browsers */
*:focus {
  outline: none;
}

/* Visible focus only for keyboard navigation */
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
  border-radius: 3px;  /* Optional: match element border-radius */
}
```

## Component-Specific Focus Rings

```css
/* Inset ring for elements where outline-offset would overlap content */
.button {
  position: relative;
}

.button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Dark surface: use a light ring */
.dark-nav .nav-link:focus-visible {
  outline-color: white;
}

/* For inputs: border change instead of outline */
.input:focus-visible {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgb(37 99 235 / 0.25);
}
```

## Skip Links for Keyboard Users

```css
/* Visually hidden but visible on focus */
.skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: 0 0 0.5rem 0.5rem;
  z-index: 1000;
}

.skip-link:focus {
  top: 0;
}
```

## WCAG 2.2 Requirements

WCAG 2.2 Success Criterion 2.4.11 (Focus Appearance, AA) requires:
- Focus indicator area of at least the perimeter of the unfocused component times 2 CSS pixels
- Contrast ratio of at least 3:1 between focused and unfocused states
- At least 3:1 contrast against adjacent colors

## Verification

1. Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
2. Confirm the computed styles match the intended fix in DevTools.
3. Test at least one mobile and one desktop viewport before shipping.
4. If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.