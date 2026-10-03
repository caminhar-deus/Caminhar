# Provide accessible names for select elements

> All `<select>` elements must have an associated label or an accessible name to be correctly identified by screen readers.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Every form control needs a label. For `<select>` elements, this ensures that when a user focuses on the dropdown, their screen reader announces the name of the field.

## Code Example

```html
<!-- Correct: Using a label with the 'for' attribute -->
<label for="country-select">Choose your country:</label>
<select id="country-select" name="country">
  <option value="">Please select...</option>
  <option value="ca">Canada</option>
  <option value="fr">France</option>
</select>

<!-- Correct: Using aria-label (when a visible label is not possible) -->
<select aria-label="Select theme" name="theme">
  <option value="light">Light Mode</option>
  <option value="dark">Dark Mode</option>
</select>

<!-- Incorrect: No label or name -->
<select name="sort">
  <option value="price">Price</option>
  <option value="rating">Rating</option>
</select>
```

## Why It Matters

- **Form Completion**: Users must know what each field represents to fill out a form accurately.
- **W3C Standards**: This is a fundamental requirement of WCAG (Web Content Accessibility Guidelines) Success Criterion 4.1.2 (Name, Role, Value).
- **Enlarged Tap Targets**: When a `<label>` is correctly associated with a `<select>`, clicking the label also activates the dropdown, providing a larger interactive area.
- **Consistency**: Labels provide a consistent way for all users to identify form fields.

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