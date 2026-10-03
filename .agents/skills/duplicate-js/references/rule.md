# Remove duplicate JavaScript libraries

> Detect and consolidate duplicate JavaScript libraries to reduce bundle size and prevent version conflicts.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
Loading multiple versions of the same library (like two versions of jQuery or Lodash) is a common cause of unnecessary page weight and potential runtime errors.

## Code Examples

#

## 1. Checking for Duplicates with npm/pnpm
Use your package manager to find multiple versions of a dependency.

```bash
# For npm
npm ls lodash

# For pnpm
pnpm why lodash
```

### 2. Consolidating with Package Overrides
If different sub-dependencies require different versions, you can sometimes force a single version.

```json
// package.json
{
  "overrides": {
    "lodash": "^4.17.21"
  }
}
```

### 3. Identifying Duplicates in the Browser
You can check for multiple global variables in the console.

```javascript
// Check for multiple jQuery versions
console.log('jQuery version 1:', window.jQuery?.fn?.jquery);
// Some scripts might alias jQuery
```

## Why It Matters

- **Bundle Bloat**: Each duplicate library adds to the total amount of JavaScript the browser must download, parse, and execute.
- **Memory Overhead**: Multiple instances of a library consume more memory, which can impact performance on low-end devices.
- **Version Conflicts**: Different versions of a library may have incompatible APIs or global state, leading to hard-to-debug bugs.
- **Execution Time**: The browser spends more time in the "Compile Script" and "Evaluate Script" phases of the rendering process.

## Best Practices

Start with [Bundlephobia](https://bundlephobia.com/) or your local bundle analyzer before deduping packages, because the real problem is usually one duplicated heavyweight dependency rather than every shared utility in the tree.

✅ **Analyze Bundles**: Use tools like `webpack-bundle-analyzer` or `rollup-plugin-visualizer` to see exactly what's in your bundle.
✅ **Use Peer Dependencies**: If you are a library author, use `peerDependencies` to avoid forcing users to install duplicate versions.
✅ **Audit Third-Party Tags**: Use Google Tag Manager or a similar tool to audit scripts that might be loading their own dependencies.
✅ **Dependency Deduplication**: Regularly run `npm dedupe` or `pnpm dedupe` to clean up your lockfile.

❌ **Don't Ignore Warnings**: Pay attention to "multiple versions of X" warnings during your build process.
❌ **Avoid Multiple Global Libraries**: Don't load libraries via CDN if they are already included in your main application bundle.

## Tools & Validation

- [Bundlephobia](https://bundlephobia.com/): Check the cost of adding a new dependency.
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer): Visualizes the size of webpack output files with an interactive zoomable treemap.
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/): Specifically flags "duplicate modules in JavaScript bundles."
- [JSHint](https://jshint.com/): Can help identify global variable collisions.

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