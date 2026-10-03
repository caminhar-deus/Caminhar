# Include a skip navigation link

> A skip navigation link is provided to allow keyboard users to bypass repetitive content and navigate directly to main content.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
Skip links allow keyboard users to bypass repetitive navigation and jump directly to the main content.

## Code Example

```html
<body>
  <!-- Skip link as first focusable element -->
  <a href="#main-content" class="skip-link">
    Skip to main content
  </a>

  <nav>
    <!-- Navigation with many links -->
  </nav>

  <main id="main-content" tabindex="-1">
    <!-- Main page content -->
  </main>
</body>
```

## Why It Matters

Skip links save keyboard and screen reader users from tabbing through 50+ navigation items on every page visit—turning a frustrating experience into an efficient one.

## CSS for Skip Links

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: #000;
  color: #fff;
  z-index: 100;
  transition: top 0.3s;
}

/* Show on focus */
.skip-link:focus {
  top: 0;
}
```

## Framework Examples

### React/Next.js

```tsx

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black"
    >
      Skip to main content
    </a>
  )
}

// In layout

  return (
    <>
      
      
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </>
  )
}
```

## Exceptions

- Temporary or intentionally inert UI can be removed from the focus order, but only when the same state is also communicated clearly to assistive technology users.
- A focus-management issue should be evaluated in the rendered interaction, not only from static markup, because route changes, overlays, and JS timing can change the real behavior.
- If a component is both unlabeled and focus-broken, fix the stronger user-facing orientation problem first rather than reporting multiple secondary symptoms.

## Verification

### Automated Checks

- Use browser accessibility tooling, axe, Lighthouse, or equivalent automated checks against a representative rendered state.

### Manual Checks

- Load the page and press Tab once
- Skip link should become visible
- Press Enter to activate
- Focus should move to main content
- Screen reader should announce the main content region