# Avoid scrolljacking and custom scroll behavior

> Natural scroll behavior is preserved without custom scroll speeds, directions, or hijacked scroll events.

**Priority:** medium · **Difficulty:** beginner · **Time:** 15 min

---
Scrolljacking breaks user trust by making the page behave unpredictably.

## Code Example

```javascript
// ❌ Bad: Hijacking scroll for section navigation
window.addEventListener('wheel', (e) => {
  e.preventDefault() // Blocks native scroll
  const direction = e.deltaY > 0 ? 'down' : 'up'
  scrollToNextSection(direction)
})

// ❌ Bad: Modifying scroll speed
window.addEventListener('scroll', (e) => {
  window.scrollTo(0, window.scrollY * 0.5) // Half-speed scroll
})

// ❌ Bad: Horizontal scroll from vertical input
container.addEventListener('wheel', (e) => {
  e.preventDefault()
  container.scrollLeft += e.deltaY // Confusing!
})
```

## Why It Matters

Scrolljacking breaks user expectations, interferes with assistive technologies, and creates unpredictable experiences that frustrate users with motor impairments or cognitive disabilities.

## What Is Scrolljacking?

| Type | Problem |
|------|---------|
| Modified scroll speed | Scroll wheel moves more/less than expected |
| Scroll direction change | Horizontal scroll on vertical input |
| Snap-to-section | Each scroll jump to next "page" |
| Scroll-triggered animations | Animation blocks continued scrolling |
| Infinite scroll without fallback | No way to reach footer content |

## Acceptable Scroll Behaviors

```css
/* ✅ OK: CSS scroll snap (user stays in control) */
.container {
  scroll-snap-type: y mandatory;
  overflow-y: scroll;
}

.section {
  scroll-snap-align: start;
}

/* User can still scroll freely, snap is just a guide */
```

```javascript
// ✅ OK: Scroll-triggered animations that don't block
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in')
    }
  })
}, { threshold: 0.1 })

// Animation happens, but scrolling continues normally
document.querySelectorAll('.animate-on-scroll').forEach(el => {
  observer.observe(el)
})
```

## Detecting Scrolljacking

```javascript
// Console test: check if scrolling is hijacked
function detectScrolljacking() {
  let scrollEvents = 0
  let scrollBlocked = false

  const handler = (e) => {
    scrollEvents++
    if (e.defaultPrevented) {
      scrollBlocked = true
      console.warn('Scroll event was prevented!')
    }
  }

  window.addEventListener('wheel', handler, { passive: false })

  setTimeout(() => {
    window.removeEventListener('wheel', handler)
    console.log(`Scroll events: ${scrollEvents}, Blocked: ${scrollBlocked}`)
  }, 5000)
}

detectScrolljacking()
```

## If Custom Scroll Is Required

```tsx
function ScrollEffects({ children }: { children: React.ReactNode }) {
  const [effectsEnabled, setEffectsEnabled] = useState(true)
  const prefersReducedMotion = useReducedMotion()

  // Disable by default if user prefers reduced motion
  useEffect(() => {
    if (prefersReducedMotion) {
      setEffectsEnabled(false)
    }
  }, [prefersReducedMotion])

  return (
    <div className={effectsEnabled ? 'scroll-effects-on' : ''}>
      <div className="scroll-toggle" role="region" aria-label="Scroll preferences">
        <label>
          <input
            type="checkbox"
            checked={effectsEnabled}
            onChange={(e) => setEffectsEnabled(e.target.checked)}
          />
          Enable scroll animations
        </label>
      </div>
      {children}
    </div>
  )
}
```

## Infinite Scroll Accessibility

```tsx
// ❌ Bad: No way to reach footer
function InfiniteList() {
  return (
    <div onScroll={loadMore}>
      {items.map(item => )}
      {/* Footer is unreachable! */}
    </div>
  )
}

// ✅ Good: Pagination fallback
function AccessibleInfiniteList() {
  return (
    <div>
      {items.map(item => )}

      <button onClick={loadMore} aria-label="Load more items">
        Load more
      </button>

      <nav aria-label="Pagination">
        <a href="?page=1">Page 1</a>
        <a href="?page=2">Page 2</a>
        {/* Footer always reachable via pagination */}
      </nav>

      <footer>Contact info, links, etc.</footer>
    </div>
  )
}
```

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Verification

### Automated Checks

- Use browser accessibility tooling, axe, Lighthouse, or equivalent automated checks against a representative rendered state.

### Manual Checks

- Scroll with mouse wheel—movement should feel natural
- Use keyboard Page Up/Down—should move predictable amounts
- Test with trackpad, touchscreen, and scroll wheel
- Verify assistive technology scroll commands work
- Confirm all page content (including footer) is reachable