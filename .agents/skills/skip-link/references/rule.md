# Implement "Skip to Content" links

> Checks for bypass mechanisms for keyboard navigation

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
A skip link (or "skip navigation" link) is an internal page link that allows users to jump directly to the main content of a page.

## Code Examples

```html
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  
  <nav>
    <!-- Many navigation links -->
  </nav>

  <main id="main-content">
    <h1>Main Content</h1>
    <!-- Page content -->
  </main>
</body>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

## Why It Matters

- **Efficiency**: Saves keyboard users from tabbing through dozens of menu items on every page load.
- **Accessibility Compliance**: Meets WCAG 2.1 Success Criterion 2.4.1 (Bypass Blocks).
- **User Experience**: Provides a better experience for power users and those using assistive technologies.
- **Screen Readers**: Allows screen reader users to skip straight to the unique content of the page.

## Exceptions

- Temporary or intentionally inert UI can be removed from the focus order, but only when the same state is also communicated clearly to assistive technology users.
- A focus-management issue should be evaluated in the rendered interaction, not only from static markup, because route changes, overlays, and JS timing can change the real behavior.
- If a component is both unlabeled and focus-broken, fix the stronger user-facing orientation problem first rather than reporting multiple secondary symptoms.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.