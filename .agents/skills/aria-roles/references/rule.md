# Use valid ARIA role values

> Checks for valid ARIA role values

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Only valid, standardized ARIA roles should be used to ensure compatibility with browsers and assistive technologies.

## Code Example

```html
<!-- ✅ Valid Roles -->
<div role="button">Click me</div>
<nav role="navigation">...</nav>
<div role="status">Saved changes</div>

<!-- ❌ Invalid/Common Typos -->
<div role="btn">Incorrect</div> <!-- Should be 'button' -->
<div role="check-box">Incorrect</div> <!-- Should be 'checkbox' -->
<div role="tooltip-item">Incorrect</div> <!-- Should be 'tooltip' -->

<!-- ✅ Better: native control instead of custom ARIA recreation -->
<button type="button">Click me</button>
```

## Why It Matters

- **Technology Support**: Assistive technologies (like VoiceOver or NVDA) only recognize official ARIA roles.
- **Browser Interpretation**: Modern browsers use ARIA roles to expose elements correctly in the accessibility tree.
- **Future Proofing**: Using standard roles ensures your site remains accessible as browsers and tools evolve.
- **Clarity**: Standard roles have defined behaviors that users are already familiar with.

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