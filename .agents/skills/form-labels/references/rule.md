# Associate labels with form controls

> Form inputs must have programmatically associated labels.

**Priority:** critical · **Difficulty:** beginner · **Time:** 5 min

---
Every form control must have a label that is programmatically associated with it to ensure it is accessible to all users. [MDN's `<label>` reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label) and WCAG form guidance both treat this as a baseline requirement, not an enhancement.
## Code Examples

### Correct Implementation
```html
<label for="email-address">Email Address</label>
<input type="email" id="email-address" name="email">

<!-- Or wrapping the input -->
<label>
  Email Address
  <input type="email" name="email">
</label>
```

### Incorrect Implementation
```html
<span>Email Address</span>
<input type="email" name="email">
```

## Why It Matters

- **Assistive Technology**: Screen readers announce the label when the user focuses on the input.
- **Usability**: Clicking the label moves focus to the input, providing a larger hit area for users with motor impairments or those on mobile devices.
- **Form Validation**: Browsers and tools can better associate error messages with the correct fields.

## Best Practices

✅ **Use `for` and `id`**: This is the most robust way to associate labels.
```html
<label for="first-name">First Name</label>
<input type="text" id="first-name">
```

✅ **Nested Labels**: Alternatively, you can nest the input inside the label.
```html
<label>
  Last Name
  <input type="text">
</label>
```

❌ **Avoid Placeholder-only labels**: Placeholders disappear when the user types and are not a substitute for labels.
```html
<!-- Avoid this -->
<input type="text" placeholder="First Name">
```

✅ **Use `<fieldset>` and `<legend>` for grouped controls**: Radio buttons and related checkboxes need a programmatic group label, not just bold text above them.
```html
<fieldset>
  <legend>Preferred contact method</legend>

  <label>
    <input type="radio" name="contact" value="email">
    Email
  </label>

  <label>
    <input type="radio" name="contact" value="phone">
    Phone
  </label>
</fieldset>
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
- Confirm every field still has a visible label after the user starts typing and after browser autofill runs.
- For radio groups and checkbox groups, confirm the shared question is announced before the individual control labels.