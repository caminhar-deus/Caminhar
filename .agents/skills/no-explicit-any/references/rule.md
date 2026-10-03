# Avoid the any type — use unknown, generics, or type guards instead

> Replace TypeScript's any type with unknown, proper generics, or narrowed type assertions to preserve type safety without sacrificing expressiveness.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
[`any`](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#any) is TypeScript's escape hatch — it tells the compiler to stop type-checking a value entirely. Every property access, method call, and assignment on an `any` value is silently accepted, and [`unknown`](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown) exists precisely so you do not have to make that tradeoff.
## Code Example

```typescript
// ❌ any defeats type checking silently
function parseConfig(raw: any) {
  return raw.settings.timeout // no error if 'settings' doesn't exist
}

// ❌ any spreads to callers
const config = parseConfig(JSON.parse(text)) // config is also 'any'
const ms = config.timeout * 1000             // no error even if timeout is undefined
```

## Why It Matters

The any type is a local opt-out that becomes a global problem: a function returning any propagates unchecked types to every caller, silently undermining the type system across the entire codebase. Replacing any with unknown forces type narrowing at the point of use, turning latent runtime errors into compile-time failures where they are cheapest to fix.

## unknown — the Safe Alternative

`unknown` is the type-safe counterpart to `any`. You can assign anything to `unknown`, but you cannot use the value without first narrowing its type.

```typescript
// ✅ unknown forces a type check before use
function parseConfig(raw: unknown): AppConfig {
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'settings' in raw &&
    typeof (raw as { settings: unknown }).settings === 'object'
  ) {
    // Now TypeScript knows enough to work with 'settings'
  }
  throw new Error('Invalid config shape')
}

// ✅ Simpler: use Zod for external data (see runtime-validation rule)

const ConfigSchema = z.object({
  settings: z.object({
    timeout: z.number(),
  }),
})

function parseConfig(raw: unknown): AppConfig {
  return ConfigSchema.parse(raw) // throws if shape is wrong, returns typed value
}
```

## Generics — Type Consistency Without any

When you need a function that accepts multiple types, generics express "whatever type you pass in, I preserve it" — something `any` cannot do.

```typescript
// ❌ any loses the relationship between input and output types
function first(arr: any[]): any {
  return arr[0]
}
const x = first([1, 2, 3])   // x is 'any', not 'number'
const y = first(['a', 'b'])  // y is 'any', not 'string'

// ✅ Generic preserves the element type
function first(arr: T[]): T | undefined {
  return arr[0]
}
const x = first([1, 2, 3])   // x is 'number | undefined'
const y = first(['a', 'b'])  // y is 'string | undefined'
```

## Type Assertions — When They Are Acceptable

A type assertion (`as Type`) is appropriate when you have verified the type through a mechanism TypeScript cannot see (e.g., a DOM API or a third-party library with weak types). It is dangerous when used as a shortcut to silence an error.

```typescript
// ✅ Acceptable assertion — we checked the element exists and know its type
const canvas = document.getElementById('main-canvas')
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Expected a canvas element')
}
const ctx = canvas.getContext('2d') // canvas: HTMLCanvasElement — safe

// ✅ Acceptable — casting from a loosely-typed SDK response
const response = await stripe.charges.create(params)
const charge = response as Stripe.Charge // Stripe SDK uses loose types internally

// ❌ Dangerous — silencing a type error without verification
const user = rawData as User     // rawData could be anything; this hides the problem
user.profile.avatar.url          // crashes if rawData doesn't match User
```

## Type Guards — Reusable Narrowing

```typescript
// Reusable type guard function
function isApiError(value: unknown): value is { message: string; code: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    'code' in value &&
    typeof (value as Record<string, unknown>).message === 'string' &&
    typeof (value as Record<string, unknown>).code === 'number'
  )
}

// Usage — TypeScript narrows inside the if block
try {
  await fetchData()
} catch (error: unknown) {
  if (isApiError(error)) {
    console.error(`API error ${error.code}: ${error.message}`) // fully typed
  }
}
```

## ESLint Configuration

The [`@typescript-eslint/no-explicit-any`](https://typescript-eslint.io/rules/no-explicit-any/) rule is the practical way to keep this standard from drifting during code review.

```json
// .eslintrc.json / eslint.config.js
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error"
  }
}
```

Sometimes a dependency's type definitions use `any` internally. When your code infers `any` from a library call, the fix is either to add a local type assertion with a guard, use the library's correct type (check `@types/library`), or wrap the call in a Zod schema. Do not widen your own code to `any` just because a dependency uses it.

## Zod at the API Boundary

The cleanest strategy for external data is to validate at the entry point and never let `unknown` or `any` past the boundary:

```typescript

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'viewer']),
  createdAt: z.coerce.date(),
})

// TypeScript type derived from the schema — single source of truth
type User = z.infer<typeof UserSchema>

async function fetchUser(id: string): Promise {
  const response = await fetch(`/api/users/${id}`)
  const json: unknown = await response.json()
  return UserSchema.parse(json) // throws ZodError if shape is wrong
}
```

## Verification

1. Run `pnpm exec eslint --rule '{"@typescript-eslint/no-explicit-any": "error"}' src/` and confirm zero violations, or check that the rule is already in your ESLint config with `"error"` severity.
2. Search the codebase for `: any` and `as any` — every remaining instance should either be enforced by [`@typescript-eslint/no-explicit-any`](https://typescript-eslint.io/rules/no-explicit-any/) or have a comment explaining why it is intentional and cannot be replaced.
3. Enable `"noImplicitAny": true` in tsconfig.json (included in `"strict": true`) and confirm `tsc --noEmit` produces zero errors.
4. Review functions that receive data from fetch, localStorage, or URL parameters — each should accept `unknown` and validate before use, not accept or return `any`.