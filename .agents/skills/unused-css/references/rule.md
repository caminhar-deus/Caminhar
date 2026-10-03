# Remove unused CSS rules

> Unused CSS is removed to reduce bundle size and improve performance.

**Priority:** high · **Difficulty:** intermediate · **Time:** 25 min

---
Removing unused CSS reduces bundle sizes, improves loading performance, and maintains cleaner codebases by eliminating dead code and unused selectors.

## Code Examples

### Performance Impact
```css
/* Example: Large CSS framework with unused styles */
/* Bootstrap CSS: ~160KB minified */
/* But project only uses: buttons, grid, utilities */
/* Unused code: ~120KB (75% unused) */

/* ❌ All of Bootstrap loaded */
@import 'bootstrap/dist/css/bootstrap.min.css';

/* ✅ Only needed components */
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';
@import 'bootstrap/scss/grid';
@import 'bootstrap/scss/buttons';
@import 'bootstrap/scss/utilities';
```

### Common Sources of Unused CSS
```css
/* 1. Legacy styles from removed features */
.old-feature-class {
  /* This component was removed 6 months ago */
  display: block;
  background: red;
}

/* 2. Development/testing styles */
.debug-border {
  border: 1px solid red !important;
}

.temp-style {
  /* TODO: Remove this after testing */
  background: yellow;
}

/* 3. Copy-pasted styles never used */
.copied-from-another-project {
  /* Copied but never actually used */
  position: absolute;
  top: 50%;
  left: 50%;
}

/* 4. Framework styles for unused components */
.modal-backdrop,
.carousel-indicators,
.breadcrumb {
  /* Bootstrap components never used in project */
}

/* 5. Media query styles for unsupported devices */
@media screen and (max-width: 320px) {
  /* Supporting very old devices */
  .legacy-mobile {
    font-size: 12px;
  }
}
```

## Why It Matters

Most projects use only 10-25% of their CSS—removing the rest can cut bundle sizes by 75%+ and dramatically improve load times.

## Manual Detection Methods

### Chrome DevTools Coverage
```javascript
// Open Chrome DevTools -> Sources -> Coverage
// 1. Click record button
// 2. Navigate through your application
// 3. Stop recording
// 4. View unused CSS highlighted in red

// You can also use the Coverage API programmatically
async function analyzeCSSCoverage() {
  const coverage = await page.coverage.startCSSCoverage()

  // Navigate through pages
  await page.goto('https://example.com')
  await page.click('#menu-button')
  await page.goto('https://example.com/about')

  const cssCoverage = await page.coverage.stopCSSCoverage()

  cssCoverage.forEach(entry => {
    const unusedBytes = entry.ranges
      .filter(range => !range.start && !range.end)
      .reduce((total, range) => total + range.end - range.start, 0)

    const percentageUsed = ((entry.text.length - unusedBytes) / entry.text.length) * 100

    console.log(`${entry.url}: ${percentageUsed.toFixed(2)}% used`)
  })
}
```

### Browser DevTools Audit
```html
<!-- Use DevTools Lighthouse audit -->
<!-- Performance section shows "Remove unused CSS" opportunities -->
<!-- Lists specific stylesheets and estimated savings -->
```

## Automated Tools

### PurgeCSS (Most Popular)
```bash
# Installation
npm install --save-dev @fullhuman/postcss-purgecss
npm install --save-dev purgecss

# CLI usage
npx purgecss --css styles.css --content index.html --output build/
```

#### PurgeCSS Configuration
```javascript
// purgecss.config.js
module.exports = {
  content: [
    './src/**/*.html',
    './src/**/*.js',
    './src/**/*.jsx',
    './src/**/*.ts',
    './src/**/*.tsx',
    './src/**/*.vue'
  ],
  css: ['./src/**/*.css', './src/**/*.scss'],
  defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
  safelist: [
    // Whitelist classes that should never be removed
    'btn',
    'active',
    'show',
    /^btn-/, // All classes starting with btn-
    {
      pattern: /^carousel-/,
      variants: ['sm', 'md', 'lg']
    }
  ],
  blocklist: [
    // Classes to always remove
    'unused-class',
    'old-style'
  ],
  keyframes: true, // Remove unused keyframes
  fontFace: true,  // Remove unused font-face rules
  variables: true  // Remove unused CSS custom properties
}
```

#### PostCSS Integration
```javascript
// postcss.config.js
const purgecss = require('@fullhuman/postcss-purgecss')

module.exports = {
  plugins: [
    require('autoprefixer'),
    ...(process.env.NODE_ENV === 'production' ? [
      purgecss({
        content: ['./src/**/*.html', './src/**/*.js'],
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
      })
    ] : [])
  ]
}
```

### UnCSS
```bash
# Installation
npm install --save-dev uncss

# CLI usage
uncss index.html > cleaned.css
uncss http://localhost:3000 > cleaned.css
```

#### UnCSS Configuration
```javascript
// uncss-config.js
const uncss = require('uncss')

const options = {
  html: ['index.html', 'about.html', 'contact.html'],
  css: ['css/bootstrap.css', 'css/main.css'],
  ignore: [
    // CSS selectors to ignore
    /\.js-/,           // Classes starting with js-
    /\.is-/,           // State classes
    /\.has-/,          // Modifier classes
    '.loaded',
    '.error',
    '.success'
  ],
  ignoreSheets: [/fonts.googleapis/], // Ignore external stylesheets
  timeout: 1000,      // Wait time for JS execution
  htmlroot: 'public', // Root directory for HTML files
  report: false       // Generate coverage report
}

uncss(options, (error, output) => {
  if (error) {
    throw error
  }
  console.log('Cleaned CSS length:', output.length)
  require('fs').writeFileSync('dist/cleaned.css', output)
})
```

### Critical CSS with Unused CSS Removal
```javascript
// critical-purge.js
const critical = require('critical')
const purgecss = require('purgecss')
const fs = require('fs')

async function optimizeCSS() {
  // Step 1: Extract critical CSS
  const criticalCSS = await critical.generate({
    base: 'dist/',
    src: 'index.html',
    width: 1300,
    height: 900,
    inline: false
  })

  // Step 2: Purge unused CSS from main stylesheet
  const purgedCSS = await purgecss.purge({
    content: ['dist/**/*.html', 'dist/**/*.js'],
    css: ['dist/styles.css']
  })

  // Step 3: Write optimized CSS files
  fs.writeFileSync('dist/critical.css', criticalCSS)
  fs.writeFileSync('dist/main.css', purgedCSS[0].css)

  console.log('CSS optimization complete')
}

optimizeCSS()
```

## Framework-Specific Implementation

### Webpack with PurgeCSS
```javascript
// webpack.config.js
const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin')
const glob = require('glob')

const PATHS = {
  src: path.join(__dirname, 'src')
}

module.exports = {
  mode: 'production',
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),

    new PurgeCSSPlugin({
      paths: glob.sync(`${PATHS.src}/**/*`, { nodir: true }),
      safelist: {
        standard: ['body', 'html', /^btn-/, /^modal/],
        deep: [/^dropdown/],
        greedy: [/^carousel-/]
      },
      defaultExtractor: (content) => {
        // Extract class names, IDs, and other CSS selectors
        const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || []
        const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || []
        return broadMatches.concat(innerMatches)
      }
    })
  ]
}
```

### Next.js Integration
```javascript
// next.config.js
const withPurgeCss = require('next-purgecss')

module.exports = withPurgeCss({
  purgeCssPaths: [
    'pages/**/*',
    'components/**/*'
  ],
  purgeCss: {
    whitelist: () => ['html', 'body'],
    whitelistPatterns: () => [/^__next/, /^btn-/, /^alert-/]
  }
})

// Alternative with PostCSS
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? {
      '@fullhuman/postcss-purgecss': {
        content: [
          './pages/**/*.{js,ts,jsx,tsx}',
          './components/**/*.{js,ts,jsx,tsx}'
        ],
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
      }
    } : {})
  }
}
```

### Vue.js with PurgeCSS
```javascript
// vue.config.js
const path = require('path')
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin')
const glob = require('glob')

module.exports = {
  configureWebpack: (config) => {
    if (process.env.NODE_ENV === 'production') {
      config.plugins.push(
        new PurgeCSSPlugin({
          paths: glob.sync([
            path.join(__dirname, './src/index.html'),
            path.join(__dirname, './src/**/*.vue'),
            path.join(__dirname, './src/**/*.js')
          ]),
          extractors: [
            {
              extractor: content => content.match(/[\w-/.:]+(?<!:)/g) || [],
              extensions: ['vue', 'js', 'html']
            }
          ],
          safelist: ['body', 'html', /^router-/, /^v-/]
        })
      )
    }
  }
}
```

### React with CSS Modules
```javascript
// webpack.config.js for CSS Modules
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin')
const glob = require('glob')

module.exports = {
  plugins: [
    new PurgeCSSPlugin({
      paths: glob.sync('./src/**/*', { nodir: true }),
      extractors: [
        {
          extractor: (content) => {
            // Extract CSS Modules class names
            const matches = content.match(/[\w-/:]+(?<!:)/g) || []
            // Also extract from import statements
            const importMatches = content.match(/import\s+.*\s+from\s+['"][^'"]*\.module\.css['"];?/g) || []
            return matches.concat(importMatches)
          },
          extensions: ['js', 'jsx', 'ts', 'tsx']
        }
      ],
      safelist: {
        // Preserve CSS Modules hashes
        standard: [/^_[\w-]+_\w+$/]
      }
    })
  ]
}
```

## Advanced Techniques

### Dynamic Content Handling
```javascript
// dynamic-purge.js
const purgecss = require('purgecss')
const puppeteer = require('puppeteer')

class DynamicPurgeCSS {
  constructor(options = {}) {
    this.browser = null
    this.pages = options.pages || []
    this.interactions = options.interactions || []
  }

  async init() {
    this.browser = await puppeteer.launch()
  }

  async extractUsedClasses() {
    const usedClasses = new Set()

    for (const pageUrl of this.pages) {
      const page = await this.browser.newPage()

      // Track CSS usage
      await page.coverage.startCSSCoverage()

      await page.goto(pageUrl)

      // Perform interactions to trigger dynamic styles
      for (const interaction of this.interactions) {
        await this.performInteraction(page, interaction)
        await page.waitForTimeout(500) // Wait for animations
      }

      const coverage = await page.coverage.stopCSSCoverage()

      // Extract used selectors from coverage
      coverage.forEach(entry => {
        entry.ranges.forEach(range => {
          if (range.count > 0) {
            const usedCSS = entry.text.slice(range.start, range.end)
            const selectors = this.extractSelectorsFromCSS(usedCSS)
            selectors.forEach(selector => usedClasses.add(selector))
          }
        })
      })

      await page.close()
    }

    return Array.from(usedClasses)
  }

  async performInteraction(page, interaction) {
    switch (interaction.type) {
      case 'click':
        await page.click(interaction.selector)
        break
      case 'hover':
        await page.hover(interaction.selector)
        break
      case 'scroll':
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        break
      case 'resize':
        await page.setViewport({ width: interaction.width, height: interaction.height })
        break
    }
  }

  extractSelectorsFromCSS(css) {
    // Simple regex to extract class names and IDs
    const classMatches = css.match(/\.[\w-]+/g) || []
    const idMatches = css.match(/#[\w-]+/g) || []
    return [...classMatches, ...idMatches]
  }

  async purgeWithDynamicAnalysis(cssFiles) {
    const usedClasses = await this.extractUsedClasses()

    const result = await purgecss.purge({
      content: [{
        raw: usedClasses.join(' '),
        extension: 'html'
      }],
      css: cssFiles,
      safelist: usedClasses
    })

    await this.browser.close()
    return result
  }
}

// Usage
const dynamicPurge = new DynamicPurgeCSS({
  pages: [
    'http://localhost:3000',
    'http://localhost:3000/about',
    'http://localhost:3000/contact'
  ],
  interactions: [
    { type: 'click', selector: '.menu-toggle' },
    { type: 'hover', selector: '.dropdown-trigger' },
    { type: 'scroll' },
    { type: 'resize', width: 768, height: 1024 }
  ]
})

dynamicPurge.init().then(() => {
  return dynamicPurge.purgeWithDynamicAnalysis(['dist/styles.css'])
}).then(result => {
  console.log('Purged CSS:', result[0].css.length)
})
```

### Component-Based Purging
```javascript
// component-purge.js
const fs = require('fs')
const path = require('path')
const purgecss = require('purgecss')

class ComponentBasedPurge {
  constructor(componentsDir, stylesDir) {
    this.componentsDir = componentsDir
    this.stylesDir = stylesDir
  }

  analyzeComponentUsage() {
    const components = this.scanComponents()
    const usageMap = new Map()

    components.forEach(component => {
      const dependencies = this.extractDependencies(component)
      const styles = this.extractStyles(component)

      usageMap.set(component.name, {
        file: component.file,
        dependencies,
        styles,
        used: false
      })
    })

    // Mark used components
    this.markUsedComponents(usageMap, 'App') // Start from App component

    return usageMap
  }

  scanComponents() {
    const components = []
    const componentFiles = fs.readdirSync(this.componentsDir)

    componentFiles.forEach(file => {
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(path.join(this.componentsDir, file), 'utf8')
        components.push({
          name: path.basename(file, path.extname(file)),
          file,
          content
        })
      }
    })

    return components
  }

  extractDependencies(component) {
    // Extract component imports
    const importRegex = /import\s+(\w+)\s+from\s+['"][^'"]*['"]/g
    const dependencies = []
    let match

    while ((match = importRegex.exec(component.content)) !== null) {
      dependencies.push(match[1])
    }

    return dependencies
  }

  extractStyles(component) {
    // Extract CSS classes used in component
    const classRegex = /className=['"]([^'"]*)['"]/g
    const styles = new Set()
    let match

    while ((match = classRegex.exec(component.content)) !== null) {
      match[1].split(' ').forEach(className => {
        if (className.trim()) {
          styles.add(className.trim())
        }
      })
    }

    return Array.from(styles)
  }

  markUsedComponents(usageMap, componentName) {
    const component = usageMap.get(componentName)
    if (!component || component.used) return

    component.used = true

    // Recursively mark dependencies as used
    component.dependencies.forEach(dep => {
      this.markUsedComponents(usageMap, dep)
    })
  }

  async generateOptimizedCSS() {
    const usageMap = this.analyzeComponentUsage()
    const usedClasses = new Set()

    // Collect all classes from used components
    for (const [name, component] of usageMap) {
      if (component.used) {
        component.styles.forEach(style => usedClasses.add(style))
      }
    }

    // Purge CSS based on used classes
    const result = await purgecss.purge({
      content: [{
        raw: Array.from(usedClasses).join(' '),
        extension: 'html'
      }],
      css: [path.join(this.stylesDir, 'main.css')],
      safelist: Array.from(usedClasses)
    })

    return result[0].css
  }
}

// Usage
const componentPurge = new ComponentBasedPurge('./src/components', './src/styles')
componentPurge.generateOptimizedCSS().then(optimizedCSS => {
  fs.writeFileSync('./dist/optimized.css', optimizedCSS)
  console.log('Component-based purging complete')
})
```

## Build Pipeline Integration

### GitHub Actions CSS Optimization
```yaml
# .github/workflows/css-optimization.yml
name: CSS Optimization

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  optimize-css:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build project
      run: npm run build

    - name: Analyze CSS usage
      run: |
        npm install -g purgecss
        purgecss --css dist/**/*.css --content dist/**/*.html --output analysis/

        # Generate report
        echo "CSS_SIZE_BEFORE=$(du -sh dist/css/ | cut -f1)" >> $GITHUB_ENV
        echo "CSS_SIZE_AFTER=$(du -sh analysis/ | cut -f1)" >> $GITHUB_ENV

    - name: Comment PR with results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `## CSS Optimization Results

            📦 **CSS Size Before:** ${process.env.CSS_SIZE_BEFORE}
            ✨ **CSS Size After:** ${process.env.CSS_SIZE_AFTER}

            Run \`npm run css:optimize\` to apply optimizations.`
          })
```

### Performance Monitoring
```javascript
// css-performance-monitor.js
const fs = require('fs')
const gzipSize = require('gzip-size')

class CSSPerformanceMonitor {
  constructor() {
    this.metrics = {
      before: {},
      after: {},
      savings: {}
    }
  }

  async analyzeCSSFile(filePath, label = 'css') {
    const content = fs.readFileSync(filePath, 'utf8')
    const size = Buffer.byteLength(content, 'utf8')
    const gzipped = await gzipSize(content)

    return {
      path: filePath,
      size,
      gzipped,
      sizeFormatted: this.formatBytes(size),
      gzippedFormatted: this.formatBytes(gzipped)
    }
  }

  async compareOptimization(beforePath, afterPath) {
    const before = await this.analyzeCSSFile(beforePath, 'before')
    const after = await this.analyzeCSSFile(afterPath, 'after')

    const sizeSavings = before.size - after.size
    const gzipSavings = before.gzipped - after.gzipped
    const percentSaved = Math.round((sizeSavings / before.size) * 100)
    const gzipPercentSaved = Math.round((gzipSavings / before.gzipped) * 100)

    return {
      before,
      after,
      savings: {
        size: sizeSavings,
        gzipped: gzipSavings,
        percent: percentSaved,
        gzipPercent: gzipPercentSaved,
        sizeFormatted: this.formatBytes(sizeSavings),
        gzippedFormatted: this.formatBytes(gzipSavings)
      }
    }
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  generateReport(comparison) {
    console.log('\n=== CSS Optimization Report ===')
    console.log(`Before: ${comparison.before.sizeFormatted} (${comparison.before.gzippedFormatted} gzipped)`)
    console.log(`After:  ${comparison.after.sizeFormatted} (${comparison.after.gzippedFormatted} gzipped)`)
    console.log(`Savings: ${comparison.savings.sizeFormatted} (${comparison.savings.percent}%)`)
    console.log(`Gzipped Savings: ${comparison.savings.gzippedFormatted} (${comparison.savings.gzipPercent}%)`)
  }
}

// Usage
const monitor = new CSSPerformanceMonitor()
monitor.compareOptimization('dist/styles.css', 'dist/styles.purged.css').then(report => {
  monitor.generateReport(report)
})
```

## Best Practices

1. **Automate in Build**: Integrate unused CSS removal in production builds
2. **Safelist Critical Classes**: Protect important utility and state classes
3. **Test Thoroughly**: Verify all functionality after CSS purging
4. **Monitor Performance**: Track bundle size reductions over time
5. **Component-Based**: Use component analysis for accurate purging
6. **Dynamic Content**: Account for JavaScript-generated content
7. **Framework Awareness**: Use framework-specific extraction patterns
8. **Regular Auditing**: Periodically review and clean CSS files
9. **Team Education**: Train developers on CSS optimization practices
10. **Gradual Implementation**: Start with conservative purging and refine

## Common Pitfalls and Solutions

### Dynamic Class Names
```javascript
// ❌ Problem: Dynamic classes not detected
const buttonType = 'primary'
const className = `btn-${buttonType}` // PurgeCSS might miss this

// ✅ Solution: Safelist pattern
// purgecss.config.js
{
  safelist: [
    /^btn-/, // Safelist all button variants
  ]
}

// ✅ Alternative: Explicit class names
const getButtonClass = (type) => {
  // Explicit class names for PurgeCSS to detect
  const classes = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger'
  }
  return classes[type] || 'btn-primary'
}
```

### Third-Party Components
```javascript
// ❌ Problem: Third-party component styles removed

// ✅ Solution: Exclude from purging
{
  content: ['./src/**/*.js'],
  css: ['./src/**/*.css'],
  rejected: ['./node_modules/react-datepicker/dist/react-datepicker.css']
}

// ✅ Alternative: Safelist vendor classes
{
  safelist: [
    /^react-datepicker/,
    /^rdp-/ // React date picker classes
  ]
}
```

### Conditional Styling
```css
/* ❌ Problem: Conditional styles might be removed */
.dark-mode .button {
  background: #333;
}

.is-mobile .nav {
  display: none;
}
```

```javascript
// ✅ Solution: Include conditional HTML in content
{
  content: [
    './src/**/*.js',
    {
      raw: '<div class="dark-mode"><div class="is-mobile">',
      extension: 'html'
    }
  ]
}
```

Remember to always test your application thoroughly after implementing unused CSS removal to ensure no critical styles are accidentally removed.

## Verification

### Automated Checks

- Confirm the computed styles match the intended fix in DevTools.
- If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.

### Manual Checks

- Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
- Test at least one mobile and one desktop viewport before shipping.