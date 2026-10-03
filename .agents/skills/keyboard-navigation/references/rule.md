# Enable keyboard navigation for all elements

> All interactive elements are accessible via keyboard with logical focus order and hidden elements excluded from tab sequence.

**Priority:** critical · **Difficulty:** intermediate · **Time:** 30 min

---
All interactive elements must be keyboard accessible with a logical focus order that matches the visual layout.

## Code Example

```html
<!-- ✅ Good: Natural tab order -->
<button>First</button>
<button>Second</button>
<button>Third</button>

<!-- ❌ Bad: Positive tabindex breaks flow -->
<button tabindex="3">First</button>
<button tabindex="1">Second</button>
<button tabindex="2">Third</button>

<!-- ✅ Remove from tab order (for hidden content) -->
<button tabindex="-1">Hidden from tab</button>
```

## Why It Matters

15% of users rely on keyboard navigation—broken focus order or keyboard traps make your site completely unusable for them.

## Keyboard Navigation Basics

| Key | Expected Action |
|-----|-----------------|
| Tab | Move to next focusable element |
| Shift+Tab | Move to previous focusable element |
| Enter | Activate buttons/links |
| Space | Activate buttons, toggle checkboxes |
| Arrow keys | Navigate within widgets (menus, tabs, sliders) |
| Escape | Close modals, menus, dropdowns |

## Custom Interactive Elements

```html
<!-- ❌ Bad: div is not keyboard accessible -->
<div class="button" onclick="doSomething()">Click me</div>

<!-- ✅ Good: Native button is keyboard accessible -->
<button onclick="doSomething()">Click me</button>

<!-- ✅ Acceptable: Custom element with keyboard support -->
<div
  role="button"
  tabindex="0"
  onclick="doSomething()"
  onkeydown="if(event.key === 'Enter' || event.key === ' ') doSomething()"
>
  Click me
</div>
```

## Hidden Content Management

```tsx
function Modal({ isOpen, children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      // Remove from tab order when closed
      tabIndex={isOpen ? 0 : -1}
      style={{ display: isOpen ? 'block' : 'none' }}
    >
      {children}
    </div>
  )
}
```

## Focus Trapping for Modals

Focus trapping is valid only when the user is inside an active modal or popover that must temporarily contain interaction. Trapping focus in drawers, carousels, chat widgets, or sticky banners without a clear exit creates a keyboard trap.

```tsx

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef{children}</div>
}
```

## Exceptions

- Temporary or intentionally inert UI can be removed from the focus order, but only when the same state is also communicated clearly to assistive technology users.
- A focus-management issue should be evaluated in the rendered interaction, not only from static markup, because route changes, overlays, and JS timing can change the real behavior.
- If a component is both unlabeled and focus-broken, fix the stronger user-facing orientation problem first rather than reporting multiple secondary symptoms.

## Standards

- Align the implementation with W3C WAI: WCAG Overview and verify the rendered experience, not only the source code.
- Align the implementation with MDN: Accessibility and verify the rendered experience, not only the source code.

## Verification

### Automated Checks

- Use browser accessibility tooling, axe, Lighthouse, or equivalent automated checks against a representative rendered state.

### Manual Checks

- Unplug your mouse and navigate the entire page using only keyboard
- Verify Tab moves through all interactive elements in visual order
- Confirm Enter/Space activate buttons and links
- Check that hidden elements cannot receive focus
- Test modals trap focus and Escape closes them
- Enter and exit every overlay, drawer, and widget to confirm focus is never trapped outside an active modal dialog