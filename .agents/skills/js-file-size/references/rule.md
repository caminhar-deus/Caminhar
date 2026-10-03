# Optimize JavaScript bundle size

> Checks for JavaScript files that exceed recommended size limits to ensure fast interaction

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Excessive JavaScript is one of the biggest contributors to poor web performance. Unlike images, which only need to be decoded, JavaScript must be downloaded, parsed, compiled, and executed.

## Code Examples

#

## Using Dynamic Imports (Next.js/React)
```jsx

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
})

  return (
    <div>
      
    </div>
  )
}
```

### Tree Shaking (ES Modules)
```javascript
// ✅ Good: Import only what you need

// ❌ Bad: Import the whole library

// Use instead: import debounce from 'lodash/debounce';
```

## Why It Matters

- **Main Thread Blocking**: JavaScript execution happens on the main thread, blocking user interactions.
- **Device Disparity**: A 1MB script might take 1s to parse on a flagship phone but 10s on a budget device.
- **Data Usage**: Larger files consume more of the user's data plan, which is critical for users on metered connections.
- **SEO Impact**: Slow interaction metrics (FID/INP) are part of Google's Core Web Vitals and can affect search rankings.

## Best Practices

✅ **Code Splitting**: Break large bundles into smaller, page-specific chunks.
✅ **Tree Shaking**: Ensure your build tool (Webpack, Vite, Rollup) is removing unused exports.
✅ **Audit Dependencies**: Use tools like `bundle-analyzer` to find "heavy" libraries.
✅ **Compression**: Always serve JS with Gzip or Brotli compression.

## Tools & Validation

- [BundleAnalyzer](https://www.npmjs.com/package/webpack-bundle-analyzer)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [BundlePhobia](https://bundlephobia.com/)
- Browser DevTools Coverage tab

## Verification

### Automated Checks

- Measure the affected page or flow in Lighthouse, PageSpeed Insights, or DevTools and confirm the targeted metric improves.
- Inspect the network waterfall or performance timeline to confirm the intended resource or execution change actually took effect.

### Manual Checks

- Verify the change on a throttled mobile profile, not just local desktop.
- If this rule maps to a budget or Web Vital, confirm the page now stays within that threshold.