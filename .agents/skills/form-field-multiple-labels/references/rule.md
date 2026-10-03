# Use a single label for each form field

> Form fields should have exactly one associated <label> element for maximum clarity.

**Priority:** medium · **Difficulty:** beginner · **Time:** 5 min

---
A form field should have one clear, primary label. Providing multiple `<label>` elements for a single input can lead to inconsistent behavior across different browsers and screen readers.

## Code Example

```html
<!-- ✅ Good: Single label with for/id association -->
<label for="email-addr">Email Address</label>
<input id="email-addr" type="email">

<!-- ✅ Good: Using aria-labelledby for complex labels -->
<span id="label-main">Phone Number</span>
<span id="label-sub">(Include area code)</span>
<input aria-labelledby="label-main label-sub" type="tel">

<!-- ❌ Bad: Multiple label elements for one input -->
<label for="username">Username</label>
<label for="username">Required</label> <!-- Error: Input has multiple labels -->
<input id="username" type="text">
```

## Why It Matters

- **Clarity**: Users need a single, unambiguous name for every form control.
- **Voice Control**: Users who navigate by voice (e.g., Dragon NaturallySpeaking) rely on labels to "click" inputs. Multiple labels can make the target ambiguous.
- **Assistive Technology**: Some screen readers may only read the first label, while others might read all of them, leading to a confusing user experience.

## Best Practices

✅ **1:1 Mapping**: Stick to one `<label>` per `<input>`.
✅ **Use aria-describedby**: For supplemental information (like "Password must be 8 characters"), use `aria-describedby` instead of a second label.
✅ **Nesting vs For**: While nesting an input inside a label is valid, using the `for` attribute with a matching `id` is the most robust method across all technologies.

## Tools & Validation

- [WebAIM: Creating Accessible Forms](https://webaim.org/techniques/forms/)
- [Axe-core Rule: form-field-multiple-labels](https://dequeuniversity.com/rules/axe/4.7/form-field-multiple-labels)

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