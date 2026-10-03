# Maintain logical heading order

> Heading levels should follow a sequential, hierarchical order.

**Priority:** medium · **Difficulty:** beginner · **Time:** 5 min

---
Headings help users understand the structure of a page. Skipping heading levels can confuse users of assistive technology who rely on them for navigation, which is why this rule complements broader [heading hierarchy](/en/rules/accessibility/heading-hierarchy) checks.
## Code Examples

### Correct Implementation
```html
<h1>Main Page Title</h1>
  <h2>Section One</h2>
    <h3>Sub-section A</h3>
  <h2>Section Two</h2>
    <h3>Sub-section B</h3>
```

### Incorrect Implementation
```html
<h1>Main Page Title</h1>
  <h3>Skipped a level!</h3>
    <h5>Skipped again!</h5>
```

## Why It Matters

- **Navigation**: Screen reader users often navigate by jumping from heading to heading.
- **Outlining**: A correct hierarchy provides an accurate outline of the document content.
- **SEO**: Search engines use heading structure to understand the importance and relationship of content.

## Best Practices

✅ **Start with `<h1>`**: Each page should typically have one primary `<h1>` representing the main topic.

✅ **Sequential Nesting**: Only go down one level at a time (`<h1>` to `<h2>`, `<h2>` to `<h3>`).

✅ **Styling != Structure**: Don't choose a heading level based on its default font size. Use CSS to style headings while maintaining the correct semantic level.

❌ **Don't use headings for styling**: Don't use a heading tag just to make text bold or large if it isn't actually a section title.

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