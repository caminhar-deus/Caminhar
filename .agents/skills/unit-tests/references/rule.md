# Write unit tests

> Critical functionality has unit tests with good coverage for reliability.

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
Unit tests verify that individual functions and components work correctly in isolation.

## Code Examples

```typescript
// vitest.config.ts

  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

```typescript
// vitest.setup.ts

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

## Why It Matters

Unit tests catch bugs before they reach production, serve as documentation for expected behavior, and give developers confidence to refactor code without breaking functionality.

## What to Test

| Priority | Example | Why |
|----------|---------|-----|
| Critical | Payment calculations | Financial accuracy |
| High | Form validation | User data integrity |
| High | Authentication logic | Security |
| Medium | Data transformations | Business logic |
| Medium | Utility functions | Reusable code |
| Low | Simple getters | Rarely break |

## Testing Pure Functions

```typescript
// utils/formatters.ts

  amount: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}
```

```typescript
// utils/formatters.test.ts

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats other currencies', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56')
    expect(formatCurrency(1234.56, 'GBP')).toBe('£1,234.56')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('handles negative amounts', () => {
    expect(formatCurrency(-50)).toBe('-$50.00')
  })

  it('rounds to two decimal places', () => {
    expect(formatCurrency(10.999)).toBe('$11.00')
  })
})

describe('formatDate', () => {
  it('formats Date objects', () => {
    const date = new Date('2024-01-15')
    expect(formatDate(date)).toBe('January 15, 2024')
  })

  it('formats date strings', () => {
    expect(formatDate('2024-06-20')).toBe('June 20, 2024')
  })
})
```

## Testing React Components

```typescript
// components/Button.tsx
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary'
}

  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn btn-${variant}`}
      aria-busy={loading}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}
```

```typescript
// components/Button.test.tsx

describe('Button', () => {
  it('renders children', () => {
    render(Click me)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(Click me)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(Click me)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading state', () => {
    render(Submit)
    const button = screen.getByRole('button')

    expect(button).toHaveTextContent('Loading...')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()
  })

  it('applies variant class', () => {
    render(Cancel)
    expect(screen.getByRole('button')).toHaveClass('btn-secondary')
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      
        Click me
      
    )
    await user.click(screen.getByRole('button'))

    expect(handleClick).not.toHaveBeenCalled()
  })
})
```

## Testing Custom Hooks

```typescript
// hooks/useCounter.ts

  const [count, setCount] = useState(initialValue)

  const increment = useCallback(() => setCount((c) => c + 1), [])
  const decrement = useCallback(() => setCount((c) => c - 1), [])
  const reset = useCallback(() => setCount(initialValue), [initialValue])

  return { count, increment, decrement, reset }
}
```

```typescript
// hooks/useCounter.test.ts

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(0)
  })

  it('initializes with provided value', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })

  it('increments count', () => {
    const { result } = renderHook(() => useCounter(0))

    act(() => {
      result.current.increment()
    })

    expect(result.current.count).toBe(1)
  })

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5))

    act(() => {
      result.current.decrement()
    })

    expect(result.current.count).toBe(4)
  })

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(10))

    act(() => {
      result.current.increment()
      result.current.increment()
      result.current.reset()
    })

    expect(result.current.count).toBe(10)
  })
})
```

## Testing Async Functions

```typescript
// services/api.ts

  const response = await fetch(`/api/users/${id}`)

  if (!response.ok) {
    throw new Error(`User not found: ${id}`)
  }

  return response.json()
}
```

```typescript
// services/api.test.ts

describe('fetchUser', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns user data on success', async () => {
    const mockUser = { id: '1', name: 'John' }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUser),
    } as Response)

    const result = await fetchUser('1')
    expect(result).toEqual(mockUser)
    expect(fetch).toHaveBeenCalledWith('/api/users/1')
  })

  it('throws error when user not found', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    await expect(fetchUser('999')).rejects.toThrow('User not found: 999')
  })
})
```

## Mocking Best Practices

```typescript
// Mock external modules
vi.mock('@/services/analytics', () => ({
  trackEvent: vi.fn(),
}))

// Mock environment variables
vi.stubEnv('API_URL', 'https://test-api.com')

// Mock timers
vi.useFakeTimers()
await vi.advanceTimersByTimeAsync(1000)
vi.useRealTimers()

// Mock implementations
const mockFn = vi.fn().mockImplementation((x) => x * 2)

// Spy on methods
const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
// ... test
spy.mockRestore()
```

## Test Organization

```typescript
// ✅ Good: Descriptive test structure
describe('ShoppingCart', () => {
  describe('addItem', () => {
    it('adds new item to empty cart', () => {})
    it('increases quantity for existing item', () => {})
    it('throws error for invalid quantity', () => {})
  })

  describe('removeItem', () => {
    it('removes item from cart', () => {})
    it('does nothing if item not in cart', () => {})
  })

  describe('calculateTotal', () => {
    it('returns 0 for empty cart', () => {})
    it('sums prices of all items', () => {})
    it('applies discount codes', () => {})
  })
})
```

## CI Integration

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: coverage/coverage-final.json
```

## Testing Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| AAA | Most tests | Arrange, Act, Assert |
| Given-When-Then | BDD style | Behavior descriptions |
| Test doubles | External deps | Mocks, stubs, spies |
| Parameterized | Multiple inputs | `it.each([...])` |
| Snapshot | UI/large outputs | `expect().toMatchSnapshot()` |

## Coverage Thresholds

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

## Testing Checklist

1. ✅ Test happy path (expected inputs)
2. ✅ Test edge cases (empty, null, boundary values)
3. ✅ Test error conditions (invalid inputs)
4. ✅ Test async behavior (loading, success, error states)
5. ✅ Test accessibility (ARIA attributes, roles)
6. ✅ Test user interactions (click, type, submit)
7. ✅ Run tests in CI on every PR

High coverage doesn't mean high quality. Focus on testing critical paths and edge cases rather than achieving arbitrary coverage numbers. Test behavior, not implementation details.

## Standards

- Use these references as the standard for how the test or monitoring strategy should behave in the shipped workflow.
- Check the implementation against Playwright Docs before treating the rule as satisfied.
- Check the implementation against Testing Library Guiding Principles before treating the rule as satisfied.

## Verification

### Automated Checks

- Test one primary path and one edge case affected by the change.
- Use browser or CI tooling where applicable to verify the fix.

### Manual Checks

- Confirm the rule in the final rendered output or runtime behavior.
- Re-check shared abstractions so the fix is applied consistently.