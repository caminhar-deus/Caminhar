# Use :has() to style parent elements based on their descendants

> Use the CSS :has() relational pseudo-class to select and style an element based on what it contains, replacing JavaScript DOM manipulation for many common styling scenarios.

**Priority:** low · **Difficulty:** intermediate · **Time:** 20 min

---
The [`:has()` pseudo-class](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) selects an element if any selector passed as an argument matches a descendant or related element. The [web.dev guide](https://web.dev/articles/css-has) is why people call it the long-awaited parent selector: many JavaScript class-toggling patterns become pure CSS.
## Code Example

```css
/* Select .card if it contains an img element */
.card:has(img) {
  display: grid;
  grid-template-columns: 200px 1fr;
}

/* Select a <p> that is immediately followed by an <ul> */
p:has(+ ul) {
  margin-bottom: 0.25rem;
}

/* Select a <section> that contains a focused element */
section:has(:focus-visible) {
  outline: 2px solid var(--color-focus);
}
```

## Why It Matters

Before :has(), styling a parent based on its children required JavaScript: detecting state, toggling classes, and keeping DOM and styles in sync. This created coupling between styling logic and application logic. :has() moves that relationship back into CSS where it belongs, reducing JavaScript complexity, eliminating class-toggling boilerplate, and making styling intent readable in the stylesheet itself.

## Form Styling Based on Input State

Replace JavaScript class toggling with CSS state:

```css
/* Style the form group when its input is invalid and not empty */
.form-group:has(input:invalid:not(:placeholder-shown)) {
  --border-color: var(--color-error);
}

.form-group:has(input:invalid:not(:placeholder-shown)) .form-label {
  color: var(--color-error);
}

.form-group:has(input:invalid:not(:placeholder-shown)) .form-error {
  display: block; /* show the error message */
}

/* Style a fieldset when all its required inputs are valid */
fieldset:has(input[required]:valid):not(:has(input[required]:invalid)) {
  border-color: var(--color-success);
}

/* Checkbox-driven section toggle — no JavaScript */
.settings-panel:has(input[type="checkbox"]:checked) .settings-detail {
  display: block;
}
```

## Card Layout Based on Content Presence

```css
/* Cards without images stack their content differently */
.card:has(img) {
  grid-template-areas:
    'image'
    'content'
    'footer';
}

.card:not(:has(img)) {
  grid-template-areas:
    'content'
    'footer';
}

/* Card with a badge gets extra top padding */
.card:has(.badge) {
  padding-top: 2.5rem;
}

/* Article with a figure gets a 2-column layout */
.article:has(figure) {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 2rem;
}
```

## Navigation Active State

```css
/* Highlight the nav item whose link is the current page */
.nav-item:has(a[aria-current="page"]) {
  background: var(--color-nav-active-bg);
  border-radius: 0.375rem;
}

.nav-item:has(a[aria-current="page"]) a {
  color: var(--color-nav-active-text);
  font-weight: 600;
}

/* Expand a nav section if it contains the active link */
.nav-section:has(a[aria-current="page"]) .nav-section-list {
  display: block;
}
```

## Theme Switching Without JavaScript

A classic use case: a `<select>` or `<input>` that controls a whole-page theme:

```css
/* Page theme driven by a radio button — no JS required */
html:has(#theme-dark:checked) {
  color-scheme: dark;
  --bg: #0f172a;
  --fg: #f1f5f9;
}

html:has(#theme-light:checked) {
  color-scheme: light;
  --bg: #ffffff;
  --fg: #0f172a;
}
```

## :has() with Relational Combinators

`:has()` accepts the full selector grammar inside the parentheses, including combinators:

```css
/* Direct child */
.parent:has(> .direct-child) { … }

/* Adjacent sibling (the element has a sibling after it) */
h2:has(+ p) { margin-bottom: 0.5rem; }

/* Subsequent sibling */
.alert:has(~ .alert) { /* there is another alert after this one */ }

/* Attribute selector */
figure:has(figcaption[hidden]) { /* caption is hidden */ }
```

:has() with complex descendant selectors can be expensive when the browser needs to recalculate styles during frequent reflows (scroll, resize, animation). Avoid deeply nested or very broad :has() selectors on elements that repaint frequently. Prefer scoping :has() to a specific subtree (e.g., `.card:has(img)`) rather than a universal or tag-only selector at the root.

## Browser Support

`:has()` reached baseline support in late 2023. All major browsers support it:
- Chrome/Edge 105+
- Firefox 121+
- Safari 15.4+

Use [`Can I Use`](https://caniuse.com/css-has) and `@supports selector(:has(*))` to provide a fallback for older environments:

```css
/* Base styles work for everyone */
.card {
  display: block;
}

/* Enhanced layout only when :has() is available */
@supports selector(:has(*)) {
  .card:has(img) {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}
```

## Verification

Check the result against [`Can I Use`](https://caniuse.com/css-has) and the [MDN `:has()` reference](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) so you confirm both dynamic behavior and fallback coverage.

1. Open browser DevTools and inspect an element targeted by a `:has()` rule. Confirm the rule appears in the Styles panel and is applied when the matching descendant is present.
2. Test with the matching descendant removed to confirm the style is not applied — verifying the selector responds dynamically to DOM changes.
3. Check the browser's compatibility table or `@supports selector(:has(*))` to confirm the feature is available for your target audience, or that a fallback is in place.
4. Profile the page with DevTools Performance panel if `:has()` is used on elements that update frequently — confirm no excessive style recalculation time.