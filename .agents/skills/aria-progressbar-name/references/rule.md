# Provide accessible names for progress bars

> Checks that progressbar elements have accessible names

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Every progress bar must have an accessible name so that users of assistive technologies understand what process is being tracked.

## Code Example

```html
<!-- Using aria-label -->
<div role="progressbar" 
     aria-valuenow="70" 
     aria-valuemin="0" 
     aria-valuemax="100" 
     aria-label="Uploading files...">
</div>

<!-- Using aria-labelledby -->
<h3 id="loading-label">Fetching your data</h3>
<div role="progressbar" 
     aria-labelledby="loading-label"
     aria-valuenow="30" 
     aria-valuemin="0" 
     aria-valuemax="100">
</div>
```

## Why It Matters

- **Contextual Awareness**: Tells users what the loading state refers to (e.g., "File Upload" vs "System Update").
- **Screen Reader Support**: Ensures the element is announced as more than just a generic "progress bar."
- **Clarity**: Prevents confusion when multiple progress indicators are present on a single page.
- **Compliance**: Meets WCAG requirements for naming interactive and status-providing components.

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