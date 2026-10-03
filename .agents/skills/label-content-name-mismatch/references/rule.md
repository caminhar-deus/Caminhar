# Align visible labels with accessible names

> The accessible name of a control should contain its visible label text.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
For users of speech recognition software, the accessible name of a control must contain the text that is visible on the screen. [WCAG 2.5.3 Label in Name](https://www.w3.org/TR/WCAG21/#label-in-name) exists specifically so voice users can speak the same words they see.
## Code Examples

### Correct Implementation
```html
<!-- Visible text is part of the ARIA label -->
<button aria-label="Add item to shopping cart">Add item</button>

<!-- Preferred: Just use the visible text -->
<button>Add item</button>
```

### Incorrect Implementation
```html
<!-- Mismatch: Voice user says "Submit", but computer expects "Send" -->
<button aria-label="Send feedback">Submit</button>
```

## Why It Matters

- **Voice Control**: Users of software like Dragon NaturallySpeaking or Apple Voice Control trigger actions by speaking the visible label. If the underlying code uses a completely different name, the command will fail.
- **Consistency**: Prevents confusion for screen reader users who might be collaborating with sighted users ("Click the 'Submit' button").
- **Cognitive Ease**: Maintains a 1:1 relationship between what is seen and how the element is identified.

## Best Practices

✅ **Start with the visible text**: If you must use an `aria-label`, start it with the exact visible text.

✅ **Prefer visible text**: Whenever possible, avoid `aria-label` and rely on the actual text content of the element.

❌ **Don't use completely different labels**: Never have a visible label like "Save" and an accessible name like "Commit changes".

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.