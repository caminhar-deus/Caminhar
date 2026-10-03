# Optimize interaction to next paint

> Page responds to user interactions within 200ms, ensuring good responsiveness.

**Priority:** high · **Difficulty:** advanced · **Time:** 30 min

---
Interaction to Next Paint measures responsiveness throughout the user session.

## Code Example

```javascript
// Bad: One long synchronous task
function processLargeArray(items) {
  items.forEach(item => {
    // Heavy processing blocks main thread
    expensiveOperation(item)
  })
}

// Good: Yield to main thread periodically
async function processLargeArrayAsync(items) {
  for (let i = 0; i < items.length; i++) {
    expensiveOperation(items[i])

    // Yield every 50ms to allow interactions
    if (i % 100 === 0) {
      await yieldToMain()
    }
  }
}

function yieldToMain() {
  return new Promise(resolve => {
    setTimeout(resolve, 0)
  })
}

// Even better: Use scheduler API
async function processWithScheduler(items) {
  for (const item of items) {
    expensiveOperation(item)

    // Yield if there's pending user input
    if ('scheduler' in window) {
      await scheduler.yield()
    }
  }
}
```

## Why It Matters

INP replaced FID as a Core Web Vital in 2024—it measures how quickly your page responds to user interactions throughout the session, not just the first interaction.

## INP Score Thresholds

| Score | Rating | User Perception |
|-------|--------|-----------------|
| 0–200ms | Good | Instant feedback |
| 200–500ms | Needs improvement | Noticeable delay |
| > 500ms | Poor | Sluggish, frustrating |

## INP vs FID

| Metric | Measures | Replaced |
|--------|----------|----------|
| INP | All interactions throughout session | No |
| FID | First interaction only | Yes (by INP) |

## Common INP Issues

| Issue | Impact | Solution |
|-------|--------|----------|
| Long tasks (>50ms) | High | Break into chunks |
| Heavy JavaScript | High | Code split, web workers |
| Complex event handlers | Medium | Debounce, optimize |
| Layout thrashing | Medium | Batch DOM reads/writes |
| Third-party scripts | Medium | Lazy load, defer |

## Use Web Workers for Heavy Computation

```typescript
// worker.ts
self.onmessage = (e: MessageEvent) => {
  const { data, type } = e.data

  if (type === 'process') {
    // Heavy computation happens off main thread
    const result = heavyComputation(data)
    self.postMessage({ type: 'result', data: result })
  }
}

function heavyComputation(data: any[]) {
  // Complex processing that would block main thread
  return data.map(item => expensiveTransform(item))
}
```

```tsx
// React component using web worker

function DataProcessor({ data }) {
  const workerRef = useRef {
    workerRef.current = new Worker(
      new URL('./worker.ts', import.meta.url)
    )

    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'result') {
        setResult(e.data.data)
      }
    }

    return () => workerRef.current?.terminate()
  }, [])

  useEffect(() => {
    if (data && workerRef.current) {
      workerRef.current.postMessage({ type: 'process', data })
    }
  }, [data])

  return <div>{result ?  : }</div>
}
```

## Optimize Event Handlers

```tsx
// Bad: Heavy work in click handler
function BadButton() {
  const handleClick = () => {
    // Blocks main thread during interaction
    const result = expensiveCalculation()
    updateUI(result)
  }

  return <button onClick={handleClick}>Process</button>
}

// Good: Defer heavy work
function GoodButton() {
  const handleClick = () => {
    // Show immediate feedback
    setLoading(true)

    // Defer heavy work
    requestIdleCallback(() => {
      const result = expensiveCalculation()
      updateUI(result)
      setLoading(false)
    })
  }

  return <button onClick={handleClick}>Process</button>
}

// Better: Use startTransition for non-urgent updates

function BetterButton() {
  const handleClick = () => {
    // Urgent: Show loading state
    setLoading(true)

    // Non-urgent: Can be interrupted
    startTransition(() => {
      const result = expensiveCalculation()
      setData(result)
      setLoading(false)
    })
  }

  return <button onClick={handleClick}>Process</button>
}
```

## Avoid Layout Thrashing

```javascript
// Bad: Multiple forced reflows
function badLayoutCode(elements) {
  elements.forEach(el => {
    const height = el.offsetHeight // Read (forces layout)
    el.style.height = height + 10 + 'px' // Write (invalidates layout)
  })
}

// Good: Batch reads and writes
function goodLayoutCode(elements) {
  // Batch all reads
  const heights = elements.map(el => el.offsetHeight)

  // Batch all writes
  elements.forEach((el, i) => {
    el.style.height = heights[i] + 10 + 'px'
  })
}
```

## Debounce Frequent Events

```typescript
// Debounce scroll/resize handlers
function useDebounce clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// Usage
function SearchComponent() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedQuery) {
      // Only search after user stops typing
      performSearch(debouncedQuery)
    }
  }, [debouncedQuery])

  return <input onChange={e => setQuery(e.target.value)} />
}
```

## Measuring INP

```javascript
// Using web-vitals library

onINP(metric => {
  console.log('INP:', metric.value, 'ms')
  console.log('Interaction type:', metric.entries[0]?.name)

  if (metric.value > 200) {
    // Log for debugging
    console.warn('Slow interaction detected:', {
      value: metric.value,
      target: metric.entries[0]?.target,
    })
  }
})
```

## Verification

### Automated Checks

- Use Chrome DevTools Performance panel
- Check PageSpeed Insights for field data
- Run Lighthouse (shows INP in newer versions)

### Manual Checks

- Test with CPU throttling (6x slowdown)
- Monitor real user metrics with RUM