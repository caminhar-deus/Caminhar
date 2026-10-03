# Use consistent CSS naming conventions

> Adopt a consistent class naming methodology (BEM, CUBE CSS, or a team-agreed pattern) to make class names self-documenting and prevent style conflicts.

**Priority:** medium · **Difficulty:** beginner · **Time:** 15 min

---
Consistent naming conventions make CSS self-documenting and prevent the class name collisions that lead to unexpected style leakage.

## Code Examples

BEM is the most widely adopted CSS naming methodology. It uses double underscores for elements and double hyphens for modifiers.

```css
/* Block — a standalone component */
.card { }

/* Element — a part of the block (uses __) */
.card__header { }
.card__body { }
.card__footer { }
.card__title { }
.card__image { }

/* Modifier — a variant or state (uses --) */
.card--featured { }
.card--dark { }
.card--loading { }

/* Element modifier */
.card__title--large { }
```

### HTML Example

```html
<article class="card card--featured">
  <div class="card__header">
    <img class="card__image" src="..." alt="...">
  </div>
  <div class="card__body">
    <h2 class="card__title card__title--large">Title</h2>
    <p class="card__description">...</p>
  </div>
  <footer class="card__footer">
    <button class="button button--primary">Read more</button>
  </footer>
</article>
```

## Why It Matters

Without a naming convention, class names become a guessing game — does .active mean the nav item is active, the button is pressed, or a form field has focus? With BEM or a similar methodology, .button--active is unambiguous. This reduces the time spent searching for existing styles and prevents accidental style conflicts.

## Namespacing Different Class Types

```css
/* Component classes — BEM */
.c-card { }
.c-button { }

/* Layout classes */
.l-grid { }
.l-container { }

/* Utility classes */
.u-text-center { }
.u-visually-hidden { }

/* State classes — applied via JavaScript */
.is-active { }
.is-loading { }
.is-open { }

/* JavaScript hooks — never style these */
.js-modal-trigger { }
.js-form-submit { }
```

## Common Naming Mistakes

```css
/* ❌ Ambiguous — active what? */
.active { }

/* ✅ Specific about what is active */
.nav-item--active { }
.tab--selected { }
.accordion--open { }

/* ❌ Presentational name — what if the color changes? */
.blue-button { }
.big-text { }

/* ✅ Semantic name — describes purpose, not appearance */
.button--primary { }
.text--headline { }

/* ❌ Overly generic */
.container { }  /* Container of what? */
.wrapper { }

/* ✅ Scoped to context */
.page-container { }
.hero-wrapper { }
```

## Utility-First (Tailwind-style)

If using a utility-first approach, the "convention" is composed in HTML:

```html
<!-- Utility classes describe one thing each -->
<div class="flex items-center gap-4 p-6 rounded-lg shadow-md bg-white">
  <img class="w-12 h-12 rounded-full" ...>
  <div class="flex-1 min-w-0">
    <h3 class="text-lg font-semibold truncate">Title</h3>
    <p class="text-sm text-gray-500">Description</p>
  </div>
</div>
```

## Standards

- Use MDN: CSS as the standard for the final rendered behavior across the supported browsers and breakpoints.
- Use web.dev: Learn CSS as the standard for the final rendered behavior across the supported browsers and breakpoints.

## Verification

1. Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
2. Confirm the computed styles match the intended fix in DevTools.
3. Test at least one mobile and one desktop viewport before shipping.
4. If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.