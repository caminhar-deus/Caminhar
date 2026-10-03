# Use modern array and object methods

> Use ES2015+ array methods (map, filter, reduce, find, flatMap) and object methods (Object.entries, Object.fromEntries, structuredClone) for cleaner, more expressive code.

**Priority:** medium · **Difficulty:** beginner · **Time:** 15 min

---
Modern JavaScript provides expressive methods for working with arrays and objects that replace verbose loops with declarative transformations.

## Code Example

```javascript
const users = [
  { id: 1, name: 'Alice', age: 32, active: true },
  { id: 2, name: 'Bob', age: 17, active: false },
  { id: 3, name: 'Carol', age: 25, active: true }
]

// map() — transform every element
const names = users.map(u => u.name)
// ['Alice', 'Bob', 'Carol']

// filter() — select matching elements
const adults = users.filter(u => u.age >= 18)
// [Alice, Carol]

// find() — first matching element
const alice = users.find(u => u.name === 'Alice')

// findIndex() — index of first match
const bobIndex = users.findIndex(u => u.id === 2)

// some() / every() — boolean checks
const hasMinors = users.some(u => u.age < 18)    // true
const allActive = users.every(u => u.active)      // false
```

## Why It Matters

Modern array and object methods produce code that directly expresses intent — a filter() call self-documents that you're selecting items. Manual for loops obscure the purpose behind implementation details. These methods are also well-optimized by JavaScript engines and support chaining for concise data transformations.

## Aggregation with reduce()

```javascript
// Sum a property
const totalAge = users.reduce((sum, u) => sum + u.age, 0)

// Group by a property
const byActive = users.reduce((groups, user) => {
  const key = user.active ? 'active' : 'inactive'
  return { ...groups, [key]: [...(groups[key] ?? []), user] }
}, {})
```

## flatMap() for Map + Flatten

```javascript
const orders = [
  { id: 1, items: ['shirt', 'pants'] },
  { id: 2, items: ['shoes'] },
  { id: 3, items: ['jacket', 'scarf', 'gloves'] }
]

// Get all items across all orders (flat)
const allItems = orders.flatMap(order => order.items)
// ['shirt', 'pants', 'shoes', 'jacket', 'scarf', 'gloves']
```

## Object Methods

```javascript
const prices = { apple: 1.20, banana: 0.50, cherry: 3.00 }

// Object.entries() — iterate as [key, value] pairs
Object.entries(prices).forEach(([fruit, price]) => {
  console.log(`${fruit}: $${price}`)
})

// Transform an object (entries → map → fromEntries)
const discounted = Object.fromEntries(
  Object.entries(prices).map(([k, v]) => [k, v * 0.9])
)

// Object.keys() and Object.values()
const fruits = Object.keys(prices)
const amounts = Object.values(prices)
```

## Deep Cloning

```javascript
// ❌ Shallow clone — nested objects still shared
const copy = { ...original }

// ❌ Brittle hack for deep clone
const deep = JSON.parse(JSON.stringify(original)) // loses Date, undefined, functions

// ✅ Modern deep clone
const deep = structuredClone(original) // Handles Date, Map, Set, circular refs
```

## Array from Iterables

```javascript
// Convert NodeList, Set, arguments to arrays
const elements = Array.from(document.querySelectorAll('.item'))
const unique = Array.from(new Set([1, 2, 2, 3, 3]))
const range = Array.from({ length: 5 }, (_, i) => i + 1) // [1, 2, 3, 4, 5]
```

## Verification

1. Verify the behavior in the browser after the code change, not only in static analysis.
2. Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
3. Test the primary user flow and one edge case triggered by the changed script path.
4. Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.