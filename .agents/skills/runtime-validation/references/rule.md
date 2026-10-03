# Validate external data at runtime with a schema library

> Use Zod or Valibot to validate data from API responses, form inputs, localStorage, and environment variables — TypeScript types are erased at runtime and cannot protect against unexpected shapes.

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
TypeScript types are a compile-time tool. When your code runs in the browser or on a server, every type annotation is gone, which is why libraries like [Zod](https://zod.dev) and [Valibot](https://valibot.dev) exist to validate runtime data before it spreads through the rest of the app.
## Code Example

```typescript
// The TypeScript type — looks safe
interface Product {
  id: string
  name: string
  price: number
  inStock: boolean
}

// ❌ Unsafe: we cast the response to our type without checking
async function fetchProduct(id: string): Promise {
  const res = await fetch(`/api/products/${id}`)
  const data = await res.json()
  return data as Product // the API might return { id: number, price: "12.99" }
}

// TypeScript is happy — but this crashes at runtime:
const product = await fetchProduct('abc')
const total = product.price * 1.2 // NaN if price is actually the string "12.99"
```

## Why It Matters

TypeScript gives you confidence at compile time, but data from the network, user input, and storage arrives at runtime as raw, untyped values. A backend schema change, a misconfigured API, or malicious input can produce data that does not match your TypeScript types — and the compiler will never warn you. Runtime validation at the same boundary where you would otherwise call [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) catches these mismatches early, surfaces clear error messages, and prevents type-unsafe data from propagating through your application.

## API Response Validation with Zod

```typescript

// 1. Define the schema — single source of truth
const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  price: z.number().positive(),
  inStock: z.boolean(),
  // Coerce types that the API might send differently
  createdAt: z.coerce.date(),
})

// 2. Infer the TypeScript type from the schema — no duplication
type Product = z.infer<typeof ProductSchema>

// 3. Validate at the boundary
async function fetchProduct(id: string): Promise {
  const res = await fetch(`/api/products/${id}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch product: ${res.status}`)
  }
  const json: unknown = await res.json()
  return ProductSchema.parse(json) // throws ZodError with clear message if invalid
}
```

## Safe Parsing for Graceful Error Handling

Use `.safeParse()` when you want to handle the failure without throwing:

```typescript
async function fetchProducts(): Promise {
  const res = await fetch('/api/products')
  const json: unknown = await res.json()

  const result = z.array(ProductSchema).safeParse(json)

  if (!result.success) {
    // result.error is a ZodError with field-level detail
    console.error('API response shape mismatch:', result.error.flatten())
    return null
  }

  return result.data // fully typed: Product[]
}
```

## Form Validation

```typescript

const ContactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  message: z.string().min(10).max(1000),
  // Enum validation
  subject: z.enum(['support', 'billing', 'feedback']),
  // Optional with default
  newsletter: z.boolean().default(false),
})

type ContactForm = z.infer<typeof ContactFormSchema>

function handleSubmit(formData: FormData): void {
  const raw = Object.fromEntries(formData.entries())

  const result = ContactFormSchema.safeParse(raw)
  if (!result.success) {
    // Field-level errors for the UI
    const errors = result.error.flatten().fieldErrors
    displayErrors(errors)
    return
  }

  submitContact(result.data) // result.data is typed as ContactForm
}
```

## Environment Variable Validation

Validate environment variables at startup so misconfiguration is caught immediately rather than at the point of use hours later.

```typescript

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  API_SECRET: z.string().min(32, 'API_SECRET must be at least 32 characters'),
  PORT: z.coerce.number().int().positive().default(3000),
  FEATURE_NEW_DASHBOARD: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
})

// Call once at application startup — throws if any required variable is missing

// Usage — fully typed, no string indexing into process.env
console.log(`Listening on port ${env.PORT}`)
```

Runtime validation is meant for trust boundaries — where data enters your application from the outside world. Do not add Zod schemas to every internal function call between modules you control; that adds noise without improving safety. The pattern is: validate once at the edge (API layer, form handler, startup), then pass typed values through your application.

## localStorage Validation

```typescript
const ThemePreferenceSchema = z.object({
  mode: z.enum(['light', 'dark', 'system']),
  fontSize: z.number().min(12).max(24).default(16),
})

type ThemePreference = z.infer<typeof ThemePreferenceSchema>

function loadThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem('theme')
    if (!stored) return ThemePreferenceSchema.parse({}) // uses defaults
    return ThemePreferenceSchema.parse(JSON.parse(stored))
  } catch {
    // Stored value was invalid JSON or wrong shape — use defaults
    localStorage.removeItem('theme')
    return ThemePreferenceSchema.parse({})
  }
}
```

## Valibot — a Smaller Alternative

Valibot offers the same validation patterns with a tree-shakeable, modular API that produces smaller bundle sizes:

```typescript

const UserSchema = object({
  id: string(),
  email: string([email()]),
  name: string([minLength(1)]),
  age: number(),
  active: boolean(),
})

type User = typeof UserSchema._types.output

const user = parse(UserSchema, apiResponse)
```

## Exceptions

- A framework default or browser behavior is not an exception by itself; only documented constraints with compensating controls should suppress the finding.
- When a JavaScript pattern looks unsafe but the data is fully constrained, validated, and never attacker-controlled, document that boundary explicitly instead of treating it as implicit.
- If a rule overlaps with a stronger exploit path or runtime failure, fix the issue that most directly enables compromise or user-visible breakage first.

## Verification

1. Search for every `fetch()` call, `JSON.parse()`, and `localStorage.getItem()` in the codebase and confirm each one passes the result through a Zod `.parse()` or `.safeParse()` call before the data is used.
2. Verify that TypeScript types for external data are derived with `z.infer<typeof Schema>` or the equivalent [Valibot](https://valibot.dev) output types rather than written separately — duplicate type definitions drift apart over time.
3. Confirm environment variable access goes through a validated `env` object rather than direct `process.env` string indexing.
4. Run the application with an intentionally malformed API response (e.g., using a mock server) and confirm the schema error is caught and handled gracefully rather than propagating as a runtime crash.