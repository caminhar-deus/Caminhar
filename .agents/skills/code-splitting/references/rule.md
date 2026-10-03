# Split large JavaScript bundles

> Use dynamic imports and route-based code splitting to break large bundles into smaller chunks that load on demand, reducing initial page load time.

**Priority:** high · **Difficulty:** intermediate · **Time:** 25 min

---
Code splitting uses [`import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) and route boundaries to divide your JavaScript application into separate chunks that load on demand rather than all at once.
## Code Example

```javascript
// ❌ Static import loads everything upfront

// ✅ Dynamic import loads only when needed
async function handleExportClick() {
  const { generatePDF } = await import('./pdf-generator.js')
  generatePDF(document)
}
```

## Why It Matters

A 500 KB JavaScript bundle blocks page interactivity for 3–5 seconds on a mid-range mobile device even after the bytes arrive — JS must be parsed and compiled before execution. The [web.dev dynamic imports guide](https://web.dev/articles/code-splitting-with-dynamic-imports-in-nextjs) focuses on this exact win: users only download and parse the code they actually need for the current page.

## Route-Based Splitting (React)

```javascript

// Each route is its own chunk — users download code for the page they visit
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))
const Reports = lazy(() => import('./pages/Reports'))

function App() {
  return (
    }>
      
        } />
        } />
        } />
      
    
  )
}
```

## Lazy-Loading Heavy Components

```javascript
// Rich text editors, chart libraries, map components
const RichEditor = lazy(() => import('./RichEditor'))
const ChartPanel = lazy(() => import('./ChartPanel'))

function PostEditor({ showChart }) {
  return (
    <div>
      }>
        
      
      {showChart && (
        }>
          
        
      )}
    </div>
  )
}
```

## Conditional Feature Loading

```javascript
// Load analytics only in production
if (process.env.NODE_ENV === 'production') {
  import('./analytics.js').then(({ init }) => init())
}

// Load a polyfill only when needed
async function setupApp() {
  if (!window.ResizeObserver) {
    await import('resize-observer-polyfill')
  }
  initApp()
}
```

## Preloading for Anticipated Navigation

```javascript
// Preload the next likely page without executing it yet
function prefetchSettingsPage() {
  import(/* webpackPrefetch: true */ './pages/Settings')
}

// Trigger on hover — user is likely about to click
settingsLink.addEventListener('mouseenter', prefetchSettingsPage)
```

## Analyzing Your Bundle

A first pass with [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) or [Bundlephobia](https://bundlephobia.com) usually shows which dependency or route should move behind `import()`.

```bash
# With Vite
pnpm exec vite-bundle-visualizer

# With webpack
pnpm exec webpack-bundle-analyzer stats.json

# With source-map-explorer
pnpm exec source-map-explorer 'build/static/js/*.js'
```

## Verification

### Automated Checks

- Compare the before/after output from your bundle visualizer and confirm the initial chunk shrinks meaningfully; [`import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) should move real code out of the initial graph rather than only reshuffle file names.
- Test the loading state or suspense fallback so deferred features still feel intentional to users.
- Re-run Lighthouse or your performance budget check to confirm the split improves initial JS cost instead of only moving bytes around.
- If your project uses a JS budget, keep the initial bundle within that threshold rather than only moving bytes into slightly later chunks; a common starting point is `<= 150 KB` gzipped for the main route bundle.

### Manual Checks

- Verify the lazy-loaded code is not downloaded on first load unless the current route or interaction needs it.