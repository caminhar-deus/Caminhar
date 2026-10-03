# Use event delegation for dynamic content

> Attach event listeners to stable parent elements rather than individual dynamic children to reduce memory usage and handle elements added to the DOM after page load.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
Event delegation leverages the DOM's event bubbling mechanism — events fired on child elements bubble up to parent elements, where a single listener can handle them all.

## Code Example

```javascript
// ❌ Bad: one listener per item — 1000 items = 1000 listeners
document.querySelectorAll('.list-item').forEach(item => {
  item.addEventListener('click', handleItemClick)
})

// Also fails for dynamically added items:
const newItem = createItem()
list.appendChild(newItem)
// newItem has no click listener!
```

## Why It Matters

Adding hundreds of individual event listeners for list items or table rows consumes significant memory and creates performance overhead. Dynamic content (items loaded via AJAX or rendered after user actions) won't have event listeners unless you re-attach them after each update — event delegation solves both problems at once.

## Event Delegation Pattern

```javascript
// ✅ Good: one listener on the parent handles all children
const list = document.getElementById('item-list')

list.addEventListener('click', (event) => {
  // Find the closest ancestor that matches our selector
  const item = event.target.closest('.list-item')
  if (!item) return // Click was outside an item (e.g., on the list itself)

  handleItemClick(item)
})

// Works for any item, including ones added later!
list.appendChild(createNewItem())
```

## Using closest() for Nested Elements

```html
<!-- The click target might be the icon inside the button -->
<ul id="todo-list">
  <li class="todo-item" data-id="1">
    <span class="todo-text">Buy groceries</span>
    <button class="delete-btn">
      <svg class="delete-icon">...</svg>  <!-- This is event.target -->
    </button>
  </li>
</ul>
```

```javascript
const list = document.getElementById('todo-list')

list.addEventListener('click', (event) => {
  // closest() walks up the tree — works even if the SVG icon was clicked
  const deleteBtn = event.target.closest('.delete-btn')
  if (!deleteBtn) return

  const todoItem = deleteBtn.closest('.todo-item')
  const id = todoItem.dataset.id
  deleteTodo(id)
})
```

## Multiple Action Types

```javascript
const toolbar = document.getElementById('editor-toolbar')

toolbar.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-action]')
  if (!btn) return

  const action = btn.dataset.action
  switch (action) {
    case 'bold': applyBold(); break
    case 'italic': applyItalic(); break
    case 'underline': applyUnderline(); break
  }
})
```

## When NOT to Use Delegation

- **High-frequency events** (mousemove, scroll) — add directly to specific elements
- **Non-bubbling events** (focus, blur) — use capture phase (`{ capture: true }`) or `focusin`/`focusout` which do bubble
- **Single static element** — delegation adds unnecessary complexity

## Standards

- Use MDN: JavaScript Guide as the standard for how this JavaScript pattern should behave in production, not just in a small local example.
- Use web.dev: Learn JavaScript as the standard for how this JavaScript pattern should behave in production, not just in a small local example.

## Verification

1. Verify the behavior in the browser after the code change, not only in static analysis.
2. Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
3. Test the primary user flow and one edge case triggered by the changed script path.
4. Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.