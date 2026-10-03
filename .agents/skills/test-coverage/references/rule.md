# Maintain test coverage thresholds

> Set and enforce minimum code coverage thresholds to ensure adequate test coverage.

**Priority:** medium · **Difficulty:** beginner · **Time:** 15 min

---
Test coverage thresholds prevent code quality from degrading over time by failing builds when coverage drops below acceptable levels.

## Code Example

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.{js,ts}' // Re-exports only
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Stricter thresholds for critical code
    './src/utils/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  coverageReporters: ['text', 'lcov', 'html']
}
```

## Why It Matters

Coverage thresholds prevent code quality from degrading over time by failing builds when test coverage drops below safe levels.

## Recommended Thresholds

| Coverage Type | Minimum | Good | Excellent |
|---------------|---------|------|-----------|
| Statements | 60% | 80% | 90%+ |
| Branches | 60% | 75% | 85%+ |
| Functions | 70% | 85% | 95%+ |
| Lines | 60% | 80% | 90%+ |

## Vitest Configuration

```typescript
// vitest.config.ts

  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80
      },
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.{js,ts}'
      ]
    }
  }
})
```

## CI/CD Integration

#

## GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test -- --coverage --coverageReporters=text-lcov > coverage.lcov

      # Upload to Codecov
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage.lcov
          fail_ci_if_error: true

      # Or upload to Coveralls
      - uses: coverallsapp/github-action@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Best Practices

### Focus on Meaningful Coverage

```javascript
// ✅ Good: Test behavior, not just lines
test('validates email format', () => {
  expect(isValidEmail('user@example.com')).toBe(true)
  expect(isValidEmail('invalid')).toBe(false)
  expect(isValidEmail('')).toBe(false)
  expect(isValidEmail('user@.com')).toBe(false)
})

// ❌ Bad: Just hitting lines without meaningful assertions
test('calls isValidEmail', () => {
  isValidEmail('test@test.com')
  // No assertions!
})
```

### Exclude Generated Code

```javascript
// jest.config.js
collectCoverageFrom: [
  'src/**/*.{ts,tsx}',
  '!src/**/*.generated.ts',
  '!src/graphql/types.ts',
  '!src/**/__mocks__/**'
]
```

## Verification

1. Run the relevant test or CI step locally and confirm it fails when the rule is violated.
2. Ensure the automation blocks regressions instead of only printing warnings.
3. Cover at least one representative high-risk flow, component, or route.
4. Keep thresholds or assertions in version control so changes remain reviewable.