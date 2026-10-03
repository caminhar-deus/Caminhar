# Keep page weight under 1500KB

> Total page weight including all resources is under 1500KB (ideally under 500KB).

**Priority:** high · **Difficulty:** beginner · **Time:** 20 min

---
Page weight is the total size of all resources needed to render a page.

## Code Examples

```typescript
// next.config.js - automatic image optimization
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  }
}
```

```tsx
// Component with optimized images

function ProductCard({ image, name }: { image: string; name: string }) {
  return (
    
  )
}
```

## Why It Matters

Page weight directly correlates with load time—a 1.5MB page takes 3-5 seconds on 4G mobile. Every 100KB reduction improves user experience, especially on slower networks.

## Weight Benchmarks

| Category | Target | Acceptable | Poor |
|----------|--------|------------|------|
| Total page | < 500KB | < 1500KB | > 1500KB |
| HTML | < 50KB | < 100KB | > 100KB |
| CSS | < 50KB | < 100KB | > 100KB |
| JavaScript | < 200KB | < 400KB | > 400KB |
| Images | < 200KB | < 500KB | > 500KB |
| Fonts | < 100KB | < 200KB | > 200KB |

## Typical Page Weight Breakdown

| Resource Type | Average % | Optimization Priority |
|---------------|-----------|----------------------|
| Images | 50-70% | High |
| JavaScript | 15-25% | High |
| CSS | 5-10% | Medium |
| Fonts | 5-10% | Medium |
| HTML | 2-5% | Low |

## JavaScript Bundle Optimization

```javascript
// vite.config.js

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code
          vendor: ['react', 'react-dom'],
          // Split by feature
          charts: ['recharts', 'd3'],
        }
      }
    },
    // Warn if chunk exceeds size
    chunkSizeWarningLimit: 200
  }
}
```

```tsx
// Dynamic imports for code splitting

const HeavyChart = lazy(() => import('./HeavyChart'))
const AdminPanel = lazy(() => import('./AdminPanel'))

function Dashboard() {
  return (
    }>
      {showChart && }
      {isAdmin && }
    
  )
}
```

## CSS Optimization

```css
/* Remove unused CSS with PurgeCSS */
/* After: Only critical styles remain */

/* Use CSS custom properties to reduce repetition */
:root {
  --color-primary: #3b82f6;
  --spacing-md: 1rem;
}

/* Avoid large frameworks entirely if possible */
/* Tailwind CSS with purging typically produces < 10KB */
```

## Font Optimization

```css
/* Subset fonts to only needed characters */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom-latin.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+0000-007F, U+0080-00FF; /* Latin only */
}

/* Or use system fonts */
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

## Performance Budget in CI/CD

```javascript
// lighthouse.config.js
module.exports = {
  extends: 'lighthouse:default',
  settings: {
    budgets: [
      {
        resourceSizes: [
          { resourceType: 'total', budget: 500 },
          { resourceType: 'script', budget: 200 },
          { resourceType: 'image', budget: 200 },
          { resourceType: 'stylesheet', budget: 50 },
          { resourceType: 'font', budget: 100 },
        ]
      }
    ]
  }
}
```

```yaml
# GitHub Actions performance check
- name: Run Lighthouse
  uses: treosh/lighthouse-ci-action@v10
  with:
    budgetPath: ./lighthouse-budget.json
    uploadArtifacts: true
```

## Measuring Page Weight

```javascript
// Check total page weight
function measurePageWeight() {
  const resources = performance.getEntriesByType('resource')
  const navigation = performance.getEntriesByType('navigation')[0]

  const breakdown = {
    html: navigation?.transferSize || 0,
    css: 0,
    js: 0,
    images: 0,
    fonts: 0,
    other: 0
  }

  resources.forEach(r => {
    const size = r.transferSize || 0
    if (r.initiatorType === 'css' || r.name.includes('.css')) {
      breakdown.css += size
    } else if (r.initiatorType === 'script' || r.name.includes('.js')) {
      breakdown.js += size
    } else if (r.initiatorType === 'img' || /\.(jpg|png|webp|avif|gif|svg)/.test(r.name)) {
      breakdown.images += size
    } else if (/\.(woff2?|ttf|otf|eot)/.test(r.name)) {
      breakdown.fonts += size
    } else {
      breakdown.other += size
    }
  })

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)

  console.table({
    ...Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, `${(v / 1024).toFixed(1)} KB`])
    ),
    total: `${(total / 1024).toFixed(1)} KB`
  })

  return { total, breakdown }
}
```

## Verification

### Automated Checks

- Check Network tab—sort by Size column
- Run Lighthouse performance audit
- Use WebPageTest for detailed breakdown
- Set up performance budgets in CI

### Manual Checks

- Monitor with Real User Monitoring (RUM)