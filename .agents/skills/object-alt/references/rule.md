# Provide alternative text for objects

> The `<object>` element must contain alternative content to ensure accessibility for users who cannot view the primary content.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
The [`<object>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object) is used to embed external resources like multimedia or other web pages. The [HTML standard](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-object-element) and [WCAG non-text content rules](https://www.w3.org/TR/WCAG21/#non-text-content) both rely on meaningful fallback content when the primary object is unavailable or inaccessible.
## Code Example

```html
<!-- Incorrect: No alternative content -->
<object data="interactive-map.swf" type="application/x-shockwave-flash">
</object>

<!-- Correct: Meaningful fallback text -->
<object data="annual-report.pdf" type="application/pdf" width="600" height="800">
  <p>Your browser does not support PDFs. You can 
     <a href="annual-report.pdf">download the 2023 Annual Report PDF</a> instead.
  </p>
</object>

<!-- Correct: Fallback image and text -->
<object data="chart.svg" type="image/svg+xml">
  <img src="chart.png" alt="Graph showing a 20% increase in sales this quarter">
</object>
```

## Why It Matters

- **Assistive Technology**: Screen readers read the content inside the `<object>` tag if the object itself is not accessible or cannot be rendered.
- **Fail-safe Design**: It provides a graceful degradation for browsers that do not support certain file types (e.g., legacy plugins or modern PDF viewers).
- **SEO**: Search engine crawlers can index the fallback text even if they cannot parse the object's internal data.
- **User Experience**: Users on slow connections may benefit from a text alternative while waiting for a large object to load.

## Exceptions

- Logos, purely decorative text treatments, and screenshots used as documentation can be valid exceptions when their accessible alternative is still provided appropriately.
- An image or media rule should not force redundant alt text, captions, or transcripts when another nearby mechanism already provides the equivalent information clearly.
- If the media asset fails more than one rule, prioritize the issue that most directly blocks understanding for assistive technology users.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.