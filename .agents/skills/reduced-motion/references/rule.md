# Respect reduced motion preferences

> Animations respect user motion preferences, avoid seizure-triggering flashing, and include warnings for excessive motion.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
Some users experience motion sickness, migraines, or seizures from animations. Respect their system preferences.

## Code Example

```css
/* Default: animations enabled */
.card {
  transition: transform 0.3s ease;
}

.card:hover {
  transform: scale(1.05);
}

/* Reduced motion: disable or simplify */
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }

  .card:hover {
    transform: none;
    /* Use opacity instead of motion */
    opacity: 0.9;
  }
}
```

## Why It Matters

Animations can trigger vestibular disorders, migraines, and seizures—respecting motion preferences makes your site usable for millions of affected users.

## Global Animation Disable

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## JavaScript Detection

```typescript
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// React hook
function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReduced
}

// Usage
function AnimatedComponent() {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      animate={{ x: reducedMotion ? 0 : 100 }}
      transition={{ duration: reducedMotion ? 0 : 0.5 }}
    >
      Content
    </motion.div>
  )
}
```

## Framer Motion Integration

```tsx

function Card() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      Card content
    </motion.div>
  )
}
```

## Safe Animation Patterns

| Safe | Dangerous |
|------|-----------|
| Opacity transitions | Spinning/rotating |
| Color changes | Parallax scrolling |
| Border changes | Zooming in/out |
| Subtle scale (less than 1.1) | Bouncing effects |

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Verification

### Automated Checks

- Use browser accessibility tooling, axe, Lighthouse, or equivalent automated checks against a representative rendered state.

### Manual Checks

- Enable "Reduce motion" in system settings
- macOS: System Preferences → Accessibility → Display
- Windows: Settings → Ease of Access → Display
- iOS: Settings → Accessibility → Motion
- Verify animations are disabled or simplified
- Check that no flashing content exists