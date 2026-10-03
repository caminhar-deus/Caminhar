# Load CSS without blocking render

> Non-critical CSS is loaded asynchronously to avoid blocking DOM rendering.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
CSS files should be loaded in a non-blocking manner to prevent them from delaying DOM parsing and initial page rendering.

## Code Example

```html
<!-- ❌ Blocking CSS - delays DOM parsing -->
<head>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="large-library.css">
</head>
```

## Why It Matters

Render-blocking CSS delays First Contentful Paint—users see a blank screen while waiting for stylesheets to download and parse.

## Non-Blocking Solutions

### 1. Preload with Media Attribute

```html
<head>
    <!-- Critical CSS inline -->
    <style>
        /* Critical above-the-fold styles */
        .header { background: #000; color: #fff; }
        .hero { min-height: 50vh; }
    </style>

    <!-- Non-blocking CSS loading -->
    <link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="styles.css"></noscript>

    <!-- Load non-critical CSS with media attribute -->
    <link rel="stylesheet" href="print.css" media="print">
    <link rel="stylesheet" href="mobile.css" media="screen and (max-width: 768px)">
</head>
```

### 2. LoadCSS Library Implementation

```html
<head>
    <!-- Critical CSS inline -->
    <style>
        /* Critical styles here */
    </style>

    <!-- LoadCSS script -->
    <script>
        /*! loadCSS. [c]2017 Filament Group, Inc. MIT License */
        !function(a){"use strict";var b=function(b,c,d){function e(a){return h.body?a():void setTimeout(function(){e(a)})}function f(){i.addEventListener&&i.removeEventListener("load",f),i.media=d||"all"}var g,h=a.document,i=h.createElement("link");if(c)g=c;else{var j=(h.body||h.getElementsByTagName("head")[0]).childNodes;g=j[j.length-1]}var k=h.styleSheets;i.rel="stylesheet",i.href=b,i.media="only x",e(function(){g.parentNode.insertBefore(i,c?g:g.nextSibling)});var l=function(a){for(var b=i.href,c=k.length;c--;)if(k[c].href===b)return a();setTimeout(function(){l(a)})};return i.addEventListener&&i.addEventListener("load",f),i.onloadcssdefined=l,l(f),i};"undefined"!=typeof exports?exports.loadCSS=b:a.loadCSS=b}("undefined"!=typeof global?global:this);
    </script>

    <!-- Load non-critical CSS -->
    <script>
        loadCSS('styles.css');
        loadCSS('components.css');
        loadCSS('vendor.css');
    </script>

    <!-- Fallback for no-JS -->
    <noscript>
        <link rel="stylesheet" href="styles.css">
        <link rel="stylesheet" href="components.css">
        <link rel="stylesheet" href="vendor.css">
    </noscript>
</head>
```

## Framework Examples

### Next.js (Automatic Optimization)
```jsx
// Next.js automatically optimizes CSS loading

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### React with Critical CSS
```jsx
// Critical CSS component

function App() {
  useEffect(() => {
    // Load non-critical CSS after component mounts
    const loadCSS = (href) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      document.head.appendChild(link)
    }

    loadCSS('/styles/non-critical.css')
    loadCSS('/styles/components.css')
  }, [])

  return (
    <div className="app">
      <style jsx>{`
        /* Critical inline styles */
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
      `}</style>
      {/* Your app content */}
    </div>
  )
}
```

### Vue.js with Async CSS
```vue
<template>
  <div class="app">
    <!-- Your app content -->
  </div>
</template>

<script>

  mounted() {
    // Load non-critical CSS after mount
    this.loadCSS('/styles/components.css')
    this.loadCSS('/styles/animations.css')
  },
  methods: {
    loadCSS(href) {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'style'
      link.href = href
      link.onload = function() {
        this.onload = null
        this.rel = 'stylesheet'
      }
      document.head.appendChild(link)
    }
  }
}
</script>

<style scoped>
/* Critical component styles */
.app {
  min-height: 100vh;
}
</style>
```

## Modern CSS Loading Strategies

### 1. Critical CSS Inlining
```html
<head>
    <style>
        /* Inline critical CSS - above-the-fold content */
        body { margin: 0; font-family: Arial, sans-serif; }
        .header { background: #000; color: #fff; height: 60px; }
        .hero { min-height: 50vh; background: #f0f0f0; }
    </style>
</head>
```

### 2. Resource Hints
```html
<head>
    <!-- Preconnect to font/CDN domains -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">

    <!-- Preload critical CSS -->
    <link rel="preload" href="critical.css" as="style">

    <!-- Prefetch non-critical CSS -->
    <link rel="prefetch" href="animations.css">
</head>
```

### 3. Service Worker CSS Caching
```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'style') {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    )
  }
})
```

## Performance Benefits

- **Faster First Paint**: DOM parsing isn't blocked by CSS downloads
- **Better Core Web Vitals**: Improved LCP (Largest Contentful Paint)
- **Progressive Enhancement**: Page is functional while styles load
- **Perceived Performance**: Users see content sooner

## Build Tool Integration

### Webpack
```javascript
// webpack.config.js
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].[contenthash].css',
    })
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
}
```

### Vite
```javascript
// vite.config.js

  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          critical: ['./src/styles/critical.css'],
          components: ['./src/styles/components.css']
        }
      }
    }
  }
})
```

## Tools & Libraries

- [loadCSS by Filament Group](https://github.com/filamentgroup/loadCSS)
- [Critical CSS Generator](https://github.com/addyosmani/critical)
- [PurgeCSS](https://purgecss.com/) - Remove unused CSS
- [CSS Tree Shaking](https://webpack.js.org/guides/tree-shaking/) in Webpack

## Support Notes

- Non-blocking CSS strategies can behave differently depending on preload, stylesheet priority, and browser loading heuristics, so verify the final page output in target browsers.
- Document the fallback when a loading optimization depends on browser support or a framework-specific resource pipeline.

## Verification

### Automated Checks

- **Lighthouse**: Check for render-blocking resources
- **Chrome DevTools**: Network tab to see resource loading order

### Manual Checks

- **PageSpeed Insights**: Analyze CSS loading performance
- **WebPageTest**: Visualize CSS loading timeline