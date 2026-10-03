# Use valid values for ARIA attributes

> Checks for valid values in ARIA attributes

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
ARIA attributes only work correctly when they use the specific types of values (tokens, booleans, IDs, etc.) expected by the specification.

## Code Example

```html
<!-- ✅ Correct: Standard ARIA values -->
<button aria-expanded="true">Close</button>
<div aria-hidden="false">Visible content</div>
<div aria-valuenow="50">Progress</div>

<!-- ❌ Incorrect: Using non-standard values -->
<button aria-expanded="yes">Close</button> <!-- Use 'true' -->
<div aria-hidden="no">Visible content</div> <!-- Use 'false' -->
<div aria-valuenow="half">Progress</div> <!-- Use a number -->

<!-- ❌ Incorrect: Broken ID references -->
<div aria-labelledby="non-existent-id">Missing label</div>
```

## Why It Matters

- **State Accuracy**: Assistive technologies might fail to report the correct state (e.g., whether a menu is expanded) if the value is invalid.
- **User Interface Reliability**: Broken ID references mean that labels or descriptions will never be announced.
- **Interoperability**: Correct values ensure that your accessibility features work across different browsers and screen readers.
- **Standardization**: Following the spec prevents "custom" values that don't adhere to universal accessibility rules.

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