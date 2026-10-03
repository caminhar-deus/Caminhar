# Provide accessible names for toggle fields

> Checks that toggle fields (checkbox, radio, switch) have accessible names

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
All interactive toggle controls (checkboxes, radio buttons, switches) must have an accessible name so users of assistive technologies understand their purpose.

## Code Example

```html
<!-- ✅ Correct: Using a label element -->
<label for="newsletter">Subscribe to newsletter</label>
<input type="checkbox" id="newsletter" name="newsletter">

<!-- ✅ Correct: Using aria-labelledby -->
<span id="switch-label">Enable dark mode</span>
<button role="switch" aria-checked="false" aria-labelledby="switch-label">
  Off
</button>

<!-- ✅ Correct: Using aria-label -->
<input type="radio" name="color" value="red" aria-label="Select red color">
```

## Why It Matters

- **Clarity of Action**: Users need to know what the toggle represents before changing its state.
- **State Feedback**: Screen readers announce the name along with the state (e.g., "Subscribe to newsletter, checkbox, checked").
- **Error Reduction**: Prevents users from accidentally toggling the wrong setting due to missing labels.
- **Form Accessibility**: Labels are essential for the successful completion of forms by all users.

## Exceptions

- Prefer native HTML semantics over ARIA when both are possible; some apparent ARIA failures disappear when the underlying element is corrected.
- A missing ARIA attribute is not automatically the strongest finding if the control is already semantically broken, unnamed, or keyboard-inaccessible.
- Do not add ARIA only to satisfy the rule if the feature should instead be implemented with a native element or a simpler interaction pattern.

## Standards

- Align the implementation with WAI-ARIA 1.2 and verify the rendered experience, not only the source code.
- Align the implementation with MDN: ARIA and verify the rendered experience, not only the source code.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.