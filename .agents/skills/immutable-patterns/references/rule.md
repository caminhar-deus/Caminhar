# Prefer immutable data patterns

> Use spread operators, Object.assign, and array methods that return new values instead of mutating objects and arrays in place, to make data flow predictable and debugging easier.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
Immutability means creating new values instead of changing existing ones. This makes it easy to see exactly what changed and when.

## Code Example

```javascript
// ❌ Bad: mutates the original object
function updateUser(user, changes) {
  user.name = changes.name  // Original is mutated
  user.email = changes.email
  return user  // Same reference as input
}

// ✅ Good: returns a new object
function updateUser(user, changes) {
  return { ...user, ...changes }
}

// ✅ Deep update with spread
function updateUserAddress(user, address) {
  return {
    ...user,
    address: { ...user.address, ...address }
  }
}
```

## Why It Matters

Mutating shared objects makes it impossible to track where a value changed. When you update state immutably, each version of the data is a separate object — you can compare references to detect changes, time-travel debug, and know exactly which part of your code changed the data.

## Array Updates

```javascript
const todos = [
  { id: 1, text: 'Buy groceries', done: false },
  { id: 2, text: 'Walk the dog', done: false }
]

// ❌ Bad: mutates in place
function addTodo(todos, newTodo) {
  todos.push(newTodo)  // Mutation!
  return todos
}

// ✅ Good: returns a new array
const addTodo = (todos, newTodo) => [...todos, newTodo]

// Remove without splice
const removeTodo = (todos, id) => todos.filter(todo => todo.id !== id)

// Update one item
const completeTodo = (todos, id) =>
  todos.map(todo => todo.id === id ? { ...todo, done: true } : todo)
```

## Mutating Array Methods to Avoid on Shared Data

```javascript
// These mutate in place — use their immutable alternatives
array.push(item)        → [...array, item]
array.pop()             → array.slice(0, -1)
array.shift()           → array.slice(1)
array.unshift(item)     → [item, ...array]
array.splice(i, 1)      → array.filter((_, idx) => idx !== i)
array.sort(fn)          → [...array].sort(fn)
array.reverse()         → [...array].reverse()
```

## Object.freeze for Constants

```javascript
// ✅ Freeze configuration objects to prevent accidental mutation
const CONFIG = Object.freeze({
  apiUrl: 'https://api.example.com',
  maxRetries: 3,
  timeout: 5000
})

CONFIG.apiUrl = 'https://evil.com' // TypeError in strict mode, silent in sloppy

// Note: freeze is shallow — nested objects are still mutable
const config = Object.freeze({ db: { host: 'localhost' } })
config.db.host = 'remote' // This works! db object is not frozen
```

## Using Immer for Complex Nested Updates

```javascript

// Write mutations — Immer produces a new immutable object
const nextState = produce(currentState, draft => {
  draft.users[userId].profile.avatar = newAvatarUrl
  draft.users[userId].posts.push(newPost)
})
// currentState is unchanged, nextState is a new object
```

## Standards

- Use MDN: JavaScript Guide as the standard for how this JavaScript pattern should behave in production, not just in a small local example.
- Use web.dev: Learn JavaScript as the standard for how this JavaScript pattern should behave in production, not just in a small local example.

## Verification

1. Verify the behavior in the browser after the code change, not only in static analysis.
2. Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
3. Test the primary user flow and one edge case triggered by the changed script path.
4. Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.