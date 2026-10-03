# Provide titles for iframes and frames

> iframes and frames must have a title attribute to describe their content.

**Priority:** medium · **Difficulty:** beginner · **Time:** 5 min

---
Iframes and frames must have a `title` attribute that describes their purpose or content so assistive technologies can identify them. This is one of the quickest ways to make embedded content navigable, especially when the frame contains a map, video, or external app, and it follows the same descriptive-label logic discussed in [WCAG guidance](https://www.w3.org/WAI/standards-guidelines/wcag/).
## Code Examples

### Correct Implementation
```html
<iframe title="Map of our office location" src="https://maps.google.com/..."></iframe>

<iframe title="Tutorial video: How to use our product" src="https://youtube.com/..."></iframe>
```

### Incorrect Implementation
```html
<!-- No title provided -->
<iframe src="https://example.com/ad"></iframe>

<!-- Generic or unhelpful title -->
<iframe title="frame" src="https://example.com/content"></iframe>
```

## Why It Matters

- **Orientation**: Screen readers often list frames on a page. A descriptive title helps users know which frame they are entering.
- **Efficiency**: Users can skip over frames that don't interest them (like ads) if they are clearly labeled.
- **Context**: For embedded content like maps or videos, the title provides immediate context about what is inside the frame.

## Best Practices

✅ **Be Descriptive**: The title should accurately describe the content.
```html
<title="Financial growth chart for 2023">
```

✅ **Keep it Concise**: Don't include redundant words like "iframe" or "embedded content".
```html
<title="User registration form">
```

❌ **Don't use the `name` attribute as a substitute**: The `name` attribute is for scripting/targets, not for accessibility.
```html
<!-- Incorrect -->
<iframe name="newsletter-signup" src="..."></iframe>
```

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