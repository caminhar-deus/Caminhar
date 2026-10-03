# Ensure ARIA roles are contained by required parent roles

> Checks that elements with certain roles have required parent roles

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Certain ARIA roles are dependent on being children of specific parent roles to function correctly for assistive technologies.

## Code Example

```html
<!-- Correct nested Listitem -->
<div role="list">
  <div role="listitem">Item 1</div>
</div>

<!-- Correct nested Tab -->
<div role="tablist">
  <button role="tab" id="tab-1">Tab 1</button>
</div>

<!-- Correct nested Menuitem -->
<ul role="menu">
  <li role="menuitem">Save</li>
</ul>
```

## Why It Matters

- **Group Announcement**: Screen readers announce "Item 1 of 3" only if the element is correctly nested in its parent group.
- **Structural Semantic**: Maintains the logical flow of the document for keyboard and screen reader navigation.
- **Spec Compliance**: Prevents ARIA validation errors that occur when roles are used in isolation.
- **Predictable Behavior**: Ensures that complex components like accordions or menus behave as expected by users.

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