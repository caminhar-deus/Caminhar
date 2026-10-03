# Prevent seizure-triggering flashing content

> Content does not flash more than three times per second to prevent seizures in users with photosensitive epilepsy.

**Priority:** critical · **Difficulty:** beginner · **Time:** 15 min

---
Flashing content can trigger seizures, which is why [WCAG 2.3.1](https://www.w3.org/TR/WCAG21/#three-flashes-or-below-threshold) treats it as a hard safety limit rather than a design preference.

[WCAG 2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html) is a Level A requirement. Content that flashes more than 3 times per second and exceeds size thresholds fails accessibility compliance and poses serious health risks.

## Code Example

```css
/* ❌ DANGEROUS: Rapid flashing animation */
@keyframes flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.danger {
  /* 0.1s = 10 flashes per second - SEIZURE RISK */
  animation: flash 0.1s infinite;
}

/* ❌ DANGEROUS: Rapid color changes */
@keyframes strobe {
  0% { background: white; }
  50% { background: black; }
}

.strobe-effect {
  animation: strobe 0.2s infinite; /* 5 Hz - DANGEROUS */
}
```

## Why It Matters

Flashing content between 3-60 Hz can trigger seizures in people with photosensitive epilepsy. [MDN's accessibility guidance](https://developer.mozilla.org/en-US/docs/Web/Accessibility) frames this correctly as a health and safety requirement, not just an accessibility preference.

## The Rule

Content must not flash more than **3 times per second** unless:
- The flashing area is smaller than 25% of 10 degrees of visual field (roughly 341×256 pixels at typical viewing distance)
- The contrast ratio of the flash is below 10% of maximum brightness

## Safe Alternatives

```css
/* ✅ Safe: Slow pulsing effect */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.attention {
  /* 2s = 0.5 flashes per second - SAFE */
  animation: pulse 2s ease-in-out infinite;
}

/* ✅ Safe: Fade transition instead of flash */
@keyframes fade-in-out {
  0% { opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}

.notification {
  animation: fade-in-out 3s ease-in-out;
}
```

## React Safe Animation Component

```tsx
interface SafeAnimationProps {
  children: React.ReactNode
  duration?: number // in seconds, minimum 0.33 (3 flashes/sec max)
  className?: string
}

function SafePulse({ children, duration = 2, className }: SafeAnimationProps) {
  // Enforce minimum duration to prevent seizure risk
  const safeDuration = Math.max(duration, 0.34)

  return (
    <div
      className={className}
      style={{
        animation: `pulse ${safeDuration}s ease-in-out infinite`
      }}
    >
      {children}
    </div>
  )
}
```

## Checking GIFs and Videos

```javascript
// Analyze animation frame rate
function checkAnimationSafety(element: HTMLElement) {
  const computedStyle = window.getComputedStyle(element)
  const animationDuration = parseFloat(computedStyle.animationDuration)

  // If animation completes in less than 0.33s, it may flash too fast
  if (animationDuration < 0.33) {
    console.warn('Animation may flash more than 3 times per second:', element)
    return false
  }
  return true
}

// Check all animated elements
document.querySelectorAll('[style*="animation"], .animated').forEach(el => {
  checkAnimationSafety(el as HTMLElement)
})
```

## Red Flash Threshold

Red flashing is especially dangerous due to how the eye processes red light:

```css
/* ❌ ESPECIALLY DANGEROUS: Red flashing */
@keyframes red-flash {
  0% { background: #ff0000; }
  50% { background: #000000; }
}

/* ✅ Safer: Use amber/orange instead of red for warnings */
.warning-indicator {
  background: #ff9800;
  animation: pulse 2s infinite;
}
```

## Video Content Guidelines

| Content Type | Requirement |
|--------------|-------------|
| Flashing scenes | Show warning before video |
| Strobe effects | Remove or reduce frequency |
| Rapid transitions | Slow down or use fades |
| Red saturated flashes | Avoid entirely |

## Warning Implementation

```tsx
function VideoWithFlashWarning({ src, hasFlashing }: {
  src: string
  hasFlashing: boolean
}) {
  const [acknowledged, setAcknowledged] = useState(false)

  if (hasFlashing && !acknowledged) {
    return (
      <div role="alert" className="warning-dialog">
        <h2>Flash Warning</h2>
        <p>This video contains flashing images that may trigger seizures in people with photosensitive epilepsy.</p>
        <button onClick={() => setAcknowledged(true)}>
          I understand, play video
        </button>
      </div>
    )
  }

  return <video src={src} controls />
}
```

## Testing Tools

- **PEAT (Photosensitive Epilepsy Analysis Tool)** - Analyzes video for seizure risk
- **Harding Test** - Professional broadcast standard test
- **Manual check** - Count flashes per second, measure flashing area

## Testing Steps

1. Identify all animated content (CSS, GIFs, videos)
2. Count flash frequency—must be 3 or fewer per second
3. Check flashing area size against viewport
4. Test with prefers-reduced-motion enabled
5. Add warnings for any unavoidable flashing content

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.