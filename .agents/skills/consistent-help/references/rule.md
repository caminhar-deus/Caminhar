# Keep repeated help mechanisms in a consistent location

> When help or support mechanisms appear on multiple pages in the same flow, they stay in the same relative order so users can find them predictably.

**Priority:** medium · **Difficulty:** beginner · **Time:** 15 min

---
If a site offers help across multiple pages in the same journey, users should be able to learn where that help lives and find it again without re-scanning the whole layout. Consistency matters most when the user is already stuck.

## Code Example

```html
<!-- Good: help stays in the same relative area across checkout steps -->
<header>
  <a href="/checkout">Checkout</a>
  <a href="/help" aria-label="Get help with checkout">Help</a>
</header>
```

```html
<!-- Bad: page 1 puts help in the header -->
<header>
  <a href="/help">Help</a>
</header>

<!-- Bad: page 2 moves the same help mechanism to the footer -->
<footer>
  <a href="/help">Help</a>
</footer>
```

```html
<!-- Better: keep the same help order on another page in the same flow -->
<aside aria-label="Support">
  <a href="/help">Help center</a>
  <a href="/contact">Contact support</a>
</aside>
```

## Why It Matters

People who need help during a task often need it quickly. Inconsistent support placement creates extra search effort at exactly the moment a user is already blocked.

- users with cognitive disabilities benefit from predictable placement
- repeated scanning for support controls slows form and checkout completion
- consistency reduces frustration in recovery, onboarding, and support flows

## Best Practices

### Choose a stable support location

If help is repeated across a flow, keep it in one predictable place such as:

- the header utility area
- the same sidebar region
- the same footer support area

The exact visual position can vary by breakpoint, but the relative order should stay consistent within that page variation.

### Keep the same mechanisms together

If you expose more than one support mechanism, such as:

- chat
- phone
- FAQ/help center
- contact form

keep their order predictable across pages in the same flow.

### Do not over-apply the rule

This rule does not require every page to have help. It requires consistency when the same help mechanism is repeated across multiple pages.

## Standards

- This rule maps to WCAG 2.2 Success Criterion 3.2.6 Consistent Help.
- Evaluate the same breakpoint and zoom level when comparing relative order across pages.

## Exceptions

- A page that does not include a help mechanism at all does not fail this rule solely because another page in the flow does.
- Responsive layouts can rearrange content, but the relative order should remain consistent within the same breakpoint and zoom variation.
- Contextual inline help inside a field is different from a repeated help mechanism such as chat, support, or contact links.

## Verification

### Automated Checks

- Inventory repeated help mechanisms across the relevant set of pages.
- Compare their DOM order and placement across pages at the same breakpoint.

### Manual Checks

- Open several pages in the same flow at the same viewport and zoom level.
- Pass if repeated help appears in the same relative order on each page.
- Fail if the same chat, contact, or help-center entry point moves unpredictably between header, body, sidebar, and footer positions.