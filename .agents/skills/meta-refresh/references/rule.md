# Avoid meta refresh redirects

> Meta refresh redirects can disorient users and cause accessibility issues by refreshing the page unexpectedly.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
The [`http-equiv="refresh"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta) pattern on a `<meta>` tag is often used to refresh a page or redirect a user to a new location. [WCAG timing guidance](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) discourages this because the user loses control over when context changes.
## Code Example

```html
<!-- Incorrect: Automatic redirect after 5 seconds -->
<head>
  <meta http-equiv="refresh" content="5; url=https://example.com/new-page">
</head>

<!-- Better: Provide a clear link instead -->
<body>
  <p>This page has moved. Please <a href="https://example.com/new-page">visit the new location</a>.</p>
</body>

<!-- Best: Use server-side redirect (e.g., via .htaccess or Next.js config) -->
```

## Why It Matters

- **User Control**: Users should always be in control of when their context changes. Unexpected redirects take that control away.
- **Screen Reader Disruption**: When a page refreshes, a screen reader starts reading from the top, which is very disruptive if the user was in the middle of a paragraph.
- **Time Constraints**: Some users need more time to read a page before they are redirected. Meta refresh doesn't account for individual reading speeds.
- **SEO & Performance**: Server-side redirects are faster and better for search engine optimization than client-side meta refreshes.

## Exceptions

- Some exact legal, product, or brand wording cannot be simplified freely, but the surrounding content should still reduce ambiguity and cognitive load where possible.
- A content rule should be judged on the final user-facing wording, not just on individual banned phrases taken out of context.
- If a page has both structural accessibility failures and content clarity issues, fix the failure that prevents users from reaching or perceiving the content first.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.