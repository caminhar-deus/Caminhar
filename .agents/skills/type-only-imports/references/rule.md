# Use import type for type-only imports

> Use the import type syntax for imports that are only needed as TypeScript types, ensuring they are fully erased at compile time with zero runtime cost.

**Priority:** low · **Difficulty:** beginner · **Time:** 10 min

---
TypeScript's [`import type`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export) syntax explicitly marks an import as type-only, guaranteeing that the compiler erases it completely from the emitted JavaScript with no module evaluation.
## Code Examples

```typescript
// ❌ Regular import used only for a type — module is evaluated at runtime

function formatUser(user: User): string {
  return user.name
}

async function handleResponse(res: ApiResponse {
  return res.data
}
```

```typescript
// ✅ import type — both imports are completely erased from the output JS

function formatUser(user: User): string {
  return user.name
}

async function handleResponse(res: ApiResponse {
  return res.data
}
```

The compiled output for the type-only version contains no reference to `./user` or `./api`. No module evaluation, no bundle inclusion.

## Why It Matters

Regular imports cause the JavaScript runtime to evaluate and execute the imported module even when only a TypeScript type from that module is used. This can increase bundle size, introduce unintended side effects, and create circular dependency issues that are otherwise avoidable. Using import type makes the erased-at-runtime nature of type imports explicit and enables bundlers and the TypeScript compiler to handle them optimally.

## Mixed Imports — Types and Values Together

When you need both a type and a runtime value from the same module, you can either use a single import with inline `type` modifiers, or separate the imports:

```typescript
// Option A — inline type modifier (TypeScript 4.5+)

//                   ^^^^ type  ^^^^ type — erased at compile time
//       ^^^^^^^^^^^ value — kept in runtime output

// Option B — two separate imports

// Both are correct — choose based on team preference
```

## verbatimModuleSyntax — Automatic Enforcement

TypeScript 5.0 introduced `verbatimModuleSyntax`, which enforces that type-only imports use `import type`. The compiler will error if you write a regular import that is only used as a type.

```json
// tsconfig.json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true,
    // verbatimModuleSyntax replaces the older importsNotUsedAsValues and
    // preserveValueImports options — do not set those alongside it
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

With [`verbatimModuleSyntax`](https://www.typescriptlang.org/tsconfig#verbatimModuleSyntax) enabled, this becomes a compiler error:

```typescript
// ❌ TypeScript error: This import is never used as a value and must use 'import type'

function greet(user: User): string {
  return `Hello, ${user.name}`
}
```

## ESLint Rule

Add the [`consistent-type-imports` rule](https://typescript-eslint.io/rules/consistent-type-imports/) to enforce `import type` via your linter, independently of TypeScript version:

```json
// eslint.config.js (flat config)
{
  "rules": {
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        "prefer": "type-imports",
        "fixStyle": "inline-type-imports"
      }
    ]
  }
}
```

The rule is auto-fixable — running `eslint --fix` converts all violating imports automatically.

## Re-exporting Types

Type-only exports follow the same pattern:

```typescript
// types.ts

// Both are erased from the compiled output of types.ts
// Consumers of types.ts still get the full types
```

A TypeScript `class` declares both a type (the instance shape) and a runtime value (the constructor). If you use `import type { MyClass }` and then write `new MyClass()`, you will get a compile error because the constructor was erased. Use a regular `import` whenever you call `new`, access static members, or use the class as a value at runtime.

## Type Imports in Declaration Files

In `.d.ts` files, all imports are already type-only by nature, but using `import type` is still considered good practice as it makes intent explicit:

```typescript
// declarations.d.ts

declare class MyEmitter extends EventEmitter {
  on(event: 'data', listener: (chunk: Buffer) => void): this
}
```

## Verification

The [TypeScript 3.8 type-only import notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export) and the [`consistent-type-imports` rule](https://typescript-eslint.io/rules/consistent-type-imports/) are the fastest way to verify both compiler and linter behavior agree on the same import boundary.

1. Run `pnpm exec tsc --noEmit` and confirm zero errors. If using `verbatimModuleSyntax: true`, any type-only import without `import type` will surface as a compiler error.
2. Run the ESLint `consistent-type-imports` rule across the `src/` directory and confirm zero violations (the rule is auto-fixable with `--fix`).
3. Inspect the compiled JavaScript output for a module that uses only type imports — confirm the imported module paths do not appear in the output file.
4. Search for `import {` in TypeScript files and verify each imported identifier is actually used as a runtime value, not only in type positions.