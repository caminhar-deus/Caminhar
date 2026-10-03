# Ensure table headers associate with data cells

> Checks that table headers have associated data cells

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
All table headers must describe at least one cell of data to be useful for accessibility.

## Code Example

```html
<!-- ✅ GOOD: Every header has associated data -->
<table>
  <tr>
    <th scope="col">Product</th>
    <th scope="col">Price</th>
  </tr>
  <tr>
    <td>Apples</td>
    <td>$1.00</td>
  </tr>
</table>

<!-- ❌ BAD: Empty header with no purpose -->
<table>
  <tr>
    <th scope="col">Product</th>
    <th scope="col"></th> <!-- Empty/Unused -->
  </tr>
  <tr>
    <td>Apples</td>
    <td>$1.00</td>
  </tr>
</table>
```

## Why It Matters

- **Reduced Noise**: Prevents screen readers from announcing headers that don't lead to meaningful information.
- **Logical Structure**: Ensures the table's visual and programmatic structure matches its purpose.
- **Navigation Accuracy**: Prevents dead-ends in keyboard and screen reader navigation.
- **Clarity**: Helps all users understand exactly what data each column or row represents.

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