# Follow mocking best practices

> Use mocks strategically to isolate units under test without over-mocking.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
Effective mocking isolates the code under test while maintaining realistic test scenarios. Over-mocking leads to brittle tests that pass when they should fail.

## Code Examples

#

## Module Mocking

```javascript
// Mock entire module
jest.mock('./api', () => ({
  fetchUser: jest.fn().mockResolvedValue({ id: 1, name: 'Test' })
}))

// Mock specific exports
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  formatDate: jest.fn().mockReturnValue('2024-01-01')
}))
```

### Function Mocking

```javascript

jest.mock('./api')
const mockFetchUser = fetchUser as jest.MockedFunction<typeof fetchUser>

beforeEach(() => {
  mockFetchUser.mockClear()
})

test('loads user data', async () => {
  mockFetchUser.mockResolvedValueOnce({ id: 1, name: 'John' })

  await loadUserProfile(1)

  expect(mockFetchUser).toHaveBeenCalledWith(1)
})
```

### Spy on Methods

```javascript
test('logs errors to console', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

  handleError(new Error('Test'))

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('Test')
  )

  consoleSpy.mockRestore()
})
```

## Why It Matters

Proper mocking isolates units under test while keeping tests realistic—over-mocking creates false confidence when tests pass but production breaks.

## When to Mock

| Mock | Do not Mock |
|------|-------------|
| External APIs | Pure functions |
| Database calls | Business logic |
| File system | Data transformations |
| Time/Date | Simple utilities |
| Network requests | React components (usually) |

## Common Mistakes

### Over-Mocking

```javascript
// ❌ Bad: Mocking the thing you're testing
jest.mock('./validateEmail')
test('validates email', () => {
  // This tests nothing!
  expect(validateEmail('test@test.com')).toBe(true)
})

// ✅ Good: Test the actual implementation
test('validates email format', () => {
  expect(validateEmail('test@test.com')).toBe(true)
  expect(validateEmail('invalid')).toBe(false)
})
```

### Missing Cleanup

```javascript
// ❌ Bad: Mocks leak between tests
test('first test', () => {
  jest.spyOn(Date, 'now').mockReturnValue(1000)
  // Forgot to restore!
})

test('second test', () => {
  // Date.now is still mocked!
})

// ✅ Good: Always cleanup
afterEach(() => {
  jest.restoreAllMocks()
})
```

### Implementation Details

```javascript
// ❌ Bad: Testing implementation
test('calls internal method', () => {
  const spy = jest.spyOn(component, '_privateMethod')
  component.doSomething()
  expect(spy).toHaveBeenCalled()
})

// ✅ Good: Testing behavior
test('updates UI when action completes', () => {
  component.doSomething()
  expect(screen.getByText('Success')).toBeInTheDocument()
})
```

## MSW for API Mocking

```javascript

const server = setupServer(
  rest.get('/api/user/:id', (req, res, ctx) => {
    return res(ctx.json({ id: req.params.id, name: 'Test User' }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('fetches user data', async () => {
  render()

  await screen.findByText('Test User')
})
```

## Standards

- Use these references as the standard for how the test or monitoring strategy should behave in the shipped workflow.
- Check the implementation against Playwright Docs before treating the rule as satisfied.
- Check the implementation against Testing Library Guiding Principles before treating the rule as satisfied.

## Verification

1. Run the relevant test or CI step locally and confirm it fails when the rule is violated.
2. Ensure the automation blocks regressions instead of only printing warnings.
3. Cover at least one representative high-risk flow, component, or route.
4. Keep thresholds or assertions in version control so changes remain reviewable.