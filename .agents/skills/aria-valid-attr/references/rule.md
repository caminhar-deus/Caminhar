# Ensure ARIA attributes are valid

> All ARIA attributes must be valid and exist in the WAI-ARIA specification.

**Priority:** high · **Difficulty:** beginner · **Time:** 5 min

---
Using valid ARIA attributes ensures that assistive technologies can correctly interpret and communicate the state, role, and properties of web elements to users.

## Code Example

```html
<!-- ✅ Valid ARIA attribute -->
<button aria-expanded="false" aria-controls="menu">
  Menu
</button>

<!-- ❌ Invalid ARIA attribute -->
<div aria-labeledby="header">...</div> <!-- Misspelled: should be aria-labelledby -->

<!-- ❌ Non-existent ARIA attribute -->
<input aria-required-type="email"> <!-- aria-required-type does not exist -->
```

## Why It Matters

- **Assistive Technology Support**: Screen readers rely on specific attribute names to provide feedback.
- **Browser Compatibility**: Browsers ignore attributes that don't match the WAI-ARIA spec.
- **User Orientation**: Correct attributes (like `aria-invalid`) help users understand form errors and state changes.
- **Future Proofing**: Using standard attributes ensures your site remains accessible as browsers evolve.

## Best Practices

✅ **Verify Names**: Double-check the spelling of attributes (e.g., `aria-labelledby` has two 'l's).
✅ **Use Correct Roles**: Ensure the ARIA attribute is valid for the `role` of the element.
✅ **Check Values**: Ensure the value provided (e.g., "true", "false", or an ID) is valid for that specific attribute.

## Tools & Validation

- [W3C WAI-ARIA Specification](https://www.w3.org/TR/wai-aria/)
- [Axe DevTools](https://www.deque.com/axe/)
- [WAVE Web Accessibility Evaluation Tool](https://wave.webaim.org/)

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