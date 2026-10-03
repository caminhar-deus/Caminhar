# Make modal dialogs keyboard accessible

> Modal dialogs are accessible with proper focus trapping, ARIA attributes, and keyboard dismissal.

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
Accessible modals require proper ARIA attributes, focus management, and keyboard interaction.

## Code Example

```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Confirm Action</h2>
  <p id="modal-description">Are you sure you want to delete this item?</p>

  <button>Cancel</button>
  <button>Delete</button>
</div>
```

## Why It Matters

Without proper focus trapping and keyboard handling, modal dialogs are invisible traps for keyboard users—they can't navigate, can't escape, and can't complete tasks.

## Complete Accessible Modal

```tsx

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef(null)

  // Store trigger and focus modal on open
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement
      modalRef.current?.focus()
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      triggerRef.current?.focus()
    }
  }, [isOpen])

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }

    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (!focusableElements?.length) return

      const first = focusableElements[0] as HTMLElement
      const last = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className="modal"
      >
        <h2 id="modal-title">{title}</h2>

        {children}

        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="close-button"
        >
          ×
        </button>
      </div>
    </>
  )
}
```

## Using Native Dialog Element

```tsx
function NativeDialog({ isOpen, onClose, title, children }) {
  const dialogRef = useRef {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      dialog.showModal() // Handles focus trapping automatically
    } else {
      dialog.close()
    }
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="dialog-title"
    >
      <h2 id="dialog-title">{title}</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </dialog>
  )
}
```

## Accessibility Checklist

| Requirement | Implementation |
|-------------|----------------|
| ARIA role | `role="dialog"` |
| Modal flag | `aria-modal="true"` |
| Label | `aria-labelledby` pointing to title |
| Focus trap | Tab cycles within modal only |
| Escape key | Closes the modal |
| Return focus | Focus returns to trigger on close |
| Background scroll | Disabled while modal is open |

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Standards

- Align the implementation with W3C WAI: WCAG Overview and verify the rendered experience, not only the source code.
- Align the implementation with MDN: Accessibility and verify the rendered experience, not only the source code.

## Verification

### Automated Checks

- Use browser accessibility tooling, axe, Lighthouse, or equivalent automated checks against a representative rendered state.

### Manual Checks

- Open modal with keyboard (Enter/Space on trigger)
- Verify focus moves inside modal
- Tab through all elements—focus should not escape
- Press Escape—modal should close
- Verify focus returns to the element that opened the modal