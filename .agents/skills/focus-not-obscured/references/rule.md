# Keep focused elements unobscured

> Sticky headers, footers, banners, and overlays must not fully hide the element that currently has keyboard focus.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Keyboard focus must stay visible as users move through the interface. A sticky header, cookie banner, footer bar, or floating widget that sits on top of the focused control can make the page unusable even if the focus indicator itself is technically rendered.

## Code Example

```css
/* Bad: fixed chrome with no spacing for keyboard-driven scrolling */
.site-header {
  position: sticky;
  top: 0;
  height: 72px;
}

.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  min-height: 88px;
}
```

```css
/* Better: reserve room for focused content */
html {
  scroll-padding-top: 80px;
  scroll-padding-bottom: 96px;
}

.site-header {
  position: sticky;
  top: 0;
}

.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 96px;
}
```

```html
<!-- Better: a skip link target with enough top margin to stay visible -->
<a class="skip-link" href="#main">Skip to main content</a>
<main id="main" tabindex="-1">...</main>
```

## Why It Matters

When keyboard users tab through a page, the browser scrolls the next focused element into view. If author-controlled UI keeps covering that element, users lose context and may not know what will activate when they press Enter or Space.

- sticky bars can hide the target control
- zoomed layouts make overlap problems far more frequent
- consent banners and promo bars often appear only after load, so the bug is missed in static review
- low-vision users relying on zoom are especially exposed to this failure mode

## Best Practices

### Reserve room for fixed UI

If your layout uses fixed or sticky chrome, add appropriate `scroll-padding-top` and `scroll-padding-bottom` values on the scrolling container so browser-driven focus scrolling does not tuck controls underneath those regions.

### Test with transient UI active

Do not validate focus only in the clean layout. Re-test when these are present:

- cookie consent banners
- floating chat launchers
- promo bars
- sticky mobile toolbars
- in-page anchored navigation

### Re-test at zoom and narrow widths

A layout that works at 100% zoom on desktop can still fail badly at 200% or 400% zoom, or on short mobile viewports where sticky UI consumes a larger percentage of the screen.

## Exceptions

- User-triggered temporary disclosures can change the visible area, but author-controlled persistent bars still must not fully hide the focused control.
- If a focus movement opens a modal dialog, move focus into the dialog instead of leaving it behind the overlay.
- Solving the issue by disabling focus outlines is not a valid fix. Keep the focus indicator and keep the focused control visible.

## Verification

### Automated Checks

- Search for `position: fixed` and `position: sticky` UI that persists while the page scrolls.
- Identify any scrolling container that needs `scroll-padding-top` or `scroll-padding-bottom`.

### Manual Checks

- Tab through the page with all sticky UI active.
- Repeat at zoomed layouts and narrow viewports.
- Pass if the focused element and its focus indicator remain visible.
- Fail if a sticky header, footer, banner, or widget fully covers the focused control.