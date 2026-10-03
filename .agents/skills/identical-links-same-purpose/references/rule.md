# Ensure identical links have consistent destinations

> Links with the same text must point to the same destination or be distinguishable.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Links that have the same text but different destinations can be confusing for all users, but especially for those using assistive technology. [WCAG's link purpose guidance](https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context) and [WebAIM's link-text guidance](https://webaim.org/techniques/hypertext/) both depend on that label-to-destination consistency.
## Code Examples

### Incorrect Implementation
```html
<!-- Confusing: Same text, different pages -->
<a href="/report-2022">Download Report</a>
<a href="/report-2023">Download Report</a>
```

### Correct Implementation (Unique Text)
```html
<a href="/report-2022">Download 2022 Report</a>
<a href="/report-2023">Download 2023 Report</a>
```

### Correct Implementation (Same Destination)
```html
<!-- Consistent: Same text, same page -->
<a href="/contact">Contact Us</a>
...
<a href="/contact">Contact Us</a>
```

## Why It Matters

This is ultimately a [link purpose](https://www.w3.org/TR/WCAG21/#link-purpose-in-context) problem: when the same words point to different places, users cannot predict what each link will do from the text alone.

- **Predictability**: Users expect the same text to lead to the same place.
- **Link Lists**: Screen reader users often pull up a list of all links on a page. If they see "Click here" or "Read more" multiple times pointing to different things, they have no context for which is which.
- **Cognitive Load**: Distinct labels reduce the mental effort required to navigate a site.

## Best Practices

✅ **Be Specific**: Include keywords in the link text that describe the destination.

✅ **Use ARIA when necessary**: If the visual design requires short text, use `aria-label` or `aria-describedby` to provide extra context to screen readers.
```html
<a href="/products/1" aria-label="Read more about Product Alpha">Read more</a>
```

❌ **Avoid "Click Here"**: Generic link text is a major accessibility barrier.

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