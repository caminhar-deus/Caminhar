# Lint CSS and SCSS files

> All CSS/SCSS files are linted with Stylelint to detect errors and enforce standards.

**Priority:** medium · **Difficulty:** beginner · **Time:** 20 min

---
CSS and SCSS linting tools like Stylelint help detect syntax errors, enforce coding standards, and maintain consistent code quality across stylesheets.

## Code Examples

### Installation
```bash
# Install Stylelint and standard config
npm install --save-dev stylelint stylelint-config-standard

# For SCSS support
npm install --save-dev stylelint-config-standard-scss

# For CSS-in-JS support
npm install --save-dev stylelint-config-styled-components

# Additional useful plugins
npm install --save-dev stylelint-order stylelint-scss
```

### Basic Configuration (.stylelintrc.json)
```json
{
  "extends": ["stylelint-config-standard"],
  "rules": {
    "indentation": 2,
    "string-quotes": "double",
    "no-duplicate-selectors": true,
    "color-hex-case": "lower",
    "color-hex-length": "short",
    "color-named": "never",
    "selector-combinator-space-after": "always",
    "selector-attribute-quotes": "always",
    "selector-attribute-operator-space-before": "never",
    "selector-attribute-operator-space-after": "never",
    "selector-attribute-brackets-space-inside": "never",
    "declaration-block-trailing-semicolon": "always",
    "declaration-colon-space-before": "never",
    "declaration-colon-space-after": "always",
    "declaration-block-single-line-max-declarations": 1,
    "property-no-unknown": true,
    "unit-allowed-list": ["px", "rem", "em", "%", "vh", "vw", "deg", "s", "ms"],
    "shorthand-property-no-redundant-values": true,
    "value-no-vendor-prefix": true,
    "property-no-vendor-prefix": true,
    "comment-pattern": "^.+$",
    "rule-empty-line-before": ["always", {
      "except": ["first-nested"],
      "ignore": ["after-comment"]
    }],
    "at-rule-no-unknown": true,
    "no-descending-specificity": true,
    "max-nesting-depth": 3,
    "selector-max-id": 0,
    "selector-no-qualifying-type": true,
    "font-family-no-missing-generic-family-keyword": true
  },
  "ignoreFiles": [
    "node_modules/**/*",
    "dist/**/*",
    "build/**/*",
    "**/*.min.css"
  ]
}
```

### SCSS Configuration
```json
{
  "extends": [
    "stylelint-config-standard",
    "stylelint-config-standard-scss"
  ],
  "plugins": [
    "stylelint-scss",
    "stylelint-order"
  ],
  "rules": {
    "scss/dollar-variable-pattern": "^[a-z][a-zA-Z0-9]*$",
    "scss/at-function-pattern": "^[a-z][a-zA-Z0-9]*$",
    "scss/at-mixin-pattern": "^[a-z][a-zA-Z0-9]*$",
    "scss/percent-placeholder-pattern": "^[a-z][a-zA-Z0-9]*$",
    "scss/at-import-partial-extension-blacklist": ["scss"],
    "scss/at-import-no-partial-leading-underscore": true,
    "scss/at-else-closing-brace-newline-after": "always-last-in-chain",
    "scss/at-else-closing-brace-space-after": "always-intermediate",
    "scss/at-else-empty-line-before": "never",
    "scss/at-if-closing-brace-newline-after": "always-last-in-chain",
    "scss/at-if-closing-brace-space-after": "always-intermediate",
    "scss/dollar-variable-colon-space-after": "always",
    "scss/dollar-variable-colon-space-before": "never",
    "scss/dollar-variable-no-missing-interpolation": true,
    "scss/double-slash-comment-whitespace-inside": "always",
    "scss/operator-no-unspaced": true,
    "scss/selector-no-redundant-nesting-selector": true,
    "order/properties-alphabetical-order": true
  }
}
```

### Advanced Configuration with Property Order
```json
{
  "extends": ["stylelint-config-standard-scss"],
  "plugins": ["stylelint-order"],
  "rules": {
    "order/properties-order": [
      [
        {
          "groupName": "Special",
          "emptyLineBefore": "always",
          "properties": [
            "composes",
            "@import",
            "@extend"
          ]
        },
        {
          "groupName": "Positioning",
          "emptyLineBefore": "always",
          "properties": [
            "position",
            "top",
            "right",
            "bottom",
            "left",
            "z-index"
          ]
        },
        {
          "groupName": "Box Model",
          "emptyLineBefore": "always",
          "properties": [
            "display",
            "flex",
            "flex-grow",
            "flex-shrink",
            "flex-basis",
            "flex-direction",
            "flex-flow",
            "flex-wrap",
            "grid",
            "grid-area",
            "grid-template",
            "grid-template-areas",
            "grid-template-rows",
            "grid-template-columns",
            "grid-row",
            "grid-row-start",
            "grid-row-end",
            "grid-column",
            "grid-column-start",
            "grid-column-end",
            "grid-auto-rows",
            "grid-auto-columns",
            "grid-auto-flow",
            "grid-gap",
            "grid-row-gap",
            "grid-column-gap",
            "gap",
            "row-gap",
            "column-gap",
            "align-content",
            "align-items",
            "align-self",
            "justify-content",
            "justify-items",
            "justify-self",
            "order",
            "float",
            "clear",
            "object-fit",
            "overflow",
            "overflow-x",
            "overflow-y",
            "clip",
            "zoom",
            "width",
            "min-width",
            "max-width",
            "height",
            "min-height",
            "max-height",
            "margin",
            "margin-top",
            "margin-right",
            "margin-bottom",
            "margin-left",
            "padding",
            "padding-top",
            "padding-right",
            "padding-bottom",
            "padding-left"
          ]
        },
        {
          "groupName": "Typography",
          "emptyLineBefore": "always",
          "properties": [
            "color",
            "font",
            "font-family",
            "font-size",
            "font-style",
            "font-variant",
            "font-weight",
            "font-stretch",
            "font-display",
            "line-height",
            "letter-spacing",
            "text-align",
            "text-decoration",
            "text-indent",
            "text-overflow",
            "text-rendering",
            "text-shadow",
            "text-transform",
            "text-wrap",
            "white-space",
            "word-spacing",
            "word-wrap",
            "word-break",
            "tab-size",
            "hyphens"
          ]
        },
        {
          "groupName": "Visual",
          "emptyLineBefore": "always",
          "properties": [
            "background",
            "background-color",
            "background-image",
            "background-position",
            "background-size",
            "background-repeat",
            "background-origin",
            "background-clip",
            "background-attachment",
            "background-blend-mode",
            "border",
            "border-top",
            "border-right",
            "border-bottom",
            "border-left",
            "border-width",
            "border-top-width",
            "border-right-width",
            "border-bottom-width",
            "border-left-width",
            "border-style",
            "border-top-style",
            "border-right-style",
            "border-bottom-style",
            "border-left-style",
            "border-color",
            "border-top-color",
            "border-right-color",
            "border-bottom-color",
            "border-left-color",
            "border-radius",
            "border-top-left-radius",
            "border-top-right-radius",
            "border-bottom-right-radius",
            "border-bottom-left-radius",
            "border-image",
            "border-image-source",
            "border-image-slice",
            "border-image-width",
            "border-image-outset",
            "border-image-repeat",
            "outline",
            "outline-width",
            "outline-style",
            "outline-color",
            "outline-offset",
            "box-shadow",
            "opacity",
            "filter",
            "backdrop-filter"
          ]
        },
        {
          "groupName": "Animation",
          "emptyLineBefore": "always",
          "properties": [
            "transform",
            "transform-origin",
            "transform-style",
            "perspective",
            "perspective-origin",
            "backface-visibility",
            "transition",
            "transition-property",
            "transition-duration",
            "transition-timing-function",
            "transition-delay",
            "animation",
            "animation-name",
            "animation-duration",
            "animation-play-state",
            "animation-timing-function",
            "animation-delay",
            "animation-iteration-count",
            "animation-direction",
            "animation-fill-mode"
          ]
        },
        {
          "groupName": "Misc",
          "emptyLineBefore": "always",
          "properties": [
            "appearance",
            "content",
            "clip-path",
            "counter-reset",
            "counter-increment",
            "resize",
            "cursor",
            "pointer-events",
            "will-change",
            "user-select",
            "list-style",
            "list-style-type",
            "list-style-position",
            "list-style-image",
            "caption-side",
            "table-layout",
            "border-collapse",
            "border-spacing",
            "empty-cells",
            "quotes"
          ]
        }
      ],
      {
        "unspecified": "bottom"
      }
    ]
  }
}
```

## Why It Matters

CSS linting catches syntax errors, enforces consistent coding standards, and prevents maintainability issues before they reach production.

## Framework-Specific Linting

### React with CSS Modules
```json
{
  "extends": ["stylelint-config-standard"],
  "rules": {
    "selector-pseudo-class-no-unknown": [
      true,
      {
        "ignorePseudoClasses": ["export", "import", "global", "local", "external"]
      }
    ],
    "selector-type-no-unknown": [
      true,
      {
        "ignoreTypes": ["from"]
      }
    ],
    "property-no-unknown": [
      true,
      {
        "ignoreProperties": ["composes"]
      }
    ],
    "at-rule-no-unknown": [
      true,
      {
        "ignoreAtRules": ["value"]
      }
    ]
  }
}
```

### Styled Components Configuration
```json
{
  "extends": [
    "stylelint-config-standard",
    "stylelint-config-styled-components"
  ],
  "processors": ["stylelint-processor-styled-components"],
  "rules": {
    "value-keyword-case": null,
    "declaration-empty-line-before": null
  }
}
```

### Tailwind CSS Configuration
```json
{
  "extends": ["stylelint-config-standard"],
  "rules": {
    "at-rule-no-unknown": [
      true,
      {
        "ignoreAtRules": [
          "tailwind",
          "apply",
          "variants",
          "responsive",
          "screen",
          "layer"
        ]
      }
    ],
    "declaration-block-trailing-semicolon": null,
    "no-descending-specificity": null
  }
}
```

## Build Tool Integration

### Webpack Integration
```javascript
// webpack.config.js
const StylelintPlugin = require('stylelint-webpack-plugin')

module.exports = {
  plugins: [
    new StylelintPlugin({
      configFile: '.stylelintrc.json',
      context: 'src',
      files: '**/*.(s(c|a)ss|css)',
      failOnError: false,
      quiet: false,
      emitErrors: true,
      emitWarnings: true,
      fix: false // Set to true to auto-fix issues
    })
  ]
}
```

### Vite Integration
```javascript
// vite.config.js

  plugins: [
    stylelint({
      fix: true,
      include: ['src/**/*.{css,scss,sass,vue}']
    })
  ]
})
```

### Gulp Integration
```javascript
// gulpfile.js
const gulp = require('gulp')
const stylelint = require('gulp-stylelint')

gulp.task('lint-css', () => {
  return gulp
    .src('src/**/*.scss')
    .pipe(stylelint({
      reporters: [
        { formatter: 'verbose', console: true }
      ],
      fix: true
    }))
})

gulp.task('watch-css', () => {
  gulp.watch('src/**/*.scss', gulp.series('lint-css'))
})
```

### npm Scripts
```json
{
  "scripts": {
    "lint:css": "stylelint \"src/**/*.{css,scss}\"",
    "lint:css:fix": "stylelint \"src/**/*.{css,scss}\" --fix",
    "lint:css:report": "stylelint \"src/**/*.{css,scss}\" --formatter json --output-file reports/stylelint-report.json"
  }
}
```

## IDE Integration

### VS Code Configuration
```json
{
  "css.validate": false,
  "less.validate": false,
  "scss.validate": false,
  "stylelint.enable": true,
  "stylelint.packageManager": "npm",
  "stylelint.validate": ["css", "scss", "sass"],
  "editor.codeActionsOnSave": {
    "source.fixAll.stylelint": true
  },
  "[css]": {
    "editor.defaultFormatter": "stylelint.vscode-stylelint"
  },
  "[scss]": {
    "editor.defaultFormatter": "stylelint.vscode-stylelint"
  }
}
```

### EditorConfig for CSS
```ini
# .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{css,scss,sass}]
indent_style = space
indent_size = 2

[*.{json,yml,yaml}]
indent_style = space
indent_size = 2
```

## Custom Rules and Plugins

### Custom Stylelint Rule
```javascript
// stylelint-no-important.js
const stylelint = require('stylelint')
const { utils } = stylelint

const ruleName = 'my-org/no-important'
const messages = utils.ruleMessages(ruleName, {
  rejected: 'Avoid using !important'
})

module.exports = stylelint.createPlugin(ruleName, (actual) => {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, { actual })
    
    if (!validOptions) {
      return
    }

    root.walkDecls((decl) => {
      if (decl.important) {
        utils.report({
          message: messages.rejected,
          node: decl,
          result,
          ruleName
        })
      }
    })
  }
})

module.exports.ruleName = ruleName
module.exports.messages = messages
```

### BEM Methodology Linting
```json
{
  "extends": ["stylelint-config-standard"],
  "plugins": ["stylelint-selector-bem-pattern"],
  "rules": {
    "plugin/selector-bem-pattern": {
      "preset": "bem",
      "componentName": "[A-Z]+",
      "componentSelectors": {
        "initial": "^\\.{componentName}(?:-[a-z]+)*$",
        "combined": "^\\.combined-{componentName}-[a-z]+$"
      },
      "utilitySelectors": "^\\.util-[a-z]+$"
    }
  }
}
```

## Automated Testing and CI Integration

### GitHub Actions
```yaml
# .github/workflows/css-lint.yml
name: CSS Linting

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-css:
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
    
    - name: Run Stylelint
      run: npm run lint:css
    
    - name: Generate CSS lint report
      if: failure()
      run: |
        npm run lint:css:report
        echo "CSS_LINT_REPORT< $GITHUB_ENV
        cat reports/stylelint-report.json >> $GITHUB_ENV
        echo "EOF" >> $GITHUB_ENV
    
    - name: Comment PR with lint results
      if: failure() && github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const report = JSON.parse(process.env.CSS_LINT_REPORT || '[]')
          let comment = '## CSS Linting Results\n\n'
          
          if (report.length === 0) {
            comment += '✅ No CSS linting errors found!'
          } else {
            comment += '❌ CSS linting errors found:\n\n'
            report.forEach(file => {
              if (file.warnings.length > 0) {
                comment += `**${file.source}:**\n`
                file.warnings.forEach(warning => {
                  comment += `- Line ${warning.line}: ${warning.text}\n`
                })
                comment += '\n'
              }
            })
          }
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          })
```

### Pre-commit Hooks
```bash
# Install husky and lint-staged
npm install --save-dev husky lint-staged

# Setup husky
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

```json
{
  "lint-staged": {
    "*.{css,scss,sass}": [
      "stylelint --fix",
      "git add"
    ]
  }
}
```

## Error Detection and Common Issues

### Common CSS Errors Detected
```css
/* Syntax errors */
.invalid-property {
  colr: red; /* Property misspelled */
  background-color: #ff000; /* Invalid hex color */
  margin: 10; /* Missing unit */
  padding: 10px 20px 30px 40px 50px; /* Too many values */
}

/* Structure errors */
.unclosed-rule {
  color: blue;
  /* Missing closing brace */

.nested-too-deep {
  .level1 {
    .level2 {
      .level3 {
        .level4 {
          /* Exceeds max nesting depth */
          color: red;
        }
      }
    }
  }
}

/* Performance issues */
.performance-issue {
  color: red !important; /* Avoid !important */
  background-image: url('very-large-image.jpg'); /* Large images */
}

/* Accessibility issues */
.accessibility-issue {
  color: #ffffff;
  background-color: #ffffffe; /* Poor contrast */
  font-size: 8px; /* Too small for readability */
}
```

### Linting Report Analysis
```javascript
// stylelint-reporter.js
const fs = require('fs')

class StylelintReporter {
  static analyzeReport(reportPath) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
    
    const analysis = {
      totalFiles: report.length,
      totalWarnings: 0,
      totalErrors: 0,
      ruleBreakdown: {},
      fileBreakdown: []
    }
    
    report.forEach(file => {
      const fileAnalysis = {
        file: file.source,
        warnings: file.warnings.length,
        errors: file.errored ? 1 : 0,
        rules: {}
      }
      
      file.warnings.forEach(warning => {
        if (warning.severity === 'error') {
          analysis.totalErrors++
          fileAnalysis.errors++
        } else {
          analysis.totalWarnings++
        }
        
        // Count rule occurrences
        const rule = warning.rule
        analysis.ruleBreakdown[rule] = (analysis.ruleBreakdown[rule] || 0) + 1
        fileAnalysis.rules[rule] = (fileAnalysis.rules[rule] || 0) + 1
      })
      
      analysis.fileBreakdown.push(fileAnalysis)
    })
    
    return analysis
  }
  
  static generateSummary(analysis) {
    console.log('=== Stylelint Report Summary ===')
    console.log(`Files analyzed: ${analysis.totalFiles}`)
    console.log(`Total warnings: ${analysis.totalWarnings}`)
    console.log(`Total errors: ${analysis.totalErrors}`)
    
    console.log('\n=== Most Common Issues ===')
    const sortedRules = Object.entries(analysis.ruleBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
    
    sortedRules.forEach(([rule, count]) => {
      console.log(`${rule}: ${count} occurrences`)
    })
    
    console.log('\n=== Files with Most Issues ===')
    const sortedFiles = analysis.fileBreakdown
      .sort((a, b) => (b.warnings + b.errors) - (a.warnings + a.errors))
      .slice(0, 10)
    
    sortedFiles.forEach(file => {
      console.log(`${file.file}: ${file.warnings + file.errors} issues`)
    })
  }
}

// Usage
const analysis = StylelintReporter.analyzeReport('reports/stylelint-report.json')
StylelintReporter.generateSummary(analysis)
```

## Performance Optimization

### Large Project Optimization
```json
{
  "extends": ["stylelint-config-standard"],
  "cache": true,
  "cacheLocation": "node_modules/.cache/stylelint",
  "ignoreFiles": [
    "node_modules/**/*",
    "dist/**/*",
    "**/*.min.css",
    "vendor/**/*"
  ],
  "rules": {
    "max-line-length": null,
    "no-descending-specificity": null
  }
}
```

### Parallel Processing
```javascript
// parallel-stylelint.js
const { Worker } = require('worker_threads')
const path = require('path')
const glob = require('glob')

class ParallelStylelint {
  constructor(options = {}) {
    this.workerCount = options.workers || require('os').cpus().length
    this.configFile = options.configFile || '.stylelintrc.json'
  }
  
  async lintFiles(pattern) {
    const files = glob.sync(pattern)
    const chunks = this.chunkArray(files, Math.ceil(files.length / this.workerCount))
    
    const workers = chunks.map(chunk => 
      new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'stylelint-worker.js'), {
          workerData: { files: chunk, configFile: this.configFile }
        })
        
        worker.on('message', resolve)
        worker.on('error', reject)
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`))
          }
        })
      })
    )
    
    const results = await Promise.all(workers)
    return results.flat()
  }
  
  chunkArray(array, chunkSize) {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }
}

// Usage
const linter = new ParallelStylelint({ workers: 4 })
linter.lintFiles('src/**/*.scss').then(results => {
  console.log('Linting completed:', results)
})
```

## Best Practices

1. **Start Early**: Integrate linting from the beginning of the project
2. **Team Standards**: Establish consistent rules across the team
3. **Gradual Adoption**: Introduce rules gradually to avoid overwhelming errors
4. **Auto-fix**: Use auto-fixing capabilities for simple issues
5. **IDE Integration**: Enable real-time linting in code editors
6. **CI Integration**: Include linting in continuous integration pipelines
7. **Documentation**: Document custom rules and style guidelines
8. **Regular Updates**: Keep linting tools and configurations updated
9. **Performance**: Optimize linting configuration for large projects
10. **Education**: Train team members on CSS best practices and linting rules

## Verification

### Automated Checks

- Confirm the computed styles match the intended fix in DevTools.
- If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.

### Manual Checks

- Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
- Test at least one mobile and one desktop viewport before shipping.