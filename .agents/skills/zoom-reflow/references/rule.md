# Support content reflow at 400% zoom

> Content reflows when zoomed to 400% without requiring horizontal scrolling or loss of functionality.

**Priority:** critical · **Difficulty:** intermediate · **Time:** 30 min

---
At 400% zoom, content must reflow to fit the viewport width without horizontal scrolling.

## Code Example

```css
/* ❌ Bad: Fixed width layout */
.container {
  width: 1200px;
}

/* ✅ Good: Fluid layout with max-width */
.container {
  width: 100%;
  max-width: 1200px;
  padding: 0 1rem;
}

/* ❌ Bad: Fixed columns */
.grid {
  display: grid;
  grid-template-columns: 300px 600px 300px;
}

/* ✅ Good: Responsive columns */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}
```

## Why It Matters

Users with low vision zoom to 400% to read content—horizontal scrolling at that level makes it impossible to track lines of text and navigate effectively.

## WCAG Requirement

400% zoom on a 1280px wide viewport = 320px equivalent width. Content must be usable at this width.

## Single Column Reflow

```css
/* Reflow to single column on narrow viewports */
.two-column {
  display: flex;
  flex-wrap: wrap;
}

.sidebar {
  flex: 1 1 250px;
}

.main-content {
  flex: 2 1 300px;
}

/* At 400% zoom, both become full width */
```

## Tables That Reflow

```css
/* Responsive table approach */
@media (max-width: 600px) {
  table, thead, tbody, th, td, tr {
    display: block;
  }

  thead {
    position: absolute;
    left: -9999px;
  }

  tr {
    margin-bottom: 1rem;
    border: 1px solid #ccc;
  }

  td {
    position: relative;
    padding-left: 50%;
  }

  td::before {
    content: attr(data-label);
    position: absolute;
    left: 0.5rem;
    font-weight: bold;
  }
}
```

```html
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Price</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="Name">Product A</td>
      <td data-label="Price">$29.99</td>
    </tr>
  </tbody>
</table>
```

## Navigation Reflow

```css
/* Horizontal nav becomes vertical at narrow widths */
.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

@media (max-width: 400px) {
  .nav {
    flex-direction: column;
  }
}
```

## Images That Scale

```css
/* Images scale with container */
img {
  max-width: 100%;
  height: auto;
}

/* Prevent overflow */
.content img {
  max-width: 100%;
  object-fit: contain;
}
```

## Form Reflow

```css
/* ❌ Bad: Fixed width inputs */
input {
  width: 400px;
}

/* ✅ Good: Flexible inputs */
input {
  width: 100%;
  max-width: 400px;
}

/* Stack label and input at narrow widths */
.form-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.form-group label {
  flex: 0 0 150px;
}

.form-group input {
  flex: 1 1 200px;
}
```

## Testing at 400%

1. Set browser to 1280px width
2. Zoom to 400% (Ctrl/Cmd + Plus)
3. Content should display like 320px mobile view
4. Verify:
   - No horizontal scrollbar
   - All content readable
   - No overlapping elements
   - All interactions work

## React Responsive Component

```tsx
function ResponsiveLayout({ sidebar, main }: { sidebar: React.ReactNode; main: React.ReactNode }) {
  return (
    <div className="flex flex-wrap">
      <aside className="w-full md:w-64 flex-shrink-0">
        {sidebar}
      </aside>
      <main className="w-full md:flex-1 min-w-0">
        {main}
      </main>
    </div>
  )
}
```

Some content legitimately requires two-dimensional scrolling (maps, data tables, diagrams). These are exceptions to the reflow requirement, but provide alternatives where possible.

## Exceptions

- Temporary or intentionally inert UI can be removed from the focus order, but only when the same state is also communicated clearly to assistive technology users.
- A focus-management issue should be evaluated in the rendered interaction, not only from static markup, because route changes, overlays, and JS timing can change the real behavior.
- If a component is both unlabeled and focus-broken, fix the stronger user-facing orientation problem first rather than reporting multiple secondary symptoms.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.