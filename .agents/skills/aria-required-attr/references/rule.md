# Include required ARIA attributes for roles

> Checks that elements have required ARIA attributes for their roles

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
ARIA roles often have mandatory attributes that must be present for the element to be considered valid and accessible.

## Code Example

```html
<!-- Correct Slider implementation -->
<div role="slider"
     aria-valuenow="50"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-label="Volume level">
</div>

<!-- Correct Scrollbar implementation -->
<div role="scrollbar"
     aria-controls="content-id"
     aria-orientation="vertical"
     aria-valuenow="25"
     aria-valuemin="0"
     aria-valuemax="100">
</div>
```

## Why It Matters

- **Functional Integrity**: Many roles are non-functional without their supporting attributes.
- **Accurate Communication**: Screen readers rely on these attributes to announce the current state (e.g., the current value of a slider).
- **Spec Compliance**: Adheres to the W3C ARIA standard, ensuring better cross-browser accessibility.
- **User Control**: Allows users to understand the boundaries (min/max) and current state of interactive controls.

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