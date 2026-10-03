# Use CSS custom properties for design tokens

> Define design system values (colors, spacing, typography) as CSS custom properties on :root to enable consistent theming, dynamic updates, and dark mode support.

**Priority:** high · **Difficulty:** beginner · **Time:** 20 min

---
CSS custom properties (often called CSS variables) are properties you define yourself, prefixed with `--`, that cascade and inherit just like standard CSS properties.

## Code Example

```css
:root {
  /* Colors */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-surface: #ffffff;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;

  /* Spacing scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;

  /* Borders */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

## Why It Matters

Hard-coded color values and magic numbers scattered across CSS files make global changes (a rebrand, a dark mode, a spacing adjustment) require finding and updating dozens of individual lines. Custom properties centralize these values so one change propagates everywhere — and enable runtime theming that preprocessor variables cannot.

## Using Custom Properties

```css
.button {
  background-color: var(--color-primary);
  color: var(--color-surface);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-sm);

  /* Fallback value if variable is undefined */
  box-shadow: var(--shadow-button, var(--shadow-sm));
}

.button:hover {
  background-color: var(--color-primary-hover);
}
```

## Component-Scoped Overrides

```css
/* Override a variable at the component level */
.card {
  --color-surface: #f9fafb;
  --shadow-md: 0 8px 12px -2px rgb(0 0 0 / 0.15);

  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}
```

## Dark Mode with Custom Properties

```css
:root {
  --color-surface: #ffffff;
  --color-text: #111827;
  --color-border: #e5e7eb;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-surface: #1f2937;
    --color-text: #f9fafb;
    --color-border: #374151;
  }
}

/* All components using these variables update automatically */
```

## JavaScript Interop

```javascript
// Read a custom property
const primaryColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-primary').trim()

// Write a custom property (dynamic theming)
document.documentElement.style.setProperty('--color-primary', '#10b981')

// Theme switching
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}
```

## Verification

1. Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
2. Confirm the computed styles match the intended fix in DevTools.
3. Test at least one mobile and one desktop viewport before shipping.
4. If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.