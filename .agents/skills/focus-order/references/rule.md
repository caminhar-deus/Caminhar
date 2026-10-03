# Ensure logical focus order

> Tab focus order follows the visual layout and logical reading sequence of the page.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Focus order must follow the visual layout so keyboard users can navigate predictably.

## Code Example

```html
<!-- ❌ Bad: Positive tabindex breaks natural order -->
<button tabindex="3">Third</button>
<button tabindex="1">First</button>
<button tabindex="2">Second</button>
<!-- Focus goes: First → Second → Third (confusing!) -->

<!-- ✅ Good: DOM order matches visual order -->
<button>First</button>
<button>Second</button>
<button>Third</button>
<!-- Focus goes: First → Second → Third (predictable) -->
```

## Why It Matters

When focus jumps unexpectedly, keyboard users get disoriented and can't find content—mismatched visual and focus order makes navigation impossible.

## Focus Order Principles

| Principle | Description |
|-----------|-------------|
| Visual matching | Tab order follows visual reading order |
| DOM-based | Focus order comes from DOM position |
| Logical flow | Related elements group together |
| No surprises | Focus doesn't jump unexpectedly |

## CSS Visual Reordering Issues

```html
<!-- ❌ Bad: CSS order doesn't change focus order -->
<style>
  .container { display: flex; }
  .first { order: 3; }
  .second { order: 1; }
  .third { order: 2; }
</style>

<div class="container">
  <button class="first">Visually Third</button>
  <button class="second">Visually First</button>
  <button class="third">Visually Second</button>
</div>
<!-- Focus: First → Second → Third (doesn't match visual!) -->

<!-- ✅ Good: DOM order matches intended visual order -->
<div class="container">
  <button>First</button>
  <button>Second</button>
  <button>Third</button>
</div>
```

## Tabindex Values

```html
<!-- tabindex="0": Add to tab order in DOM position -->
<div role="button" tabindex="0">Custom button</div>

<!-- tabindex="-1": Focusable by script only -->
<div id="modal" tabindex="-1">Focus target for JS</div>

<!-- tabindex="1+": NEVER use - breaks natural order -->
<button tabindex="1">Don't do this</button>
```

## Form Field Order

```html
<!-- ❌ Bad: Visual columns, wrong tab order -->
<div class="two-column">
  <div class="left">
    <input name="first">
    <input name="city">
  </div>
  <div class="right">
    <input name="last">
    <input name="state">
  </div>
</div>
<!-- Tab: first → city → last → state (skips between columns) -->

<!-- ✅ Good: Single column or proper row grouping -->
<div class="form-row">
  <input name="first">
  <input name="last">
</div>
<div class="form-row">
  <input name="city">
  <input name="state">
</div>
<!-- Tab: first → last → city → state (left-to-right by row) -->
```

## React Layout Example

```tsx
// ✅ Good: DOM order matches visual order
function Header() {
  return (
    <header>
      <a href="/" className="logo">Logo</a>
      <nav>
        <a href="/products">Products</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
      </nav>
      <button className="menu-toggle">Menu</button>
    </header>
  )
}

// CSS positions elements visually
// .logo { order: 1; }
// nav { order: 2; }
// .menu-toggle { order: 3; }
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

- Tab through entire page with keyboard only
- Verify focus moves in expected visual order
- Check that focus never jumps unexpectedly
- Confirm all interactive elements are reachable