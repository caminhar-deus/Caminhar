# Use ES modules (import/export)

> Use native ES module syntax for imports and exports instead of CommonJS require() to enable static analysis, tree-shaking, and better tooling support.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
ES modules (`import`/`export`) are the JavaScript standard for code organization and are supported natively in all modern browsers and Node.js.

## Code Example

```javascript
// ❌ CommonJS (avoid for new code)
const utils = require('./utils')
const { formatDate } = require('./utils')
module.exports = { myFunction }
module.exports = myFunction

// ✅ ES Modules

```

## Why It Matters

ES modules are statically analyzable — bundlers can determine at build time what code is actually used and eliminate the rest (tree-shaking). CommonJS require() is dynamic and prevents this optimization. ES modules are also the browser-native standard, reducing the need for build-time transformation.

## Named vs Default Exports

```javascript
// utils.js — named exports (preferred for libraries and utilities)

// consumer.js

// Only imported functions are included in the bundle
```

```javascript
// UserCard.js — default export (common for single-concept modules)

// consumer.js

```

## In the Browser

```html
<!-- Add type="module" to use import/export directly -->
<script type="module">
  import { formatDate } from './utils.js'
  console.log(formatDate(new Date()))
</script>
```

Module scripts are deferred by default, execute in strict mode, and have their own scope (no global leakage).

## Dynamic Imports for Code Splitting

```javascript
// Load a heavy module only when needed
async function loadChart() {
  const { Chart } = await import('./chart.js')
  return new Chart(document.getElementById('canvas'))
}

button.addEventListener('click', loadChart)
```

## Re-exporting (Barrel Files)

```javascript
// index.js — re-export from a central entry point

```

## Standards

- Use MDN: JavaScript Guide as the standard for how this JavaScript pattern should behave in production, not just in a small local example.
- Use web.dev: Learn JavaScript as the standard for how this JavaScript pattern should behave in production, not just in a small local example.

## Support Notes

- Module loading behavior depends on the target browser matrix and build pipeline, so verify the final shipped output rather than relying only on source syntax.
- If legacy targets remain in scope, document the fallback or transpilation path explicitly.
- ES modules and class bodies run in strict mode automatically. If the codebase still ships classic non-module scripts, an explicit `'use strict'` directive can still matter there.

## Verification

### Automated Checks

- Verify the behavior in the browser after the code change, not only in static analysis.
- Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
- Test the primary user flow and one edge case triggered by the changed script path.

### Manual Checks

- Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.