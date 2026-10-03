# Provide alt text for image buttons

> Input elements of type='image' must have a descriptive alt attribute.

**Priority:** critical · **Difficulty:** beginner · **Time:** 5 min

---
When an image is used as a form button, it must have alternative text that describes the action the button performs. Both [WCAG 1.1.1](https://www.w3.org/TR/WCAG21/#non-text-content) and the [`<input type="image">` reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/image) treat this as an accessible-name requirement, not a decorative-image exception.
## Code Examples

### Correct Implementation
```html
<input type="image" src="search-icon.png" alt="Search">

<input type="image" src="submit-btn.png" alt="Submit Registration">
```

### Incorrect Implementation
```html
<!-- No alt text -->
<input type="image" src="go.png">

<!-- Describing the icon instead of the action -->
<input type="image" src="magnifying-glass.png" alt="Magnifying glass">
```

## Why It Matters

- **Functional Clarity**: The `alt` text for a button should describe the *action* (e.g., "Search") rather than the *visuals* (e.g., "Magnifying glass").
- **Accessibility**: Users of screen readers need to know what will happen when they interact with the element.
- **Fallbacks**: If the image fails to load, the `alt` text is displayed, allowing the user to still use the form.

## Best Practices

✅ **Be Action-Oriented**: Use verbs like "Search", "Login", "Sign Up".

✅ **Keep it Short**: Usually one or two words is sufficient for a button.

❌ **Don't leave it empty**: Unlike decorative images, an image button *must* have alt text because it is a functional element.

## Exceptions

- Logos, purely decorative text treatments, and screenshots used as documentation can be valid exceptions when their accessible alternative is still provided appropriately.
- An image or media rule should not force redundant alt text, captions, or transcripts when another nearby mechanism already provides the equivalent information clearly.
- If the media asset fails more than one rule, prioritize the issue that most directly blocks understanding for assistive technology users.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.