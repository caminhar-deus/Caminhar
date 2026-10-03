# Use correct definition list structure

> Definition lists (&lt;dl&gt;) must only contain valid &lt;dt&gt; and &lt;dd&gt; elements.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 5 min

---
A definition list (`&lt;dl&gt;`) is used to group terms (`&lt;dt&gt;`) and their descriptions (`&lt;dd&gt;`). Using the correct structure ensures that assistive technologies can correctly parse and announce these relationships.

## Code Example

```html
<!-- ✅ Good structure -->
&lt;dl&gt;
  &lt;dt&gt;HTML</dt>
  &lt;dd&gt;HyperText Markup Language</dd>
  &lt;dt&gt;CSS</dt>
  &lt;dd&gt;Cascading Style Sheets</dd>
</dl>

<!-- ✅ Good structure (using div for styling, valid in HTML5) -->
&lt;dl&gt;
  <div class="row">
    &lt;dt&gt;Author</dt>
    &lt;dd&gt;Jane Doe</dd>
  </div>
</dl>

<!-- ❌ Bad structure: Direct children that aren't dt, dd, or div -->
&lt;dl&gt;
  <h3>Book Metadata</h3> <!-- Headings should be outside the dl -->
  <p>Some introductory text</p> <!-- Paragraphs should be outside -->
  &lt;dt&gt;Year</dt>
  &lt;dd&gt;2023</dd>
</dl>
```

## Why It Matters

- **Semantic Accuracy**: Correct nesting allows browsers to understand the document structure.
- **Screen Reader Navigation**: Some screen readers provide shortcuts to jump between items in a list; invalid markup breaks this.
- **Grouping**: Proper structure ensures that multiple definitions for a single term are correctly grouped.

## Best Practices

✅ **Keep it simple**: Only put terms and definitions inside the list.
✅ **Use DIVs for styling only**: Wrap `dt`/`dd` pairs in a `div` if you need a container for CSS layout (Grid/Flexbox).
✅ **Check for Orphaned Items**: Ensure every `dt` has at least one associated `dd`.

## Tools & Validation

- [W3C Markup Validation Service](https://validator.w3.org/)
- [MDN Reference: The Description List element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl)

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