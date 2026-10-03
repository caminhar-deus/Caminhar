# Ensure content remains usable without CSS

> Content structure, instructions, and primary tasks remain understandable and operable when author CSS is disabled or replaced by user styles.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Users should still be able to read, understand, and complete the main task when your stylesheet fails to load or when they replace it with their own. The easiest way to achieve that resilience is to start with [semantic HTML](https://developer.mozilla.org/en-US/docs/Learn/Accessibility/HTML) rather than visual layout tricks.
## Code Examples

```html
<!-- Bad: layout and CSS generated content carry the meaning -->
<div class="checkout-grid">
  <div class="step step-summary">3. Review order</div>
  <div class="step step-payment">2. Payment</div>
  <div class="step step-shipping">1. Shipping</div>

  <div class="field">
    <span class="field__label">Email address</span>
    <input type="email" placeholder="Email address">
  </div>

  <button class="primary-action">Pay now</button>
</div>

<p class="error"></p>
```

```css
.checkout-grid {
  display: grid;
}

.step-summary { order: 3; }
.step-payment { order: 2; }
.step-shipping { order: 1; }

.field__label::after {
  content: " (required)";
}

.error::before {
  content: "Card number is required.";
}
```

```html
<!-- Good: meaning and task flow are in the markup -->
<main>
  <h1>Checkout</h1>

  <ol>
    <li>Shipping</li>
    <li>Payment</li>
    <li>Review order</li>
  </ol>

  <form novalidate>
    <fieldset>
      <legend>Contact details</legend>

      <label for="email">
        Email address
        <span aria-hidden="true">*</span>
      </label>
      <p id="email-note">Required for the receipt and delivery updates.</p>
      <input
        id="email"
        name="email"
        type="email"
        aria-describedby="email-note email-error"
        required
      >
      <p id="email-error" role="alert">Email address is required.</p>
    </fieldset>

    <button type="submit">Pay now</button>
  </form>
</main>
```

```html
<!-- Bad: instructions only exist visually -->
<label class="password-label" for="password">Password</label>
<input id="password" type="password">
```

```css
.password-label::after {
  content: " Minimum 12 characters, one number, one symbol";
}
```

```html
<!-- Good: instructions exist in the DOM and stay available without CSS -->
<label for="password">Password</label>
<p id="password-help">Minimum 12 characters, one number, one symbol.</p>
<input id="password" type="password" aria-describedby="password-help">
```

## Why It Matters

When CSS is disabled, replaced, or partially broken, the browser falls back to the DOM order and native HTML semantics. That is exactly the scenario covered by [WCAG 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships) and [WCAG 1.3.2 Meaningful Sequence](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence): if headings are really `div`s, required markers only come from `::after`, or the task sequence only exists through grid or flex reordering, users lose the structure they need to understand the page.

- **Custom styles and assistive tech**: Some users override author styles to increase contrast, spacing, or readability.
- **Network and rendering failures**: A stylesheet can fail to load, be blocked, or be partially applied, especially on low-bandwidth or privacy-focused setups.
- **Semantic resilience**: Proper headings, lists, labels, fieldsets, and buttons survive presentation changes and keep the page understandable.
- **Primary task completion**: Forms, checkout, account recovery, and navigation should still make sense when visual layout collapses to a linear flow.

## Best Practices

Think about this section as a practical application of [MDN's semantic HTML guidance](https://developer.mozilla.org/en-US/docs/Learn/Accessibility/HTML): if the meaning survives without presentation, the markup is probably doing its job.

### Keep meaning in HTML, not in layout

The DOM order should match the order users need to read or act. CSS can enhance layout, but it should not create the only meaningful sequence.

```html
<!-- Bad: visual order differs from the task order -->
<section class="wizard">
  <aside class="wizard__summary">Step 3: Confirm</aside>
  <section class="wizard__payment">Step 2: Payment</section>
  <section class="wizard__shipping">Step 1: Shipping</section>
</section>
```

```css
.wizard {
  display: flex;
}

.wizard__summary { order: 3; }
.wizard__payment { order: 2; }
.wizard__shipping { order: 1; }
```

```html
<!-- Good: DOM order already matches the intended flow -->
<section class="wizard">
  <section class="wizard__shipping">
    <h2>Step 1: Shipping</h2>
  </section>
  <section class="wizard__payment">
    <h2>Step 2: Payment</h2>
  </section>
  <section class="wizard__summary">
    <h2>Step 3: Confirm</h2>
  </section>
</section>
```

### Keep labels, instructions, and errors in the DOM

Required markers, helper text, and validation messages must exist as actual text in the markup. CSS generated content is not reliable for critical instructions.

| Content type | Put it in | Avoid |
|--------------|-----------|-------|
| Field labels | `<label>` text | Placeholder-only labels |
| Group names | `<fieldset>` + `<legend>` | Bold text positioned nearby |
| Required markers | Visible text or inline markup | `::before` / `::after` only |
| Error messages | DOM text linked with `aria-describedby` or live regions | Background images, icons, or CSS `content` |

### Let native semantics carry the page when styles disappear

Use native headings, paragraphs, lists, buttons, links, tables, and form controls. That gives browsers and assistive technology enough structure even when presentation changes completely.

```html
<!-- Bad -->
<div class="faq-title">Shipping options</div>
<div class="faq-list">
  <div>Standard shipping</div>
  <div>Express shipping</div>
</div>

<!-- Good -->
<h2>Shipping options</h2>
<ul>
  <li>Standard shipping</li>
  <li>Express shipping</li>
</ul>
```

### Define pass or fail in a no-style state

Treat the page as passing only if all of the following remain true when author styles are disabled:

- There is still a meaningful reading sequence.
- Every form field still has a visible or programmatically associated label.
- Required indicators and instructions still exist as text in the DOM.
- Error messages still appear and stay associated with the affected control.
- A representative primary task can be completed without guessing the layout.

## Exceptions

- Purely decorative enhancements such as spacing, color, shadows, illustration placement, or animation may disappear when CSS is disabled as long as they do not carry meaning needed to understand or complete the task.
- Complex layouts may collapse into a simpler single-column reading order without failing the rule, provided the resulting sequence is still meaningful and operable.
- This rule should focus on essential structure and task completion, not on preserving visual polish when presentation is removed.

## Verification

### Automated Checks

- Run [Nu Html Checker](https://validator.w3.org/nu/) and fix structural issues that often signal CSS-dependent meaning, such as broken heading hierarchy, missing labels, or invalid list and table markup.
- Run axe or Lighthouse against the rendered page to catch missing labels, missing landmarks, and relationship issues before manual no-style testing.
- In browser automation, disable author stylesheets and verify the key content still exists in DOM order. A representative Playwright setup:

```ts
await page.addInitScript(() => {
  for (const styleSheet of Array.from(document.styleSheets)) {
    try {
      styleSheet.disabled = true
    } catch {}
  }
})
```

- Fail the rule if essential instructions, required markers, or errors only exist through CSS generated content or if the DOM order no longer supports the main task flow.

### Manual Checks

1. Disable author styles in a browser. In Firefox, use `View -> Page Style -> No Style`, or disable stylesheet nodes in DevTools.
2. Read the page from top to bottom and confirm the content order still makes sense without the visual layout.
3. Tab through the primary task and confirm each field, button, and link still has enough text context to be understood.
4. Trigger a validation error and confirm the error text is still present and linked to the affected field.
5. Pass only if a user can locate the main heading, understand the instructions, and complete a representative task without relying on presentation.