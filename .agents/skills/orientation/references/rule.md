# Support both portrait and landscape orientation

> Content and functionality work in both portrait and landscape unless a specific orientation is essential to the activity.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Users must be able to access the same core content and complete the same core tasks in both portrait and landscape unless the activity itself truly depends on one orientation. [WCAG 1.3.4 Orientation](https://www.w3.org/TR/WCAG21/#orientation) and [MDN's orientation guidance](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Object_Model/Managing_screen_orientation) both treat device rotation as something layouts should adapt to, not block.
## Code Examples

### Do Not Lock the Interface to One Orientation

```javascript
// ❌ Bad: locks the experience to portrait without a task-specific reason
screen.orientation.lock('portrait')

// ❌ Bad: blocks the page behind a generic rotate-device wall
if (window.innerWidth > window.innerHeight) {
  document.body.innerHTML = '<p>Please rotate your device</p>'
}
```

### Adapt the Layout Instead of Blocking It

```css
/* ✅ Good: layout adapts in either orientation */
.checkout-layout {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .checkout-layout {
    grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  }
}

.summary,
.form-panel {
  min-width: 0;
}
```

```html
<main class="checkout-layout">
  <section class="form-panel">
    <!-- Checkout form remains available in portrait and landscape -->
  </section>
  <aside class="summary">
    <!-- Order summary wraps instead of disappearing -->
  </aside>
</main>
```

### Orientation Hints Are Fine When They Are Not Blocking

```html
<p class="orientation-tip">
  Landscape gives you a wider chart view, but all controls still work in portrait.
</p>
```

## Why It Matters

The [Understanding document for Orientation](https://www.w3.org/WAI/WCAG21/Understanding/orientation.html) focuses on exactly this problem: many users cannot simply rotate a mounted or assistive-device setup to satisfy an arbitrary layout assumption.

- **Physical constraints vary**: users may have a device mounted, attached to assistive hardware, or difficult to rotate.
- **Tablets and phones are used differently**: a layout that only works in one posture creates an unnecessary barrier.
- **Orientation changes are common**: users rotate to read, type, compare information, or use split-screen apps.
- **Blocking overlays are worse than imperfect layouts**: content that adapts imperfectly is still better than content that disappears entirely.

## When an Orientation Requirement Is Acceptable

An orientation restriction is only acceptable when the activity is genuinely orientation-essential, for example:

- a piano keyboard app that requires landscape to represent the instrument correctly
- a check deposit flow that must align with a bank's camera framing requirements
- an experience tied to a physical device or headset with a fixed orientation

Even then, provide the clearest possible explanation and avoid locking unrelated parts of the site.

## Common Mistakes

- **Blocking the whole page with a rotate-device overlay**
- **Hiding primary navigation or submit actions in one orientation**
- **Using fixed heights or widths that collapse after rotation**
- **Assuming landscape means desktop-like space** without testing actual tablets and small phones
- **Locking orientation because a component is inconvenient to redesign** rather than because the task truly requires it

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Verification

Use the [orientation understanding guide](https://www.w3.org/WAI/WCAG21/Understanding/orientation.html) while testing so you are verifying the actual task, not just whether the layout technically rotates.

1. Test the route in both portrait and landscape on phone and tablet-sized viewports.
2. Confirm users can reach navigation, read content, complete forms, and trigger key actions in both orientations.
3. Check for orientation-lock APIs, blocking rotate-device overlays, or CSS that hides essential controls after rotation.
4. Re-test with zoom or larger text settings if the route is dense, because orientation and reflow failures often appear together.
5. If an orientation restriction remains, document why it is essential to the activity and verify only that activity is affected.