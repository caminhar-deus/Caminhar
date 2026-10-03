# Use the View Transitions API for smooth page and component transitions

> The View Transitions API is used to animate between page states or navigations with cross-fade or custom animations, providing a native-app quality transition without JavaScript animation libraries.

**Priority:** low · **Difficulty:** intermediate · **Time:** 30 min

---
The [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) provides a two-step mechanism: capture a screenshot of the current state, update the DOM to the new state, then animate between the two screenshots using CSS. The [Chrome platform guide](https://developer.chrome.com/docs/web-platform/view-transitions) is helpful because it covers both same-document and cross-document transitions with the same mental model.
## Code Examples

```typescript
// Wrap any DOM mutation in startViewTransition
async function navigateTo(newRoute: string) {
  if (!document.startViewTransition) {
    // Fallback: instant update for unsupported browsers
    await renderRoute(newRoute)
    return
  }

  const transition = document.startViewTransition(async () => {
    await renderRoute(newRoute)
  })

  // Optionally wait for the transition to complete
  await transition.finished
}
```

### React Router v6 integration

```tsx
// hooks/use-view-transition.ts

  const navigate = useNavigate()

  return useCallback(
    (to: string) => {
      if (!document.startViewTransition) {
        navigate(to)
        return
      }

      document.startViewTransition(() => {
        navigate(to)
      })
    },
    [navigate]
  )
}
```

```tsx
// components/nav-link.tsx

  const navigate = useViewTransitionNavigate()

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault()
        navigate(href)
      }}
    >
      {children}
    </a>
  )
}
```

## Why It Matters

Jarring instant page changes are one of the most noticeable perceived- performance problems in web applications. Smooth transitions help users maintain context during navigation — they understand where they came from and where they are going. Previously, achieving this required complex JavaScript animation libraries; the View Transitions API delivers it natively at a fraction of the code cost.

## How It Works

1. `document.startViewTransition(callback)` is called
2. The browser captures a screenshot of the current DOM (the "old" state)
3. The `callback` updates the DOM to the new state
4. The browser animates between old and new screenshots using `::view-transition-*` pseudo-elements
5. The screenshots are discarded and the live DOM takes over

## Cross-Document Transitions (MPA)

For multi-page applications (or Next.js with full page navigation), enable transitions in CSS — no JavaScript required:

```css
/* opt into cross-document transitions */
@view-transition {
  navigation: auto;
}
```

That single CSS rule enables a default cross-fade between pages. Supported in Chrome 126+ and progressively enhanced for other browsers.

## Customising the Default Transition

```css
/* Override the default cross-fade animation */
::view-transition-old(root) {
  animation: 200ms ease-out both fade-out, 200ms ease-out both slide-out;
}

::view-transition-new(root) {
  animation: 300ms ease-in both fade-in, 300ms ease-in both slide-in;
}

@keyframes fade-out {
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
}

@keyframes slide-out {
  to { transform: translateX(-30px); }
}

@keyframes slide-in {
  from { transform: translateX(30px); }
}
```

## Shared-Element Transitions

Assign `view-transition-name` to elements that should animate as a unit between states — the classic "magic move" effect:

```css
/* Hero image on the list page */
.product-card .hero-image {
  view-transition-name: product-hero;
}

/* Hero image on the detail page — same name = shared transition */
.product-detail .hero-image {
  view-transition-name: product-hero;
}
```

```typescript
// Navigating between list and detail triggers the shared-element animation
document.startViewTransition(async () => {
  await renderProductDetail(productId)
})
```

### Dynamic view-transition-name (unique per item)

When generating list items with repeated structure, each element needs a unique name:

```tsx
// Each product card gets its own unique transition name

  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          <img
            src={product.image}
            alt={product.name}
            style={{ viewTransitionName: `product-${product.id}` }}
          />
        </li>
      ))}
    </ul>
  )
}
```

## Respecting Reduced Motion

Always wrap custom transition animations in a `prefers-reduced-motion` media query:

```css
/* Default: smooth animation */
::view-transition-old(root) {
  animation: 250ms ease-out both fade-and-slide-out;
}

::view-transition-new(root) {
  animation: 250ms ease-in both fade-and-slide-in;
}

/* Reduced motion: instant swap (browser default cross-fade is also acceptable) */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }
}
```

## Next.js App Router

Next.js does not natively expose view transitions yet, but you can use them via route change events:

```tsx
// app/layout.tsx — inject the MPA opt-in globally

  return (
    <html lang="en">
      <head>
        <style>{`@view-transition { navigation: auto; }`}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
```

## Feature Detection

```typescript
function supportsViewTransitions(): boolean {
  return 'startViewTransition' in document
}

// Type augmentation for TypeScript
interface Document {
  startViewTransition(callback: () => Promise<void> | void): ViewTransition
}

interface ViewTransition {
  ready: Promise<void>
  finished: Promise<void>
  updateCallbackDone: Promise<void>
  skipTransition(): void
}
```

If two elements have the same `view-transition-name` at the same time, the browser will throw an error and skip the transition entirely. For lists, always use unique names like `product-${id}`. Remove the property via JavaScript before triggering the transition if uniqueness cannot be guaranteed.

## Support Notes

- Current project targets outside the feature support range: chrome 109, firefox 140.
- Baseline-compatible minimums: chrome 115, edge 115, firefox 116, safari 16.4, safari_ios 16.4.
- Add a fallback or progressive-enhancement note when a required project target falls outside that support range.

## Verification

1. Trigger a page transition and open DevTools → **Animations** panel — you should see the `::view-transition-*` animations recorded.
2. Toggle **prefers-reduced-motion** in DevTools → **Rendering** and confirm transitions are disabled or reduced appropriately.
3. Verify that `document.startViewTransition` calls have a fallback code path for browsers that do not support the API.
4. Check that shared-element transitions use unique `view-transition-name` values — inspect the DOM before the transition fires and confirm no duplicates exist.