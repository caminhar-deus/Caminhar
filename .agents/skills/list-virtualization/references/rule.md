# Virtualize long lists and tables

> Render only the visible subset of rows or cards in large collections to reduce DOM size, memory usage, and scroll-time rendering work.

**Priority:** high · **Difficulty:** intermediate · **Time:** 25 min

---
List virtualization, also called windowing, renders only the rows or cards a user can currently see plus a small buffer. This keeps large collections responsive without forcing the browser to maintain thousands of mounted nodes.
## Code Examples

#

## Render Only Visible Rows

```tsx

  return (
    
      {({ index, style }) => (
        <div style={style}>
          {orders[index].customerName}
        </div>
      )}
    
  )
}
```

### Avoid Rendering Every Row

```tsx
// ❌ Bad: Thousands of mounted nodes at once

  return (
    <table>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>{order.id}</td>
            <td>{order.customerName}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

## Why It Matters

- **Smaller DOM**: The browser manages tens of nodes instead of thousands.
- **Lower memory pressure**: Mounted components, event handlers, and style data stay bounded.
- **Smoother scrolling**: Style recalculation, layout, and paint work stay predictable during long-list interactions.
- **Better interaction performance**: Selection, hover, expansion, and keyboard navigation remain responsive on dense screens.

## When to Use It

Virtualization is usually worth considering when:

- A single view renders more than roughly `100-200` repeated items
- DOM size approaches or exceeds roughly `1,500` total nodes
- Scrolling shows jank, dropped frames, or slow row interactions
- Tables or dashboards hold large datasets that users inspect incrementally

Avoid it when:

- The list is small enough to render normally
- SEO or full-document find-in-page behavior requires all content to be mounted
- Accessibility semantics would be degraded by a naive windowing implementation

## Standards

- Use Patterns.dev: List Virtualization as the standard for measuring the final production behavior, not just local synthetic output.
- Use web.dev: Virtualize large lists with react-window as the standard for measuring the final production behavior, not just local synthetic output.

## Verification

Cross-check the result against [react-window guidance on virtualized lists](https://web.dev/articles/virtualize-long-lists-react-window) so the DOM stays small without breaking keyboard or assistive-technology expectations.

1. Compare the mounted node count before and after the change and confirm the view no longer renders the full dataset at once.
2. Record a performance trace while scrolling and confirm layout, paint, and scripting work stay flatter with fewer long frames.
3. Verify keyboard navigation, row focus, selection state, and screen-reader labels still work as expected inside the virtualized list or table.
4. Tune the overscan buffer so fast scrolling does not reveal blank gaps while still keeping the mounted row count low.
5. Re-test memory usage and interaction responsiveness on lower-end mobile or laptop hardware if the list is part of a critical workflow.