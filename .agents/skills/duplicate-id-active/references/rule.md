# Use unique IDs for active elements

> All focusable or active elements must have a unique ID attribute.

**Priority:** high · **Difficulty:** intermediate · **Time:** 10 min

---
Every interactive element on a page must have a unique ID to ensure that browsers and assistive technologies can uniquely identify and interact with them.

## Code Example

```html
<!-- ✅ Good: Unique IDs for each input -->
<label for="first-name">First Name</label>
<input id="first-name" type="text">

<label for="last-name">Last Name</label>
<input id="last-name" type="text">

<!-- ❌ Bad: Duplicate IDs on active elements -->
<button id="submit-btn">Save</button>
<button id="submit-btn">Cancel</button> <!-- Error: ID must be unique -->
```

## Why It Matters

- **Focus Management**: Browsers use IDs to track which element currently has focus. Duplicate IDs can lead to focus being lost or moved to the wrong element.
- **Keyboard Navigation**: Users navigating by keyboard may find that some interactive elements are unreachable if they share an ID with another element.
- **Assistive Technology**: Screen readers often use IDs to build a map of the page's interactive controls. Duplicate IDs corrupt this map.

## Best Practices

✅ **Automate Checks**: Use linters or accessibility auditors to catch duplicate IDs during development.
✅ **Use Prefixes**: In component-based frameworks, use unique prefixes or generated IDs to avoid collisions between multiple instances of the same component.
✅ **Semantic Labels**: Always ensure `for` attributes on labels match the unique `id` of their corresponding input.

## Tools & Validation

- [W3C HTML Validator](https://validator.w3.org/)
- [Axe-core Rule: duplicate-id-active](https://dequeuniversity.com/rules/axe/4.7/duplicate-id-active)

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