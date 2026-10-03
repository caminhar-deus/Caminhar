# Use unique IDs for ARIA references

> IDs referenced by ARIA attributes must be unique to ensure correct accessibility relationships.

**Priority:** high · **Difficulty:** intermediate · **Time:** 10 min

---
ARIA attributes like `aria-labelledby`, `aria-describedby`, and `aria-controls` rely on element IDs to create relationships. If these IDs are not unique, the relationships become ambiguous and unreliable.

## Code Example

```html
<!-- ✅ Good: Unique IDs for ARIA mapping -->
<h2 id="modal-title-1">Settings</h2>
<div role="dialog" aria-labelledby="modal-title-1">...</div>

<!-- ❌ Bad: Duplicate IDs referenced by ARIA -->
<div id="desc">Standard shipping</div>
<button aria-describedby="desc">Option A</button>

<div id="desc">Express shipping</div>
<button aria-describedby="desc">Option B</button> <!-- Error: Screen reader may only see the first "desc" -->
```

## Why It Matters

- **Accurate Labeling**: Screen readers use these references to announce labels and descriptions. Duplicates cause the wrong text to be read.
- **Dynamic Interaction**: `aria-controls` helps users understand which part of the page changes when they interact with a toggle or menu.
- **Relationship Clarity**: Clear ID mapping ensures that users with disabilities receive the same contextual information as sighted users.

## Best Practices

✅ **Unique Reference IDs**: Ensure that every element used as a label or description source has a globally unique ID.
✅ **Validation**: Use tools that specifically check the "Accessibility Tree" to ensure references are resolving correctly.
✅ **Dynamic IDs**: If generating content dynamically, use a library or utility to ensure generated IDs are unique (e.g., `useId` in React).

## Tools & Validation

- [Axe-core Rule: duplicate-id-aria](https://dequeuniversity.com/rules/axe/4.7/duplicate-id-aria)
- [Accessibility Insights for Web](https://accessibilityinsights.io/)

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