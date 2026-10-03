# Remove console statements in production

> Remove or disable console.log, console.debug, and other console statements before deploying to production.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
Console statements left in production code can leak sensitive information, impact performance, and create a poor user experience.

## Code Example

#

## Common Console Methods to Remove

```javascript
// ❌ Remove before production
console.log('User data:', userData)
console.debug('API response:', response)
console.info('Feature flag enabled')
console.table(results)
console.time('operation')
console.timeEnd('operation')
console.trace('Call stack')
console.group('Group')
console.groupEnd()

// ✅ Keep for legitimate purposes
console.error('Critical error:', error)  // May keep for error tracking
console.warn('Deprecation notice')        // May keep for developer warnings
```

## Why It Matters

Console statements leak sensitive information, impact performance, and create unprofessional user experiences when visible in production.

## Best Practices

### Conditional Logging

```javascript
// ✅ Good: Environment-aware logging
const isDev = process.env.NODE_ENV === 'development'

function log(...args) {
  if (isDev) {
    console.log(...args)
  }
}

// Usage
log('Debug info:', data)
```

### Using a Logging Service

```javascript
// ✅ Good: Structured logging service

// Development: logs to console
// Production: logs to service (Sentry, LogRocket, etc.)
logger.info('User logged in', { userId: user.id })
logger.error('API failed', { endpoint, error })
```

## Build Tool Configuration

### Linter Configuration

  
    ```javascript
    // .eslintrc.js
    module.exports = {
      rules: {
        'no-console': process.env.NODE_ENV === 'production'
          ? 'error'
          : 'warn'
      }
    }
    ```
  
  
    ```json
    // biome.json
    {
      "linter": {
        "rules": {
          "suspicious": {
            "noConsoleLog": "warn"
          }
        }
      }
    }
    ```
  

### Webpack (Terser)

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true
          }
        }
      })
    ]
  }
}
```

### Vite

```javascript
// vite.config.js

  build: {
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
}
```

## Standards

- Use MDN: JavaScript Guide as the standard for how this JavaScript pattern should behave in production, not just in a small local example.
- Use web.dev: Learn JavaScript as the standard for how this JavaScript pattern should behave in production, not just in a small local example.

## Verification

### Automated Checks

- Verify the behavior in the browser after the code change, not only in static analysis.
- Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
- Test the primary user flow and one edge case triggered by the changed script path.

### Manual Checks

- Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.