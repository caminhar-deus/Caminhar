# Announce dynamic content with ARIA live regions

> Dynamic content updates are announced to screen readers using appropriate ARIA live regions.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
ARIA live regions announce dynamic content changes to screen readers without requiring focus to move.

## Code Example

```html
<!-- Polite: Announced after current speech finishes -->
<div aria-live="polite" id="status">
  <!-- Content inserted here will be announced -->
</div>

<!-- Assertive: Interrupts current speech immediately -->
<div aria-live="assertive" id="error">
  <!-- Critical messages only -->
</div>
```

## Why It Matters

Without live regions, screen reader users miss dynamic updates entirely—they won't know their form submitted, their cart updated, or an error occurred.

## Politeness Levels

| Level | Use For | Example |
|-------|---------|---------|
| `polite` | Non-urgent updates | Cart count, search results |
| `assertive` | Critical alerts | Errors, session expiry |
| `off` | Disable announcements | Frequently updating content |

## Semantic Live Regions

```html
<!-- role="alert" implies aria-live="assertive" -->
<div role="alert">
  Your session will expire in 2 minutes
</div>

<!-- role="status" implies aria-live="polite" -->
<div role="status">
  3 items added to cart
</div>
```

## Common Use Cases

### Form Validation Errors

```tsx
function FormField({ label, error }) {
  const errorId = `${label}-error`

  return (
    <div>
      <label>{label}</label>
      <input aria-describedby={error ? errorId : undefined} />
      {/* Live region for errors */}
      <div role="alert" id={errorId}>
        {error}
      </div>
    </div>
  )
}
```

### Loading States

```tsx
function SearchResults({ isLoading, results }) {
  return (
    <div>
      {/* Status announcements */}
      <div role="status" aria-live="polite">
        {isLoading && 'Loading results...'}
        {!isLoading && `${results.length} results found`}
      </div>

      <ul>
        {results.map(item => <li key={item.id}>{item.name}</li>)}
      </ul>
    </div>
  )
}
```

### Toast Notifications

```tsx
function Toast({ message, type }) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className="toast"
    >
      {message}
    </div>
  )
}
```

### Cart Updates

```tsx
function CartIcon({ count }) {
  return (
    <div>
      <button aria-label={`Cart, ${count} items`}>
        
        <span>{count}</span>
      </button>
      {/* Announce changes */}
      <div role="status" className="sr-only">
        {count} items in cart
      </div>
    </div>
  )
}
```

## Important Rules

```html
<!-- ❌ Bad: Live region added with content -->
<div aria-live="polite">New message!</div>

<!-- ✅ Good: Live region exists, content added later -->
<div aria-live="polite" id="messages"></div>
<script>
  // Content change triggers announcement
  document.getElementById('messages').textContent = 'New message!'
</script>
```

## Exceptions

- Prefer native HTML semantics over ARIA when both are possible; some apparent ARIA failures disappear when the underlying element is corrected.
- A missing ARIA attribute is not automatically the strongest finding if the control is already semantically broken, unnamed, or keyboard-inaccessible.
- Do not add ARIA only to satisfy the rule if the feature should instead be implemented with a native element or a simpler interaction pattern.

## Verification

### Automated Checks

- Use browser accessibility tooling, axe, Lighthouse, or equivalent automated checks against a representative rendered state.

### Manual Checks

- Enable screen reader (NVDA, VoiceOver)
- Trigger dynamic content updates
- Verify announcements occur at appropriate times
- Check that assertive regions don't interrupt unnecessarily