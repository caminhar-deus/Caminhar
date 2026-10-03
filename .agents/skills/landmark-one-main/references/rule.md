# Use exactly one main landmark

> Each page must have one and only one main landmark.

**Priority:** medium · **Difficulty:** beginner · **Time:** 5 min

---
The [`<main>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/main) or [`role="main"`](https://www.w3.org/TR/wai-aria-1.2/#main) designates the primary content of the document. Having more than one can confuse users of assistive technology.
## Code Examples

### Correct Implementation
```html
<body>
  <header>...</header>
  <nav>...</nav>
  
  <main id="main-content">
    <h1>Welcome to our site</h1>
    <p>This is the primary content.</p>
  </main>
  
  <footer>...</footer>
</body>
```

### Incorrect Implementation
```html
<main>Section 1</main>
<main>Section 2</main>
```

## Why It Matters

- **Navigation**: Many screen readers provide a shortcut key to jump directly to the "main" landmark.
- **Structure**: It clearly defines where the unique content of a page begins, separating it from global elements like headers, footers, and sidebars.
- **Focus Management**: Often used as the target for "Skip to content" links.

## Best Practices

✅ **Use the `<main>` tag**: It's the modern, semantic way to define the main landmark.

✅ **Place unique content inside**: Only include content that is unique to the specific page.

❌ **Don't nest `<main>`**: It should be a top-level landmark, not nested inside `<article>`, `<aside>`, `<nav>`, etc.

❌ **Don't include multiple instances**: If you have multiple areas of content, wrap them in a single `<main>` container.

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Standards

- Align the implementation with W3C WAI: WCAG Overview and verify the rendered experience, not only the source code.
- Align the implementation with MDN: Accessibility and verify the rendered experience, not only the source code.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.