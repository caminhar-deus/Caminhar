# Use descriptive link text

> Link text clearly describes the destination or purpose without relying on surrounding context.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
Link text should clearly describe where the link goes or what it does, without relying on surrounding context.

## Code Example

```html
<!-- ❌ Bad: Generic, meaningless out of context -->
<a href="/pricing">Click here</a>
<a href="/docs">Read more</a>
<a href="/signup">Learn more</a>

<!-- ✅ Good: Descriptive, understandable alone -->
<a href="/pricing">View pricing plans</a>
<a href="/docs">Read the documentation</a>
<a href="/signup">Create your free account</a>
```

## Why It Matters

- **Screen Reader Navigation**: Users often use a shortcut to list all links on a page; descriptive text makes this list meaningful.
- **Cognitive Accessibility**: Clear labels help users with cognitive disabilities understand what will happen when they click a link.
- **SEO**: Search engines use link text (anchor text) to understand the content of the linked page.
- **Context Independence**: Users should be able to understand the link even if they don't read the surrounding paragraph.
- **Correct Semantics**: Links should navigate to another URL. If the interaction opens a menu, submits a form, or toggles UI state, use a button instead.

### Links vs Buttons

```html
<!-- ❌ Bad: button used for navigation -->
<button type="button" onclick="window.location.href='/pricing'">
  View pricing
</button>

<!-- ✅ Good: link used for navigation -->
<a href="/pricing">View pricing</a>
```

## Common Patterns

### "Read More" Links

```html
<!-- ❌ Bad: Multiple "Read more" links -->
<article>
  <h3>Getting Started with React</h3>
  <p>Learn the basics of React...</p>
  <a href="/react-intro">Read more</a>
</article>

<!-- ✅ Good: Descriptive link text -->
<article>
  <h3>Getting Started with React</h3>
  <p>Learn the basics of React...</p>
  <a href="/react-intro">Read the React introduction guide</a>
</article>

<!-- ✅ Also good: Visually hidden expanded text -->
<article>
  <h3>Getting Started with React</h3>
  <p>Learn the basics of React...</p>
  <a href="/react-intro">
    Read more<span class="sr-only"> about Getting Started with React</span>
  </a>
</article>
```

### Download Links

```html
<!-- ❌ Bad: No file information -->
<a href="/report.pdf">Download</a>

<!-- ✅ Good: Includes file type and size -->
<a href="/report.pdf">Download annual report (PDF, 2.4 MB)</a>
```

### External Links

```html
<!-- ✅ Good: Indicate external links -->
<a href="https://github.com" target="_blank" rel="noopener noreferrer">
  View the project on GitHub (opens in new tab)
</a>
```

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