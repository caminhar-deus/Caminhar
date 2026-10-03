# Avoid redundant entry in the same process

> Information already provided earlier in a multi-step flow is auto-populated or available for selection instead of being typed again.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Multi-step processes should not force people to remember and retype information they already provided earlier in the same task. If the system already knows the value, surface it again instead of treating the next step as a blank slate.

## Code Example

```html
<!-- Bad: step 1 collected the same email address already -->
<label for="confirm-email">Confirm your email</label>
<input id="confirm-email" name="confirmEmail" type="email">

<!-- Better: show or prefill the previously entered value -->
<label for="contact-email">Contact email</label>
<input
  id="contact-email"
  name="email"
  type="email"
  autocomplete="email"
  value="sam@example.com">
```

```tsx
function ShippingStep({
  billingAddress,
  shippingAddress,
  useBillingAddress,
  onToggle,
}: {
  billingAddress: Address
  shippingAddress: Address
  useBillingAddress: boolean
  onToggle: (value: boolean) => void
}) {
  const effectiveAddress = useBillingAddress ? billingAddress : shippingAddress

  return (
    <fieldset>
      <legend>Shipping address</legend>

      <label>
        <input
          checked={useBillingAddress}
          name="sameAsBilling"
          type="checkbox"
          onChange={(event) => onToggle(event.target.checked)}
        />
        Same as billing address
      </label>

      <input defaultValue={effectiveAddress.street} name="street" type="text" />
      <input defaultValue={effectiveAddress.city} name="city" type="text" />
      <input defaultValue={effectiveAddress.postalCode} name="postalCode" type="text" />
    </fieldset>
  )
}
```

```html
<!-- Better: review previously entered data instead of retyping it -->
<section aria-labelledby="review-contact">
  <h2 id="review-contact">Review contact details</h2>
  <p>Email: sam@example.com</p>
  <p>Phone: +1 555 0100</p>
  <a href="/checkout/contact">Edit contact details</a>
</section>
```

## Why It Matters

Redundant entry adds work without adding value. In complex flows, that extra work compounds:

- users have to remember what they entered on an earlier screen
- voice, switch, and keyboard-only users spend longer on repetitive text entry
- repeated fields create more opportunities for typos and mismatches
- users abandon more easily when a process feels bureaucratic instead of assistive

## Best Practices

### Reuse values inside the same task

If the user already entered the data during the current process, either:

- auto-populate the new field, or
- make the prior value available for selection

Common patterns include:

- "Same as billing address"
- showing the earlier contact email on a confirmation step
- selecting a previously entered company ID from review text instead of asking for it again

### Treat review screens as review screens

Confirmation steps should usually display data for checking and editing, not require full re-entry of the same values. If edits are needed, provide an edit action or keep the fields populated.

### Limit true exceptions to real exceptions

The WCAG exceptions are narrower than many teams assume. Re-entry can be valid when:

- it is essential to the activity itself
- it is required for security
- the previously entered information is no longer valid

That means password confirmation may be acceptable, but retyping a shipping city, email address, or support case number usually is not.

## Thresholds

- Pass if previously entered non-exempt data is prefilled or selectable later in the same flow.
- Fail if the user must manually re-enter the same contact, address, or profile information during the same process.

## Standards

- This rule maps to WCAG 2.2 Success Criterion 3.3.7 Redundant Entry.
- The allowed exceptions are narrow: essential information, security-required re-entry, or information that is no longer valid.

## Exceptions

- Re-entering a new password can be a valid security exception when the user must confirm a non-displayed secret.
- If the earlier value is outdated or intentionally expired, asking again can be correct.
- Avoid solving this rule by storing sensitive data longer than necessary. Reuse prior data within the process without creating a new privacy leak.

## Verification

### Automated Checks

- Map each step in the process and list every required field.
- Flag values that appear more than once without being prefilled or selectable from earlier entries.

### Manual Checks

- Complete the flow from start to finish as a user would.
- Pass if repeated information is already present or can be selected without retyping.
- Fail if the user must manually re-enter the same non-exempt value during the same process.