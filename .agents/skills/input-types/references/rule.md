# Use semantic input type attributes

> Set the correct type attribute on input elements to trigger the right mobile keyboard, enable browser validation, and improve autofill accuracy.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
The `type` attribute is one of the most impactful and underused HTML attributes — it directly affects mobile keyboard display, browser validation, and autofill.

## Code Example

```html
<!-- Text inputs -->
<input type="text">      <!-- Default. General text. QWERTY keyboard on mobile -->
<input type="email">     <!-- Email address. Adds @ and .com key on mobile -->
<input type="tel">       <!-- Phone number. Shows numeric dialpad on mobile -->
<input type="url">       <!-- URL. Shows / : . and .com keys on mobile -->
<input type="search">    <!-- Search. Shows search/return key on mobile -->
<input type="password">  <!-- Masked input for passwords -->

<!-- Number inputs -->
<input type="number">    <!-- Numeric keypad. Use for quantities you can increment -->
<input type="range">     <!-- Slider for a range of values -->

<!-- Date and time inputs -->
<input type="date">      <!-- Date picker. Returns YYYY-MM-DD -->
<input type="time">      <!-- Time picker. Returns HH:MM -->
<input type="datetime-local">  <!-- Combined date and time -->
<input type="month">     <!-- Month and year picker -->
<input type="week">      <!-- Week picker -->

<!-- Other inputs -->
<input type="color">     <!-- Color picker -->
<input type="file">      <!-- File upload -->
<input type="checkbox">  <!-- Boolean checkbox -->
<input type="radio">     <!-- Radio button group -->
<input type="hidden">    <!-- Hidden value in form submissions -->
```

## Why It Matters

Using type=text for every input forces mobile users to switch keyboards manually for email, phone, and number entry. The correct type also enables browser autofill to correctly identify fields for name, address, and payment data. Combined with autocomplete attributes, semantic types can make form completion 40% faster for returning users.

## inputmode for Mobile Keyboards

`inputmode` controls the keyboard without affecting validation:

```html
<!-- Numeric input that looks like text (e.g., credit card) -->
<input type="text" inputmode="numeric" pattern="[0-9]*">

<!-- ZIP code: numbers but shouldn't spin/validate as number -->
<input type="text" inputmode="numeric" autocomplete="postal-code">

<!-- Decimal values (shows decimal key on mobile) -->
<input type="text" inputmode="decimal">
```

| inputmode | Mobile Keyboard |
|-----------|-----------------|
| `text` | Default QWERTY |
| `numeric` | Number pad (0-9) |
| `decimal` | Number pad with decimal |
| `tel` | Phone dial pad |
| `email` | Email keyboard |
| `url` | URL keyboard |
| `search` | Search keyboard |

## autocomplete for Autofill

```html
<form>
  <!-- Name -->
  <input type="text" autocomplete="name" placeholder="Full name">
  <input type="text" autocomplete="given-name" placeholder="First name">
  <input type="text" autocomplete="family-name" placeholder="Last name">

  <!-- Contact -->
  <input type="email" autocomplete="email">
  <input type="tel" autocomplete="tel">

  <!-- Address -->
  <input type="text" autocomplete="street-address">
  <input type="text" autocomplete="address-level2"> <!-- City -->
  <input type="text" autocomplete="postal-code">
  <input type="text" autocomplete="country-name">

  <!-- Payment -->
  <input type="text" autocomplete="cc-name" inputmode="text">
  <input type="text" autocomplete="cc-number" inputmode="numeric">
  <input type="text" autocomplete="cc-exp" placeholder="MM/YY">
  <input type="text" autocomplete="cc-csc" inputmode="numeric">

  <!-- Authentication -->
  <input type="email" autocomplete="username">
  <input type="password" autocomplete="current-password">
  <input type="password" autocomplete="new-password"> <!-- For registration -->
</form>
```

## Standards

- Use MDN: HTML as the standard for the final rendered HTML and browser-facing behavior.
- Use WHATWG HTML Living Standard as the standard for the final rendered HTML and browser-facing behavior.

## Verification

### Automated Checks

- Inspect the final rendered HTML in the browser or page source to confirm the rule is satisfied.
- Validate the affected markup with browser tooling or an HTML validator where appropriate.
- Test one representative route or template that uses the pattern.
- Re-check shared components that emit the same markup so the fix is consistent.

### Manual Checks

- Verify the rendered browser behavior manually on representative routes and supported browsers so the user-facing outcome matches the rule.