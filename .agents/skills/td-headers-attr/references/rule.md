# Link table cells to headers using IDs

> Checks that td headers attribute references valid th ids

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
The `headers` attribute is used on `<td>` elements to explicitly associate them with header cells in complex tables.

## Code Example

```html
<table>
  <thead>
    <tr>
      <th id="h-region">Region</th>
      <th id="h-q1">Q1</th>
      <th id="h-q2">Q2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th id="r-north" headers="h-region">North</th>
      <td headers="r-north h-q1">$10k</td>
      <td headers="r-north h-q2">$12k</td>
    </tr>
  </tbody>
</table>
```

## Why It Matters

- **Complex Tables**: Essential for tables with headers that span multiple columns or rows.
- **Precision**: Provides an unambiguous way for screen readers to identify which headers apply to a cell.
- **Improved UX**: Helps users navigate and understand nested data structures.
- **Compliance**: Meets advanced WCAG standards for complex data relationships.

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