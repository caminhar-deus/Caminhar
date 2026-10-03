# Ensure tables have unique accessible names

> Checks that data tables have unique accessible names

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Accessible names for tables provide context for users of assistive technologies, especially when a page contains multiple tables.

## Code Example

```html
<!-- ✅ GOOD: Using <caption> -->
<table>
  <caption>Monthly Sales Data (2023)</caption>
  <thead>...</thead>
  <tbody>...</tbody>
</table>

<!-- ✅ GOOD: Using aria-label -->
<table aria-label="Employee Directory">
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

## Why It Matters

- **Navigation**: Screen reader users can pull up a list of tables; unique names help them choose the right one.
- **Context**: Explains what the data represents before the user starts diving into rows and columns.
- **Clarity**: Prevents confusion when similar-looking tables are used for different purposes.
- **Compliance**: Supports WCAG requirements for providing names for structural elements.

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