# Minimize costly DOM read/write operations

> Batch DOM reads and writes separately to avoid layout thrashing — the performance problem caused by alternating between reading and writing layout properties.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
The browser maintains a representation of your page layout. When you change the DOM, it marks the layout as "dirty". When you then read a layout property, it must synchronously recompute layout before it can give you a value — this is forced synchronous layout.

## Code Example

```javascript
// ❌ Bad: read-write-read-write interleaved — forces reflow on each iteration
const items = document.querySelectorAll('.item')
items.forEach(item => {
  const height = item.offsetHeight  // READ — forces reflow
  item.style.height = height * 2 + 'px'  // WRITE — invalidates layout
  // Next iteration: READ again forces another reflow!
})

// ✅ Good: all reads first, then all writes
const items = document.querySelectorAll('.item')
const heights = Array.from(items).map(item => item.offsetHeight) // All READs
items.forEach((item, i) => {
  item.style.height = heights[i] * 2 + 'px' // All WRITEs
})
```

## Why It Matters

Every time you read a layout property after making a DOM change, the browser must synchronously recalculate layout (reflow) before returning the value. Doing this in a loop — even with just 10 elements — can freeze the page for hundreds of milliseconds. This is called layout thrashing and is one of the most common causes of janky animations and slow renders.

## Use requestAnimationFrame for Visual Updates

```javascript
// ❌ Bad: visual updates outside of animation frame can cause visual glitches
function animateItems() {
  items.forEach(item => {
    item.style.transform = `translateX(${getNextPosition()}px)`
  })
  setTimeout(animateItems, 16) // Not synchronized with display refresh
}

// ✅ Good: use rAF to sync with the browser's paint cycle
function animateItems() {
  requestAnimationFrame(() => {
    items.forEach(item => {
      item.style.transform = `translateX(${getNextPosition()}px)`
    })
    animateItems()
  })
}
```

## Bulk DOM Insertion

```javascript
// ❌ Bad: appending items one by one causes a reflow per item
const list = document.getElementById('list')
for (let i = 0; i < 1000; i++) {
  const item = document.createElement('li')
  item.textContent = `Item ${i}`
  list.appendChild(item) // reflow potentially triggered each time
}

// ✅ Good: use DocumentFragment — only one DOM insertion
const fragment = document.createDocumentFragment()
for (let i = 0; i < 1000; i++) {
  const item = document.createElement('li')
  item.textContent = `Item ${i}`
  fragment.appendChild(item) // no reflow — fragment is off-DOM
}
list.appendChild(fragment) // one reflow
```

## CSS Class Toggling Over Inline Styles

```javascript
// ❌ Bad: multiple style assignments, each can trigger reflow
element.style.width = '200px'
element.style.height = '100px'
element.style.backgroundColor = '#f00'
element.style.border = '2px solid #000'

// ✅ Good: one class change, one reflow
element.classList.add('expanded')
// Define in CSS:
// .expanded { width: 200px; height: 100px; background: #f00; border: 2px solid #000; }
```

## CSS contain for Isolation

```css
/* Tell the browser this element's internals don't affect the outside layout */
.widget {
  contain: layout style;
}
```

## Passive Event Listeners

Scroll and touch handlers can delay browser scrolling if the browser must wait to learn whether your code will call `preventDefault()`. Mark handlers passive when they only observe state:

```javascript
// ❌ Bad: browser must assume scrolling might be blocked
window.addEventListener('scroll', onScroll)

// ✅ Good: tells the browser this handler will not cancel scrolling
window.addEventListener('scroll', onScroll, { passive: true })
window.addEventListener('wheel', onWheelTelemetry, { passive: true })
window.addEventListener('touchmove', onTouchTelemetry, { passive: true })
```

Do not mark a listener passive if the handler intentionally calls `preventDefault()`, such as for a custom gesture recognizer.

## Verification

1. Verify the behavior in the browser after the code change, not only in static analysis.
2. Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
3. Test the primary user flow and one edge case triggered by the changed script path.
4. Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.
5. Check DevTools for scroll-blocking listener warnings and confirm passive handlers are used where cancellation is unnecessary.