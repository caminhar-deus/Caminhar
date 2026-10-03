# Lint JavaScript code

> JavaScript code is linted with ESLint to detect errors and enforce coding standards.

**Priority:** medium · **Difficulty:** beginner · **Time:** 20 min

---
JavaScript linting tools such as [ESLint](https://eslint.org/docs/latest/use/getting-started), [Biome](https://biomejs.dev/linter/), and [typescript-eslint](https://typescript-eslint.io/getting-started/) catch syntax errors, enforce coding standards, and keep code quality consistent across development teams.
## Code Examples

#

## Installation and Basic Setup
```bash
# Install ESLint
pnpm add -D eslint

# Initialize ESLint configuration
pnpm dlx eslint --init

# Install popular configurations
pnpm add -D @eslint/js
pnpm add -D eslint-config-airbnb-base
pnpm add -D eslint-config-standard

# For React projects
pnpm add -D eslint-plugin-react eslint-plugin-react-hooks
pnpm add -D eslint-config-react-app

# For TypeScript
pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin

# For Vue.js
pnpm add -D eslint-plugin-vue

# Additional useful plugins
pnpm add -D eslint-plugin-import
pnpm add -D eslint-plugin-node
pnpm add -D eslint-plugin-promise
pnpm add -D eslint-plugin-security
```

### Basic Configuration

  
    ```javascript
    // .eslintrc.js
    module.exports = {
      env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true
      },

      extends: [
        'eslint:recommended',
        'airbnb-base'
      ],

      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },

      rules: {
        // Error prevention
        'no-console': 'warn',
        'no-debugger': 'error',
        'no-alert': 'error',
        'no-unused-vars': 'error',
        'no-undef': 'error',
        'no-unreachable': 'error',

        // Code style
        'indent': ['error', 2],
        'quotes': ['error', 'single'],
        'semi': ['error', 'never'],
        'comma-dangle': ['error', 'never'],
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],

        // Best practices
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'dot-notation': 'error',
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-script-url': 'error',

        // ES6+
        'prefer-const': 'error',
        'prefer-arrow-callback': 'error',
        'arrow-spacing': 'error',
        'no-var': 'error',
        'object-shorthand': 'error',
        'prefer-template': 'error',

        // Import rules
        'import/order': ['error', {
          'groups': [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index'
          ],
          'newlines-between': 'always'
        }],
        'import/no-unresolved': 'error',
        'import/no-unused-modules': 'warn'
      },

      ignorePatterns: [
        'node_modules/',
        'dist/',
        'build/',
        '*.min.js',
        'coverage/'
      ]
    }
    ```
  
  
    ```json
    // biome.json
    {
      "linter": {
        "enabled": true,
        "rules": {
          "recommended": true,
          "suspicious": {
            "noConsoleLog": "warn",
            "noDebugger": "error",
            "noDoubleEquals": "error"
          },
          "correctness": {
            "noUnusedVariables": "error",
            "noUnreachable": "error"
          },
          "style": {
            "noVar": "error",
            "useConst": "error",
            "useShorthandArrayType": "error",
            "useTemplate": "error"
          },
          "security": {
            "noGlobalEval": "error"
          }
        }
      },
      "formatter": {
        "indentStyle": "space",
        "indentWidth": 2
      },
      "javascript": {
        "formatter": {
          "quoteStyle": "single",
          "semicolons": "asNeeded",
          "trailingCommas": "none"
        }
      },
      "files": {
        "ignore": [
          "node_modules/",
          "dist/",
          "build/",
          "*.min.js",
          "coverage/"
        ]
      }
    }
    ```
  

## Why It Matters

Linting catches bugs before runtime, enforces team coding standards, and prevents common mistakes that slip through code review.

## Framework-Specific Configurations

### React ESLint Configuration
```javascript
// .eslintrc.js for React
module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true
  },

  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended'
  ],

  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y'
  ],

  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },

  settings: {
    react: {
      version: 'detect'
    }
  },

  rules: {
    // React specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/prop-types': 'error',
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/jsx-pascal-case': 'error',
    'react/no-deprecated': 'error',
    'react/no-direct-mutation-state': 'error',
    'react/no-typos': 'error',
    'react/require-render-return': 'error',
    'react/style-prop-object': 'error',

    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // JSX accessibility rules
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/img-redundant-alt': 'error',
    'jsx-a11y/label-has-associated-control': 'error',
    'jsx-a11y/no-access-key': 'error'
  }
}
```

### TypeScript Configuration

  
    ```javascript
    // .eslintrc.js for TypeScript
    module.exports = {
      parser: '@typescript-eslint/parser',

      plugins: [
        '@typescript-eslint'
      ],

      extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
        '@typescript-eslint/recommended-requiring-type-checking'
      ],

      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json']
      },

      rules: {
        // TypeScript specific rules
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/explicit-module-boundary-types': 'warn',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/strict-boolean-expressions': 'error',
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/prefer-readonly-parameter-types': 'warn',

        // Disable base ESLint rules that are covered by TypeScript
        'no-unused-vars': 'off',
        'no-undef': 'off', // TypeScript handles this
        'no-dupe-args': 'off',
        'no-dupe-keys': 'off',
        'no-unreachable': 'off',
        'valid-typeof': 'off',

        // Override recommended rules for better TypeScript experience
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/ban-ts-comment': ['error', {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false
        }]
      },

      overrides: [
        {
          files: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
          rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off'
          }
        }
      ]
    }
    ```
  
  
    ```json
    // biome.json for TypeScript
    {
      "linter": {
        "enabled": true,
        "rules": {
          "recommended": true,
          "correctness": {
            "noUnusedVariables": "error"
          },
          "suspicious": {
            "noExplicitAny": "warn",
            "noNonNullAssertion": "warn"
          },
          "complexity": {
            "useOptionalChain": "error"
          },
          "style": {
            "noNonNullAssertion": "warn"
          },
          "nursery": {
            "useStrictMode": "error"
          }
        }
      },
      "javascript": {
        "globals": []
      },
      "overrides": [
        {
          "include": ["*.test.ts", "*.test.tsx", "*.spec.ts", "*.spec.tsx"],
          "linter": {
            "rules": {
              "suspicious": {
                "noExplicitAny": "off"
              }
            }
          }
        }
      ]
    }
    ```
  

### Vue.js ESLint Configuration
```javascript
// .eslintrc.js for Vue.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },

  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-essential',
    'plugin:vue/vue3-strongly-recommended',
    'plugin:vue/vue3-recommended'
  ],

  plugins: [
    'vue'
  ],

  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: '@babel/eslint-parser',
    requireConfigFile: false
  },

  rules: {
    // Vue specific rules
    'vue/html-indent': ['error', 2],
    'vue/html-quotes': ['error', 'double'],
    'vue/html-self-closing': ['error', {
      'html': {
        'void': 'always',
        'normal': 'never',
        'component': 'always'
      },
      'svg': 'always',
      'math': 'always'
    }],
    'vue/max-attributes-per-line': ['error', {
      'singleline': 3,
      'multiline': 1
    }],
    'vue/multiline-html-element-content-newline': 'error',
    'vue/no-multi-spaces': 'error',
    'vue/no-spaces-around-equal-signs-in-attribute': 'error',
    'vue/require-default-prop': 'error',
    'vue/require-prop-types': 'error',
    'vue/v-bind-style': ['error', 'shorthand'],
    'vue/v-on-style': ['error', 'shorthand'],
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    'vue/prop-name-casing': ['error', 'camelCase']
  }
}
```

## Advanced Linting Configurations

### Security-Focused ESLint Setup
```javascript
// Security-focused configuration
module.exports = {
  plugins: [
    'security',
    'no-secrets'
  ],

  extends: [
    'eslint:recommended',
    'plugin:security/recommended'
  ],

  rules: {
    // Security rules
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-require': 'warn',
    'security/detect-object-injection': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-unsafe-regex': 'error',

    // Prevent secrets in code
    'no-secrets/no-secrets': 'error',

    // Dangerous patterns
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-proto': 'error',
    'no-with': 'error'
  }
}
```

### Performance-Focused Rules

  
    ```javascript
    module.exports = {
      rules: {
        // Performance rules
        'no-loop-func': 'error',
        'prefer-const': 'error',
        'no-var': 'error',

        // Memory leaks prevention
        'no-global-assign': 'error',
        'no-implicit-globals': 'error',
        'no-unused-vars': ['error', {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_'
        }],

        // Efficient patterns
        'prefer-template': 'error',
        'prefer-spread': 'error',
        'prefer-rest-params': 'error',
        'no-useless-concat': 'error',
        'no-useless-call': 'error',

        // Array/Object efficiency
        'prefer-destructuring': ['error', {
          'array': true,
          'object': true
        }, {
          'enforceForRenamedProperties': false
        }]
      }
    }
    ```
  
  
    ```json
    {
      "linter": {
        "rules": {
          "style": {
            "useConst": "error",
            "noVar": "error",
            "useTemplate": "error"
          },
          "correctness": {
            "noUnusedVariables": "error",
            "noGlobalAssign": "error"
          },
          "complexity": {
            "useFlatMap": "error",
            "noUselessFragments": "error"
          },
          "performance": {
            "noAccumulatingSpread": "error",
            "noDelete": "warn"
          }
        }
      }
    }
    ```
  

## Custom ESLint Rules

### Creating Custom Rules
```javascript
// rules/no-console-log.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow console.log statements',
      category: 'Best Practices',
      recommended: false
    },
    fixable: 'code',
    schema: []
  },

  create(context) {
    return {
      MemberExpression(node) {
        if (node.object.name === 'console' && node.property.name === 'log') {
          context.report({
            node,
            message: 'console.log statements are not allowed',
            fix(fixer) {
              return fixer.remove(node.parent)
            }
          })
        }
      }
    }
  }
}

// Custom rule for enforcing component naming
// rules/component-naming.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce PascalCase for React component names'
    }
  },

  create(context) {
    function isPascalCase(name) {
      return /^[A-Z][a-zA-Z0-9]*$/.test(name)
    }

    return {
      FunctionDeclaration(node) {
        if (node.id && node.id.name) {
          const { name } = node.id

          // Check if function returns JSX (simplified check)
          const hasJSXReturn = context.getSourceCode().getText(node).includes('return')

          if (hasJSXReturn && !isPascalCase(name)) {
            context.report({
              node: node.id,
              message: `Component '${name}' should use PascalCase naming`
            })
          }
        }
      }
    }
  }
}

// Using custom rules in configuration
module.exports = {
  plugins: [
    'local'  // For local custom rules
  ],

  rules: {
    'local/no-console-log': 'error',
    'local/component-naming': 'error'
  }
}
```

## Build Tool Integration

### Webpack ESLint Integration
```javascript
// webpack.config.js
const ESLintPlugin = require('eslint-webpack-plugin')

module.exports = {
  plugins: [
    new ESLintPlugin({
      extensions: ['js', 'jsx', 'ts', 'tsx'],
      fix: true, // Auto-fix issues
      failOnError: false,
      failOnWarning: false,
      emitError: true,
      emitWarning: true,
      quiet: false,
      outputReport: {
        filePath: 'reports/eslint-report.html',
        formatter: 'html'
      }
    })
  ]
}
```

### Vite ESLint Integration
```javascript
// vite.config.js

  plugins: [
    eslint({
      include: ['src/**/*.js', 'src/**/*.jsx', 'src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['node_modules', 'dist'],
      fix: true
    })
  ]
})
```

### Next.js ESLint Integration
```javascript
// next.config.js
module.exports = {
  eslint: {
    // Run ESLint during build
    dirs: ['pages', 'utils', 'components', 'lib'],

    // Ignore ESLint during production builds (not recommended)
    ignoreDuringBuilds: false
  },

  // Custom webpack config for ESLint
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.module.rules.push({
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'eslint-loader',
            options: {
              cache: true,
              fix: true
            }
          }
        ]
      })
    }

    return config
  }
}
```

## IDE Integration

### VS Code ESLint Setup
```json
// .vscode/settings.json
{
  "eslint.enable": true,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.format.enable": true,
  "eslint.lintTask.enable": true,
  "eslint.run": "onSave",
  "eslint.autoFixOnSave": true,
  "eslint.codeActionsOnSave.mode": "all",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.defaultFormatter": "dbaeumer.vscode-eslint",
  "[javascript]": {
    "editor.defaultFormatter": "dbaeumer.vscode-eslint"
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "dbaeumer.vscode-eslint"
  },
  "[typescript]": {
    "editor.defaultFormatter": "dbaeumer.vscode-eslint"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "dbaeumer.vscode-eslint"
  }
}

// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

## Automated Testing and CI Integration

### Pre-commit Hooks
```bash
# Install husky and lint-staged
npm install --save-dev husky lint-staged

# Setup husky
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"

# Setup pre-push hook
npx husky add .husky/pre-push "npm run lint"
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  },
  "scripts": {
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src --ext .js,.jsx,.ts,.tsx --fix",
    "lint:report": "eslint src --ext .js,.jsx,.ts,.tsx --format html --output-file reports/eslint-report.html"
  }
}
```

### GitHub Actions ESLint Workflow
```yaml
# .github/workflows/eslint.yml
name: ESLint Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  eslint:
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

    - name: Run ESLint
      run: |
        npm run lint
        npm run lint:report
      continue-on-error: true

    - name: Annotate code with ESLint results
      uses: ataylorme/eslint-annotate-action@v2
      if: failure()
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"
        report-json: "reports/eslint-report.json"

    - name: Upload ESLint report
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: eslint-report
        path: reports/
        retention-days: 30

    - name: Comment PR with lint results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs')

          if (fs.existsSync('reports/eslint-report.json')) {
            const report = JSON.parse(fs.readFileSync('reports/eslint-report.json', 'utf8'))

            let comment = '## ESLint Results\n\n'
            let totalErrors = 0
            let totalWarnings = 0

            report.forEach(file => {
              totalErrors += file.errorCount
              totalWarnings += file.warningCount

              if (file.errorCount > 0 || file.warningCount > 0) {
                comment += `**${file.filePath.replace(process.cwd(), '')}:**\n`
                comment += `- Errors: ${file.errorCount}\n`
                comment += `- Warnings: ${file.warningCount}\n\n`
              }
            })

            comment += `### Summary\n`
            comment += `- Total Errors: ${totalErrors}\n`
            comment += `- Total Warnings: ${totalWarnings}\n`

            if (totalErrors === 0) {
              comment += '\n✅ No ESLint errors found!'
            } else {
              comment += '\n❌ Please fix ESLint errors before merging.'
            }

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            })
          }
```

## Advanced Linting Techniques

### Code Quality Metrics

  
    ```javascript
    // eslint-complexity-rules.js
    module.exports = {
      rules: {
        // Complexity rules
        'complexity': ['error', { max: 10 }],
        'max-depth': ['error', 4],
        'max-lines': ['error', { max: 300, skipComments: true }],
        'max-lines-per-function': ['error', { max: 50, skipComments: true }],
        'max-nested-callbacks': ['error', 3],
        'max-params': ['error', 5],
        'max-statements': ['error', 20],
        'max-statements-per-line': ['error', { max: 1 }],

        // File organization
        'max-classes-per-file': ['error', 1],
        'one-var': ['error', 'never'],
        'prefer-object-spread': 'error',

        // Code duplication
        'no-duplicate-imports': 'error',
        'no-useless-return': 'error',
        'no-useless-constructor': 'error',
        'no-useless-rename': 'error'
      }
    }
    ```
  
  
    ```json
    {
      "linter": {
        "rules": {
          "complexity": {
            "noExcessiveCognitiveComplexity": {
              "level": "error",
              "options": { "maxAllowedComplexity": 10 }
            },
            "noExcessiveNestedTestSuites": "error",
            "noForEach": "warn",
            "useFlatMap": "error"
          },
          "correctness": {
            "noUnusedImports": "error"
          },
          "suspicious": {
            "noEmptyBlockStatements": "error",
            "noRedeclare": "error",
            "noSelfCompare": "error"
          },
          "style": {
            "noUselessElse": "error",
            "useShorthandFunctionType": "error"
          }
        }
      }
    }
    ```
  

### Team Collaboration Rules
```javascript
module.exports = {
  rules: {
    // Documentation
    'valid-jsdoc': ['error', {
      requireReturn: false,
      requireParamDescription: false,
      requireReturnDescription: false
    }],
    'require-jsdoc': ['warn', {
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true
      }
    }],

    // Naming conventions
    'camelcase': ['error', { properties: 'never' }],
    'new-cap': ['error', { newIsCap: true }],
    'no-underscore-dangle': ['error', { allowAfterThis: true }],

    // Code organization
    'sort-imports': ['error', {
      ignoreCase: false,
      ignoreDeclarationSort: false,
      ignoreMemberSort: false,
      memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single']
    }],

    // Error handling
    'handle-callback-err': 'error',
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error'
  }
}
```

## Performance Monitoring and Reporting

### ESLint Performance Analysis
```javascript
// scripts/eslint-performance.js
const { ESLint } = require('eslint')
const fs = require('fs')

class ESLintPerformanceAnalyzer {
  constructor(options = {}) {
    this.eslint = new ESLint({
      baseConfig: options.config || {},
      useEslintrc: options.useEslintrc !== false,
      fix: options.fix || false
    })
  }

  async analyzeProject(patterns) {
    const startTime = Date.now()

    try {
      const results = await this.eslint.lintFiles(patterns)
      const duration = Date.now() - startTime

      const analysis = {
        duration,
        totalFiles: results.length,
        totalErrors: results.reduce((sum, result) => sum + result.errorCount, 0),
        totalWarnings: results.reduce((sum, result) => sum + result.warningCount, 0),
        fileAnalysis: results.map(result => ({
          filePath: result.filePath,
          errorCount: result.errorCount,
          warningCount: result.warningCount,
          messages: result.messages.map(msg => ({
            ruleId: msg.ruleId,
            severity: msg.severity,
            message: msg.message,
            line: msg.line,
            column: msg.column
          }))
        })),
        ruleBreakdown: this.analyzeRuleBreakdown(results),
        performanceMetrics: {
          averageTimePerFile: duration / results.length,
          filesWithErrors: results.filter(r => r.errorCount > 0).length,
          filesWithWarnings: results.filter(r => r.warningCount > 0).length
        }
      }

      return analysis

    } catch (error) {
      throw new Error(`ESLint analysis failed: ${error.message}`)
    }
  }

  analyzeRuleBreakdown(results) {
    const ruleStats = new Map()

    results.forEach(result => {
      result.messages.forEach(message => {
        const ruleId = message.ruleId || 'unknown'
        const existing = ruleStats.get(ruleId) || { count: 0, errors: 0, warnings: 0 }

        existing.count++
        if (message.severity === 2) existing.errors++
        if (message.severity === 1) existing.warnings++

        ruleStats.set(ruleId, existing)
      })
    })

    return Array.from(ruleStats.entries())
      .map(([ruleId, stats]) => ({ ruleId, ...stats }))
      .sort((a, b) => b.count - a.count)
  }

  generateReport(analysis, outputPath) {
    const report = {
      summary: {
        totalFiles: analysis.totalFiles,
        totalErrors: analysis.totalErrors,
        totalWarnings: analysis.totalWarnings,
        duration: `${analysis.duration}ms`,
        averageTimePerFile: `${analysis.performanceMetrics.averageTimePerFile.toFixed(2)}ms`
      },
      topRules: analysis.ruleBreakdown.slice(0, 10),
      filesWithMostIssues: analysis.fileAnalysis
        .sort((a, b) => (b.errorCount + b.warningCount) - (a.errorCount + a.warningCount))
        .slice(0, 10)
        .map(file => ({
          file: file.filePath.replace(process.cwd(), ''),
          issues: file.errorCount + file.warningCount,
          errors: file.errorCount,
          warnings: file.warningCount
        })),
      timestamp: new Date().toISOString()
    }

    if (outputPath) {
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))
      console.log(`Report saved to ${outputPath}`)
    }

    return report
  }

  printSummary(analysis) {
    console.log('\n=== ESLint Analysis Summary ===')
    console.log(`Files analyzed: ${analysis.totalFiles}`)
    console.log(`Total errors: ${analysis.totalErrors}`)
    console.log(`Total warnings: ${analysis.totalWarnings}`)
    console.log(`Analysis time: ${analysis.duration}ms`)
    console.log(`Average time per file: ${analysis.performanceMetrics.averageTimePerFile.toFixed(2)}ms`)

    if (analysis.ruleBreakdown.length > 0) {
      console.log('\n=== Top Rule Violations ===')
      analysis.ruleBreakdown.slice(0, 5).forEach((rule, index) => {
        console.log(`${index + 1}. ${rule.ruleId}: ${rule.count} issues`)
      })
    }
  }
}

// Usage
async function main() {
  const analyzer = new ESLintPerformanceAnalyzer({
    fix: false,
    config: {
      extends: ['eslint:recommended']
    }
  })

  const analysis = await analyzer.analyzeProject(['src/**/*.js', 'src/**/*.jsx'])

  analyzer.printSummary(analysis)
  analyzer.generateReport(analysis, 'reports/eslint-analysis.json')
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = ESLintPerformanceAnalyzer
```

## Best Practices

Start from the official [ESLint getting started guide](https://eslint.org/docs/latest/use/getting-started) or the [typescript-eslint starter setup](https://typescript-eslint.io/getting-started/) instead of inventing a rule stack from scratch on day one.

1. **Start with Recommended**: Begin with `eslint:recommended` and gradually add rules
2. **Team Consistency**: Establish rules that your entire team can follow
3. **Gradual Adoption**: Introduce stricter rules incrementally
4. **IDE Integration**: Ensure real-time linting feedback in development
5. **Automated Fixing**: Use `--fix` flag to automatically resolve fixable issues
6. **Regular Updates**: Keep ESLint and plugins updated
7. **Custom Rules**: Create custom rules for team-specific patterns
8. **Performance Monitoring**: Track linting performance in large codebases
9. **Documentation**: Document custom rules and team conventions
10. **CI Integration**: Include linting in continuous integration pipelines

## Common ESLint Errors and Solutions

### Typical Configuration Issues
```javascript
// Common fixes for ESLint issues

// 1. Parsing errors with modern JavaScript
{
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  }
}

// 2. React not defined errors
{
  "rules": {
    "react/react-in-jsx-scope": "off"  // React 17+
  }
}

// 3. TypeScript parsing issues
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  }
}

// 4. Import resolution errors
{
  "settings": {
    "import/resolver": {
      "node": {
        "extensions": [".js", ".jsx", ".ts", ".tsx"]
      }
    }
  }
}
```

Remember that ESLint configuration should match your team's coding standards and project requirements. Regular review and adjustment of rules ensures the linting setup continues to serve your development goals effectively.

## Exceptions

- Some patterns are acceptable in generated, transpiled, or framework-managed output even when they are poor choices for hand-written application code.
- Do not flag a low-level implementation detail as the primary problem when a stronger architectural or runtime issue is causing the real failure.
- If the codebase already has a stricter lint or type-system rule that catches the same bug earlier, document that stronger source of truth.

## Verification

### Automated Checks

- Run the linter in CI and locally, then verify the changed code path still behaves correctly in the browser if the autofix touched runtime code.

### Manual Checks

- Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.