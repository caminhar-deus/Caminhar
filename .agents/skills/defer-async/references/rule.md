# Load scripts with defer, async, or type=module

> Prevent JavaScript from blocking HTML parsing by using defer, async, or type=module attributes on script tags so the browser can continue building the DOM while scripts download.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
How you load JavaScript has a major impact on page rendering performance. The default `<script>` behavior blocks the HTML parser.

## Code Example

```
HTML parsing: [====================================================]

Plain <script src="app.js"> in <head>:
HTML parsing: [====]  BLOCKED  [====================================]
Download:          [=========]
Execute:                      [=]

async:
HTML parsing: [========================]  [=========================]
Download:     [=========]
Execute:               [=]  ← interrupts parsing when ready

defer:
HTML parsing: [====================================================]
Download:     [=========]
Execute:                                                          [=]  ← after parsing

type="module":
Behaves like defer + enables import/export
```

## Why It Matters

A plain &lt;script&gt; tag in the document head blocks all HTML parsing until the script downloads, parses, and executes. On a slow network this can add seconds of white-screen time before any content renders. defer and async allow the browser to continue parsing HTML while the script downloads, reducing Time to First Contentful Paint dramatically.

## When to Use Each

```html
<!DOCTYPE html>
<html>
<head>
  <!-- ✅ defer: order-dependent scripts, most application code -->
  <!-- Executes in order, after DOM is ready -->
  <script defer src="/vendor.js"></script>
  <script defer src="/app.js"></script>

  <!-- ✅ async: independent scripts that don't need DOM or other scripts -->
  <!-- Analytics, chat widgets, social share buttons -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>

  <!-- ✅ type=module: ES modules, implies defer -->
  <script type="module" src="/main.js"></script>

  <!-- ❌ Bad: blocks parsing -->
  <script src="/app.js"></script>
</head>
</html>
```

## Decision Guide

```
Does the script use import/export?
  → type="module"

Does the script depend on other scripts or the DOM?
  → defer (executes in order after HTML is parsed)

Is the script completely independent (analytics, widgets)?
  → async (executes as soon as downloaded)

Does the script need to run before DOM is ready (e.g., anti-flicker theme)?
  → inline <script> in <head> (acceptable exception)
```

## Inline Critical Scripts

```html
<!-- Anti-flicker theme detection must run before paint — inline is correct here -->
<head>
  <script>
    // Runs synchronously before render — necessary for theme
    const theme = localStorage.getItem('theme') || 'light'
    document.documentElement.setAttribute('data-theme', theme)
  </script>

  <!-- Then defer everything else -->
  <script defer src="/app.js"></script>
</head>
```

## module vs nomodule for Legacy Support

```html
<!-- Modern browsers load the module, legacy browsers load the nomodule -->
<script type="module" src="/app.modern.js"></script>
<script nomodule src="/app.legacy.js"></script>
```

## Framework Examples

```tsx

  return (
    <>
      
      
        {`document.documentElement.dataset.theme = localStorage.getItem('theme') || 'light'`}
      
    </>
  )
}
```

```javascript
button.addEventListener('click', async () => {
  const { openConfigurator } = await import('./configurator.js')
  openConfigurator()
})
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