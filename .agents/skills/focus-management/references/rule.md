# Manage focus during dynamic interactions

> Focus is programmatically managed during dynamic interactions like modals, page transitions, and content updates.

**Priority:** high · **Difficulty:** intermediate · **Time:** 25 min

---
Focus management ensures keyboard and screen reader users can follow dynamic content changes and interactions.

## Code Example

```tsx

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef {
    if (isOpen) {
      // Store the element that opened the modal
      triggerRef.current = document.activeElement as HTMLElement
      // Focus the modal
      modalRef.current?.focus()
    } else if (triggerRef.current) {
      // Return focus when closing
      triggerRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  )
}
```

## Why It Matters

Poor focus management leaves keyboard users stranded—they can't find new content, get trapped in closed modals, or lose their place entirely after interactions.

## Key Principles

| Scenario | Focus Should Move To |
|----------|---------------------|
| Modal opens | First focusable element in modal |
| Modal closes | Element that triggered the modal |
| SPA navigation | Main content heading or container |
| Content deleted | Previous/next item or parent container |
| Form submitted | Success message or error summary |

## SPA Navigation Focus

```tsx

function MainContent({ children }) {
  const mainRef = useRef {
    // Focus main content on navigation
    mainRef.current?.focus()
  }, [location.pathname])

  return (
    <main ref={mainRef} tabIndex={-1}>
      {children}
    </main>
  )
}
```

## Dynamic Content Updates

```tsx
function TodoList({ todos, onDelete }) {
  const listRef = useRef {
    if (deletedIndex !== null) {
      // Focus next item, or previous, or the list itself
      const items = listRef.current?.querySelectorAll('button')
      const nextItem = items?.[deletedIndex] || items?.[deletedIndex - 1]

      if (nextItem) {
        nextItem.focus()
      } else {
        listRef.current?.focus()
      }
      setDeletedIndex(null)
    }
  }, [deletedIndex, todos])

  return (
    <ul ref={listRef} tabIndex={-1}>
      {todos.map((todo, index) => (
        <li key={todo.id}>
          {todo.text}
          <button onClick={() => handleDelete(index)}>Delete</button>
        </li>
      ))}
    </ul>
  )
}
```

## Form Submission Focus

```tsx
function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const statusRef = useRef
      {/* Form fields */}

      {status !== 'idle' && (
        <div
          ref={statusRef}
          tabIndex={-1}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {status === 'success' ? 'Message sent!' : 'Please fix errors above'}
        </div>
      )}

      <button type="submit">Send</button>
    </form>
  )
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

- Open modal with keyboard → focus should be inside modal
- Close modal → focus should return to trigger element
- Navigate SPA routes → focus should move to new content
- Delete list items → focus should remain logical