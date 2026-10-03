# Ensure headings contain text

> All heading elements (h1-h6) must have visible, descriptive content.

**Priority:** medium · **Difficulty:** beginner · **Time:** 5 min

---
Headings provide a roadmap for the page. If a heading is empty, it fails to provide any information about the section it represents, while still appearing in the document's outline.

## Code Example

```html
<!-- ✅ Good: Descriptive heading content -->
<h1>Product Specifications</h1>

<!-- ❌ Bad: Empty heading -->
<h2></h2>

<!-- ❌ Bad: Heading with only whitespace -->
<h3>   </h3>

<!-- ❌ Bad: Heading used only for an icon without text -->
<h4><i class="fas fa-user"></i></h4> <!-- Needs an aria-label or screen-reader-only text -->
```

## Why It Matters

- **Navigation**: Screen reader users often navigate pages by jumping from heading to heading. An empty heading is a frustrating "dead end."
- **SEO**: Search engines use headings to understand the hierarchy and topic of your content.
- **Context**: Headings help all users quickly scan a page to find the information they need.

## Best Practices

✅ **Visible Content**: Headings should ideally contain text that is visible to all users.
✅ **Hidden Text as Fallback**: If a heading must be visual-only (like an icon), include text wrapped in a "screen-reader-only" class.
✅ **Avoid Styling-Only Headings**: Don't use an `<h3>` just because you like the font size; use CSS for styling and HTML for structure.

## Tools & Validation

- [Heading Map Browser Extension](https://chrome.google.com/webstore/detail/headings-map/faieocmmodmbebebegejdcdoomihichn)
- [WAVE Web Accessibility Tool](https://wave.webaim.org/)

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