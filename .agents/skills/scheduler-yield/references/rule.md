# Use scheduler.yield() to keep the main thread responsive during long tasks

> Break up tasks longer than 50 ms by yielding to the browser with scheduler.yield() or a MessageChannel fallback so that user input is never blocked.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
The browser's main thread handles JavaScript execution, style calculation, layout, paint, and user input on a single queue. A long-running task — even a fast-looking `for` loop over thousands of records — blocks that queue entirely. Until the task completes, click handlers, keyboard events, and animations are all frozen.

## Code Example

`scheduler.yield()` is a Promise-based API that suspends the current task, allows the browser to handle any pending input or rendering work, and then resumes the suspended task. It is simpler and more semantically correct than `setTimeout(callback, 0)` because it preserves the task's priority in the scheduler queue.

```typescript
// processInChunks.ts

/**
 * Yields to the browser between chunks of synchronous work.
 * Uses scheduler.yield() when available, with a MessageChannel fallback
 * for browsers that do not yet support the Scheduler API.
 */
function yieldToMain(): Promise<void> {
  // scheduler.yield() is available in Chrome 115+ and Edge 115+
  if ('scheduler' in globalThis && 'yield' in (globalThis as any).scheduler) {
    return (globalThis as any).scheduler.yield();
  }

  // MessageChannel fallback — faster than setTimeout(0) because it uses
  // a microtask-adjacent message port rather than a 4 ms clamped timer.
  return new Promise<void>((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = () => resolve();
    port2.postMessage(null);
  });
}

/**
 * Process a large array in chunks, yielding to the browser between each chunk.
 *
 * @param items      - The full array to process
 * @param processor  - Function applied to each item
 * @param chunkSize  - Number of items to process before yielding (default: 50)
 */

  items: T[],
  processor: (item: T, index: number) => void,
  chunkSize = 50
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    processor(items[i], i);

    // Yield at the end of each chunk (not after every item — that would be too slow)
    if ((i + 1) % chunkSize === 0 && i + 1 < items.length) {
      await yieldToMain();
    }
  }
}
```

## Why It Matters

Any JavaScript task longer than 50 ms blocks the browser's main thread, preventing it from processing clicks, keyboard events, and rendering frames. Yielding between chunks of work keeps Interaction to Next Paint (INP) low and makes the page feel responsive even during heavy computation.

## The 50 ms Budget

The [RAIL performance model](https://web.dev/articles/rail) and the INP metric both treat 50 ms as the budget for a single main-thread task. Tasks that exceed 50 ms appear in the Performance panel as "Long Tasks" (red bar) and directly contribute to poor INP scores.

## Practical Usage

```typescript
// ❌ Blocks the main thread for potentially hundreds of milliseconds
function renderSearchResults(results: SearchResult[]) {
  for (const result of results) {
    renderCard(result); // involves DOM mutation
  }
}

// ✅ Yields between chunks — input events are processed between chunks
async function renderSearchResults(results: SearchResult[]) {
  await processInChunks(results, (result) => renderCard(result), 25);
}
```

```typescript
// ❌ Long synchronous data transformation
function buildReportData(transactions: Transaction[]): ReportRow[] {
  return transactions.map((t) => expensiveTransform(t));
}

// ✅ Yielding version that accumulates results
async function buildReportData(transactions: Transaction[]): Promise {
    results.push(expensiveTransform(t));
  });
  return results;
}
```

## Choosing the Right Chunk Size

Chunk size is a balance between throughput and responsiveness:

- **Too large**: tasks still block input; no improvement to INP
- **Too small**: excessive yielding adds scheduling overhead

A starting point of **50 items per chunk** works well for lightweight per-item work (e.g. DOM reads, object transformations). For heavier per-item work, reduce to 10–20. Measure in the [Chrome DevTools Performance panel](https://developer.chrome.com/docs/devtools/performance/) and cross-check the heuristics in [web.dev's long task guidance](https://web.dev/articles/optimize-long-tasks) to confirm tasks stay under 50 ms.

Yielding breaks one long task into many short tasks — it does not parallelize work. For truly CPU-intensive work (image processing, cryptography, complex calculations), prefer a **Web Worker** so the main thread is never involved at all.

## Detecting Long Tasks in CI

Add a PerformanceObserver in development to log any task that exceeds 50 ms:

```typescript
// lib/long-task-observer.ts (development only)
if (
  process.env.NODE_ENV === 'development' &&
  typeof PerformanceObserver !== 'undefined'
) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 50) {
        console.warn(
          `[LongTask] ${entry.duration.toFixed(1)} ms`,
          entry
        );
      }
    }
  });
  observer.observe({ type: 'longtask', buffered: true });
}
```

## When to Use scheduler.yield() vs Web Workers

| Scenario | Recommendation |
|---|---|
| Loop over 100–10 000 items with DOM side-effects | `scheduler.yield()` — DOM access requires main thread |
| Initialization logic that runs once on page load | `scheduler.yield()` — keeps UI interactive during startup |
| CPU-intensive computation (image processing, parsing) | Web Worker — no DOM access needed |
| Streaming JSON parsing of large responses | Web Worker + `ReadableStream` |

## Verification

### Automated Checks

- Open the Chrome DevTools Performance panel and record a page interaction that triggers the long task. Confirm tasks no longer appear as red "Long Task" markers.
- Test the `yieldToMain` polyfill in Firefox (which does not support `scheduler.yield()`) to confirm the MessageChannel fallback fires correctly.
- Set `chunkSize` to 1 in tests and verify the full array is processed correctly across multiple yields.

### Manual Checks

- Run a Lighthouse INP audit before and after applying `processInChunks` — score should improve.