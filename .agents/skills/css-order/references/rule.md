# Order CSS files correctly

> All CSS files are loaded before JavaScript files to prevent render blocking.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
CSS files should load before JavaScript files in the document head to ensure proper styling precedence and prevent render-blocking issues.

## Code Examples

### HTML Document Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
  
  <!-- ✅ CSS files first -->
  <link rel="stylesheet" href="reset.css">
  <link rel="stylesheet" href="main.css">
  <link rel="stylesheet" href="components.css">
  
  <!-- ✅ Critical inline CSS -->
  <style>
    /* Critical above-the-fold styles */
    .hero { display: block; }
  </style>
  
  <!-- ✅ JavaScript files after CSS -->
  <script src="critical-polyfills.js"></script>
  <script defer src="main.js"></script>
  
  <!-- ✅ Async scripts can be anywhere -->
  <script async src="analytics.js"></script>
</head>
<body>
  <!-- Content -->
</body>
</html>
```

### Incorrect Order (Avoid)
```html
<!-- ❌ Bad: JavaScript before CSS -->
<head>
  <script src="main.js"></script> <!-- Blocks CSS parsing -->
  <link rel="stylesheet" href="main.css">
</head>

<!-- ❌ Bad: Mixed order -->
<head>
  <link rel="stylesheet" href="main.css">
  <script src="blocking.js"></script>
  <link rel="stylesheet" href="components.css"> <!-- May cause FOUC -->
</head>
```

## Why It Matters

Incorrect CSS/JS order causes render-blocking delays and FOUC—users see unstyled content while waiting for styles to load.

## Framework-Specific Implementation

### React with Next.js
```jsx
// pages/_document.js

  return (
    
      
        {/* CSS files loaded first */}
        <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="stylesheet" href="/css/globals.css" />
        <link rel="stylesheet" href="/css/components.css" />
        
        {/* Critical inline styles */}
        <style jsx>{`
          .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }
        `}</style>
        
        {/* JavaScript after CSS */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Critical synchronous JavaScript
              if (!window.localStorage) {
                document.documentElement.className += ' no-localStorage';
              }
            `
          }}
        />
      
      <body>
        
        
      </body>
    
  )
}

// next.config.js - Optimize CSS/JS loading
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizeFonts: true
  },
  
  webpack: (config, { dev, isServer }) => {
    // Ensure CSS is loaded before JS in production
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        styles: {
          name: 'styles',
          test: /\.(css|scss|sass)$/,
          chunks: 'all',
          enforce: true,
          priority: 10
        }
      }
    }
    
    return config
  }
}
```

### React with Create React App
```jsx
// public/index.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  
  <!-- CSS first -->
  <link rel="stylesheet" href="%PUBLIC_URL%/css/normalize.css">
  <link rel="stylesheet" href="%PUBLIC_URL%/css/base.css">
  
  <!-- Critical styles inline -->
  <style>
    /* Above-the-fold critical CSS */
    #root {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
  </style>
  
  <!-- JavaScript after CSS -->
  <script>
    // Synchronous critical JavaScript
    window.APP_CONFIG = {
      version: '%REACT_APP_VERSION%'
    };
  </script>
  
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
  <!-- React scripts will be injected here -->
</body>
</html>

// Custom webpack configuration (CRACO)
// craco.config.js
const { whenProd } = require('@craco/craco')

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      whenProd(() => {
        // Ensure CSS loads before JS
        webpackConfig.optimization.splitChunks.cacheGroups.styles = {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true,
          priority: 20
        }
      })
      
      return webpackConfig
    }
  }
}
```

### Vue.js Implementation
```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  
  <!-- CSS files first -->
  <link rel="preload" href="/fonts/roboto.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/css/normalize.css">
  <link rel="stylesheet" href="/css/base.css">
  
  <!-- Critical inline CSS -->
  <style>
    #app {
      min-height: 100vh;
      font-family: Roboto, sans-serif;
    }
    
    .v-enter-active, .v-leave-active {
      transition: opacity 0.3s;
    }
    
    .v-enter, .v-leave-to {
      opacity: 0;
    }
  </style>
  
  <!-- JavaScript after CSS -->
  <script>
    // Critical synchronous code
    window.VUE_APP_VERSION = '<%= process.env.VUE_APP_VERSION %>';
  </script>
  
  <title>Vue App</title>
</head>
<body>
  <div id="app"></div>
  <!-- Vue scripts injected here -->
</body>
</html>
```

```javascript
// vue.config.js
module.exports = {
  configureWebpack: (config) => {
    if (process.env.NODE_ENV === 'production') {
      // Split CSS from JS bundles
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        styles: {
          name: 'styles',
          test: /\.(css|vue)$/,
          chunks: 'all',
          enforce: true,
          priority: 10
        }
      }
    }
  },
  
  css: {
    extract: {
      // Ensure CSS is extracted and loaded first
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[name].[contenthash:8].css'
    }
  }
}
```

### Angular Implementation
```html
<!-- src/index.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Angular App</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  
  <!-- CSS files first -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap">
  
  <!-- Critical inline styles -->
  <style>
    /* Critical CSS for initial render */
    html, body {
      height: 100%;
      margin: 0;
      font-family: Roboto, sans-serif;
    }
    
    app-root {
      display: block;
      min-height: 100vh;
    }
    
    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
  </style>
  
  <!-- JavaScript after CSS -->
  <script>
    // Critical JavaScript
    if (!window.customElements) {
      document.write('<script src="polyfills-es5.js"><\/script>');
    }
  </script>
</head>
<body>
  <app-root>
    <div class="loading">Loading...</div>
  </app-root>
  <!-- Angular scripts will be injected here -->
</body>
</html>
```

```javascript
// angular.json - Build configuration
{
  "projects": {
    "app": {
      "architect": {
        "build": {
          "options": {
            "styles": [
              "src/styles.css"
            ],
            "scripts": [],
            "extractCss": true,
            "optimization": {
              "styles": {
                "minify": true,
                "inlineCritical": true
              },
              "scripts": true
            }
          }
        }
      }
    }
  }
}
```

## Build Tool Optimization

### Webpack CSS/JS Order Plugin
```javascript
// webpack-css-first-plugin.js
class CSSFirstPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('CSSFirstPlugin', (compilation) => {
      compilation.hooks.htmlWebpackPluginAlterAssetTags.tapAsync(
        'CSSFirstPlugin',
        (data, callback) => {
          // Separate CSS and JS assets
          const cssAssets = data.head.filter(tag => 
            tag.tagName === 'link' && tag.attributes.rel === 'stylesheet'
          )
          
          const jsAssets = data.head.filter(tag => 
            tag.tagName === 'script'
          )
          
          const otherAssets = data.head.filter(tag => 
            !cssAssets.includes(tag) && !jsAssets.includes(tag)
          )
          
          // Reorder: other assets, then CSS, then JS
          data.head = [...otherAssets, ...cssAssets, ...jsAssets]
          
          callback(null, data)
        }
      )
    })
  }
}

// webpack.config.js
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CSSFirstPlugin = require('./webpack-css-first-plugin')

module.exports = {
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css',
      chunkFilename: 'css/[id].[contenthash].css'
    }),
    
    new HtmlWebpackPlugin({
      template: 'src/index.html',
      inject: 'head',
      scriptLoading: 'defer'
    }),
    
    new CSSFirstPlugin()
  ],
  
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true,
          priority: 10
        }
      }
    }
  }
}
```

### Vite CSS Loading Optimization
```javascript
// vite.config.js

  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "src/styles/variables.scss";`
      }
    }
  },
  
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Ensure CSS loads before JS
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
        
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js'
      }
    }
  },
  
  plugins: [
    {
      name: 'css-first',
      generateBundle(options, bundle) {
        // Ensure CSS assets are processed first
        Object.keys(bundle).forEach(key => {
          if (key.endsWith('.css')) {
            const asset = bundle[key]
            delete bundle[key]
            bundle[`0-${key}`] = asset
          }
        })
      }
    }
  ]
})
```

## Performance Impact Analysis

### Critical Path Analysis
```javascript
// analyze-critical-path.js
const puppeteer = require('puppeteer')

async function analyzeCriticalPath(url) {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  
  // Track resource loading order
  const resources = []
  
  page.on('response', response => {
    const contentType = response.headers()['content-type'] || ''
    
    resources.push({
      url: response.url(),
      type: contentType.includes('text/css') ? 'CSS' : 
            contentType.includes('javascript') ? 'JS' : 'OTHER',
      timestamp: Date.now(),
      status: response.status()
    })
  })
  
  await page.goto(url, { waitUntil: 'networkidle2' })
  
  // Analyze loading order
  const cssResources = resources.filter(r => r.type === 'CSS')
  const jsResources = resources.filter(r => r.type === 'JS')
  
  const firstCSS = cssResources[0]?.timestamp || Infinity
  const firstJS = jsResources[0]?.timestamp || Infinity
  
  const analysis = {
    correctOrder: firstCSS < firstJS,
    cssFirst: firstCSS,
    jsFirst: firstJS,
    totalCSS: cssResources.length,
    totalJS: jsResources.length,
    recommendations: []
  }
  
  if (!analysis.correctOrder) {
    analysis.recommendations.push('Move CSS files before JavaScript files in document head')
  }
  
  if (cssResources.length > 5) {
    analysis.recommendations.push('Consider bundling CSS files to reduce HTTP requests')
  }
  
  await browser.close()
  return analysis
}

// Usage
analyzeCriticalPath('https://example.com').then(analysis => {
  console.log('Critical Path Analysis:', analysis)
})
```

### FOUC Prevention
```html
<!-- Prevent Flash of Unstyled Content -->
<head>
  <!-- Critical CSS inline -->
  <style>
    /* Hide content until styles load */
    .content {
      visibility: hidden;
    }
    
    /* Show content when styles are loaded */
    .styles-loaded .content {
      visibility: visible;
    }
  </style>
  
  <!-- External CSS -->
  <link rel="stylesheet" href="main.css" onload="document.body.classList.add('styles-loaded')">
  
  <!-- Fallback for CSS loading -->
  <script>
    // Show content after timeout if CSS fails to load
    setTimeout(() => {
      if (!document.body.classList.contains('styles-loaded')) {
        document.body.classList.add('styles-loaded')
        console.warn('CSS loading timeout - showing unstyled content')
      }
    }, 3000)
  </script>
</head>
<body>
  <div class="content">
    <!-- Page content -->
  </div>
</body>
```

## Automated Verification

### CSS/JS Order Checker
```javascript
// css-js-order-checker.js
const cheerio = require('cheerio')
const fs = require('fs')

class CSSJSOrderChecker {
  checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    const $ = cheerio.load(content)
    
    const headElements = $('head').children()
    const issues = []
    let cssFound = false
    let jsFound = false
    
    headElements.each((index, element) => {
      const tagName = element.tagName?.toLowerCase()
      
      if (tagName === 'link') {
        const rel = $(element).attr('rel')
        if (rel === 'stylesheet') {
          cssFound = true
          
          if (jsFound) {
            issues.push({
              type: 'order',
              message: 'CSS file found after JavaScript',
              line: index,
              element: $(element).toString()
            })
          }
        }
      }
      
      if (tagName === 'script') {
        const src = $(element).attr('src')
        const async = $(element).attr('async')
        const defer = $(element).attr('defer')
        
        // Only consider blocking scripts
        if (src && !async && !defer) {
          jsFound = true
        }
      }
    })
    
    return {
      file: filePath,
      issues,
      isValid: issues.length === 0
    }
  }
  
  checkDirectory(dirPath) {
    const htmlFiles = fs.readdirSync(dirPath)
      .filter(file => file.endsWith('.html'))
      .map(file => `${dirPath}/${file}`)
    
    return htmlFiles.map(file => this.checkFile(file))
  }
}

// Usage
const checker = new CSSJSOrderChecker()
const results = checker.checkDirectory('dist')

results.forEach(result => {
  if (!result.isValid) {
    console.error(`❌ ${result.file}:`)
    result.issues.forEach(issue => {
      console.error(`  - ${issue.message}`)
    })
  } else {
    console.log(`✅ ${result.file}: CSS/JS order correct`)
  }
})
```

### ESLint Rule for Template Files
```javascript
// eslint-plugin-css-js-order.js
module.exports = {
  rules: {
    'css-before-js': {
      meta: {
        docs: {
          description: 'Enforce CSS files before JavaScript files'
        },
        schema: []
      },
      
      create(context) {
        return {
          JSXElement(node) {
            if (node.openingElement.name.name === 'head') {
              const children = node.children.filter(child => 
                child.type === 'JSXElement'
              )
              
              let cssIndex = -1
              let jsIndex = -1
              
              children.forEach((child, index) => {
                const elementName = child.openingElement.name.name
                
                if (elementName === 'link') {
                  const relAttr = child.openingElement.attributes.find(attr => 
                    attr.name.name === 'rel'
                  )
                  
                  if (relAttr?.value?.value === 'stylesheet') {
                    cssIndex = index
                  }
                }
                
                if (elementName === 'script') {
                  const srcAttr = child.openingElement.attributes.find(attr => 
                    attr.name.name === 'src'
                  )
                  
                  const asyncAttr = child.openingElement.attributes.find(attr => 
                    attr.name.name === 'async'
                  )
                  
                  if (srcAttr && !asyncAttr) {
                    jsIndex = index
                  }
                }
              })
              
              if (cssIndex > jsIndex && jsIndex !== -1) {
                context.report({
                  node,
                  message: 'CSS files should be loaded before JavaScript files'
                })
              }
            }
          }
        }
      }
    }
  }
}

// .eslintrc.js
module.exports = {
  plugins: ['css-js-order'],
  rules: {
    'css-js-order/css-before-js': 'error'
  }
}
```

## Best Practices

1. **CSS First**: Always load CSS before JavaScript in document head
2. **Critical CSS**: Inline above-the-fold CSS for faster rendering
3. **Async Scripts**: Use async/defer for non-critical JavaScript
4. **Resource Hints**: Use preload/prefetch for performance optimization
5. **Bundle Optimization**: Configure build tools to maintain proper order
6. **FOUC Prevention**: Implement strategies to prevent flash of unstyled content
7. **Monitoring**: Regularly check loading order in production
8. **Documentation**: Document exceptions and special loading requirements

## Common Mistakes

❌ **JavaScript before CSS**
```html
<head>
  <script src="main.js"></script>
  <link rel="stylesheet" href="main.css">
</head>
```

❌ **Mixed order**
```html
<head>
  <link rel="stylesheet" href="base.css">
  <script src="polyfills.js"></script>
  <link rel="stylesheet" href="components.css">
</head>
```

❌ **No order consideration**
```html
<head>
  <script async src="analytics.js"></script>
  <link rel="stylesheet" href="main.css">
  <script src="app.js"></script>
</head>
```

✅ **Correct implementation**
```html
<head>
  <!-- CSS files first -->
  <link rel="stylesheet" href="base.css">
  <link rel="stylesheet" href="components.css">
  
  <!-- JavaScript files after CSS -->
  <script src="polyfills.js"></script>
  <script defer src="app.js"></script>
  
  <!-- Async scripts can be anywhere -->
  <script async src="analytics.js"></script>
</head>
```

## Verification

### Automated Checks

- Confirm the computed styles match the intended fix in DevTools.
- If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.

### Manual Checks

- Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
- Test at least one mobile and one desktop viewport before shipping.