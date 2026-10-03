# Write integration tests for key workflows

> Test how multiple units of code work together — API routes with their database queries, form submissions with validation, and component trees with their state management.

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
Integration tests verify that separate units of code work correctly when connected together, catching the bugs that unit tests can't.

## Code Example

```javascript
// test/api/users.integration.test.js

describe('POST /api/users', () => {
  beforeAll(async () => {
    await db.migrate.latest()
    await db.seed.run()
  })

  afterAll(async () => {
    await db.destroy()
  })

  it('creates a user with valid data', async () => {
    const response = await supertest(app)
      .post('/api/users')
      .send({ name: 'Alice', email: 'alice@example.com' })
      .expect(201)

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: 'Alice',
      email: 'alice@example.com'
    })

    // Verify it was actually saved
    const saved = await db('users').where({ email: 'alice@example.com' }).first()
    expect(saved).toBeDefined()
  })

  it('returns 400 for duplicate email', async () => {
    await supertest(app)
      .post('/api/users')
      .send({ name: 'Bob', email: 'existing@example.com' })
      .expect(400)
  })
})
```

## Why It Matters

Unit tests verify individual functions in isolation, but they can't catch the bugs that occur when those functions interact — a perfectly correct validation function and a correct database function can still fail when wired together incorrectly. Integration tests catch these wiring bugs before they reach production, where they're expensive to diagnose.

## Component Integration with React Testing Library

```jsx
// test/UserProfileForm.integration.test.jsx

describe('UserProfileForm', () => {
  it('submits updated profile and shows success message', async () => {
    const user = userEvent.setup()

    render(
      
        
      
    )

    // Fill in the form
    const nameInput = screen.getByLabelText('Full name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Alice Updated')

    // Submit
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    // Verify success feedback (tests form + API call + state update + UI render)
    await waitFor(() => {
      expect(screen.getByText('Profile saved successfully')).toBeInTheDocument()
    })
  })

  it('shows field errors when API returns validation failure', async () => {
    server.use(
      rest.put('/api/users/:id', (req, res, ctx) =>
        res(ctx.status(422), ctx.json({ errors: { name: 'Name is too long' } }))
      )
    )

    // ... test error display
  })
})
```

## What to Integration Test

```
High-value integration test targets:
✓ API routes + database queries (the full server-side stack)
✓ Form components + submission + API response + UI feedback
✓ Authentication flows (login → session → protected route)
✓ Shopping cart + checkout + order creation
✓ File upload + processing + storage + thumbnail display
✓ Search input + query → results display

Skip (better as unit tests):
✗ Pure utility functions
✗ Simple transformations
✗ Components with no external dependencies
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