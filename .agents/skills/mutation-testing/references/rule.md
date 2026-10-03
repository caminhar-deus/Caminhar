# Use mutation testing to measure how well tests detect bugs

> Run Stryker mutation testing on critical business logic to verify that your test suite will actually catch real bugs, not just achieve line coverage.

**Priority:** medium · **Difficulty:** advanced · **Time:** 120 min

---
Mutation testing works by automatically introducing small, plausible bugs into your source code — called **mutants** — and then running your test suite against each mutant. If a test fails, the mutant is **killed** (the tests caught the bug). If all tests pass despite the mutant, it **survives** (the tests missed this class of bug).

The **mutation score** is the percentage of mutants killed:

```
mutation score = (killed mutants / total mutants) × 100
```

A score of 80% means 80% of injected bugs were caught by your tests.
## Code Examples

Install Stryker and the relevant plugins for your stack:

```bash
pnpm add -D @stryker-mutator/core @stryker-mutator/vitest-runner @stryker-mutator/typescript-checker
```

```javascript
// stryker.config.mjs
/** @type {import('@stryker-mutator/core').PartialStrykerOptions} */

  // Test runner — use vitest, jest, or mocha depending on your stack
  testRunner: 'vitest',

  // TypeScript checker validates mutants against the type system first,
  // which avoids running type-error mutants through the test suite
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',

  // Focus mutation on critical business logic — not on test files,
  // config, or generated code
  mutate: [
    'src/lib/**/*.ts',
    'src/utils/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
  ],

  // Vitest config — point to your vitest config
  vitest: {
    configFile: 'vitest.config.ts',
  },

  // Thresholds — the build fails if the mutation score drops below these values
  thresholds: {
    high: 80,   // Green: good coverage
    low: 60,    // Yellow: acceptable but should improve
    break: 50,  // Red: fail the build
  },

  // Run at most 4 tests in parallel per mutant to keep CI time reasonable
  concurrency: 4,

  // Report formats — 'html' for local inspection, 'json' for CI dashboards
  reporters: ['html', 'clear-text', 'json'],

  // Incremental mode caches results so only changed files are re-mutated in CI
  incremental: true,
};
```

## Why It Matters

A codebase can have 90% line coverage and still ship critical bugs if tests only execute code without asserting meaningful outcomes. Mutation testing reveals these gaps by proving that your tests can distinguish correct code from subtly broken code — the standard that actually matters in production.

## Types of Mutations Stryker Generates

| Mutation type | Example |
|---|---|
| Arithmetic operator | `a + b` → `a - b` |
| Comparison operator | `x > 0` → `x >= 0` |
| Logical connector | `a && b` → `a \|\| b` |
| Boolean literal | `return true` → `return false` |
| String literal | `'error'` → `''` |
| Array declaration | `[1, 2, 3]` → `[]` |
| Conditional boundary | `x < limit` → `x <= limit` |
| Block statement removal | Remove the body of an `if` branch |

These are the kinds of subtle changes that cause real production bugs — off-by-one errors, wrong boolean logic, missed edge cases.

## Reading the HTML Report

After running `pnpm stryker run`, open `reports/mutation/index.html`. Each file shows:

- **Green lines**: all mutants killed — tests are effective here
- **Red lines**: surviving mutants — tests are missing assertions
- **Grey lines**: no mutants generated (comments, type declarations)

Click any surviving mutant to see the exact code change that wasn't caught:

```
Survived: BooleanSubstitution on line 42
  Original: return isValid && isAuthorized
  Mutant:   return false
```

This tells you: you have no test that asserts this function returns `true` under valid, authorized conditions.

## Targeting Critical Paths

Running Stryker across an entire large codebase is slow. Start with the modules that matter most:

```javascript
// stryker.config.ci.mjs — focused config for CI

  ...baseConfig,
  mutate: [
    // Pricing calculations
    'src/lib/pricing/**/*.ts',
    // Authentication logic
    'src/lib/auth/**/*.ts',
    // Data validation utilities
    'src/utils/validation/**/*.ts',
    '!**/*.test.ts',
  ],
  thresholds: { high: 85, low: 70, break: 65 },
};
```

## Improving Tests to Kill Surviving Mutants

When you find a surviving mutant, the fix is to add a test that specifically exercises the mutated code path:

```typescript
// lib/pricing.ts

  if (memberLevel === 'premium') {
    return price * 0.8; // 20% discount
  }
  return price * 0.95; // 5% discount for basic
}
```

A weak test that only checks the premium path:

```typescript
// ❌ Only kills some mutants — the basic path is untested
it('applies 20% discount for premium', () => {
  expect(calculateDiscount(100, 'premium')).toBe(80);
});
```

A strong test that kills boundary mutants:

```typescript
// ✅ Explicitly tests both paths and edge values
it('applies 20% discount for premium members', () => {
  expect(calculateDiscount(100, 'premium')).toBe(80);
  expect(calculateDiscount(0, 'premium')).toBe(0);
});

it('applies 5% discount for basic members', () => {
  expect(calculateDiscount(100, 'basic')).toBe(95);
});

// This test kills the "return false" boolean substitution mutant
it('returns a positive discount for any positive price', () => {
  expect(calculateDiscount(200, 'premium')).toBeGreaterThan(0);
  expect(calculateDiscount(200, 'basic')).toBeGreaterThan(0);
});
```

Some mutants are equivalent — they produce code that is logically identical to the original but structurally different. Chasing 100% often leads to over-specified tests that are brittle and expensive to maintain. 80% on critical paths is a practical target for most teams.

## Adding Stryker to CI

```yaml
# .github/workflows/mutation.yml
name: Mutation Testing

on:
  pull_request:
    paths:
      - 'src/lib/**'
      - 'src/utils/**'

jobs:
  mutation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm stryker run --config stryker.config.ci.mjs
      - name: Upload mutation report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: mutation-report
          path: reports/mutation/
```

## Verification

1. Run `pnpm stryker run` and confirm the mutation score meets the configured threshold.
2. Open the HTML report and inspect surviving mutants in the three most critical source files.
3. Write additional tests to kill at least the surviving boundary-condition and boolean-inversion mutants.
4. Re-run Stryker and confirm the score has improved.