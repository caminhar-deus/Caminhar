# Use appropriate tabindex values

> Checks for appropriate tabindex values

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
The `tabindex` attribute should be used sparingly to manage focus, primarily for custom components that aren't natively focusable.

## Code Example

```html
<!-- ✅ GOOD: Element is in natural tab order -->
<div role="button" tabindex="0">Click Me</div>

<!-- ✅ GOOD: Focusable only via JavaScript (.focus()) -->
<div id="modal" tabindex="-1">Modal Content</div>

<!-- ❌ BAD: Forces a specific tab order, breaking accessibility -->
<button tabindex="1">First</button>
<button tabindex="2">Second</button>
```

## Why It Matters

- **Predictability**: Users expect focus to follow the visual flow of the page.
- **Maintenance**: Positive `tabindex` values are hard to maintain as the page layout changes.
- **Keyboard Access**: Ensuring non-native elements (like custom divs) are reachable via keyboard.
- **Modal Focus**: `tabindex="-1"` is essential for managing focus in overlays and modals.

## Exceptions

- Temporary or intentionally inert UI can be removed from the focus order, but only when the same state is also communicated clearly to assistive technology users.
- A focus-management issue should be evaluated in the rendered interaction, not only from static markup, because route changes, overlays, and JS timing can change the real behavior.
- If a component is both unlabeled and focus-broken, fix the stronger user-facing orientation problem first rather than reporting multiple secondary symptoms.

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