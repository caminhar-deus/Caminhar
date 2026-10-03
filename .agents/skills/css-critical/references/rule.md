# Inline critical CSS for faster rendering

> Critical CSS (above-the-fold content) is inlined in the head for faster initial render.

**Priority:** high · **Difficulty:** advanced · **Time:** 30 min

---
Critical CSS contains the minimum styles needed to render above-the-fold content, improving page load performance by reducing render-blocking resources.

## Code Example

```html
<head>
    <!-- Critical CSS inlined in the head -->
    <style>
        /* Critical styles for above-the-fold content */
        body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            line-height: 1.6;
        }

        .header {
            background: #333;
            color: white;
            padding: 1rem;
            position: sticky;
            top: 0;
        }

        .hero {
            min-height: 50vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
        }

        .hero h1 {
            font-size: 2.5rem;
            margin: 0 0 1rem 0;
        }

        .cta-button {
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: 5px;
            font-size: 1.1rem;
            cursor: pointer;
        }
    </style>

    <!-- Non-critical CSS loaded asynchronously -->
    <link rel="preload" href="/styles/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="/styles/main.css"></noscript>
</head>
```

## Why It Matters

Critical CSS eliminates render-blocking resources, enabling browsers to paint content immediately—directly improving LCP and FCP scores.

## Framework Implementations

### Next.js Critical CSS
```jsx
// pages/_document.js

class MyDocument extends Document {
  render() {
    return (
      
        
          {/* Critical CSS for above-the-fold content */}
          <style dangerouslySetInnerHTML={{
            __html: `
              body {
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                margin: 0;
                line-height: 1.6;
              }
              .header {
                background: #333;
                color: white;
                padding: 1rem;
                position: sticky;
                top: 0;
              }
              .hero {
                min-height: 50vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .loading {
                display: flex;
                justify-content: center;
                padding: 2rem;
              }
            `
          }} />
        
        <body>
          
          
        </body>
      
    )
  }
}

```

### Next.js with CSS-in-JS Critical Path
```jsx
// components/CriticalStyles.js

  
)

// pages/_app.js

function MyApp({ Component, pageProps }) {
  return (
    <>
      
      
    </>
  )
}

```

### React with Critical CSS Hook
```jsx

function useCriticalCSS() {
  const [criticalLoaded, setCriticalLoaded] = useState(false)

  useEffect(() => {
    // Inject critical CSS
    const criticalStyles = `
      body {
        font-family: system-ui, sans-serif;
        margin: 0;
        line-height: 1.6;
      }
      .app-header {
        background: #000;
        color: #fff;
        padding: 1rem;
      }
      .hero {
        min-height: 50vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .loading {
        text-align: center;
        padding: 2rem;
      }
    `

    const styleElement = document.createElement('style')
    styleElement.textContent = criticalStyles
    document.head.appendChild(styleElement)

    setCriticalLoaded(true)

    // Load non-critical CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/styles/non-critical.css'
    document.head.appendChild(link)

    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])

  return criticalLoaded
}

function App() {
  const criticalLoaded = useCriticalCSS()

  if (!criticalLoaded) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>My App</h1>
      </header>
      <main className="hero">
        <div>
          <h2>Welcome to our app</h2>
          <button>Get Started</button>
        </div>
      </main>
    </div>
  )
}
```

### Vue.js Critical CSS Strategy
```vue
<!-- App.vue -->
<template>
  <div id="app">
    
    <router-view />
    
  </div>
</template>

<script>

  name: 'App',
  mounted() {
    // Load non-critical CSS after mount
    this.loadNonCriticalCSS()
  },
  methods: {
    loadNonCriticalCSS() {
      const nonCriticalFiles = [
        '/css/components.css',
        '/css/animations.css',
        '/css/responsive-extended.css'
      ]

      nonCriticalFiles.forEach(href => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        link.onload = () => console.log(`Loaded: ${href}`)
        document.head.appendChild(link)
      })
    }
  }
}
</script>

<style>
/* Critical CSS embedded in component */
#app {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
}

/* Critical layout styles */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Above-the-fold header */
.app-header {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 1000;
}

/* Hero section that's immediately visible */
.hero-section {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: #f8f9fa;
}

/* Critical interactive elements */
.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #0056b3;
  transform: translateY(-2px);
}

/* Loading states */
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}
</style>
```

## Build Tool Integration

### Webpack Critical CSS Plugin
```javascript
// webpack.config.js
const HtmlCriticalWebpackPlugin = require('html-critical-webpack-plugin')

module.exports = {
  plugins: [
    new HtmlCriticalWebpackPlugin({
      base: path.resolve(__dirname, 'dist'),
      src: 'index.html',
      dest: 'index.html',
      inline: true,
      minify: true,
      extract: true,
      width: 1200,
      height: 800,
      penthouse: {
        blockJSRequests: false,
      }
    })
  ]
}
```

### Vite Critical CSS
```javascript
// vite.config.js

  plugins: [
    ViteEjsPlugin({
      criticalCSS: `
        body { font-family: system-ui, sans-serif; margin: 0; }
        .header { background: #333; color: white; padding: 1rem; }
        .hero { min-height: 50vh; display: flex; align-items: center; }
      `
    })
  ],
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          critical: ['./src/styles/critical.css'],
          vendor: ['./src/styles/vendor.css'],
          components: ['./src/styles/components.css']
        }
      }
    }
  }
})
```

### PostCSS Critical CSS
```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('@fullhuman/postcss-purgecss')({
      content: ['./src/**/*.html', './src/**/*.js'],
      safelist: ['critical-*', 'above-fold-*']
    }),
    require('cssnano')({
      preset: 'default'
    })
  ]
}
```

## Automated Critical CSS Generation

### Critical CSS with Puppeteer
```javascript
// generate-critical.js
const puppeteer = require('puppeteer')
const critical = require('critical')
const fs = require('fs').promises

async function generateCriticalCSS() {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  // Set viewport to common desktop size
  await page.setViewport({ width: 1200, height: 800 })

  // Navigate to your page
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' })

  // Generate critical CSS
  const criticalCSS = await critical.generate({
    inline: false,
    base: 'dist/',
    src: 'index.html',
    width: 1200,
    height: 800,
    minify: true
  })

  // Save critical CSS
  await fs.writeFile('src/styles/critical.css', criticalCSS.css)

  await browser.close()
  console.log('Critical CSS generated successfully!')
}

generateCriticalCSS()
```

### GitHub Actions Critical CSS Workflow
```yaml
# .github/workflows/critical-css.yml
name: Generate Critical CSS

on:
  push:
    branches: [main]
    paths: ['src/styles/**', 'src/components/**']

jobs:
  generate-critical:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build

    - name: Start server
      run: npm start &

    - name: Wait for server
      run: sleep 10

    - name: Generate critical CSS
      run: npm run generate:critical

    - name: Commit critical CSS
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add src/styles/critical.css
        git commit -m "Update critical CSS" || exit 0
        git push
```

## Performance Monitoring

### Core Web Vitals Tracking
```javascript
// Track critical CSS impact on performance
function measureCriticalCSSPerformance() {
  // Monitor First Contentful Paint
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        console.log('FCP:', entry.startTime)

        // Send to analytics
        gtag('event', 'timing_complete', {
          name: 'critical_css_fcp',
          value: Math.round(entry.startTime)
        })
      }
    }
  }).observe({ type: 'paint', buffered: true })

  // Monitor Largest Contentful Paint
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries()
    const lastEntry = entries[entries.length - 1]

    console.log('LCP:', lastEntry.startTime)

    gtag('event', 'timing_complete', {
      name: 'critical_css_lcp',
      value: Math.round(lastEntry.startTime)
    })
  }).observe({ type: 'largest-contentful-paint', buffered: true })
}

// Initialize monitoring
measureCriticalCSSPerformance()
```

### A/B Testing Critical CSS
```javascript
// Test different critical CSS strategies
function initializeCriticalCSSTest() {
  const testGroup = Math.random() < 0.5 ? 'minimal' : 'extended'

  if (testGroup === 'minimal') {
    // Load minimal critical CSS
    loadCriticalCSS('/styles/critical-minimal.css')
  } else {
    // Load extended critical CSS
    loadCriticalCSS('/styles/critical-extended.css')
  }

  // Track the test group
  gtag('config', 'GA_MEASUREMENT_ID', {
    custom_map: { custom_dimension_1: 'critical_css_test' }
  })

  gtag('event', 'experiment_impression', {
    custom_dimension_1: testGroup
  })
}

function loadCriticalCSS(href) {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.onload = () => {
    document.documentElement.classList.add('critical-css-loaded')
  }
  document.head.appendChild(link)
}
```

## Tools and Resources

- **Critical**: npm package by Addy Osmani for generating critical CSS
- **Penthouse**: Critical path CSS generator
- **UnCSS**: Remove unused CSS from your stylesheets
- **PurgeCSS**: Remove unused CSS for smaller bundles
- **Lighthouse**: Audit critical CSS implementation
- **WebPageTest**: Measure critical CSS impact on performance

## Best Practices

1. **Keep it minimal**: Only include styles for above-the-fold content
2. **Inline critical CSS**: Embed in `<style>` tags to avoid extra HTTP requests
3. **Load non-critical asynchronously**: Use `rel="preload"` with `onload` handler
4. **Minify critical CSS**: Remove comments, whitespace, and unused properties
5. **Test on real devices**: Verify critical CSS works across different screen sizes
6. **Monitor performance**: Track Core Web Vitals to measure improvements
7. **Update regularly**: Regenerate critical CSS when designs change
8. **Use build tools**: Automate critical CSS generation in your build process

## Verification

### Automated Checks

- Confirm the computed styles match the intended fix in DevTools.
- If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.

### Manual Checks

- Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
- Test at least one mobile and one desktop viewport before shipping.