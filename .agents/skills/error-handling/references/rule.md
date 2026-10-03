# Implement proper error handling

> Use try-catch blocks and error boundaries to gracefully handle errors in async operations and UI components.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Proper error handling prevents crashes, improves debugging, and creates better user experiences.

## Code Examples

#

## Basic Pattern
```javascript
// ❌ No error handling
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
}

// ✅ With error handling
async function fetchUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to fetch user:', error)
    throw error // Re-throw for caller to handle
  }
}
```

### With Error Recovery
```javascript
async function fetchUserWithFallback(id) {
  try {
    const response = await fetch(`/api/users/${id}`)
    return await response.json()
  } catch (error) {
    console.error('API failed, using cache:', error)

    // Fallback to cached data
    const cached = localStorage.getItem(`user_${id}`)
    if (cached) {
      return JSON.parse(cached)
    }

    // If no cache, show user-friendly error
    throw new Error('Unable to load user data. Please try again.')
  }
}
```

## Why It Matters

Unhandled errors crash applications, create poor user experiences, and make debugging impossible without proper context.

## Promise Error Handling

```javascript
// ❌ Unhandled promise rejection
fetch('/api/data')
  .then(response => response.json())
  .then(data => processData(data))

// ✅ With error handling
fetch('/api/data')
  .then(response => {
    if (!response.ok) throw new Error('Network response was not ok')
    return response.json()
  })
  .then(data => processData(data))
  .catch(error => {
    console.error('Fetch failed:', error)
    showErrorMessage('Failed to load data')
  })
```

## React Error Boundaries

```tsx

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Report to error tracking service
    reportError(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div role="alert">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Usage
function App() {
  return (
    }>
      
    
  )
}
```

## Global Error Handling

```javascript
// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  // Report to error tracking
  reportError(event.reason)
  // Optionally prevent default browser behavior
  event.preventDefault()
})

// Catch global errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
  reportError(event.error)
})
```

## Best Practices

1. **Always handle async errors** - Use try-catch or .catch()
2. **Don't swallow errors** - Log and report them
3. **Provide user feedback** - Show meaningful error messages
4. **Implement recovery** - Offer retry or fallback options
5. **Use error boundaries** - Prevent entire app crashes
6. **Track errors** - Use services like Sentry or LogRocket

## Standards

- Use MDN: JavaScript Guide as the standard for how this JavaScript pattern should behave in production, not just in a small local example.
- Use web.dev: Learn JavaScript as the standard for how this JavaScript pattern should behave in production, not just in a small local example.

## Verification

1. Verify the behavior in the browser after the code change, not only in static analysis.
2. Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
3. Test the primary user flow and one edge case triggered by the changed script path.
4. Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.