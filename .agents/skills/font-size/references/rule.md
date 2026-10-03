# Use readable font sizes on mobile

> Text must be large enough to read without zooming on mobile devices. Using relative units (rem/em) allows browser font size preferences to be respected.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Font sizes on mobile must be large enough to read without zooming, and must be expressed in relative units so they respect user browser preferences.

## Code Example

```css
/* ✅ Good: rem units respect browser font size preferences */
body {
  font-size: 1rem;     /* 16px at default browser settings */
  line-height: 1.5;
}

h1 { font-size: 2rem; }    /* 32px */
h2 { font-size: 1.5rem; }  /* 24px */
p  { font-size: 1rem; }    /* 16px */
small { font-size: 0.875rem; } /* 14px */

/* ✅ Good: input font-size ≥ 16px prevents iOS zoom-on-focus */
input, select, textarea {
  font-size: 1rem;
}

/* ❌ Bad: px units block user font size preferences */
body {
  font-size: 14px; /* Ignores browser font-size setting */
}

/* ❌ Bad: 10px base reset makes rem arithmetic work but breaks accessibility */
html {
  font-size: 10px; /* User setting of 20px is now treated as 10px */
}
```

## Why It Matters

- **Low Vision Users**: Browser font size is an accessibility tool for users who cannot use screen magnifiers or ZoomText.
- **Aging Users**: Font size needs increase with age — respecting browser settings is a low-effort, high-impact accommodation.
- **Readability**: 16px is the typographic minimum for comfortable sustained reading; smaller body text increases fatigue.
- **iOS Compatibility**: Sub-12px text triggers Safari's auto-inflation, causing unexpected layout shifts.

## Recommended Font Size Scale

| Element | Minimum | Recommended |
|---|---|---|
| Body text | `1rem` (16px) | `1rem`–`1.125rem` |
| Small text / captions | `0.75rem` (12px) | `0.875rem` (14px) |
| Navigation labels | `0.875rem` (14px) | `1rem` |
| Headings (h1) | `1.5rem` (24px) | `2rem`+ |
| Input text | `1rem` (16px) | `1rem` — prevents iOS zoom on focus |

## iOS Zoom-on-Focus

iOS Safari automatically zooms in when a form input is focused if its `font-size` is below 16px. This creates a jarring UX. Set all inputs to `font-size: 1rem` (16px) to prevent this behavior.

## Verification

1. Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
2. Confirm the computed styles match the intended fix in DevTools.
3. Test at least one mobile and one desktop viewport before shipping.
4. If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.