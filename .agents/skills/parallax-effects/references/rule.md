# Provide alternatives to parallax effects

> Parallax scrolling effects have reduced-motion alternatives or can be disabled by users.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
Parallax effects can cause severe discomfort for users with vestibular disorders.

## Code Example

```css
/* ❌ Bad: Always applies parallax */
.hero {
  background-attachment: fixed;
  background-position: center;
  transform: translateZ(-1px) scale(2);
}

/* ✅ Good: Only when motion is acceptable */
@media (prefers-reduced-motion: no-preference) {
  .hero {
    background-attachment: fixed;
  }
}

/* Reduced motion: static background (default) */
.hero {
  background-attachment: scroll;
}
```

## Why It Matters

Parallax creates a mismatch between what the eyes see and what the inner ear senses—triggering dizziness, nausea, and vertigo for users with vestibular disorders.

## JavaScript Parallax Control

```typescript
class ParallaxController {
  private prefersReducedMotion: boolean

  constructor() {
    this.prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    // Listen for preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', (e) => {
        this.prefersReducedMotion = e.matches
        this.toggle(!e.matches)
      })
  }

  init(elements: HTMLElement[]) {
    if (this.prefersReducedMotion) return

    elements.forEach(el => this.applyParallax(el))
    window.addEventListener('scroll', () => this.update(elements))
  }

  private applyParallax(element: HTMLElement) {
    // Parallax logic here
  }

  toggle(enabled: boolean) {
    document.body.classList.toggle('parallax-disabled', !enabled)
  }
}
```

## React Parallax Component

```tsx
interface ParallaxProps {
  children: React.ReactNode
  speed?: number // 0 to 1, default 0.5
  className?: string
}

function Parallax({ children, speed = 0.5, className }: ParallaxProps) {
  const [offset, setOffset] = useState(0)
  const prefersReducedMotion = useReducedMotion()
  const ref = useRef
      {children}
    </div>
  )
}

function useReducedMotion() {
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
```

## User Toggle Control

```tsx
function MotionPreferences() {
  const [motionEnabled, setMotionEnabled] = useState(true)

  useEffect(() => {
    document.body.classList.toggle('reduce-motion', !motionEnabled)
  }, [motionEnabled])

  return (
    <label className="motion-toggle">
      <input
        type="checkbox"
        checked={motionEnabled}
        onChange={(e) => setMotionEnabled(e.target.checked)}
      />
      Enable motion effects
    </label>
  )
}
```

```css
/* Global disable via user preference */
.reduce-motion * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
  transform: none !important;
}
```

## Safe Static Fallback

```css
/* Default: no parallax */
.hero-section {
  background-image: url('hero.jpg');
  background-size: cover;
  background-position: center;
}

/* Parallax only with explicit motion preference */
@media (prefers-reduced-motion: no-preference) {
  .hero-section {
    background-attachment: fixed;
  }
}
```

## Content Must Work Without Effect

```html
<!-- ❌ Bad: Parallax hides essential content -->
<section class="parallax-only">
  <div class="background-layer">Important info here</div>
</section>

<!-- ✅ Good: Content accessible regardless of effect -->
<section class="hero">
  <div class="hero-background" aria-hidden="true"></div>
  <div class="hero-content">
    <h1>Welcome</h1>
    <p>All content readable without parallax</p>
  </div>
</section>
```

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Verification

### Automated Checks

- Use browser accessibility tooling, axe, Lighthouse, or equivalent automated checks against a representative rendered state.

### Manual Checks

- Enable "Reduce motion" in OS accessibility settings
- Verify parallax effects are disabled
- Confirm all content is still visible and readable
- Check that page layout doesn't break without effects
- Test user toggle if provided