# Avoid intrusive interstitials

> Full-screen interstitials (pop-ups, overlays, cookie banners) that block the main content on mobile are a ranking penalty signal and accessibility barrier. Use non-intrusive alternatives.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Interstitials (pop-ups, overlays, cookie banners) that obstruct the main content on mobile are penalized by Google and create accessibility barriers. When modals are necessary, they must be implemented with correct focus management.

## Code Example

```css
/* ❌ Problem: full-viewport overlay appears on page load */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  z-index: 9999;
}

/* ✅ Better: small sticky banner at the bottom */
.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 15vh;
  background: #fff;
  border-top: 2px solid #ccc;
  z-index: 100;
  padding: 1rem;
}
```

## Why It Matters

- **SEO**: Google demotes mobile search rankings for pages showing intrusive interstitials after clicking from search results.
- **Keyboard Users**: Without focus management, keyboard users cannot interact with or dismiss modals.
- **Screen Reader Users**: An overlay appearing without focus management is invisible to screen reader users.
- **Cognitive Load**: Unexpected overlays interrupt the user's intent and are especially disorienting for users with cognitive disabilities.

## Acceptable vs Unacceptable Interstitials

| Type | Acceptable? | Reason |
|---|---|---|
| Full-screen pop-up on page load (mobile) | No | Google penalty; blocks content |
| Cookie consent banner (small, sticky) | Yes | Legally required; small footprint |
| Age verification gate | Yes | Legally required exception |
| Login wall (private content) | Yes | Content requires auth |
| Newsletter pop-up (delayed, closable) | With caution | Not on page load; must be accessible |
| GDPR/cookie full-screen overlay | Avoid | Use sticky banner instead |

## Accessible Modal Pattern (When a Modal is Necessary)

```html
<!-- ✅ Accessible modal dialog -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
  id="cookie-dialog">
  <h2 id="dialog-title">Cookie Preferences</h2>
  <p id="dialog-description">We use cookies to improve your experience.</p>
  <button type="button" id="accept-btn">Accept all</button>
  <button type="button" id="reject-btn">Reject non-essential</button>
  <button type="button" aria-label="Close dialog" id="close-btn">×</button>
</div>
```

```javascript
// Required focus management
function openModal(dialog, triggerEl) {
  dialog.removeAttribute('hidden');
  dialog.querySelector('[id$="-btn"]').focus(); // Focus first button
}

function closeModal(dialog, triggerEl) {
  dialog.setAttribute('hidden', '');
  triggerEl.focus(); // Return focus to trigger
}

// Dismiss on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal(dialog, triggerEl);
});
```

## Verification

1. Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
2. Confirm the computed styles match the intended fix in DevTools.
3. Test at least one mobile and one desktop viewport before shipping.
4. If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.