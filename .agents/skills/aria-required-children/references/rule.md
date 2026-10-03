# Ensure ARIA roles contain required child roles

> Elements with certain ARIA roles must contain the required child roles or the widget structure will be broken for assistive technologies.

**Priority:** high · **Difficulty:** intermediate · **Time:** 15 min

---
Complex ARIA widgets often require a specific nesting structure where a parent role must contain children with specific roles. The WAI-ARIA spec calls these [required owned elements](https://www.w3.org/TR/wai-aria-1.2/#mustContain), and getting them wrong often goes hand-in-hand with [required parent role](/en/rules/accessibility/aria-required-parent) failures.
## Code Example

```html
<!-- ✅ Correct: tablist owns tab children -->
<div role="tablist" aria-label="Settings sections">
  <button role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1">General</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2" id="tab-2">Security</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">General settings content</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>Security settings content</div>

<!-- ✅ Correct: listbox owns option children -->
<ul role="listbox" aria-label="Select a country">
  <li role="option" aria-selected="false">France</li>
  <li role="option" aria-selected="true">Germany</li>
  <li role="option" aria-selected="false">Spain</li>
</ul>

<!-- ❌ Incorrect: tablist contains divs, not tab roles -->
<div role="tablist">
  <div class="tab active">General</div>
  <div class="tab">Security</div>
</div>

<!-- ✅ Using role="none" on layout wrappers inside a menu -->
<ul role="menu">
  <li role="none">
    <a href="/profile" role="menuitem">Profile</a>
  </li>
  <li role="none">
    <a href="/settings" role="menuitem">Settings</a>
  </li>
</ul>
```

## Why It Matters

- **Navigation Logic**: Screen readers allow users to jump between items in a list or tabs in a tablist based on these roles.
- **Item Count**: Assistive technology announces the count of items (e.g., "tab 1 of 3") only when the required child roles exist.
- **Widget Mode**: NVDA and JAWS enter a special interaction mode (Application Mode / Forms Mode) for composite widgets — this mode only activates when the widget structure is valid.
- **Keyboard Patterns**: Arrow key navigation inside menus, trees, and grids depends on the AT finding the correct child roles to move between.

## Required Parent → Child Relationships

| Container Role | Required Child Roles |
|---|---|
| `tablist` | `tab` |
| `list` | `listitem` |
| `listbox` | `group` or `option` |
| `menu` / `menubar` | `menuitem`, `menuitemcheckbox`, or `menuitemradio` |
| `radiogroup` | `radio` |
| `tree` | `treeitem` |
| `treegrid` | `row` |
| `grid` | `row` or `rowgroup` |
| `row` (in grid/treegrid) | `cell`, `gridcell`, `columnheader`, `rowheader` |

## Exceptions

- Prefer native HTML semantics over ARIA when both are possible; some apparent ARIA failures disappear when the underlying element is corrected.
- A missing ARIA attribute is not automatically the strongest finding if the control is already semantically broken, unnamed, or keyboard-inaccessible.
- Do not add ARIA only to satisfy the rule if the feature should instead be implemented with a native element or a simpler interaction pattern.

## Standards

- Align the implementation with WAI-ARIA 1.2: Required Owned Elements and verify the rendered experience, not only the source code.
- Align the implementation with WAI-ARIA 1.2: Role Definitions and verify the rendered experience, not only the source code.
- Align the implementation with WCAG 2.1 SC 4.1.2: Name, Role, Value and verify the rendered experience, not only the source code.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.