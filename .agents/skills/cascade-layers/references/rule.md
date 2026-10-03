# Use @layer to manage CSS cascade order explicitly

> CSS Cascade Layers (@layer) are used to give the codebase explicit, predictable control over specificity and cascade order, eliminating the need to fight specificity with !important.

**Priority:** low · **Difficulty:** intermediate · **Time:** 30 min

---
[CSS Cascade Layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) give you a new dimension of cascade control that sits above specificity. The [web.dev guide](https://web.dev/articles/cascade-layers) is a good mental model here: instead of relying on selector weight and source-order accidents, you define an explicit priority stack.
## Code Example

```
Higher priority (wins)
       ↑
       │  Unlayered styles (implicit top layer)
       │  utilities layer
       │  components layer
       │  base layer
       │  reset layer
       ↓
Lower priority
```

Styles in a higher layer win over styles in lower layers **regardless of selector specificity**. A single class in the `utilities` layer beats a three-class selector in the `base` layer.

## Why It Matters

Specificity conflicts are one of the most common causes of CSS bugs in large codebases. Developers resort to !important, deeply nested selectors, or inline styles to win specificity wars, creating an unmaintainable arms race. Cascade layers move the source of truth for cascade order from selector specificity to explicit layer ordering, making the system predictable and easy to reason about.

## Declaring the Layer Stack

Always declare the layer order at the top of your CSS entry point. The order of `@layer` declarations determines priority — later = higher priority:

```css
/* main.css — declare the full stack first */
@layer reset, base, components, utilities;

/* Then import or define each layer */
@import url('./reset.css') layer(reset);
@import url('./base.css') layer(base);
@import url('./components.css') layer(components);
@import url('./utilities.css') layer(utilities);
```

If you do not pre-declare layers, their order is determined by when they are first encountered in the source — which can change unpredictably as you add imports.

## Defining Styles in a Layer

```css
/* reset.css */
@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
  body, h1, h2, h3, p, ul { margin: 0; padding: 0; }
  img { max-width: 100%; display: block; }
}

/* base.css */
@layer base {
  body {
    font-family: var(--font-sans);
    font-size: 1rem;
    line-height: 1.5;
    color: var(--color-text);
    background-color: var(--color-bg);
  }

  h1 { font-size: clamp(1.75rem, 4vw, 2.5rem); }
  h2 { font-size: clamp(1.375rem, 3vw, 1.875rem); }
  a { color: var(--color-link); }
}

/* components.css */
@layer components {
  .btn {
    display: inline-flex;
    align-items: center;
    padding: 0.5em 1.25em;
    border-radius: 0.375rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .btn-primary {
    background-color: var(--color-primary);
    color: white;
  }
}

/* utilities.css */
@layer utilities {
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  .mt-4 { margin-top: 1rem; }
  .flex { display: flex; }
  .gap-2 { gap: 0.5rem; }
}
```

## Third-Party Styles in Layers

Wrapping third-party CSS in a low-priority layer ensures your own styles always win — no more `!important` battles with third-party components:

```css
/* Wrap a third-party library in a layer */
@import url('third-party-ui/styles.css') layer(vendor);

/* Declare vendor below your own layers — your styles always win */
@layer vendor, reset, base, components, utilities;
```

```css
/* Or wrap inline */
@layer vendor {
  @import url('some-component-library/dist/styles.css');
}
```

## Nested Layers

Layers can be nested for more granular control:

```css
@layer components {
  @layer forms {
    .input { border: 1px solid var(--color-border); }
  }

  @layer cards {
    .card { border-radius: 0.5rem; }
  }
}

/* Reference nested layers as components.forms, components.cards */
```

## Migrating an Existing Codebase

A safe migration strategy — move styles into layers without rewriting everything at once:

```css
/* Step 1: Declare layers but keep existing styles outside (they stay highest priority) */
@layer reset, base, components;

/* Step 2: Move resets into the reset layer first */
@layer reset {
  /* existing reset styles */
}

/* Step 3: Move base styles */
@layer base {
  /* existing base styles */
}

/* Step 4: Move component styles — existing utility/override styles remain unlayered */
@layer components {
  /* existing component styles */
}

/* Step 5: Move utilities last — these become the new top layer */
@layer utilities {
  /* existing utility styles */
}
```

## @layer and Tailwind CSS

Tailwind v3.3+ supports cascade layers natively. Configure it in `tailwind.config.js`:

```javascript
// tailwind.config.js
module.exports = {
  future: {
    hoverOnlyWhenSupported: true,
  },
}
```

```css
/* With @import for Tailwind's own layer registration */
@layer base {
  @tailwind base;
}
@layer components {
  @tailwind components;
}
@layer utilities {
  @tailwind utilities;
}
```

## Browser Support

[`@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) is supported in all modern browsers (Chrome 99+, Firefox 97+, Safari 15.4+). The [Chrome rollout notes](https://developer.chrome.com/blog/cascade-layers) are a useful reminder that unsupported browsers simply treat the rules as unlayered styles, so compatibility is mostly about whether your project still targets those engines.

Any style defined outside a `@layer` block has higher priority than all layered styles. This is intentional for migration (existing styles keep working) but can cause confusion if you mix layered and unlayered styles. Establish a team convention: either put everything in layers, or reserve unlayered styles only for critical emergency overrides.

## Verification

Use the [MDN `@layer` reference](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) while checking DevTools so you are verifying the declared layer order and not just the final visual result.

1. Open DevTools → **Elements** → **Styles** panel and verify that layer names appear in the style source (e.g., `layer(components)` or `@layer components`).
2. Search the codebase for `!important` declarations — each one is a candidate for elimination via proper layer ordering.
3. Verify the layer stack is declared at the top of the main CSS entry file, before any `@import` statements that use those layers.
4. Confirm that third-party CSS imports are wrapped in a `vendor` or `third-party` layer declared before your own layers.