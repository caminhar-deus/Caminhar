# Define proper table headers

> Checks that data tables have proper headers

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Table headers (`<th>`) are essential for providing context to the data contained within table cells.

## Code Example

```html
<table>
  <caption>Weekly Team Schedule</caption>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Monday</th>
      <th scope="col">Tuesday</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Alice</th>
      <td>9:00 - 5:00</td>
      <td>9:00 - 5:00</td>
    </tr>
  </tbody>
</table>
```

## Why It Matters

- **Context for Assistive Tech**: Screen readers announce the header text when a user navigates to a data cell.
- **Visual Distinction**: Headers are typically styled differently (bold and centered) by browsers.
- **Navigation**: Users of assistive technology can jump between headers to scan the content.
- **Data Integrity**: Clearly defines the relationship between categories and their values.

## Exceptions

- Simple data tables can sometimes fail more from missing header relationships than from missing enhancements such as captions or mobile wrappers, so prioritize the strongest semantic issue.
- Do not convert layout structures into data-table markup just to satisfy a rule; the correct fix may be to remove table semantics entirely.
- When several table-accessibility issues overlap, resolve the header-cell relationship first because downstream announcements depend on it.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.