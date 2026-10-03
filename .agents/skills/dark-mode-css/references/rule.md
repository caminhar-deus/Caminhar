# Support dark mode with prefers-color-scheme

> Implement dark mode using the prefers-color-scheme media query and CSS custom properties so the site automatically adapts to the user's system preference.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 25 min

---
Dark mode is best implemented by redefining CSS custom property values in a media query or a [data-theme] selector, without changing any component styles.

## Code Example

```css
/* ✅ Define semantic color tokens — not "dark-blue" but "color-primary" */
:root {
  /* Light mode values (default) */
  --color-surface: #ffffff;
  --color-surface-elevated: #f9fafb;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-primary: #2563eb;
  --color-primary-foreground: #ffffff;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
}

/* Dark mode: just redefine the same variables */
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface: #0f172a;
    --color-surface-elevated: #1e293b;
    --color-text: #f1f5f9;
    --color-text-muted: #94a3b8;
    --color-border: #334155;
    --color-primary: #3b82f6;
    --color-primary-foreground: #ffffff;
    --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.3);
  }
}

/* Components use variables — no dark-mode-specific component CSS needed */
.card {
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}
```

## Why It Matters

More than half of users prefer dark mode for reduced eye strain, especially in low-light environments. Users with photosensitivity rely on it. Implementing dark mode via prefers-color-scheme respects the user's OS preference without them needing to find a toggle, and CSS custom properties make it a clean, maintainable addition rather than a disruptive refactor.

## Supporting a Manual Toggle

```css
/* Allow data-theme attribute to override OS preference */
[data-theme="light"] {
  --color-surface: #ffffff;
  --color-text: #111827;
  /* ... all light values */
}

[data-theme="dark"] {
  --color-surface: #0f172a;
  --color-text: #f1f5f9;
  /* ... all dark values */
  color-scheme: dark; /* Tell browser to use dark scrollbars, inputs, etc */
}
```

```javascript
// Manual toggle with localStorage persistence
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme-preference', theme)
}

// On load — respect saved preference or OS default
const saved = localStorage.getItem('theme-preference')
if (saved) {
  document.documentElement.setAttribute('data-theme', saved)
}
// If no saved preference, the media query handles it automatically
```

## Color Scheme for Native Elements

```css
:root {
  color-scheme: light dark; /* Browser adjusts scrollbars, form inputs, etc */
}

[data-theme="dark"] {
  color-scheme: dark;
}
```

## Images in Dark Mode

```css
/* Reduce image brightness in dark mode (useful for screenshots and diagrams) */
@media (prefers-color-scheme: dark) {
  img:not([src*=".svg"]) {
    filter: brightness(0.85) contrast(1.05);
  }
}
```

## Smooth Transitions

```css
/* Add a smooth transition when switching themes */
:root {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
}

/* But skip transition on page load */
.no-transition * {
  transition: none !important;
}
```

## Verification

1. Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
2. Confirm the computed styles match the intended fix in DevTools.
3. Test at least one mobile and one desktop viewport before shipping.
4. If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.