# Provide source maps for production debugging

> Checks for source map availability and configuration to ensure easier debugging

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Source maps are a critical bridge between the minified code that runs in a user's browser and the original source code that developers write. Without them, debugging production errors is nearly impossible.

## Code Examples

#

## Generating Source Maps (Webpack)
```javascript
// ✅ Good: Generate a source map that's easy to debug
module.exports = {
  devtool: 'source-map', // Options vary by build tool and environment
};
```

### Source Map Link (Minified File)
```javascript
// at the end of your app.min.js
//# sourceMappingURL=app.min.js.map
```

### Excluding Source Maps from Public Production (Vite)
```javascript
// ✅ Good: Generate hidden source maps for external error trackers

  build: {
    sourcemap: 'hidden', // Maps are generated but not linked in the JS
  },
};
```

## Why It Matters

- **Easier Debugging**: See the exact line and column in your original code where an error occurred.
- **Accurate Stack Traces**: Error tracking services like Sentry or LogRocket use source maps to provide meaningful error reports.
- **Improved Monitoring**: Detailed production logs allow for faster bug identification and resolution.
- **Maintain Performance**: You get all the benefits of minification and obfuscation while still retaining the ability to debug your code.

## Best Practices

✅ **Always Generate in Build**: Ensure source maps are a standard part of your build process.
✅ **Secure Your Maps**: Don't upload source maps to your public web server if you want to protect your source code; upload them to your error tracking tool instead.
✅ **Use `hidden-source-map`**: This is a great way to generate maps without making them publicly available in the browser's developer tools.
✅ **Test Your Integration**: Manually verify that your error tracker is correctly de-minifying stack traces.

## Tools & Validation

Keep source-map verification tied to the real error-reporting path, because [Sentry’s source map docs](https://docs.sentry.io/platforms/javascript/sourcemaps/) or your tracker’s upload flow matter more than whether the map file exists locally.

- [Sentry Source Map Documentation](https://docs.sentry.io/platforms/javascript/sourcemaps/)
- Webpack devtool documentation is useful when you need to choose the right source-map mode for a build.
- Vite build options document when maps are hidden, linked, or omitted.
- Browser DevTools (Sources tab -> look for your original files)

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