# Enforce performance budgets in CI

> Define measurable performance thresholds (bundle size, Lighthouse scores, Core Web Vitals) and fail CI builds automatically when they're exceeded.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 25 min

---
Performance budgets are explicit constraints on measurable metrics that fail your build when exceeded.

## Code Examples

```bash
pnpm add -D size-limit @size-limit/preset-app
```

```json
// package.json
{
  "size-limit": [
    {
      "name": "Main bundle",
      "path": "dist/assets/index-*.js",
      "limit": "200 kB",
      "gzip": true
    },
    {
      "name": "CSS",
      "path": "dist/assets/index-*.css",
      "limit": "30 kB",
      "gzip": true
    },
    {
      "name": "Vendor chunk",
      "path": "dist/assets/vendor-*.js",
      "limit": "150 kB",
      "gzip": true
    }
  ],
  "scripts": {
    "size": "size-limit",
    "analyze": "size-limit --why"
  }
}
```

```yaml
# .github/workflows/size-check.yml
- name: Check bundle size
  run: |
    pnpm build
    npx size-limit
```

## Why It Matters

Without automated enforcement, performance degrades gradually — each PR adds a small library, each feature adds a few KB, and within months the app that loaded in 2 seconds now takes 5. Performance budgets make regressions visible at PR time rather than after user complaints. Catching 'this PR added 200KB to the bundle' in review is far cheaper than debugging a slow production site.

## Lighthouse CI

```bash
pnpm add -D @lhci/cli
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000", "http://localhost:3000/about"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.8 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  run: |
    pnpm build
    npx lhci autorun
```

```json
// budget.json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 250 },
      { "resourceType": "image", "budget": 500 },
      { "resourceType": "total", "budget": 1600 }
    ]
  }
]
```

## Webpack/Vite Build Budgets

```javascript
// vite.config.js

  build: {
    rollupOptions: {
      output: {
        // Warn when chunks are large
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    },
    chunkSizeWarningLimit: 500 // KB — build warns above this
  }
}
```

## Recommended Starting Thresholds

| Metric | Good | Needs Work |
|--------|------|------------|
| Main JS bundle (gzipped) | < 150 KB | > 300 KB |
| Total JS (gzipped) | < 400 KB | > 800 KB |
| Lighthouse Performance | > 80 | < 60 |
| Largest Contentful Paint | < 2.5s | > 4s |
| Total Blocking Time | < 200ms | > 600ms |
| Cumulative Layout Shift | < 0.1 | > 0.25 |

## Progressive Tightening

- Start with thresholds the current app can realistically meet.
- Promote stable warnings to blocking errors once the team fixes obvious regressions.
- Revisit budgets after major architectural changes so they remain intentional instead of inherited.

## Production RUM Completes the Loop

CI budgets catch regressions before merge, but field data catches regressions caused by real devices, third-party tags, route mixes, and backend variance after deployment. Pair CI budgets with production RUM and alert on regression against a known baseline:

| Signal | Suggested alert |
|--------|------------------|
| LCP p75 | Above 2.5s for 3 consecutive deploy windows |
| INP p75 | Above 200ms vs previous baseline |
| CLS p75 | Above 0.1 after release |
| Failed route budget | Endpoint error rate above baseline |

## Support Notes

- Tooling, browser-automation behavior, and CI environments can vary across platforms, so verify the intended workflow in the environments the team actually ships and tests against.
- Document any fallback when a browser-specific testing capability is unavailable in part of the supported matrix.

## Verification

### Automated Checks

- Open the CI run for a representative pull request and confirm bundle-size and Lighthouse assertions execute on every change.
- Verify the budgets fail the pipeline when a threshold is exceeded instead of only printing a warning.
- Store the chosen budgets in version control so changes are explicit and reviewable.

### Manual Checks

- Review thresholds quarterly so they tighten as the app improves rather than drifting upward.
- Review production dashboards after each release and confirm alerts fire on regressions, not only when someone notices a log line later.