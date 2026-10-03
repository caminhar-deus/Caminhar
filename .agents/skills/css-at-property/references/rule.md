# Register CSS custom properties with @property for animation and type safety

> Use @property to register CSS custom properties with a type, initial value, and inheritance control — enabling animation of custom properties and providing compile-time validation for design tokens.

**Priority:** low · **Difficulty:** advanced · **Time:** 30 min

---
CSS custom properties (variables) are string substitutions by default. The browser does not know whether `--brand-color` is a color, a length, or a number, which is why [`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property) and the [Properties & Values API spec](https://www.w3.org/TR/css-properties-values-api-1/) exist: they let the engine treat a custom property as a real typed value.
## Code Example

```css
@property --property-name {
  syntax: '<color>';      /* The type — see valid syntax descriptors below */
  initial-value: #000;    /* Required — the property's default value */
  inherits: true;         /* Whether the value cascades to child elements */
}
```

## Why It Matters

CSS custom properties are powerful but limited by default: they are untyped string substitutions that the browser cannot interpolate during transitions or animations. The [web.dev @property article](https://web.dev/articles/at-property) shows why registration matters in practice: the browser finally has enough information to animate between values, validate token assignments, and scope inheritance cleanly.

## Syntax Descriptors

```css
/* Primitive types */
syntax: '<color>';          /* #hex, rgb(), hsl(), oklch(), color names */
syntax: '<length>';         /* px, em, rem, vw, etc. */
syntax: '<number>';         /* unitless numbers */
syntax: '<integer>';        /* integers only */
syntax: '<percentage>';     /* 0% to 100% */
syntax: '<angle>';          /* deg, rad, turn */
syntax: '<time>';           /* s, ms */
syntax: '<length-percentage>'; /* length or percentage */

/* Compound types */
syntax: '<color>+';         /* one or more space-separated colors */
syntax: '<length>#';        /* one or more comma-separated lengths */

/* Universal fallback — behaves like an unregistered property */
syntax: '*';
```

## Animating a Gradient via Custom Property

Without `@property`, gradient stops cannot be animated because the browser treats the whole gradient as an opaque string:

```css
/* ❌ Without @property — animation jumps between discrete values */
.card {
  --gradient-angle: 135deg;
  background: linear-gradient(var(--gradient-angle), #667eea, #764ba2);
  transition: --gradient-angle 0.6s ease; /* has no effect — string transition */
}

.card:hover {
  --gradient-angle: 225deg;
}
```

```css
/* ✅ With @property — the angle interpolates smoothly */
@property --gradient-angle {
  syntax: '<angle>';
  initial-value: 135deg;
  inherits: false;
}

.card {
  background: linear-gradient(var(--gradient-angle), #667eea, #764ba2);
  transition: --gradient-angle 0.6s ease; /* smooth animation */
}

.card:hover {
  --gradient-angle: 225deg;
}
```

## Animating a Color Token

```css
@property --accent-hue {
  syntax: '<number>';
  initial-value: 220;
  inherits: true; /* children pick up the animated value */
}

:root {
  --accent-hue: 220;
  --accent: oklch(60% 0.2 var(--accent-hue));
  transition: --accent-hue 0.4s ease;
}

/* Shift the hue on a specific section */
.section--warm:hover {
  --accent-hue: 30; /* orange */
}

/* The component using --accent sees the interpolated hue mid-transition */
.button {
  background: var(--accent);
}
```

## Typed Design Tokens

Registering design tokens with `@property` catches mistakes: assigning a length to a color property becomes a validation error in DevTools, not a silent no-op:

```css
/* Register color tokens with explicit types */
@property --color-brand-primary {
  syntax: '<color>';
  initial-value: oklch(55% 0.25 265);
  inherits: true;
}

@property --color-surface {
  syntax: '<color>';
  initial-value: #ffffff;
  inherits: true;
}

/* Register spacing tokens */
@property --spacing-base {
  syntax: '<length>';
  initial-value: 1rem;
  inherits: true;
}

/* Override in dark mode — type is enforced */
@media (prefers-color-scheme: dark) {
  :root {
    --color-brand-primary: oklch(70% 0.25 265);
    --color-surface: #0f172a;
  }
}
```

## Scoped Component Tokens with inherits: false

```css
/* A progress bar with an animatable fill */
@property --progress-fill {
  syntax: '<percentage>';
  initial-value: 0%;
  inherits: false; /* Each .progress-bar has its own value — they don't share */
}

.progress-bar {
  --progress-fill: 0%;
  background: linear-gradient(
    to right,
    var(--color-brand-primary) var(--progress-fill),
    var(--color-surface) var(--progress-fill)
  );
  transition: --progress-fill 0.5s ease;
}

/* JS sets the value per instance */
/* element.style.setProperty('--progress-fill', '72%') */
```

If you specify a typed syntax descriptor (anything other than `*`), you must also provide an `initial-value`. Without it, the registration is invalid and the browser treats the property as unregistered. This is a common source of silent failures when first writing @property rules — always include both.

## CSS.registerProperty() — the JavaScript Equivalent

The same registration is available in JavaScript, useful for programmatic token generation:

```javascript
// Equivalent to the @property at-rule
CSS.registerProperty({
  name: '--gradient-angle',
  syntax: '<angle>',
  initialValue: '135deg',
  inherits: false,
})
```

Prefer the CSS `@property` at-rule for static tokens; use `CSS.registerProperty()` only for dynamically computed token registrations.

## Browser Support

`@property` is supported in all major browsers as of 2024:
- Chrome/Edge 85+
- Firefox 128+
- Safari 16.4+

## Verification

Use the [MDN `@property` reference](https://developer.mozilla.org/en-US/docs/Web/CSS/@property) and the [Properties & Values API spec](https://www.w3.org/TR/css-properties-values-api-1/) as the baseline for what counts as a valid registration.

1. Open DevTools and inspect an element with a registered custom property. The Computed Styles panel should show the resolved typed value (e.g., `oklch(55% 0.25 265)`) rather than the raw variable string.
2. Apply a CSS transition to the registered property and confirm the animation interpolates smoothly between values rather than jumping discretely.
3. Intentionally assign a value of the wrong type to a registered property (e.g., assign a `px` length to a `<color>` property) and confirm the browser ignores the invalid value and falls back to `initial-value` — demonstrating type enforcement.
4. Test in Firefox (the last major browser to ship `@property`, in version 128) to confirm the registration works and the animations behave identically.