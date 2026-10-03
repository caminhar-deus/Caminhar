# Avoid embedded and inline CSS

> Embedded and inline CSS are avoided except for critical CSS and performance optimization.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
Avoid embedded CSS in `<style>` tags and inline CSS except for valid cases like critical CSS, dynamic styling, or performance optimization.

## Code Examples

### Problems with Inline CSS
```html
<!-- ❌ Bad: Inline styles -->
<div style="background-color: red; padding: 20px; margin: 10px; font-size: 16px;">
  Content with inline styles
</div>

<p style="color: blue; text-align: center; font-weight: bold;">
  Another element with inline styles
</p>

<!-- ❌ Bad: Embedded styles -->
<style>
  .header { background: blue; padding: 10px; }
  .content { margin: 20px; font-size: 14px; }
  .footer { background: gray; padding: 15px; }
</style>
```

### Problems This Creates
```html
<!-- Issues with inline/embedded CSS: -->

<!-- 1. No caching - styles downloaded with every page -->
<!-- 2. Maintenance nightmare - styles scattered throughout HTML -->
<!-- 3. Specificity issues - inline styles have highest specificity -->
<!-- 4. No reusability - same styles repeated multiple times -->
<!-- 5. Hard to debug - styles mixed with markup -->
<!-- 6. Performance impact - larger HTML files -->
```

## Why It Matters

Inline CSS cannot be cached separately, increases HTML payload, breaks separation of concerns, and is harder to maintain in large codebases.

## Correct External CSS Approach

### Proper CSS Structure
```html
<!-- ✅ Good: External CSS -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Title</title>

  <!-- External CSS files -->
  <link rel="stylesheet" href="css/normalize.css">
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/components.css">
  <link rel="stylesheet" href="css/layout.css">
</head>
<body>
  <div class="header">
    <h1 class="header__title">Page Title</h1>
  </div>

  <main class="content">
    <p class="content__text">Content with external CSS classes</p>
  </main>

  <footer class="footer">
    <p class="footer__text">Footer content</p>
  </footer>
</body>
</html>
```

### External CSS Files
```css
/* css/base.css */
html {
  font-size: 16px;
  line-height: 1.5;
}

body {
  margin: 0;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: #333;
}

/* css/components.css */
.header {
  background: #007bff;
  padding: 1rem;
  color: white;
}

.header__title {
  margin: 0;
  font-size: 1.5rem;
}

.content {
  margin: 2rem;
  max-width: 800px;
}

.content__text {
  margin-bottom: 1rem;
  line-height: 1.6;
}

.footer {
  background: #6c757d;
  padding: 1rem;
  color: white;
  text-align: center;
}

.footer__text {
  margin: 0;
  font-size: 0.9rem;
}
```

## Valid Use Cases for Inline/Embedded CSS

### 1. Critical Above-the-Fold CSS
```html
<!-- ✅ Valid: Critical CSS for performance -->
<head>
  <style>
    /* Critical CSS - above-the-fold styles only */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      line-height: 1.5;
    }

    .hero {
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .hero__title {
      font-size: 3rem;
      text-align: center;
      margin: 0;
    }
  </style>

  <!-- Non-critical CSS loaded asynchronously -->
  <link rel="preload" href="css/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="css/main.css"></noscript>
</head>
```

### 2. Dynamic Styling Based on Data
```jsx
// ✅ Valid: React dynamic styles
function ProgressBar({ percentage, color }) {
  const dynamicStyles = {
    width: `${percentage}%`,
    backgroundColor: color,
    transition: 'width 0.3s ease'
  }

  return (
    <div className="progress-bar">
      <div
        className="progress-bar__fill"
        style={dynamicStyles}
        aria-valuenow={percentage}
        role="progressbar"
      />
    </div>
  )
}

// External CSS for structure
.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  border-radius: 10px;
}
```

### 3. CSS-in-JS for Component Styling
```jsx
// ✅ Valid: CSS-in-JS with proper abstraction

const Button = styled.button`
  background: ${props => props.primary ? '#007bff' : '#6c757d'};
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${props => props.primary ? '#0056b3' : '#545b62'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

// Usage
function App() {
  return (
    <div>
      Primary Button
      Secondary Button
    </div>
  )
}
```

### 4. User Customization
```html
<!-- ✅ Valid: User-customizable styles -->
<div
  class="user-widget"
  style="--user-theme-color: {{ user.themeColor }}; --user-font-size: {{ user.fontSize }}px;"
>
  <h3 class="widget__title">User Dashboard</h3>
  <p class="widget__content">Customized content</p>
</div>
```

```css
/* External CSS using custom properties */
.user-widget {
  background: var(--user-theme-color, #007bff);
  font-size: var(--user-font-size, 16px);
  padding: 1rem;
  border-radius: 8px;
  color: white;
}

.widget__title {
  margin: 0 0 0.5rem 0;
  font-size: calc(var(--user-font-size, 16px) * 1.25);
}

.widget__content {
  margin: 0;
  line-height: 1.5;
}
```

## Framework-Specific Best Practices

### React with CSS Modules
```jsx
// ✅ React with CSS Modules

function Button({ variant = 'primary', size = 'medium', children, ...props }) {
  const classNames = [
    styles.button,
    styles[`button--${variant}`],
    styles[`button--${size}`]
  ].join(' ')

  return (
    <button className={classNames} {...props}>
      {children}
    </button>
  )
}

// Button.module.css
.button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.button--primary {
  background: #007bff;
  color: white;
}

.button--primary:hover {
  background: #0056b3;
}

.button--secondary {
  background: #6c757d;
  color: white;
}

.button--small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.button--large {
  padding: 1rem 2rem;
  font-size: 1.125rem;
}
```

### Vue with Scoped CSS
```vue
<!-- ✅ Vue with scoped CSS -->
<template>
  <div class="card" :class="cardClasses">
    <header class="card__header" v-if="title">
      <h3 class="card__title">{{ title }}</h3>
    </header>

    <div class="card__content">
      <slot />
    </div>

    <footer class="card__footer" v-if="hasFooter">
      <slot name="footer" />
    </footer>
  </div>
</template>

<script>

  props: {
    title: String,
    variant: {
      type: String,
      default: 'default',
      validator: value => ['default', 'primary', 'success', 'warning', 'danger'].includes(value)
    },
    elevated: Boolean
  },

  computed: {
    cardClasses() {
      return {
        [`card--${this.variant}`]: this.variant !== 'default',
        'card--elevated': this.elevated
      }
    },

    hasFooter() {
      return this.$slots.footer
    }
  }
}
</script>

<style scoped>
.card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  transition: box-shadow 0.2s ease;
}

.card--elevated {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card--primary {
  border-color: #007bff;
}

.card--primary .card__header {
  background: #007bff;
  color: white;
}

.card__header {
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.card__title {
  margin: 0;
  font-size: 1.125rem;
}

.card__content {
  padding: 1rem;
}

.card__footer {
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
}
</style>
```

### Angular with Component Styles
```typescript
// ✅ Angular with component styles

@Component({
  selector: 'app-alert',
  template: `
    <div
      class="alert"
      [class]="'alert--' + type"
      [class.alert--dismissible]="dismissible"
      role="alert"
    >
      <div class="alert__icon" *ngIf="showIcon">
        <ng-content select="[slot=icon]"></ng-content>
      </div>

      <div class="alert__content">
        <h4 class="alert__title" *ngIf="title">{{ title }}</h4>
        <ng-content></ng-content>
      </div>

      <button
        class="alert__close"
        *ngIf="dismissible"
        (click)="onDismiss()"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  `,
  styles: [`
    .alert {
      padding: 1rem;
      border-radius: 4px;
      border: 1px solid transparent;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .alert--success {
      background-color: #d4edda;
      border-color: #c3e6cb;
      color: #155724;
    }

    .alert--warning {
      background-color: #fff3cd;
      border-color: #ffeaa7;
      color: #856404;
    }

    .alert--danger {
      background-color: #f8d7da;
      border-color: #f5c6cb;
      color: #721c24;
    }

    .alert__content {
      flex: 1;
    }

    .alert__title {
      margin: 0 0 0.5rem 0;
      font-size: 1.125rem;
    }

    .alert__close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      opacity: 0.7;
    }

    .alert__close:hover {
      opacity: 1;
    }
  `]
})

  @Input() type: 'success' | 'warning' | 'danger' = 'success'
  @Input() title?: string
  @Input() dismissible = false
  @Input() showIcon = true

  onDismiss() {
    // Emit dismiss event
  }
}
```

## Linting and Automated Detection

### ESLint Rules for React
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'plugin:react/recommended'
  ],
  rules: {
    // Warn about inline styles
    'react/forbid-component-props': ['warn', {
      forbid: [
        {
          propName: 'style',
          message: 'Avoid inline styles. Use CSS classes or CSS-in-JS instead.'
        }
      ]
    }],

    // Warn about DOM attributes with style
    'react/forbid-dom-props': ['warn', {
      forbid: [
        {
          propName: 'style',
          message: 'Avoid inline styles. Use CSS classes instead.'
        }
      ]
    }]
  }
}
```

### Stylelint Configuration
```javascript
// .stylelintrc.js
module.exports = {
  extends: ['stylelint-config-standard'],
  rules: {
    // Disallow empty sources
    'no-empty-source': true,

    // Require specific patterns for class names
    'selector-class-pattern': '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',

    // Limit nesting depth
    'max-nesting-depth': 3,

    // Disallow unknown properties
    'property-no-unknown': true,

    // Require specific units for font sizes
    'unit-allowed-list': ['px', 'rem', 'em', '%', 'vw', 'vh', 'deg', 's', 'ms']
  }
}
```

### PostCSS Plugin for Inline Style Detection
```javascript
// postcss-no-inline-styles.js
const postcss = require('postcss')

module.exports = postcss.plugin('postcss-no-inline-styles', () => {
  return (root, result) => {
    // This plugin would analyze HTML and warn about inline styles
    // Implementation would scan for style attributes in HTML templates

    root.walkRules(rule => {
      if (rule.selector.includes('[style]')) {
        result.warn('Avoid targeting elements with inline styles', {
          node: rule
        })
      }
    })
  }
})
```

## Performance Optimization Strategies

### Critical CSS Extraction
```javascript
// critical-css-webpack-plugin.js
const critical = require('critical')
const HtmlWebpackPlugin = require('html-webpack-plugin')

class CriticalCSSPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync('CriticalCSSPlugin', async (compilation, callback) => {
      try {
        const htmlFiles = Object.keys(compilation.assets)
          .filter(name => name.endsWith('.html'))

        for (const htmlFile of htmlFiles) {
          await critical.generate({
            src: `dist/${htmlFile}`,
            dest: `dist/${htmlFile}`,
            inline: true,
            minify: true,
            width: 1300,
            height: 900,
            penthouse: {
              blockJSRequests: false
            }
          })
        }

        callback()
      } catch (error) {
        callback(error)
      }
    })
  }
}

// Usage in webpack.config.js
module.exports = {
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/index.html'
    }),

    new CriticalCSSPlugin()
  ]
}
```

### CSS-in-JS Performance Best Practices
```jsx
// ✅ Optimized CSS-in-JS patterns

// 1. Memoize dynamic styles
const Button = memo(styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  ${props => props.variant === 'primary' && css`
    background: #007bff;
    color: white;

    &:hover {
      background: #0056b3;
    }
  `}

  ${props => props.variant === 'secondary' && css`
    background: #6c757d;
    color: white;

    &:hover {
      background: #545b62;
    }
  `}
`)

// 2. Extract static styles
const staticButtonStyles = css`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
`

// 3. Use CSS custom properties for dynamic values
const ThemeProvider = ({ theme, children }) => {
  const themeStyles = useMemo(() => ({
    '--primary-color': theme.primary,
    '--secondary-color': theme.secondary,
    '--font-size-base': theme.fontSize + 'px'
  }), [theme])

  return (
    <div style={themeStyles} className="theme-provider">
      {children}
    </div>
  )
}
```

## Best Practices Summary

1. **External CSS First**: Use external stylesheets as the primary styling method
2. **Critical CSS Exception**: Inline only critical above-the-fold CSS
3. **Dynamic Styles**: Use inline styles only for truly dynamic values
4. **Component Architecture**: Use CSS Modules, styled-components, or scoped CSS
5. **Performance**: Minimize inline styles to reduce HTML size
6. **Maintainability**: Keep styles organized and reusable
7. **Caching**: External CSS benefits from browser caching
8. **Separation of Concerns**: Keep styling separate from markup
9. **Linting**: Use tools to detect and prevent inline style usage
10. **Documentation**: Document exceptions and rationale for inline CSS usage

## Migration Strategy

### Converting Inline to External CSS
```javascript
// inline-to-external-converter.js
const fs = require('fs')
const cheerio = require('cheerio')

class InlineToExternalConverter {
  constructor() {
    this.extractedStyles = new Map()
    this.classCounter = 0
  }

  convertFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    const $ = cheerio.load(content)

    $('[style]').each((index, element) => {
      const $element = $(element)
      const inlineStyles = $element.attr('style')

      // Generate unique class name
      const className = `extracted-${this.classCounter++}`

      // Store extracted styles
      this.extractedStyles.set(className, inlineStyles)

      // Replace inline style with class
      $element.removeClass().addClass(className)
      $element.removeAttr('style')
    })

    // Write updated HTML
    fs.writeFileSync(filePath, $.html())

    return this.generateCSS()
  }

  generateCSS() {
    let css = '/* Extracted inline styles */\n\n'

    for (const [className, styles] of this.extractedStyles) {
      css += `.${className} {\n`
      css += `  ${styles.replace(/;/g, ';\n  ')}\n`
      css += '}\n\n'
    }

    return css
  }
}

// Usage
const converter = new InlineToExternalConverter()
const extractedCSS = converter.convertFile('index.html')
fs.writeFileSync('extracted-styles.css', extractedCSS)
```

## Verification

### Automated Checks

- Confirm the computed styles match the intended fix in DevTools.
- If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.

### Manual Checks

- Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
- Test at least one mobile and one desktop viewport before shipping.