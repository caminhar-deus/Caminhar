# Avoid serving legacy JavaScript to modern browsers

> Detects ES5 polyfills and legacy JavaScript code to reduce bundle size and improve execution

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Most web traffic today comes from modern browsers that support ES6+ natively. Transpiling all your code to ES5 and including polyfills for everything is an outdated practice that adds unnecessary weight to your bundles.

## Code Examples

#

## Differential Serving (HTML)
```html
<!-- ✅ Good: Serve modern JS to modern browsers, legacy JS to old ones -->
<script type="module" src="modern.js"></script>
<script nomodule src="legacy.js"></script>
```

### Modern Target (Vite Configuration)
```javascript
// ✅ Good: Targeting modern browsers specifically

  build: {
    target: 'esnext' // Or 'es2020', 'es2022'
  }
}
```

### Modern Target (Babel / .browserslistrc)
```text
# ✅ Good: Specifying modern browsers to avoid unnecessary polyfills
defaults and supports es6-module
last 2 versions
not dead
```

## Why It Matters

- **Bundle Size**: ES6+ syntax is often more concise than transpiled ES5, resulting in smaller files.
- **Execution Speed**: Modern browsers can execute native ES6+ features (like classes and arrow functions) faster than their transpiled equivalents.
- **Polyfill Overload**: Many polyfills are completely unnecessary for the vast majority of your users and only serve to slow down the experience.
- **Code Maintenance**: Writing and debugging modern JavaScript is easier than dealing with heavily transpiled output.

## Best Practices

✅ **Use Differential Serving**: Deliver small, fast code to 90%+ of your users.
✅ **Set a Realistic Browser Target**: Use `browserslist` to define exactly which browsers you need to support.
✅ **Audit Your Polyfills**: Use `core-js` with `useBuiltIns: 'usage'` to only include the polyfills you actually need.
✅ **Prefer Native Features**: If you only need to support modern browsers, use native `fetch`, `Promise`, and other modern APIs directly.

## Tools & Validation

Use [PageSpeed Insights](https://pagespeed.web.dev/) or your bundle report before changing build targets, because the practical win usually comes from verifying which legacy polyfills or transpiled chunks modern browsers are still downloading.

- Browserslist can help verify the actual modern-browser target.
- Polyfill.io should be used cautiously when you still need selective legacy support.
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/) can highlight `legacy-javascript` on the route.
- Bundle analyzers are useful when you need to confirm which polyfills or transforms still dominate the shipped bundle.

## Standards

- Use web.dev: Learn Performance as the standard for measuring the final production behavior, not just local synthetic output.
- Use Chrome Developers: Lighthouse overview as the standard for measuring the final production behavior, not just local synthetic output.

## Verification

### Automated Checks

- Measure the affected page or flow in Lighthouse, PageSpeed Insights, or DevTools and confirm the targeted metric improves.
- Inspect the network waterfall or performance timeline to confirm the intended resource or execution change actually took effect.

### Manual Checks

- Verify the change on a throttled mobile profile, not just local desktop.
- If this rule maps to a budget or Web Vital, confirm the page now stays within that threshold.