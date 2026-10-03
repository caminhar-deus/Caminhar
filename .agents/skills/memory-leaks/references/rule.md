# Prevent common memory leak patterns

> Identify and avoid the most common JavaScript memory leak sources: forgotten event listeners, retained DOM references, closures holding large objects, and uncleared timers.

**Priority:** high · **Difficulty:** intermediate · **Time:** 25 min

---
JavaScript's garbage collector frees memory for objects with no remaining references. Memory leaks occur when your code holds references to objects that are no longer needed but can't be collected.

## Code Example

```javascript
// ❌ Leaks: listener is never removed, holds a reference to the element
class SearchComponent {
  constructor() {
    this.input = document.getElementById('search')
    document.addEventListener('keydown', this.handleKeydown)
    // If SearchComponent is garbage collected, the listener remains
  }

  handleKeydown = (event) => {
    if (event.key === 'Escape') this.clear()
  }
}

// ✅ Good: always provide a cleanup path
class SearchComponent {
  constructor() {
    this.input = document.getElementById('search')
    this.handleKeydown = this.handleKeydown.bind(this)
    document.addEventListener('keydown', this.handleKeydown)
  }

  destroy() {
    document.removeEventListener('keydown', this.handleKeydown)
    this.input = null
  }
}
```

## Why It Matters

Memory leaks cause applications to consume increasing amounts of memory over time, eventually slowing the browser tab or crashing it. In single-page applications, where users don't reload the page, small leaks in components accumulate with each navigation and can make an app unusable after 30 minutes of use.

## Event Listener Cleanup

Event listeners are one of the most common leak sources because they keep both the handler and the referenced objects alive.

```javascript
// ❌ Anonymous listener cannot be removed later
button.addEventListener('click', () => doSomething())

// ✅ Keep a stable reference
const handleClick = () => doSomething()
button.addEventListener('click', handleClick)

function cleanup() {
  button.removeEventListener('click', handleClick)
}
```

```javascript
// ✅ AbortController removes a group of listeners at once
const controller = new AbortController()

window.addEventListener('scroll', onScroll, { signal: controller.signal })
window.addEventListener('resize', onResize, { signal: controller.signal })

function cleanup() {
  controller.abort()
}
```

## Uncleared Timers

```javascript
// ❌ Leaks: interval fires forever even after the component is gone
function startPolling(callback) {
  setInterval(callback, 5000)
}

// ✅ Good: store the ID and clear it on cleanup
function startPolling(callback) {
  const intervalId = setInterval(callback, 5000)
  return () => clearInterval(intervalId) // return cleanup function
}

// Usage
const stopPolling = startPolling(syncData)
// Later, when done:
stopPolling()
```

## Cancel Stale Async Requests

Long-running fetches can hold closures, state setters, and response objects alive after a component has already unmounted or the user has moved on:

```tsx
useEffect(() => {
  const controller = new AbortController()

  async function loadSearchResults() {
    const response = await fetch(`/api/search?q=${query}`, {
      signal: controller.signal,
    })

    const data = await response.json()
    setResults(data)
  }

  loadSearchResults().catch((error) => {
    if (error.name !== 'AbortError') {
      throw error
    }
  })

  return () => controller.abort()
}, [query])
```

## Retained DOM References

```javascript
// ❌ Leaks: detached DOM tree held in memory through a JS object
const cache = {}
function cachePanel(id) {
  cache[id] = document.getElementById(id)
  document.getElementById(id).remove() // removed from DOM but still in cache
}

// ✅ Good: use WeakMap so DOM nodes can be garbage collected
const cache = new WeakMap()
function cachePanel(element) {
  cache.set(element, { timestamp: Date.now() })
  element.remove() // WeakMap won't prevent GC
}
```

## Closures Holding Large Data

```javascript
// ❌ Leaks: the event listener closure holds a reference to largeData
function processLargeData() {
  const largeData = new Array(1_000_000).fill('x')
  const result = computeSummary(largeData)

  button.addEventListener('click', () => {
    // Only result is used, but largeData is captured in the closure
    displayResult(result)
  })
}

// ✅ Good: don't capture what you don't need
function processLargeData() {
  const largeData = new Array(1_000_000).fill('x')
  const result = computeSummary(largeData)
  // largeData goes out of scope and can be collected

  button.addEventListener('click', () => {
    displayResult(result) // Only result is captured
  })
}
```

## React Component Cleanup

```javascript
// ✅ Clean up subscriptions and timers in useEffect cleanup
useEffect(() => {
  const subscription = store.subscribe(handleChange)
  const timerId = setInterval(pollForUpdates, 10000)

  return () => {
    subscription.unsubscribe()
    clearInterval(timerId)
  }
}, [])
```

Framework-specific cleanup still belongs to the same rule:

```vue
<script setup>

function handleScroll() {}

onMounted(() => window.addEventListener('scroll', handleScroll))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))
</script>
```

## Standards

- Use MDN: JavaScript Guide as the standard for how this JavaScript pattern should behave in production, not just in a small local example.
- Use web.dev: Learn JavaScript as the standard for how this JavaScript pattern should behave in production, not just in a small local example.

## Verification

1. Verify the behavior in the browser after the code change, not only in static analysis.
2. Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
3. Test the primary user flow and one edge case triggered by the changed script path.
4. Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.
5. Navigate away or change inputs mid-request and confirm stale fetches are aborted rather than updating dead UI state.