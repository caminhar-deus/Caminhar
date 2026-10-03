# Provide accessible names for buttons

> All buttons must have a discernible, descriptive accessible name for screen readers.

**Priority:** critical · **Difficulty:** beginner · **Time:** 5 min

---
Every button on a webpage must have an accessible name so that people using assistive technologies, such as screen readers, know what the button does.

## Code Example

```html
<!-- ✅ Good: Descriptive text content -->
<button type="submit">Subscribe to Newsletter</button>

<!-- ✅ Good: Icon button with aria-label -->
<button aria-label="Close modal">
  <svg>...</svg>
</button>

<!-- ✅ Good: Using aria-labelledby -->
<span id="save-desc">Save your changes</span>
<button aria-labelledby="save-desc">
  <svg>...</svg>
</button>

<!-- ❌ Bad: Icon button with no text or label -->
<button>
  <i class="fa fa-trash"></i>
</button>
```

## Why It Matters

- **Meaningful Interaction**: Users need to know what happens when they click a button.
- **Non-Visual Navigation**: Screen readers announce the "accessible name" when a user focuses on the button.
- **Context**: For icon-only buttons, the accessible name provides the only clue to the button's function.

## Best Practices

✅ **Be Concise**: Keep labels short but descriptive (e.g., "Search" instead of "Click here to search our website").
✅ **Avoid "Button" in Label**: Screen readers already announce the element as a button.
✅ **Check Visibility**: If using text content, ensure it isn't hidden from screen readers accidentally.
✅ **Keep semantics aligned**: Use `<button>` for submit, open, close, save, delete, and toggle actions. Use `<a href>` when the user is moving to another URL.

```html
<!-- ✅ Action -->
<button type="button">Save draft</button>

<!-- ✅ Navigation -->
<a href="/pricing">View pricing</a>
```

## Tools & Validation

- [Axe DevTools](https://www.deque.com/axe/)
- [WAVE Tool](https://wave.webaim.org/)
- [Chrome DevTools Accessibility Tab](https://developer.chrome.com/docs/devtools/accessibility/reference/)

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