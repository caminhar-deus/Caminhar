# Provide accessible names for tree items

> All elements with role="treeitem" must have a descriptive accessible name so screen reader users can navigate hierarchical tree widgets.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Tree items within a tree widget must have accessible names to allow users to navigate complex hierarchies. The [treeitem role definition](https://www.w3.org/TR/wai-aria-1.2/#treeitem) and the tree-view authoring pattern both depend on those names being meaningful in context.
## Code Example

```html
<ul role="tree" aria-label="Project Files">
  <!-- ✅ Correct: text content provides the name; aria-expanded signals state -->
  <li role="treeitem" aria-expanded="true" aria-level="1">
    src
    <ul role="group">
      <!-- ✅ Correct: descriptive text content as name -->
      <li role="treeitem" aria-level="2">index.js</li>
      <!-- ✅ Correct: aria-label supplements text to add context -->
      <li role="treeitem" aria-level="2" aria-label="app.css — CSS stylesheet">app.css</li>
    </ul>
  </li>
  <!-- ✅ Correct: collapsed folder; aria-expanded="false" -->
  <li role="treeitem" aria-expanded="false" aria-level="1">
    tests
  </li>
  <!-- ❌ Incorrect: icon-only treeitem with no accessible name -->
  <li role="treeitem" aria-level="1">
    <span class="icon-folder"></span>
  </li>
</ul>
```

## Why It Matters

- **Hierarchical Clarity**: Names help users identify which folder, file, or node they are focused on without visual context.
- **Rotor/Virtual Navigation**: VoiceOver and NVDA allow users to list all treeitems; an empty name means items appear as blank entries.
- **Keyboard Navigation**: Arrow keys move focus between treeitems; the name is announced on each focus change — it is the primary signal.
- **Position Announcements**: Screen readers say "index.js, level 2, 1 of 3" — without the name, only position data is conveyed.

## Required ARIA Properties for Tree Items

| Attribute | Purpose | Required when |
|---|---|---|
| `aria-expanded` | Signals collapsed/expanded state | treeitem has children |
| `aria-level` | Nesting depth (1 = root) | When DOM nesting doesn't convey level |
| `aria-setsize` | Total items in the parent group | When not all items are in DOM |
| `aria-posinset` | Item's position in its group | When not all items are in DOM |
| `aria-selected` | Selection state | When tree supports selection |

## Exceptions

- Prefer native HTML semantics over ARIA when both are possible; some apparent ARIA failures disappear when the underlying element is corrected.
- A missing ARIA attribute is not automatically the strongest finding if the control is already semantically broken, unnamed, or keyboard-inaccessible.
- Do not add ARIA only to satisfy the rule if the feature should instead be implemented with a native element or a simpler interaction pattern.

## Standards

- Align the implementation with WAI-ARIA 1.2: treeitem Role and verify the rendered experience, not only the source code.
- Align the implementation with ARIA Authoring Practices Guide: Tree View Pattern and verify the rendered experience, not only the source code.
- Align the implementation with WCAG 2.1 SC 4.1.2: Name, Role, Value and verify the rendered experience, not only the source code.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.