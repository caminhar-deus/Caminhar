# Debounce and throttle event handlers

> Use debounce or throttle for high-frequency events like scroll, resize, and input to improve performance.

**Priority:** high · **Difficulty:** intermediate · **Time:** 15 min

---
High-frequency events like scroll, resize, and input can fire hundreds of times per second, causing performance issues if handlers are not rate-limited.

## Code Examples

#

## Debounce (wait for pause)

```javascript
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

// Usage: Search input
const searchInput = document.querySelector('#search')
const handleSearch = debounce((e) => {
  fetchSearchResults(e.target.value)
}, 300)

searchInput.addEventListener('input', handleSearch)
```

### Throttle (limit rate)

```javascript
function throttle(func, limit) {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Usage: Scroll handler
const handleScroll = throttle(() => {
  updateScrollProgress()
}, 100)

window.addEventListener('scroll', handleScroll)
```

## Why It Matters

High-frequency events fire hundreds of times per second, causing UI jank, excessive API calls, and poor Interaction to Next Paint (INP) scores.

## When to Use Each

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Debounce** | Wait for pause in activity | Search input, form validation |
| **Throttle** | Limit execution rate | Scroll position, resize handlers |

## Framework Examples

### React

```jsx

function SearchComponent() {
  const [query, setQuery] = useState('')

  // Memoize debounced function
  const debouncedSearch = useMemo(
    () => debounce((value) => {
      fetchResults(value)
    }, 300),
    []
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  const handleChange = (e) => {
    setQuery(e.target.value)
    debouncedSearch(e.target.value)
  }

  return <input value={query} onChange={handleChange} />
}
```

### Vue 3

```vue
<script setup>

const query = ref('')
const results = ref([])

const search = useDebounceFn(async (value) => {
  results.value = await fetchResults(value)
}, 300)

function handleInput(e) {
  query.value = e.target.value
  search(e.target.value)
}
</script>

<template>
  <input :value="query" @input="handleInput" />
</template>
```

## Common Mistakes

```javascript
// ❌ Bad: Creating new debounced function on every render
function Component() {
  const handleInput = debounce((e) => {
    search(e.target.value)
  }, 300) // New function every render!
}

// ❌ Bad: Not cleaning up debounced calls
useEffect(() => {
  // No cleanup for pending debounced calls
}, [])

// ❌ Bad: Debouncing inside the handler
element.addEventListener('scroll', () => {
  debounce(updateUI, 100)() // Creates new debounce each time!
})
```

## Standards

- Use MDN: JavaScript Guide as the standard for how this JavaScript pattern should behave in production, not just in a small local example.
- Use web.dev: Learn JavaScript as the standard for how this JavaScript pattern should behave in production, not just in a small local example.

## Verification

1. Verify the behavior in the browser after the code change, not only in static analysis.
2. Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
3. Test the primary user flow and one edge case triggered by the changed script path.
4. Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.