# Avoid focusable descendants in role="text" elements

> Checks that elements with role='text' have no focusable descendants

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
The `role="text"` attribute, used mainly in VoiceOver-specific edge cases, should only be applied to static text containers. [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) is clear that flattening a subtree this way becomes dangerous once interactive content is involved.
## Code Example

```html
<!-- ✅ Correct: Simple text container -->
<div role="text">
  <span>Price: </span>
  <span>$10.00</span>
</div>

<!-- ❌ Incorrect: Contains a focusable link -->
<div role="text">
  Learn more at <a href="/details">this link</a>
</div>

<!-- ❌ Incorrect: Contains a focusable button -->
<div role="text">
  Submit your form <button type="submit">Submit</button>
</div>
```

## Why It Matters

- **Interactive Visibility**: Interactive elements inside `role="text"` cannot be focused or activated by screen reader users.
- **Semantic Flattening**: The entire container is flattened into a single string, losing the semantic meaning of any child elements.
- **User Confusion**: Users may see a link visually but find it completely invisible when using a screen reader.
- **Keyboard Access**: While a keyboard user might still reach a button inside, the screen reader won't announce it correctly, creating a disconnected experience.

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