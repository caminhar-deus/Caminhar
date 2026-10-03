# Place list items within list containers

> List item elements (li) must always be direct children of a list container (ul, ol, or menu) to maintain valid HTML structure and correct screen reader announcements.

**Priority:** medium · **Difficulty:** beginner · **Time:** 5 min

---
List items such as [`<li>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/li) are semantic elements that must exist within a list context. The [HTML Living Standard](https://html.spec.whatwg.org/multipage/grouping-content.html#the-li-element) and the [ARIA `listitem` role reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/listitem_role) both require that ownership relationship, so using them outside a `<ul>`, `<ol>`, or `<menu>` parent breaks the accessibility tree.
## Code Example

```html
<!-- ❌ Incorrect: orphan <li> inside a <div> — invalid HTML -->
<div>
  <li>Contact us</li>
  <li>About us</li>
</div>

<!-- ✅ Correct: wrapped in <ul> for unordered items -->
<ul>
  <li>Contact us</li>
  <li>About us</li>
</ul>

<!-- ✅ Correct: <ol> for sequentially ordered steps -->
<ol>
  <li>Sign up</li>
  <li>Confirm email</li>
  <li>Start browsing</li>
</ol>

<!-- ✅ Correct: navigation using list structure -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>

<!-- ⚠️ Note: list-style: none may remove list semantics in Safari/VoiceOver -->
<ul style="list-style: none;" role="list">
  <li><a href="/home">Home</a></li>
</ul>
```

## Why It Matters

- **Semantic Integrity**: The `<li>` element represents membership in a list — without the list parent, that meaning is lost.
- **Item Count Announcement**: Screen readers announce "list, 3 items" only when a valid parent list exists; orphan items get no count.
- **List Type Context**: NVDA distinguishes "bullet list" from "numbered list" based on the parent element type.
- **HTML Validity**: Invalid nesting can cause unpredictable rendering differences across browsers and parsing failures in XML-based tools.

## Exceptions

- Simple data tables can sometimes fail more from missing header relationships than from missing enhancements such as captions or mobile wrappers, so prioritize the strongest semantic issue.
- Do not convert layout structures into data-table markup just to satisfy a rule; the correct fix may be to remove table semantics entirely.
- When several table-accessibility issues overlap, resolve the header-cell relationship first because downstream announcements depend on it.

## Standards

- Align the implementation with HTML Living Standard: The li element and verify the rendered experience, not only the source code.
- Align the implementation with WAI-ARIA 1.2: listitem Role and verify the rendered experience, not only the source code.
- Align the implementation with MDN: `&lt;li&gt;` element and verify the rendered experience, not only the source code.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.