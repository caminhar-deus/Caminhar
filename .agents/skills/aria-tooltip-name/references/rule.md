# Provide accessible names for tooltips

> Checks that tooltip elements have accessible names

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Tooltips provide supplementary information and must be correctly associated with their trigger elements using ARIA attributes.

## Code Example

```html
<!-- ✅ Correct: Trigger references tooltip via aria-describedby -->
<button aria-describedby="tooltip-save">
  Save
</button>
<div id="tooltip-save" role="tooltip">
  Saves your current changes to the cloud
</div>

<!-- ✅ Correct: Tooltip with its own name -->
<div role="tooltip" aria-label="Keyboard shortcuts info">
  Press Ctrl+S to save
</div>
```

## Why It Matters

- **Information Equality**: Ensures that the "hidden" text in a tooltip is available to users who don't use a mouse.
- **Trigger Awareness**: Helps users understand why a specific element is important or how to use it.
- **WCAG Compliance**: Meets success criteria for content on hover or focus.
- **Contextual Help**: Provides non-visual users with the same "hint" information available to sighted users.

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