# Avoid autofocus on form fields

> Form fields do not use the autofocus attribute which can disorient screen reader users and cause unexpected page behavior.

**Priority:** low · **Difficulty:** beginner · **Time:** 10 min

---
Autofocus can disorient users by moving them to an unexpected location on page load.

## Code Example

```html
<!-- ❌ Bad: User lands mid-page, missing context -->
<h1>Welcome to Our Service</h1>
<p>Important information about our company...</p>
<p>Read this before signing up...</p>

<form>
  <!-- Screen reader user misses all content above -->
  <input type="email" autofocus placeholder="Email">
</form>
```

## Why It Matters

Autofocus teleports screen reader users to mid-page without context—they miss everything before the form and have no idea where they landed.

## When Autofocus Causes Problems

| Scenario | Issue |
|----------|-------|
| Content before form | Users miss important information |
| Mobile devices | Keyboard pops up unexpectedly, covers content |
| Screen readers | User loses page context, disoriented |
| Multiple forms | Unclear which form gets focus |

## Acceptable Autofocus Cases

```html
<!-- ✅ OK: Search-only page (Google-style) -->
<main>
  <h1 class="sr-only">Search</h1>
  <input type="search" autofocus aria-label="Search">
</main>

<!-- ✅ OK: Login page with no preceding content -->
<main>
  <h1>Sign In</h1>
  <form>
    <label for="email">Email</label>
    <input id="email" type="email" autofocus>
  </form>
</main>
```

## Better Alternative: Focus After Interaction

```tsx
function ContactForm() {
  const emailRef = useRef {
    setFormVisible(true)
    // Focus after user chose to open the form
    setTimeout(() => emailRef.current?.focus(), 0)
  }

  return (
    <>
      {!formVisible && (
        <button onClick={showForm}>Contact Us</button>
      )}
      {formVisible && (
        <form>
          <label htmlFor="email">Email</label>
          <input ref={emailRef} id="email" type="email" />
        </form>
      )}
    </>
  )
}
```

## Focus on Route Change (SPA)

```tsx
// Move focus to main content heading on navigation
function PageLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const headingRef = useRef {
    // Focus heading so screen reader announces new page
    headingRef.current?.focus()
  }, [title])

  return (
    <main>
      <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
      {children}
    </main>
  )
}
```

## Finding Autofocus in Code

```javascript
// Browser console: find all autofocus elements
document.querySelectorAll('[autofocus]').forEach(el => {
  console.log('Autofocus found:', el)
})
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

- Load page with screen reader enabled
- Check if focus starts at page top (as expected)
- Verify autofocus elements have important content above them
- Test on mobile—unexpected keyboard popup is a signal