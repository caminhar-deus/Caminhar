# Enable noUncheckedIndexedAccess to catch out-of-bounds array bugs

> Enable noUncheckedIndexedAccess in tsconfig.json to make array and object index access return T | undefined, forcing explicit null checks that prevent out-of-bounds runtime errors.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
TypeScript's type system makes an optimistic assumption about array index access: `array[0]` is typed as `T`, not `T | undefined`. The [`noUncheckedIndexedAccess` flag](https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess) and the [TypeScript 4.1 checked indexed access notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html#checked-indexed-accesses-nouncheckedindexedaccess) exist because that default is unsound.
## Code Example

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    // strict mode does NOT include noUncheckedIndexedAccess — add it explicitly
    "noUncheckedIndexedAccess": true
  }
}
```

## Why It Matters

TypeScript's default behaviour types `array[0]` as `T`, pretending the access is always safe. In reality, the array might be empty or the index might be out of range, leading to silent `undefined` values that cause downstream crashes. Enabling `noUncheckedIndexedAccess` surfaces these potential failures as type errors at compile time, requiring developers to prove the access is safe before the code runs.

## A Real Bug Caught by the Flag

```typescript
// ❌ Without noUncheckedIndexedAccess — TypeScript sees string, not string | undefined
function getFirstTag(tags: string[]): string {
  return tags[0].toUpperCase() // TypeScript: fine. Runtime: TypeError if tags is []
}

getFirstTag([]) // Uncaught TypeError: Cannot read properties of undefined

// ✅ With noUncheckedIndexedAccess — TypeScript error forces a check
function getFirstTag(tags: string[]): string {
  const first = tags[0] // TypeScript: string | undefined
  if (first === undefined) {
    return 'untagged'
  }
  return first.toUpperCase() // safe: first is string here
}

// ✅ Concise version with nullish coalescing
function getFirstTag(tags: string[]): string {
  return (tags[0] ?? 'untagged').toUpperCase()
}

// ✅ Using Array.at() — also returns T | undefined
function getFirstTag(tags: string[]): string {
  return (tags.at(0) ?? 'untagged').toUpperCase()
}
```

## The array.map + access by index Pattern

A subtle but common bug — mapping over one array and indexing into a parallel array:

```typescript
const scores = [95, 87, 72]
const grades = ['A', 'B', 'C']

// ❌ Without the flag — TypeScript sees string, crashes if arrays differ in length
const report = scores.map((score, i) => `${grades[i]}: ${score}`)
//                                         ^^^^^^^^ string — but what if i >= grades.length?

// ✅ With noUncheckedIndexedAccess — grade is string | undefined, forces a check
const report = scores.map((score, i) => {
  const grade = grades[i] ?? 'N/A'
  return `${grade}: ${score}`
})

// ✅ Better design: use a single array of objects instead of parallel arrays
const entries = [
  { grade: 'A', score: 95 },
  { grade: 'B', score: 87 },
  { grade: 'C', score: 72 },
]
const report = entries.map(({ grade, score }) => `${grade}: ${score}`)
```

## Index Signatures

The flag also affects index signature access on objects:

```typescript
type ScoreMap = Record<string, number>

const scores: ScoreMap = { alice: 95, bob: 87 }

// ❌ Without the flag — TypeScript sees number (could be undefined)
const charlieScore = scores['charlie'] // number — but actually undefined at runtime

// ✅ With the flag — TypeScript sees number | undefined, forces a check
const charlieScore = scores['charlie'] // number | undefined
const display = charlieScore !== undefined
  ? `Score: ${charlieScore}`
  : 'No score recorded'
```

## Handling Array Iteration

Iterating with `for...of` or array methods is always safe — the flag only affects index syntax:

```typescript
const items = ['apple', 'banana', 'cherry']

// ✅ for...of — item is string, no undefined
for (const item of items) {
  console.log(item.toUpperCase())
}

// ✅ forEach — item is string, no undefined
items.forEach(item => console.log(item.toUpperCase()))

// ✅ map/filter/reduce — element type is string, no undefined
const upper = items.map(item => item.toUpperCase())

// ⚠️ Index access — with the flag, items[i] is string | undefined
for (let i = 0; i < items.length; i++) {
  const item = items[i] // string | undefined even though i is in bounds
  console.log(item?.toUpperCase()) // optional chaining handles it
}
```

Destructuring (`const [first, second] = arr`) does not get the `| undefined` treatment under `noUncheckedIndexedAccess`. `first` is still typed as `T`. For destructured access that might be out of bounds, add `| undefined` manually or use `arr.at(0)` instead.

## Suppressing False Positives

For hot loops where you have already bounds-checked with `i < arr.length`, a non-null assertion is acceptable:

```typescript
for (let i = 0; i < matrix.length; i++) {
  // We know matrix[i] exists because i < matrix.length
  const row = matrix[i]!  // '!' non-null assertion — justified by the loop guard
  for (let j = 0; j < row.length; j++) {
    const cell = row[j]!  // similarly justified
    processCell(cell)
  }
}
```

Use `!` sparingly and only where the bounds check is immediately visible.

## Verification

1. Confirm `"noUncheckedIndexedAccess": true` is present in `tsconfig.json` under `compilerOptions`. The [TSConfig reference](https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess) is explicit that this flag is not enabled by `"strict": true` and must be added separately.
2. Run `pnpm exec tsc --noEmit` after enabling the flag and fix every resulting type error — do not use `!` non-null assertions to silence errors without verifying bounds.
3. Search for `[0]` array access patterns in the codebase and confirm each one either has a null check, uses `??` or `?.`, or is inside a bounds-checked loop with a justified `!` assertion.
4. Check that no `Record<string, T>` or index signature types are accessed without handling the `| undefined` case introduced by the flag.