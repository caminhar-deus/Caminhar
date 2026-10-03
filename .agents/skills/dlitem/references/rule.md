# Wrap definition items in a definition list

> Description terms (&lt;dt&gt;) and details (&lt;dd&gt;) must be contained within a &lt;dl&gt; element.

**Priority:** medium · **Difficulty:** beginner · **Time:** 5 min

---
The `&lt;dt&gt;` (description term) and `&lt;dd&gt;` (description details) elements are only semantically valid when used as children of a `&lt;dl&gt;` (description list).

## Code Example

```html
<!-- ✅ Good: Properly wrapped -->
&lt;dl&gt;
  &lt;dt&gt;Term</dt>
  &lt;dd&gt;The definition of the term.</dd>
</dl>

<!-- ❌ Bad: Orphaned elements -->
&lt;dt&gt;Orphaned Term</dt>
&lt;dd&gt;This is not inside a list.</dd>

<!-- ❌ Bad: Using other containers incorrectly -->
<ul>
  <li>
    &lt;dt&gt;Invalid usage</dt> <!-- dt cannot be a child of li or ul -->
  </li>
</ul>
```

## Why It Matters

- **Relationship Mapping**: Browsers use the `&lt;dl&gt;` container to associate specific terms with their corresponding descriptions.
- **Accessibility Tree**: Assistive technologies expose these elements as a "list" only when wrapped correctly, allowing users to navigate by list items.
- **Validation**: Improperly nested elements will fail HTML validation, which can lead to unpredictable rendering issues.

## Best Practices

✅ **Always use &lt;dl&gt;**: Never use `&lt;dt&gt;` or `&lt;dd&gt;` on their own for styling purposes.
✅ **Logical Order**: Typically, `&lt;dt&gt;` comes before its associated `&lt;dd&gt;`.
✅ **Multiple Details**: It is perfectly valid to have one `&lt;dt&gt;` followed by multiple `&lt;dd&gt;` elements for a single term.

## Tools & Validation

- [W3C HTML Validator](https://validator.w3.org/)
- [Axe-core Rule: definition-list-item](https://dequeuniversity.com/rules/axe/4.7/dlitem)

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