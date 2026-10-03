# Prefer const and let over var

> Use block-scoped const and let declarations instead of function-scoped var to avoid hoisting bugs and unintended variable mutations.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
Block-scoped declarations introduced in ES2015 (`const` and `let`) solve real bugs caused by `var`'s function scope and hoisting behavior.

## Code Examples

```javascript
// ❌ Bad: var leaks out of the block
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// Logs: 3, 3, 3 — not 0, 1, 2!

// ✅ Good: let is block-scoped
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// Logs: 0, 1, 2
```

```javascript
// ❌ Bad: var is hoisted and accessible before declaration
console.log(name) // undefined, not ReferenceError
var name = 'Alice'

// ✅ Good: let/const throw ReferenceError in the temporal dead zone
console.log(name) // ReferenceError: Cannot access 'name' before initialization
let name = 'Alice'
```

## Why It Matters

var's function scope and hoisting behavior regularly causes bugs where variables are accessible outside the block they were declared in. const and let enforce block scope and make code intent clearer — const signals that a binding should not be reassigned, which helps readers understand data flow.

## const vs let

```javascript
// ✅ Use const when a binding won't be reassigned
const MAX_RETRIES = 3
const apiUrl = 'https://api.example.com'
const user = fetchUser() // the binding is constant, not the object

// ✅ Use let when reassignment is needed
let count = 0
count++

let status = 'pending'
status = 'complete'
```

## const Does Not Mean Immutable

```javascript
// ✅ const prevents reassignment of the binding
const user = { name: 'Alice', role: 'admin' }
user.role = 'viewer' // ✅ mutation is allowed
user = { name: 'Bob' } // ❌ TypeError: assignment to constant variable

// To make an object truly immutable, use Object.freeze
const config = Object.freeze({ debug: false, version: '1.0' })
config.debug = true // silently fails in sloppy mode, throws in strict mode
```

## Enforce with ESLint

Add these rules to your ESLint config:

```json
{
  "rules": {
    "no-var": "error",
    "prefer-const": "error"
  }
}
```

## Verification

### Automated Checks

- Verify the behavior in the browser after the code change, not only in static analysis.
- Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
- Test the primary user flow and one edge case triggered by the changed script path.

### Manual Checks

- Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.