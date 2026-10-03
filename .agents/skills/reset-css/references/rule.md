# Use a CSS reset or normalize stylesheet

> A CSS reset or normalize is used to ensure consistent styling across browsers.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
A CSS reset or normalization eliminates browser default styles and provides a consistent foundation for custom styling across all browsers and devices. In practice that usually means reaching for [normalize.css](https://github.com/necolas/normalize.css) when you want sensible defaults preserved, or [CSS Remedy](https://github.com/jensimmons/cssremedy) when you want a more opinionated reset baseline.
## Code Examples

### Traditional CSS Reset (Meyer's Reset)
```css
/* http://meyerweb.com/eric/tools/css/reset/ 
   v2.0 | 20110126
   License: none (public domain)
*/

html, body, div, span, applet, object, iframe,
h1, h2, h3, h4, h5, h6, p, blockquote, pre,
a, abbrev, acronym, address, big, cite, code,
del, dfn, em, img, ins, kbd, q, s, samp,
small, strike, strong, sub, sup, tt, var,
b, u, i, center,
dl, dt, dd, ol, ul, li,
fieldset, form, label, legend,
table, caption, tbody, tfoot, thead, tr, th, td,
article, aside, canvas, details, embed, 
figure, figcaption, footer, header, hgroup, 
menu, nav, output, ruby, section, summary,
time, mark, audio, video {
	margin: 0;
	padding: 0;
	border: 0;
	font-size: 100%;
	font: inherit;
	vertical-align: baseline;
}

/* HTML5 display-role reset for older browsers */
article, aside, details, figcaption, figure, 
footer, header, hgroup, menu, nav, section {
	display: block;
}

body {
	line-height: 1;
}

ol, ul {
	list-style: none;
}

blockquote, q {
	quotes: none;
}

blockquote:before, blockquote:after,
q:before, q:after {
	content: '';
	content: none;
}

table {
	border-collapse: collapse;
	border-spacing: 0;
}
```

### Normalize.css (Preserve Useful Defaults)
```css
/*! normalize.css v8.0.1 | MIT License | github.com/necolas/normalize.css */

/* Document
   ========================================================================== */

/**
 * 1. Correct the line height in all browsers.
 * 2. Prevent adjustments of font size after orientation changes in iOS.
 */

html {
  line-height: 1.15; /* 1 */
  -webkit-text-size-adjust: 100%; /* 2 */
}

/* Sections
   ========================================================================== */

/**
 * Remove the margin in all browsers.
 */

body {
  margin: 0;
}

/**
 * Render the `main` element consistently in IE.
 */

main {
  display: block;
}

/**
 * Correct the font size and margin on `h1` elements within `section` and
 * `article` contexts in Chrome, Firefox, and Safari.
 */

h1 {
  font-size: 2em;
  margin: 0.67em 0;
}

/* Grouping content
   ========================================================================== */

/**
 * 1. Add the correct box sizing in Firefox.
 * 2. Show the overflow in Edge and IE.
 */

hr {
  box-sizing: content-box; /* 1 */
  height: 0; /* 1 */
  overflow: visible; /* 2 */
}

/**
 * 1. Correct the inheritance and scaling of font size in all browsers.
 * 2. Correct the odd `em` font sizing in all browsers.
 */

pre {
  font-family: monospace, monospace; /* 1 */
  font-size: 1em; /* 2 */
}

/* Text-level semantics
   ========================================================================== */

/**
 * Remove the gray background on active links in IE 10.
 */

a {
  background-color: transparent;
}

/**
 * 1. Remove the bottom border in Chrome 57-
 * 2. Add the correct text decoration in Chrome, Edge, IE, Opera, and Safari.
 */

abbr[title] {
  border-bottom: none; /* 1 */
  text-decoration: underline; /* 2 */
  text-decoration: underline dotted; /* 2 */
}

/**
 * Add the correct font weight in Chrome, Edge, and Safari.
 */

b,
strong {
  font-weight: bolder;
}

/**
 * 1. Correct the inheritance and scaling of font size in all browsers.
 * 2. Correct the odd `em` font sizing in all browsers.
 */

code,
kbd,
samp {
  font-family: monospace, monospace; /* 1 */
  font-size: 1em; /* 2 */
}

/**
 * Add the correct font size in all browsers.
 */

small {
  font-size: 80%;
}

/**
 * Prevent `sub` and `sup` elements from affecting the line height in
 * all browsers.
 */

sub,
sup {
  font-size: 75%;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
}

sub {
  bottom: -0.25em;
}

sup {
  top: -0.5em;
}

/* Embedded content
   ========================================================================== */

/**
 * Remove the border on images inside links in IE 10.
 */

img {
  border-style: none;
}

/* Forms
   ========================================================================== */

/**
 * 1. Change the font styles in all browsers.
 * 2. Remove the margin in Firefox and Safari.
 */

button,
input,
optgroup,
select,
textarea {
  font-family: inherit; /* 1 */
  font-size: 100%; /* 1 */
  line-height: 1.15; /* 1 */
  margin: 0; /* 2 */
}

/**
 * Show the overflow in IE.
 * 1. Show the overflow in Edge.
 */

button,
input { /* 1 */
  overflow: visible;
}

/**
 * Remove the inheritance of text transform in Edge, Firefox, and IE.
 * 1. Remove the inheritance of text transform in Firefox.
 */

button,
select { /* 1 */
  text-transform: none;
}

/**
 * Correct the inability to style clickable types in iOS and Safari.
 */

button,
[type="button"],
[type="reset"],
[type="submit"] {
  -webkit-appearance: button;
}

/**
 * Remove the inner border and padding in Firefox.
 */

button::-moz-focus-inner,
[type="button"]::-moz-focus-inner,
[type="reset"]::-moz-focus-inner,
[type="submit"]::-moz-focus-inner {
  border-style: none;
  padding: 0;
}

/**
 * Restore the focus styles unset by the previous rule.
 */

button:-moz-focusring,
[type="button"]:-moz-focusring,
[type="reset"]:-moz-focusring,
[type="submit"]:-moz-focusring {
  outline: 1px dotted ButtonText;
}

/**
 * Correct the padding in Firefox.
 */

fieldset {
  padding: 0.35em 0.75em 0.625em;
}

/**
 * 1. Correct the text wrapping in Edge and IE.
 * 2. Correct the color inheritance from `fieldset` elements in IE.
 * 3. Remove the padding so developers are not caught out when they zero out
 *    `fieldset` elements in all browsers.
 */

legend {
  box-sizing: border-box; /* 1 */
  color: inherit; /* 2 */
  display: table; /* 1 */
  max-width: 100%; /* 1 */
  padding: 0; /* 3 */
  white-space: normal; /* 1 */
}

/**
 * Add the correct vertical alignment in Chrome, Firefox, and Opera.
 */

progress {
  vertical-align: baseline;
}

/**
 * Remove the default vertical scrollbar in IE 10+.
 */

textarea {
  overflow: auto;
}

/**
 * 1. Add the correct box sizing in IE 10.
 * 2. Remove the padding in IE 10.
 */

[type="checkbox"],
[type="radio"] {
  box-sizing: border-box; /* 1 */
  padding: 0; /* 2 */
}

/**
 * Correct the cursor style of increment and decrement buttons in Chrome.
 */

[type="number"]::-webkit-inner-spin-button,
[type="number"]::-webkit-outer-spin-button {
  height: auto;
}

/**
 * 1. Correct the odd appearance in Chrome and Safari.
 * 2. Correct the outline style in Safari.
 */

[type="search"] {
  -webkit-appearance: textfield; /* 1 */
  outline-offset: -2px; /* 2 */
}

/**
 * Remove the inner padding in Chrome and Safari on macOS.
 */

[type="search"]::-webkit-search-decoration {
  -webkit-appearance: none;
}

/**
 * 1. Correct the inability to style clickable types in iOS and Safari.
 * 2. Change font properties to `inherit` in Safari.
 */

::-webkit-file-upload-button {
  -webkit-appearance: button; /* 1 */
  font: inherit; /* 2 */
}

/* Interactive
   ========================================================================== */

/*
 * Add the correct display in Edge, IE 10+, and Firefox.
 */

details {
  display: block;
}

/*
 * Add the correct display in all browsers.
 */

summary {
  display: list-item;
}

/* Misc
   ========================================================================== */

/**
 * Add the correct display in IE 10+.
 */

template {
  display: none;
}

/**
 * Add the correct display in IE 10.
 */

[hidden] {
  display: none;
}
```

### Modern CSS Reset (Andy Bell's Modern CSS Reset)
```css
/* Modern CSS Reset by Andy Bell */
/* https://piccalil.li/blog/a-modern-css-reset */

/* Box sizing rules */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* Remove default margin */
* {
  margin: 0;
}

/* Remove list styles on ul, ol elements with a list role, 
   which suggests default styling will be removed */
ul[role='list'],
ol[role='list'] {
  list-style: none;
}

/* Set core root defaults */
html:focus-within {
  scroll-behavior: smooth;
}

/* Set core body defaults */
body {
  min-height: 100vh;
  text-rendering: optimizeSpeed;
  line-height: 1.5;
}

/* A elements that don't have a class get default styles */
a:not([class]) {
  text-decoration-skip-ink: auto;
}

/* Make images easier to work with */
img,
picture {
  max-width: 100%;
  display: block;
}

/* Inherit fonts for inputs and buttons */
input,
button,
textarea,
select {
  font: inherit;
}

/* Remove all animations, transitions and smooth scroll 
   for people that prefer not to see them */
@media (prefers-reduced-motion: reduce) {
  html:focus-within {
   scroll-behavior: auto;
  }
  
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### CSS Remedy (Modern Approach)
```css
/* CSS Remedy - A fresh approach to CSS resets */
/* https://github.com/mozdevs/cssremedy */

/* Use a better box model (opinionated) */
*,
::before,
::after {
  box-sizing: border-box;
}

/* Use a more readable tab size (opinionated) */
:root {
  tab-size: 4;
}

/* 1. Use a more readable tab size (opinionated)
   2. Correct the line height in all browsers
   3. Prevent adjustments of font size after orientation changes in iOS */
html {
  tab-size: 4; /* 1 */
  line-height: 1.15; /* 2 */
  -webkit-text-size-adjust: 100%; /* 3 */
}

/* Remove the margin in all browsers */
body {
  margin: 0;
}

/* Improve consistency of default fonts */
body {
  font-family:
    system-ui,
    -apple-system, /* Firefox supports this but not yet `system-ui` */
    'Segoe UI',
    Roboto,
    Helvetica,
    Arial,
    sans-serif,
    'Apple Color Emoji',
    'Segoe UI Emoji';
}

/* Allow percentage-based heights in the application */
html,
body {
  height: 100%;
}

/* Making sure code elements don't affect line-height */
code,
kbd,
samp,
pre {
  font-family:
    ui-monospace,
    SFMono-Regular,
    Consolas,
    'Liberation Mono',
    Menlo,
    monospace;
  font-size: 1em; /* Correct the odd `em` font sizing in all browsers */
}

/* Add the correct font weight in Chrome, Edge, and Safari */
b,
strong {
  font-weight: bolder;
}

/* Add the correct font size in all browsers */
small {
  font-size: 80%;
}

/* Remove the gray background on active links in IE 10 */
a {
  background-color: transparent;
}

/* Remove the border on images inside links in IE 10 */
img {
  border-style: none;
}

/* Change the fill color to match the text color in all browsers */
svg:not([fill]) {
  fill: currentColor;
}

/* Hide the overflow in IE */
svg:not(:root) {
  overflow: hidden;
}

/* Show the overflow in Edge and IE */
hr {
  overflow: visible;
}

/* Standardize the style used to render abbr elements */
abbr[title] {
  border-bottom: none; /* Remove the bottom border in Chrome 57- */
  text-decoration: underline; /* Add the correct text decoration in Chrome, Edge, IE, Opera, and Safari */
  text-decoration: underline dotted; /* Add the correct text decoration in Chrome, Edge, IE, Opera, and Safari */
}

/* Add the correct display in Edge and IE */
details {
  display: block;
}

/* Add the correct display in all browsers */
summary {
  display: list-item;
}

/* Add the correct display in IE */
template {
  display: none;
}

/* Add the correct display in IE 10 */
[hidden] {
  display: none;
}
```

## Why It Matters

CSS resets eliminate browser default inconsistencies—ensuring your designs look identical across Chrome, Firefox, Safari, and Edge.

## Framework Integration

### Installing with Package Managers
```bash
# Normalize.css
pnpm add normalize.css

# Modern CSS Reset
pnpm add modern-css-reset

# CSS Remedy
pnpm add @csstools/css-remedy

# Sanitize.css
pnpm add sanitize.css
```

### React Implementation
```jsx
// App.jsx

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>My Application</h1>
      </header>
      <main>
        <p>Content with consistent styling across browsers</p>
      </main>
    </div>
  )
}

```

### Next.js Implementation
```jsx
// pages/_app.js

  return 
}

// Or with CSS imports in _document.js
// pages/_document.js

  return (
    
      
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.min.css" />
      
      <body>
        
        
      </body>
    
  )
}
```

### Vue.js Implementation
```javascript
// main.js

createApp(App).mount('#app')
```

```vue
<!-- App.vue -->
<template>
  <div id="app">
    <nav>
      <router-link to="/">Home</router-link>
      <router-link to="/about">About</router-link>
    </nav>
    <router-view/>
  </div>
</template>

<style>
/* Additional custom styles after reset */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}
</style>
```

### Angular Implementation
```scss
// styles.scss (global styles)
@import '~normalize.css';

// Custom base styles
html {
  font-size: 16px;
  line-height: 1.5;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #333;
  background-color: #fff;
}

// Additional global styles
*, *::before, *::after {
  box-sizing: border-box;
}

img {
  max-width: 100%;
  height: auto;
}
```

## Custom Reset Creation

### Building Your Own Modern Reset
```css
/* custom-reset.css - Modern CSS Reset */

/* 1. Use a more-intuitive box-sizing model */
*, *::before, *::after {
  box-sizing: border-box;
}

/* 2. Remove default margin and padding */
* {
  margin: 0;
  padding: 0;
}

/* 3. Allow percentage-based heights in the application */
html, body {
  height: 100%;
}

/* 4. Add accessible line-height and improve text rendering */
body {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 5. Improve media defaults */
img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

/* 6. Remove built-in form typography styles */
input, button, textarea, select {
  font: inherit;
}

/* 7. Avoid text overflows */
p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
}

/* 8. Create a root stacking context */
#root, #__next {
  isolation: isolate;
}

/* 9. Remove list styles on ul, ol elements with a list role */
ul[role='list'], ol[role='list'] {
  list-style: none;
}

/* 10. Set core root defaults */
html:focus-within {
  scroll-behavior: smooth;
}

/* 11. Remove all animations and transitions for people that prefer not to see them */
@media (prefers-reduced-motion: reduce) {
  html:focus-within {
    scroll-behavior: auto;
  }
  
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* 12. Modern font stack */
body {
  font-family: 
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    'Noto Sans',
    sans-serif,
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'Noto Color Emoji';
}

/* 13. Improve consistency of default fonts for code */
code, kbd, samp, pre {
  font-family:
    ui-monospace,
    SFMono-Regular,
    'SF Mono',
    Consolas,
    'Liberation Mono',
    Menlo,
    monospace;
}

/* 14. Add the correct display in all browsers */
details {
  display: block;
}

summary {
  display: list-item;
}

template {
  display: none;
}

[hidden] {
  display: none;
}
```

### Project-Specific Reset
```css
/* project-reset.css - Tailored for specific project needs */

/* Base reset */
@import 'normalize.css';

/* Project-specific additions */
:root {
  --font-family-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --line-height-base: 1.6;
  --line-height-heading: 1.2;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}

body {
  font-family: var(--font-family-sans);
  line-height: var(--line-height-base);
  color: #1a1a1a;
  background-color: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Typography improvements */
h1, h2, h3, h4, h5, h6 {
  line-height: var(--line-height-heading);
  font-weight: 600;
  margin-bottom: 0.5em;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 2rem; }
h3 { font-size: 1.75rem; }
h4 { font-size: 1.5rem; }
h5 { font-size: 1.25rem; }
h6 { font-size: 1rem; }

p {
  margin-bottom: 1rem;
}

/* Link improvements */
a {
  color: #0066cc;
  text-decoration: none;
}

a:hover, a:focus {
  text-decoration: underline;
}

/* Form improvements */
button {
  cursor: pointer;
  border: none;
  background: none;
  font: inherit;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

input, textarea, select {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0.5rem;
}

input:focus, textarea:focus, select:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
  border-color: #0066cc;
}

/* Utility classes */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 768px) {
  .container {
    padding: 0 2rem;
  }
}
```

## Build Tool Integration

### Webpack CSS Reset Plugin
```javascript
// webpack-css-reset-plugin.js
const fs = require('fs')
const path = require('path')

class CSSResetPlugin {
  constructor(options = {}) {
    this.options = {
      reset: options.reset || 'normalize', // 'normalize', 'modern', 'meyer', 'custom'
      customResetPath: options.customResetPath,
      inject: options.inject !== false, // Default to true
      ...options
    }
  }
  
  apply(compiler) {
    compiler.hooks.beforeRun.tapAsync('CSSResetPlugin', (compiler, callback) => {
      this.injectReset(compiler)
      callback()
    })
  }
  
  injectReset(compiler) {
    const resetCSS = this.getResetCSS()
    
    if (this.options.inject) {
      // Inject reset CSS into the main entry
      const entryPath = path.resolve(__dirname, 'src/reset-injection.js')
      
      const injectionCode = `
        // Auto-injected CSS Reset
        const resetCSS = \`${resetCSS}\`
        
        if (typeof document !== 'undefined') {
          const styleElement = document.createElement('style')
          styleElement.textContent = resetCSS
          document.head.insertBefore(styleElement, document.head.firstChild)
        }
      `
      
      fs.writeFileSync(entryPath, injectionCode)
      
      // Modify webpack entry to include reset
      const originalEntry = compiler.options.entry
      compiler.options.entry = [entryPath, originalEntry]
    }
  }
  
  getResetCSS() {
    switch (this.options.reset) {
      case 'normalize':
        return this.getNormalizeCSS()
      case 'modern':
        return this.getModernResetCSS()
      case 'meyer':
        return this.getMeyerResetCSS()
      case 'custom':
        if (this.options.customResetPath) {
          return fs.readFileSync(this.options.customResetPath, 'utf8')
        }
        throw new Error('Custom reset path not provided')
      default:
        return this.getNormalizeCSS()
    }
  }
  
  // CSS content methods would be implemented here...
}

module.exports = CSSResetPlugin
```

### PostCSS Reset Plugin
```javascript
// postcss-auto-reset.js
const postcss = require('postcss')
const fs = require('fs')
const path = require('path')

module.exports = postcss.plugin('postcss-auto-reset', (options = {}) => {
  return (root, result) => {
    const resetType = options.reset || 'normalize'
    const resetCSS = getResetCSS(resetType, options.customPath)
    
    // Parse reset CSS and prepend to existing CSS
    const resetRoot = postcss.parse(resetCSS)
    
    // Insert reset rules at the beginning
    resetRoot.each(node => {
      root.prepend(node.clone())
    })
  }
})

function getResetCSS(type, customPath) {
  switch (type) {
    case 'normalize':
      return require('normalize.css')
    case 'modern':
      return fs.readFileSync(path.join(__dirname, 'modern-reset.css'), 'utf8')
    case 'custom':
      return fs.readFileSync(customPath, 'utf8')
    default:
      return require('normalize.css')
  }
}

// Usage in postcss.config.js
module.exports = {
  plugins: [
    require('postcss-auto-reset')({
      reset: 'normalize'
    }),
    require('autoprefixer'),
    require('cssnano')
  ]
}
```

## Testing CSS Reset Implementation

### Automated Testing
```javascript
// css-reset-tester.js
const puppeteer = require('puppeteer')

class CSSResetTester {
  async testReset(url) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    
    await page.goto(url)
    
    const resetTests = await page.evaluate(() => {
      const body = document.body
      const computedStyle = getComputedStyle(body)
      
      return {
        hasMargin: computedStyle.margin !== '0px',
        hasPadding: computedStyle.padding !== '0px',
        boxSizing: computedStyle.boxSizing,
        fontFamily: computedStyle.fontFamily,
        lineHeight: computedStyle.lineHeight
      }
    })
    
    // Test common elements
    const elementTests = await page.evaluate(() => {
      const elements = {
        h1: document.querySelector('h1'),
        p: document.querySelector('p'),
        ul: document.querySelector('ul'),
        button: document.querySelector('button'),
        input: document.querySelector('input')
      }
      
      const results = {}
      
      for (const [tag, element] of Object.entries(elements)) {
        if (element) {
          const style = getComputedStyle(element)
          results[tag] = {
            margin: style.margin,
            padding: style.padding,
            fontSize: style.fontSize,
            fontFamily: style.fontFamily
          }
        }
      }
      
      return results
    })
    
    await browser.close()
    
    return {
      body: resetTests,
      elements: elementTests
    }
  }
  
  validateReset(testResults) {
    const issues = []
    
    if (testResults.body.hasMargin) {
      issues.push('Body has default margin - reset may not be applied')
    }
    
    if (testResults.body.hasPadding) {
      issues.push('Body has default padding - reset may not be applied')
    }
    
    if (testResults.body.boxSizing !== 'border-box') {
      issues.push('Box-sizing not set to border-box - consider modern reset')
    }
    
    return {
      isValid: issues.length === 0,
      issues
    }
  }
}

// Usage
const tester = new CSSResetTester()
tester.testReset('https://example.com').then(results => {
  const validation = tester.validateReset(results)
  console.log('Reset Test Results:', validation)
})
```

## Best Practices

1. **Choose Appropriately**: Select reset based on project needs (normalize for preservation, modern for clean slate)
2. **Load First**: Ensure reset CSS loads before other stylesheets
3. **Framework Awareness**: Check if your CSS framework includes a reset
4. **Consistent Approach**: Use the same reset across all pages
5. **Modern Techniques**: Consider modern resets with better accessibility features
6. **Test Thoroughly**: Verify reset works across all target browsers
7. **Document Choice**: Document which reset is used and why
8. **Keep Updated**: Regularly update reset to latest stable version

## Choosing the Right Reset

Choose between [normalize.css](https://github.com/necolas/normalize.css) and [CSS Remedy](https://github.com/jensimmons/cssremedy) based on how much browser default behavior you want to preserve versus flatten.

### Decision Matrix

| Reset Type | Use Case | Pros | Cons |
|------------|----------|------|------|
| **Normalize.css** | General purpose, preserves useful defaults | Consistent across browsers, well-tested | Larger file size, some unwanted defaults |
| **Meyer's Reset** | Complete control, minimal starting point | Small size, removes everything | Too aggressive, removes useful defaults |
| **Modern Reset** | Modern applications, accessibility-focused | Includes modern best practices | Newer, less battle-tested |
| **CSS Remedy** | Progressive enhancement approach | Thoughtful defaults, modern features | Still in development |
| **Custom Reset** | Specific project needs | Tailored to exact requirements | More maintenance, requires expertise |

### Framework Considerations

```css
/* Bootstrap includes Reboot (based on Normalize) */
@import '~bootstrap/scss/bootstrap';

/* Tailwind CSS includes Preflight (modern reset) */
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* Bulma includes a normalize-based reset */
@import '~bulma/bulma';
```

Remember to check if your chosen CSS framework already includes a reset to avoid conflicts or redundancy.

## Verification

### Automated Checks

- Use browser or CI tooling where applicable to verify the fix.

### Manual Checks

- Confirm the rule in the final rendered output or runtime behavior.
- Test one primary path and one edge case affected by the change.
- Re-check shared abstractions so the fix is applied consistently.