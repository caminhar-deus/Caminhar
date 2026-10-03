# Support text resizing to 200%

> Text can be resized up to 200% without loss of content or functionality using browser settings.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Text must be resizable to 200% without loss of content or functionality for users with low vision. [WCAG 1.4.4 Resize Text](https://www.w3.org/TR/WCAG21/#resize-text), its [Understanding document](https://www.w3.org/WAI/WCAG21/Understanding/resize-text), and the [`font-size` reference](https://developer.mozilla.org/en-US/docs/Web/CSS/font-size) all point in the same direction: relative sizing and flexible containers.
## Code Example

```css
/* ❌ Bad: Fixed pixel sizes don't scale with browser settings */
body {
  font-size: 16px;
}
h1 {
  font-size: 32px;
}
.small {
  font-size: 12px;
}

/* ✅ Good: Relative units scale with user preferences */
:root {
  font-size: 100%; /* Respects browser default (usually 16px) */
}
body {
  font-size: 1rem;
}
h1 {
  font-size: 2rem;
}
.small {
  font-size: 0.875rem;
}
```

## Why It Matters

Users with low vision need larger text—if your layout breaks at 200% zoom or clips text in fixed containers, they can't read your content.

## Flexible Containers

```css
/* ❌ Bad: Fixed height clips overflowing text */
.card {
  height: 200px;
  overflow: hidden;
}

/* ✅ Good: Min-height allows growth */
.card {
  min-height: 200px;
}

/* ❌ Bad: Fixed width truncates text */
.button {
  width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ✅ Good: Flexible width with minimum */
.button {
  min-width: 100px;
  padding: 8px 16px;
}
```

## Line Height and Spacing

```css
/* ✅ Good: Relative line height and spacing */
body {
  line-height: 1.5;
}

p {
  margin-bottom: 1em;
}

.container {
  padding: 1rem;
}
```

## Media Queries for Large Text

```css
/* Adjust layout when text is resized */
@media (min-width: 40em) {
  .sidebar {
    width: 25%;
  }
}

/* Better: Use container queries for text-based breakpoints */
.card-container {
  container-type: inline-size;
}

@container (max-width: 20ch) {
  .card {
    flex-direction: column;
  }
}
```

## React Component Example

```tsx
// ✅ Good: Fluid typography with clamp
const FluidText = styled.p`
  font-size: clamp(1rem, 2.5vw, 1.5rem);
  line-height: 1.6;
`

// ✅ Good: Container adapts to content
const Card = styled.div`
  min-height: 150px;
  padding: 1rem;

  /* Ensure text doesn't overflow */
  overflow-wrap: break-word;
  word-wrap: break-word;
  hyphens: auto;
`
```

## Testing at 200%

### Browser Zoom
1. **Firefox**: View → Zoom → Zoom Text Only → 200%
2. **Chrome**: Settings → Appearance → Font Size → Very Large
3. **Safari**: Settings → Websites → Page Zoom → 200%

### Check List
- [ ] All text is readable
- [ ] No content is clipped or hidden
- [ ] No horizontal scrolling on mobile
- [ ] Interactive elements remain usable
- [ ] Labels stay associated with form fields

## Common Issues

```css
/* ❌ Bad: Text truncation hides content */
.nav-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ✅ Better: Allow wrapping */
.nav-item {
  overflow-wrap: break-word;
}

/* ❌ Bad: Fixed viewport units for text */
.hero-title {
  font-size: 5vw;
}

/* ✅ Better: Clamped with readable minimum */
.hero-title {
  font-size: clamp(1.5rem, 5vw, 3rem);
}
```

WCAG requires 200% text resize, not browser zoom. Test with text-only zoom (Firefox) or browser font size settings, not Ctrl+Plus which scales everything.

## Exceptions

- Temporary or intentionally inert UI can be removed from the focus order, but only when the same state is also communicated clearly to assistive technology users.
- A focus-management issue should be evaluated in the rendered interaction, not only from static markup, because route changes, overlays, and JS timing can change the real behavior.
- If a component is both unlabeled and focus-broken, fix the stronger user-facing orientation problem first rather than reporting multiple secondary symptoms.

## Support Notes

- Resize and reflow behavior can differ across browser engines and OS accessibility settings, so test the rendered page in the supported browsers rather than relying only on CSS inspection.
- If zoom, text-resize, or reflow behavior differs by browser, document the fallback layout behavior explicitly.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.