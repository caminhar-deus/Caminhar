# Minify all CSS files

> All CSS files are minified to reduce file size and improve page load performance.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
CSS minification removes unnecessary characters like whitespace, comments, and redundant code to reduce file sizes and improve loading performance.

## Code Examples

### Unminified CSS (Development)
```css
/* Main navigation styles */
.navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #ffffff;
    padding: 1rem 2rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.navigation ul {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 2rem;
}

.navigation li a {
    color: #333333;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.3s ease;
}

.navigation li a:hover {
    color: #007bff;
}

/* Responsive design */
@media (max-width: 768px) {
    .navigation {
        flex-direction: column;
        padding: 1rem;
    }

    .navigation ul {
        margin-top: 1rem;
    }
}
```

### Minified CSS (Production)
```css
.navigation{display:flex;justify-content:space-between;align-items:center;background-color:#fff;padding:1rem 2rem;box-shadow:0 2px 4px rgba(0,0,0,.1)}.navigation ul{display:flex;list-style:none;margin:0;padding:0;gap:2rem}.navigation li a{color:#333;text-decoration:none;font-weight:500;transition:color .3s ease}.navigation li a:hover{color:#007bff}@media (max-width:768px){.navigation{flex-direction:column;padding:1rem}.navigation ul{margin-top:1rem}}
```

**Size Reduction**: ~65% smaller (from ~600 bytes to ~215 bytes)

## Why It Matters

Unminified CSS wastes bandwidth with whitespace, comments, and verbose syntax—minification delivers the same styles in significantly fewer bytes.

## Build Tool Integration

### Webpack with CSS Minification
```javascript
// webpack.config.js
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

module.exports = {
  mode: 'production',

  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ]
      }
    ]
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].[contenthash].css'
    })
  ],

  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
              colormin: true,
              convertValues: true,
              discardDuplicates: true
            }
          ]
        }
      })
    ]
  }
}
```

### Vite CSS Minification
```javascript
// vite.config.js

  build: {
    cssMinify: 'lightningcss', // or 'esbuild'

    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        }
      }
    }
  },

  css: {
    postcss: {
      plugins: [
        require('autoprefixer'),
        require('cssnano')({
          preset: 'default'
        })
      ]
    }
  }
})
```

### PostCSS with cssnano
```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('autoprefixer'),
    ...(process.env.NODE_ENV === 'production' ? [
      require('cssnano')({
        preset: [
          'advanced',
          {
            discardComments: {
              removeAll: true
            },
            normalizeWhitespace: true,
            colormin: true,
            convertValues: true,
            discardDuplicates: true,
            discardEmpty: true,
            mergeRules: true,
            minifySelectors: true,
            reduceInitial: true,
            reduceTransforms: true
          }
        ]
      })
    ] : [])
  ]
}
```

## Framework Examples

### Next.js Automatic Minification
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js automatically minifies CSS in production
  experimental: {
    optimizeCss: true, // Enhanced CSS optimization
  },

  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Additional CSS optimization for production
      config.optimization.splitChunks.cacheGroups.styles = {
        name: 'styles',
        test: /\.(css|scss|sass)$/,
        chunks: 'all',
        enforce: true
      }
    }

    return config
  }
}

module.exports = nextConfig
```

### Create React App Minification
```javascript
// craco.config.js (for customizing CRA)
const CracoLessPlugin = require('craco-less')

module.exports = {
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            modifyVars: {
              '@primary-color': '#1DA57A',
            },
            javascriptEnabled: true,
          }
        },

        miniCssExtractPluginOptions: {
          ignoreOrder: true,
        },

        postcssLoaderOptions: {
          postcssOptions: {
            plugins: [
              require('autoprefixer'),
              ...(process.env.NODE_ENV === 'production' ? [
                require('cssnano')({
                  preset: 'default'
                })
              ] : [])
            ]
          }
        }
      }
    }
  ]
}
```

### Vue.js CSS Minification
```javascript
// vue.config.js
module.exports = {
  css: {
    extract: process.env.NODE_ENV === 'production' ? {
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[name].[contenthash:8].css'
    } : false,

    sourceMap: process.env.NODE_ENV !== 'production'
  },

  configureWebpack: config => {
    if (process.env.NODE_ENV === 'production') {
      // CSS optimization for production
      config.optimization.splitChunks.cacheGroups.styles = {
        name: 'styles',
        test: /\.(css|vue)$/,
        chunks: 'all',
        enforce: true
      }
    }
  },

  chainWebpack: config => {
    if (process.env.NODE_ENV === 'production') {
      config.plugin('extract-css')
        .use(require('mini-css-extract-plugin'), [{
          filename: 'css/[name].[contenthash:8].css',
          chunkFilename: 'css/[name].[contenthash:8].css'
        }])
    }
  }
}
```

## CSS-in-JS Minification

### Styled Components with Minification
```jsx

// The styled-components babel plugin automatically minifies in production
const Navigation = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  ul {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 2rem;
  }

  li a {
    color: #333;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.3s ease;

    &:hover {
      color: #007bff;
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    padding: 1rem;

    ul {
      margin-top: 1rem;
    }
  }
`

// babel-plugin-styled-components config in .babelrc
{
  "plugins": [
    ["babel-plugin-styled-components", {
      "minify": true,
      "displayName": false,
      "fileName": false
    }]
  ]
}
```

### Emotion with Production Optimization
```jsx

// Emotion automatically optimizes in production
const navigationStyles = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`

const NavigationList = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 2rem;
`

// webpack.config.js for Emotion optimization
module.exports = {
  mode: 'production',
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ]
}
```

## Manual Minification Tools

### Command Line Tools
```bash
# Using cssnano CLI
npm install -g cssnano-cli
cssnano src/styles.css dist/styles.min.css

# Using clean-css CLI
npm install -g clean-css-cli
cleancss -o dist/styles.min.css src/styles.css

# Using PostCSS CLI with cssnano
npm install -g postcss-cli cssnano
postcss src/styles.css --use cssnano --output dist/styles.min.css

# Batch processing multiple files
find src/css -name "*.css" -exec cleancss {} \; > dist/bundle.min.css
```

### Node.js Scripts
```javascript
// scripts/minify-css.js
const fs = require('fs')
const path = require('path')
const postcss = require('postcss')
const cssnano = require('cssnano')

async function minifyCSS(inputPath, outputPath) {
  try {
    const css = fs.readFileSync(inputPath, 'utf8')

    const result = await postcss([
      cssnano({
        preset: [
          'advanced',
          {
            discardComments: { removeAll: true },
            normalizeWhitespace: true,
            colormin: true,
            convertValues: true,
            discardDuplicates: true,
            mergeRules: true,
            minifySelectors: true
          }
        ]
      })
    ]).process(css, { from: inputPath, to: outputPath })

    fs.writeFileSync(outputPath, result.css)

    const originalSize = Buffer.byteLength(css, 'utf8')
    const minifiedSize = Buffer.byteLength(result.css, 'utf8')
    const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1)

    console.log(`✅ ${inputPath} → ${outputPath}`)
    console.log(`   ${originalSize} bytes → ${minifiedSize} bytes (${savings}% smaller)`)

  } catch (error) {
    console.error(`❌ Error minifying ${inputPath}:`, error)
  }
}

// Process all CSS files in src directory
async function minifyAllCSS() {
  const srcDir = 'src/css'
  const distDir = 'dist/css'

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true })
  }

  const cssFiles = fs.readdirSync(srcDir)
    .filter(file => file.endsWith('.css'))

  for (const file of cssFiles) {
    const inputPath = path.join(srcDir, file)
    const outputPath = path.join(distDir, file.replace('.css', '.min.css'))
    await minifyCSS(inputPath, outputPath)
  }
}

minifyAllCSS()
```

## Advanced Optimization Techniques

### Critical CSS Extraction and Minification
```javascript
// scripts/optimize-critical-css.js
const critical = require('critical')
const postcss = require('postcss')
const cssnano = require('cssnano')

async function optimizeCriticalCSS() {
  // Extract critical CSS
  const { css } = await critical.generate({
    inline: false,
    base: 'dist/',
    src: 'index.html',
    width: 1200,
    height: 800,
    minify: false // We'll minify separately for better control
  })

  // Minify the critical CSS
  const result = await postcss([
    cssnano({
      preset: [
        'advanced',
        {
          discardComments: { removeAll: true },
          normalizeWhitespace: true,
          colormin: true
        }
      ]
    })
  ]).process(css, { from: undefined })

  // Save minified critical CSS
  fs.writeFileSync('dist/css/critical.min.css', result.css)

  console.log('✅ Critical CSS extracted and minified')
}
```

### CSS Splitting and Minification
```javascript
// webpack.config.js - Advanced CSS splitting
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        // Critical CSS
        critical: {
          name: 'critical',
          test: /critical\.(css|scss)$/,
          chunks: 'all',
          enforce: true,
          priority: 30
        },

        // Vendor CSS
        vendorStyles: {
          name: 'vendor',
          test: /[\\/]node_modules[\\/].*\.(css|scss)$/,
          chunks: 'all',
          enforce: true,
          priority: 20
        },

        // Component CSS
        componentStyles: {
          name: 'components',
          test: /components.*\.(css|scss)$/,
          chunks: 'all',
          enforce: true,
          priority: 10
        }
      }
    },

    minimizer: [
      new CssMinimizerPlugin({
        parallel: true,
        minimizerOptions: {
          preset: [
            'advanced',
            {
              autoprefixer: false, // Disable if you're using autoprefixer separately
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
              colormin: true,
              convertValues: true,
              discardDuplicates: true,
              mergeRules: true,
              minifySelectors: true,
              reduceInitial: true,
              svgo: {
                plugins: [
                  { name: 'removeViewBox', active: false },
                  { name: 'removeDimensions', active: true }
                ]
              }
            }
          ]
        }
      })
    ]
  }
}
```

## Performance Monitoring

### Measuring CSS Optimization Impact
```javascript
// Performance monitoring script
function measureCSSPerformance() {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name.includes('.css')) {
        console.log('CSS File:', entry.name)
        console.log('Load Time:', entry.duration + 'ms')
        console.log('Transfer Size:', entry.transferSize + ' bytes')
        console.log('Encoded Size:', entry.encodedBodySize + ' bytes')
        console.log('Compression Ratio:',
          ((entry.transferSize / entry.encodedBodySize) * 100).toFixed(1) + '%')
      }
    }
  })

  observer.observe({ entryTypes: ['resource'] })
}

// Run after page load
window.addEventListener('load', measureCSSPerformance)
```

### Lighthouse CSS Auditing
```javascript
// lighthouse-css-audit.js
const lighthouse = require('lighthouse')
const chromeLauncher = require('chrome-launcher')

async function auditCSS(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })

  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port
  }

  const runnerResult = await lighthouse(url, options)

  // Extract CSS-related audits
  const cssAudits = {
    'css-minification': runnerResult.lhr.audits['css-minification'],
    'unused-css-rules': runnerResult.lhr.audits['unused-css-rules'],
    'render-blocking-resources': runnerResult.lhr.audits['render-blocking-resources']
  }

  console.log('CSS Performance Audits:', cssAudits)

  await chrome.kill()
  return cssAudits
}

auditCSS('http://localhost:3000')
```

## Best Practices

1. **Automate in Build Process**: Never manually minify CSS
2. **Source Maps**: Generate source maps for debugging minified CSS
3. **Environment-Specific**: Only minify in production builds
4. **Test After Minification**: Ensure styles work correctly after minification
5. **Monitor File Sizes**: Track CSS bundle sizes over time
6. **Critical CSS**: Inline and minify critical CSS separately
7. **Cache Busting**: Use content hashes in filenames for cache invalidation
8. **Compression**: Combine minification with gzip/brotli compression
9. **Dead Code Elimination**: Remove unused CSS before minification
10. **Performance Budget**: Set and monitor CSS size budgets

## Common Issues and Solutions

### Broken Selectors After Minification
```css
/* Problem: Over-aggressive selector minification */
/* Before: */
.my-component .nested-element { }

/* After (broken): */
.a .b { }

/* Solution: Configure cssnano to preserve class names */
cssnano({
  preset: ['default', {
    discardComments: { removeAll: true },
    minifySelectors: false // Disable if breaking selectors
  }]
})
```

### Missing Vendor Prefixes
```javascript
// Solution: Use autoprefixer before minification
postcss([
  require('autoprefixer'),
  require('cssnano')
])
```

### Source Map Issues
```javascript
// webpack.config.js
module.exports = {
  devtool: process.env.NODE_ENV === 'production'
    ? 'source-map'  // Separate source map file
    : 'eval-source-map', // Inline for development
}
```

## Verification

### Automated Checks

- Confirm the computed styles match the intended fix in DevTools.
- If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.

### Manual Checks

- Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
- Test at least one mobile and one desktop viewport before shipping.