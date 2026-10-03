# Enable TypeScript strict mode in tsconfig.json

> Enable "strict": true in tsconfig.json to activate the full suite of TypeScript type-checking flags and catch the most common runtime bugs at compile time.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
TypeScript's [`strict`](https://www.typescriptlang.org/tsconfig#strict) mode is a single flag that enables a group of compile-time checks covering the most common sources of runtime errors. Enabling it from the start of a project costs almost nothing; adding it later can require fixing hundreds of type errors.
## Code Example

```json
{
  "compilerOptions": {
    // Strict mode umbrella — enables all flags below
    "strict": true,

    // What "strict": true enables individually:
    // "strictNullChecks": true         — null and undefined are not valid everywhere
    // "noImplicitAny": true            — variables must have an explicit or inferred type
    // "strictFunctionTypes": true      — function parameter types are checked contravariantly
    // "strictBindCallApply": true      — .bind()/.call()/.apply() are type-checked
    // "strictPropertyInitialization": true — class properties must be initialised in constructors
    // "noImplicitThis": true           — 'this' must have an explicit type
    // "useUnknownInCatchVariables": true   — catch clause variables are 'unknown', not 'any'
    // "alwaysStrict": true             — emits 'use strict' in every output file

    // Strongly recommended additions (not included in "strict")
    "noUncheckedIndexedAccess": true,  // array[0] returns T | undefined
    "noImplicitOverride": true,        // override keyword required when overriding
    "exactOptionalPropertyTypes": true, // { x?: string } does not accept undefined
    "noFallthroughCasesInSwitch": true, // switch fallthrough is a compile error

    // Project setup
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Why It Matters

Without strict mode, TypeScript allows implicit `any` types, ignores possible `null` or `undefined` values, and silently accepts unsound function assignments — meaning the type system gives a false sense of safety. The [TSConfig strict reference](https://www.typescriptlang.org/tsconfig#strict) and the [TypeScript handbook's core type model](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) both frame strict mode as the baseline if you want type errors to fail at compile time instead of in production.

## Bug Caught by strictNullChecks

The most impactful strict flag is `strictNullChecks`. Without it, TypeScript silently allows `null` and `undefined` to be assigned to any type.

```typescript
// ❌ Without strictNullChecks — TypeScript accepts this, crashes at runtime
function getUsername(userId: string): string {
  const user = findUser(userId) // returns User | null
  return user.name              // TypeError: Cannot read properties of null
}

// ✅ With strictNullChecks — TypeScript forces you to handle the null case
function getUsername(userId: string): string {
  const user = findUser(userId) // TypeScript infers: User | null
  if (!user) {
    return 'Unknown'            // must handle null before accessing .name
  }
  return user.name              // safe: user is User here
}

// ✅ Alternative with optional chaining and nullish coalescing
function getUsername(userId: string): string {
  return findUser(userId)?.name ?? 'Unknown'
}
```

## Bug Caught by noImplicitAny

```typescript
// ❌ Without noImplicitAny — parameter 'data' silently becomes any
function processData(data) {
  return data.items.map((item) => item.value) // no type checking at all
}

// ✅ With noImplicitAny — must declare the type
interface DataPayload {
  items: Array<{ value: number }>
}

function processData(data: DataPayload): number[] {
  return data.items.map((item) => item.value) // fully type-checked
}
```

## Bug Caught by useUnknownInCatchVariables

```typescript
// ❌ Before TypeScript 4.4 / without strict — error is implicitly 'any'
try {
  await fetchData()
} catch (error) {
  console.log(error.message) // no type checking — could crash if error is not an Error
}

// ✅ With useUnknownInCatchVariables — error is 'unknown', forces a check
try {
  await fetchData()
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message) // safe
  } else {
    console.log('Unknown error', error)
  }
}
```

## Incremental Adoption on Existing Codebases

If adding `"strict": true` to an existing project produces hundreds of errors, enable flags one at a time. Start with the highest-value flags first.

```json
// Phase 1 — highest value, usually fixable quickly
{
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

```json
// Phase 2 — add once phase 1 errors are resolved
{
  "compilerOptions": {
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```

```json
// Phase 3 — full strict mode
{
  "compilerOptions": {
    "strict": true
  }
}
```

When retrofitting strict mode, avoid suppressing errors with `@ts-ignore` or `@ts-expect-error` unless the situation genuinely warrants it (e.g., a third-party library with incorrect types). Each suppression is a hole in your type safety. Fix the actual type, add a guard, or use `unknown` with a type predicate instead.

## strictPropertyInitialization in Classes

```typescript
// ❌ Class property not initialised — runtime access returns undefined
class UserService {
  private client: ApiClient // strict error: not definitely assigned

  async getUser(id: string) {
    return this.client.get(`/users/${id}`) // TypeError at runtime
  }
}

// ✅ Initialised in constructor
class UserService {
  private client: ApiClient

  constructor(client: ApiClient) {
    this.client = client
  }

  async getUser(id: string) {
    return this.client.get(`/users/${id}`)
  }
}

// ✅ Definite assignment assertion (when you know it will be set before use)
class UserService {
  private client!: ApiClient // '!' tells TypeScript: trust me, this is set

  init(client: ApiClient) {
    this.client = client
  }
}
```

## Exceptions

- Generated types, framework scaffolding, or narrow interoperability layers can justify exceptions, but they should be isolated and documented rather than normalized across the codebase.
- A type-safety smell is often secondary to a stronger runtime validation or API design issue; fix the layer that removes the real user risk first.
- Do not suppress a type rule broadly when a smaller wrapper, adapter, or validated boundary would contain the exception.

## Verification

Use the [TSConfig strict reference](https://www.typescriptlang.org/tsconfig#strict) as the source of truth for which checks the compiler should enforce, and keep the [typed-linting guidance](https://typescript-eslint.io/troubleshooting/typed-linting/) aligned with that setup so editor and CI behavior match.

1. Open `tsconfig.json` and confirm `"strict": true` is present inside `compilerOptions`, or verify all individual strict flags are explicitly set.
2. Run `pnpm exec tsc --noEmit` and confirm zero type errors in the project. If errors appear, fix them rather than suppressing them.
3. Check that `tsconfig.json` is not overriding strict flags after the `"strict": true` declaration (e.g., `"strictNullChecks": false` would silently disable the check).
4. Confirm the CI pipeline runs `tsc --noEmit` so that future code changes cannot silently disable type safety.