# Use correct list structure

> Lists (ul, ol) should only contain list item elements (li) to ensure they are correctly interpreted by assistive technology.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
HTML list elements such as [`<ul>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/ul) and `<ol>` have a specific requirement: their only direct children must be `<li>` elements (or `<script>` and `<template>` elements). The [HTML standard](https://html.spec.whatwg.org/multipage/grouping-content.html#the-ul-element) makes that structure explicit, so placing other tags like `<div>` directly inside a list breaks the semantics.
## Code Example

```html
<!-- Incorrect: Direct child is a div -->
<ul>
  <div>
    <li>Item 1</li>
    <li>Item 2</li>
  </div>
</ul>

<!-- Correct: All children are li elements -->
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>
    <!-- Nested lists must be inside an li -->
    <ul>
      <li>Sub-item 1</li>
    </ul>
  </li>
</ul>
```

## Why It Matters

- **Assistive Technology Interpretation**: Screen readers announce "List of 3 items" when entering a list. Incorrect structure can cause the list to be miscounted or ignored entirely.
- **Markup Validation**: Breaking the parent-child relationship of lists makes the HTML invalid, which can lead to unpredictable rendering issues.
- **Consistency**: Users expect standard list behavior (like bullet points and numbering) which is best achieved through standard markup.
- **Search Engine Parsing**: Search engines use the structure of your lists to understand relationships between pieces of content.

## Exceptions

- Simple data tables can sometimes fail more from missing header relationships than from missing enhancements such as captions or mobile wrappers, so prioritize the strongest semantic issue.
- Do not convert layout structures into data-table markup just to satisfy a rule; the correct fix may be to remove table semantics entirely.
- When several table-accessibility issues overlap, resolve the header-cell relationship first because downstream announcements depend on it.

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