# Implement consumer-driven contract testing for API boundaries

> Consumer-driven contract tests (Pact) define and verify the API contracts between the frontend consumer and backend provider, catching integration mismatches before they reach production.

**Priority:** medium · **Difficulty:** advanced · **Time:** 120 min

---
Consumer-driven contract testing (CDCT) is a technique where the API consumer (frontend) writes tests that document exactly what it needs from the provider (backend). These tests produce a contract file that the provider verifies independently.
## Code Example

```
Consumer (frontend)
  │
  │  1. Writes Pact tests describing expected interactions
  │  2. Tests run against a Pact mock server
  │  3. Pact file (.json) is produced
  │
  ▼
Pact Broker
  │
  │  4. Consumer publishes the pact file with version tag
  │
  ▼
Provider (backend)
  │
  │  5. Downloads the pact file
  │  6. Runs provider verification — replays each interaction against the real API
  │  7. Reports results back to the broker
  │
  ▼
can-i-deploy check
  │
  │  8. Before deploying, query the broker: is this version safe to deploy?
```

## Why It Matters

Integration tests that require both services running at the same time are slow, brittle, and hard to maintain. Consumer-driven contract testing decouples the consumer and provider test suites — each team can run their tests independently, yet the broker guarantees that the published contract is always verified against the live provider. This catches API mismatches days earlier than end-to-end tests, with far less infrastructure overhead.

## Consumer Side: Writing Pact Tests

#

## Install Pact

```bash
pnpm add -D @pact-foundation/pact
```

### Define an interaction (Pact consumer test)

```typescript
// src/api/__tests__/users.pact.spec.ts

const { like, eachLike, string, integer, iso8601DateTime } = MatchersV3

const provider = new PactV3({
  consumer: 'frontend-app',
  provider: 'user-service',
  dir: path.resolve(__dirname, '../../../pacts'),
  logLevel: 'error',
})

describe('User API — Pact consumer tests', () => {
  describe('GET /users/:id', () => {
    it('returns a user when the user exists', async () => {
      await provider
        .addInteraction({
          states: [{ description: 'a user with id 42 exists' }],
          uponReceiving: 'a request for user 42',
          withRequest: {
            method: 'GET',
            path: '/users/42',
            headers: {
              Accept: 'application/json',
              Authorization: like('Bearer token123'),
            },
          },
          willRespondWith: {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: {
              id: integer(42),
              name: string('Jane Doe'),
              email: string('jane@example.com'),
              role: string('admin'),
              createdAt: iso8601DateTime(),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const user = await fetchUser(42, {
            baseUrl: mockServer.url,
            token: 'Bearer token123',
          })

          expect(user.id).toBe(42)
          expect(user.name).toBe('Jane Doe')
          expect(user.role).toBe('admin')
        })
    })

    it('returns 404 when the user does not exist', async () => {
      await provider
        .addInteraction({
          states: [{ description: 'a user with id 999 does not exist' }],
          uponReceiving: 'a request for a non-existent user',
          withRequest: {
            method: 'GET',
            path: '/users/999',
            headers: { Accept: 'application/json' },
          },
          willRespondWith: {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
            body: {
              error: string('User not found'),
              code: string('USER_NOT_FOUND'),
            },
          },
        })
        .executeTest(async (mockServer) => {
          await expect(
            fetchUser(999, { baseUrl: mockServer.url })
          ).rejects.toThrow('User not found')
        })
    })
  })

  describe('GET /users', () => {
    it('returns a paginated list of users', async () => {
      await provider
        .addInteraction({
          states: [{ description: 'at least one user exists' }],
          uponReceiving: 'a request for the users list',
          withRequest: {
            method: 'GET',
            path: '/users',
            query: { page: '1', limit: '20' },
          },
          willRespondWith: {
            status: 200,
            body: {
              data: eachLike({
                id: integer(1),
                name: string('User Name'),
                email: string('user@example.com'),
              }),
              meta: {
                total: integer(50),
                page: integer(1),
                limit: integer(20),
              },
            },
          },
        })
        .executeTest(async (mockServer) => {
          const result = await fetchUsers({ page: 1, limit: 20 }, { baseUrl: mockServer.url })

          expect(result.data).toHaveLength(1)  // eachLike generates a single item
          expect(result.meta.page).toBe(1)
        })
    })
  })
})
```

## The API Client Under Test

```typescript
// src/api/users.ts
interface User {
  id: number
  name: string
  email: string
  role: string
  createdAt: string
}

interface FetchOptions {
  baseUrl?: string
  token?: string
}

  const { baseUrl = process.env.NEXT_PUBLIC_API_URL, token } = options

  const res = await fetch(`${baseUrl}/users/${id}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
  })

  if (res.status === 404) {
    const body = await res.json()
    throw new Error(body.error ?? 'User not found')
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch user: ${res.status}`)
  }

  return res.json()
}
```

## Publishing the Contract

After the consumer tests pass and the pact file is generated:

```typescript
// scripts/publish-pact.ts

const publisher = new Publisher({
  pactBroker: process.env.PACT_BROKER_URL!,
  pactBrokerToken: process.env.PACT_BROKER_TOKEN!,
  pactFilesOrDirs: [path.resolve(__dirname, '../pacts')],
  consumerVersion: process.env.GIT_SHA ?? '0.0.0',
  tags: [process.env.GIT_BRANCH ?? 'main'],
})

publisher.publishPacts().then(() => {
  console.info('Pacts published successfully')
})
```

```yaml
# .github/workflows/consumer-tests.yml
- name: Run Pact consumer tests
  run: pnpm test:pact

- name: Publish pact files
  env:
    PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
    PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
    GIT_SHA: ${{ github.sha }}
    GIT_BRANCH: ${{ github.ref_name }}
  run: pnpm tsx scripts/publish-pact.ts
```

## Provider Side: Verifying the Contract

On the backend (Node.js example):

```typescript
// provider/src/__tests__/pact-provider.spec.ts

describe('Pact provider verification', () => {
  it('validates the expectations of the frontend consumer', async () => {
    const verifier = new Verifier({
      providerBaseUrl: 'http://localhost:4000',
      pactBrokerUrl: process.env.PACT_BROKER_URL!,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN!,
      provider: 'user-service',
      providerVersion: process.env.GIT_SHA ?? '0.0.0',
      publishVerificationResult: process.env.CI === 'true',

      // Provider state handlers — set up database fixtures for each state
      stateHandlers: {
        'a user with id 42 exists': async () => {
          await db.seed({ users: [{ id: 42, name: 'Jane Doe', email: 'jane@example.com', role: 'admin' }] })
        },
        'a user with id 999 does not exist': async () => {
          await db.truncate('users')
        },
        'at least one user exists': async () => {
          await db.seed({ users: [{ id: 1, name: 'Test User', email: 'test@example.com' }] })
        },
      },
    })

    await verifier.verifyProvider()
  })
})
```

## can-i-deploy Gate in CI

The `can-i-deploy` command queries the broker and fails if the consumer/provider versions have not been mutually verified:

```yaml
# .github/workflows/deploy.yml
- name: Check can-i-deploy
  run: |
    npx pact-broker can-i-deploy \
      --pacticipant frontend-app \
      --version ${{ github.sha }} \
      --to-environment production \
      --broker-base-url ${{ secrets.PACT_BROKER_URL }} \
      --broker-token ${{ secrets.PACT_BROKER_TOKEN }}
```

## Pact Matcher Reference

| Matcher | What it does |
|---|---|
| `like(value)` | Match the type, not the exact value |
| `string('example')` | Match any string |
| `integer(42)` | Match any integer |
| `decimal(3.14)` | Match any decimal number |
| `boolean(true)` | Match any boolean |
| `eachLike(template)` | Match an array where each element has the template's shape |
| `regex('\\d+', '123')` | Match a string against a regex pattern |
| `iso8601DateTime()` | Match an ISO 8601 datetime string |
| `nullValue()` | Match a null value |

Pact tests verify that the API response has the right shape and types — they do not test whether the backend calculates the correct value. Combine Pact with unit tests on both sides for complete coverage. A Pact test that asserts `integer()` will pass whether the API returns `42` or `0` — use specific matchers only where the exact value matters to the consumer.

## Standards

- Use these references as the standard for how the test or monitoring strategy should behave in the shipped workflow.
- Check the implementation against Pact documentation before treating the rule as satisfied.
- Check the implementation against Martin Fowler: Consumer-Driven Contracts before treating the rule as satisfied.

## Verification

1. Run `pnpm test:pact` — the consumer tests should pass and a `.json` pact file should be written to the `pacts/` directory.
2. Inspect the generated pact file and confirm it contains all the interactions you defined.
3. Run the provider verification step and confirm all interactions pass against the real backend running locally.
4. Confirm the CI pipeline fails when you intentionally break a provider response (e.g., rename a field the consumer uses) and the error is traced to the specific interaction.