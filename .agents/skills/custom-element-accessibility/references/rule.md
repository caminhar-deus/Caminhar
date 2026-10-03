# Make custom elements and Web Components accessible

> Custom elements must implement ARIA reflection via ElementInternals, keyboard interaction, and form association so that screen readers and assistive technologies can interpret them correctly.

**Priority:** medium · **Difficulty:** advanced · **Time:** 60 min

---
Custom elements (Web Components) have a fundamental accessibility challenge: the shadow DOM is a separate DOM tree, and ARIA attributes set inside the shadow root do not automatically propagate to the accessibility tree exposed to assistive technologies. The solution is `ElementInternals`, an API that provides a standards-based bridge.
## Code Example

Consider a custom checkbox without `ElementInternals`:

```html
<my-checkbox checked></my-checkbox>
```

A screen reader will see an unknown element with no role, no accessible name, and no state. The `checked` attribute has no semantic meaning unless you explicitly map it.

## Why It Matters

Custom elements that lack ARIA reflection are invisible to screen readers — a button that looks correct visually may be announced as a generic "group" or not at all. ElementInternals provides the bridge between the shadow DOM and the accessibility tree, and it is also the only standards-compliant way to integrate custom inputs with native HTML forms.

Before you build a custom widget, check whether native HTML already solves the interaction. A styled `<button>`, `<input type="checkbox">`, `<select>`, or `<details>` usually ships with better keyboard, focus, form, and accessibility behavior than a custom element can recreate cheaply.

## ElementInternals: The Correct Approach

`ElementInternals` provides:

1. **ARIA reflection** — set ARIA properties (role, label, checked, etc.) on the accessibility object
2. **Form participation** — custom inputs integrate with `<form>`, submit values, and show validation errors
3. **Validity** — expose constraint validation state

```typescript
class AccessibleCheckbox extends HTMLElement {
  // Declare the element as form-associated so it participates in forms
  static formAssociated = true;

  #internals: ElementInternals;
  #checked = false;

  constructor() {
    super();
    // Always attach internals in the constructor
    this.#internals = this.attachInternals();

    // Set the ARIA role — this is visible to screen readers
    this.#internals.ariaRole = 'checkbox';
    this.#internals.ariaChecked = 'false';

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; cursor: pointer; }
        :host([disabled]) { opacity: 0.4; cursor: not-allowed; }
        .indicator { width: 1em; height: 1em; border: 2px solid currentColor; }
        :host([aria-checked="true"]) .indicator::after {
          content: '✓';
          display: block;
          text-align: center;
        }
      </style>
      <span class="indicator" part="indicator"></span>
      <slot></slot>
    `;
  }

  connectedCallback() {
    // Ensure the element is focusable
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    this.addEventListener('click', this.#toggle);
    this.addEventListener('keydown', this.#onKeyDown);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.#toggle);
    this.removeEventListener('keydown', this.#onKeyDown);
  }

  get checked(): boolean {
    return this.#checked;
  }

  set checked(value: boolean) {
    this.#checked = value;
    // Reflect to both attribute (for CSS selectors) and ARIA (for AT)
    this.setAttribute('aria-checked', String(value));
    this.#internals.ariaChecked = String(value);
    // Inform the associated form of the new value
    this.#internals.setFormValue(value ? 'on' : null);
  }

  #toggle = () => {
    if (this.hasAttribute('disabled')) return;
    this.checked = !this.checked;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  #onKeyDown = (event: KeyboardEvent) => {
    // Space toggles a checkbox (ARIA APG pattern)
    if (event.key === ' ') {
      event.preventDefault();
      this.#toggle();
    }
  };
}

customElements.define('accessible-checkbox', AccessibleCheckbox);
```

## Form-Associated Custom Elements

When `formAssociated = true` is set, the element can participate in HTML forms like a native `<input>`:

```typescript
class PhoneInput extends HTMLElement {
  static formAssociated = true;

  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.ariaRole = 'textbox';
    // ... render shadow DOM with an internal <input>
  }

  // Called by the browser when the form is reset
  formResetCallback() {
    this.value = '';
  }

  // Called when the element is associated with a form
  formAssociatedCallback(form: HTMLFormElement | null) {
    // Update validation when form changes
    this.#validate();
  }

  #validate() {
    const value = this.value;
    if (!value) {
      this.#internals.setValidity(
        { valueMissing: true },
        'Phone number is required',
        this.shadowRoot?.querySelector('input') ?? undefined
      );
    } else if (!/^\+?[\d\s\-().]{7,}$/.test(value)) {
      this.#internals.setValidity(
        { patternMismatch: true },
        'Please enter a valid phone number',
        this.shadowRoot?.querySelector('input') ?? undefined
      );
    } else {
      this.#internals.setValidity({});
    }
  }

  get value(): string {
    return this.#internals.form
      ? (this.shadowRoot?.querySelector('input') as HTMLInputElement)?.value ?? ''
      : '';
  }

  set value(v: string) {
    const input = this.shadowRoot?.querySelector('input') as HTMLInputElement;
    if (input) input.value = v;
    this.#internals.setFormValue(v);
    this.#validate();
  }
}
```

## Roving tabindex for Compound Widgets

Compound widgets (listbox, toolbar, radio group, menu) should use the **roving tabindex** pattern: only one item in the group has `tabindex="0"` at a time; all others have `tabindex="-1"`. Arrow keys move focus within the group:

```typescript
class AccessibleListbox extends HTMLElement {
  #internals: ElementInternals;
  #items: HTMLElement[] = [];
  #activeIndex = 0;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.ariaRole = 'listbox';
    this.attachShadow({ mode: 'open' }).innerHTML = `<slot></slot>`;
  }

  connectedCallback() {
    this.addEventListener('keydown', this.#onKeyDown);
    this.#updateItems();
  }

  #updateItems() {
    this.#items = Array.from(this.querySelectorAll('[role="option"]')) as HTMLElement[];
    this.#items.forEach((item, i) => {
      item.setAttribute('tabindex', i === this.#activeIndex ? '0' : '-1');
    });
  }

  #onKeyDown = (event: KeyboardEvent) => {
    let newIndex = this.#activeIndex;

    if (event.key === 'ArrowDown') {
      newIndex = Math.min(this.#activeIndex + 1, this.#items.length - 1);
    } else if (event.key === 'ArrowUp') {
      newIndex = Math.max(this.#activeIndex - 1, 0);
    } else if (event.key === 'Home') {
      newIndex = 0;
    } else if (event.key === 'End') {
      newIndex = this.#items.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    this.#items[this.#activeIndex].setAttribute('tabindex', '-1');
    this.#activeIndex = newIndex;
    this.#items[this.#activeIndex].setAttribute('tabindex', '0');
    this.#items[this.#activeIndex].focus();
  };
}
```

Set ARIA roles and states on the custom element host (via `ElementInternals` or `setAttribute`) rather than on elements inside the shadow root. Assistive technologies see the host element in the light DOM; shadow DOM internals are largely opaque to the accessibility tree unless explicitly surfaced via `ElementInternals`.

## Slot Accessibility

Content projected into a `<slot>` remains in the light DOM and is fully accessible. However, slot content does not inherit ARIA from the shadow root. Always label slots that receive interactive content:

```html
<template>
  <div role="group" aria-labelledby="group-label">
    <slot name="label" id="group-label"></slot>
    <slot></slot>
  </div>
</template>
```

## Verification

### Automated Checks

- Use axe DevTools or Accessibility Insights to audit a page containing your custom elements — zero critical ARIA violations should be reported.
- Submit a form containing a form-associated custom element and confirm the value appears in `FormData` correctly.

### Manual Checks

- Tab through the page with a keyboard only — every custom element should be reachable and operable without a mouse.
- Verify with VoiceOver (macOS) or NVDA (Windows) that the role, name, and state are announced correctly when focusing a custom element.