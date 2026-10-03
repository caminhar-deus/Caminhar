# Use landmark regions correctly

> Proper landmark regions (main, nav, footer) help users navigate the page more efficiently.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Landmark regions provide a way to identify the organization and structure of a web page. By using semantic HTML5 elements, you enable assistive technologies to offer quick navigation to these sections.

## Code Example

```html
<header>
  <h1>Site Title</h1>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h2>Article Title</h2>
    <p>Main content goes here...</p>
  </article>
</main>

<footer>
  <p>&copy; 2024 Front-End Checklist</p>
</footer>
```

## Why It Matters

- **Quick Navigation**: Screen reader users can jump directly to specific sections (e.g., bypass navigation to get to the main content).
- **Context Awareness**: Landmarks provide immediate context about where the user is within the page structure.
- **Consistency**: Using standard semantic elements ensures a predictable experience across different websites and browsers.
- **SEO Benefits**: Search engines use semantic landmarks to better understand the page's content structure.

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

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