# Parse JSON safely with error handling

> Always wrap JSON.parse() in try/catch and validate the parsed structure before use, as invalid JSON or unexpected data shapes cause runtime errors.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
`JSON.parse()` is a common source of uncaught exceptions when data comes from external, user-controlled, or cached sources.

## Code Example

```javascript
// ❌ Throws SyntaxError if input is invalid
const data = JSON.parse(input)

// ✅ Always wrap in try/catch
function safeParse(json, fallback = null) {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

const config = safeParse(localStorage.getItem('config'), {})
```

## Why It Matters

JSON.parse() on invalid input throws a SyntaxError that will crash your application if uncaught. API responses, localStorage values, and user-provided data can all be malformed. Safe parsing with validation catches these errors at the point of parsing, not deep in your application logic when a missing property causes an unexpected error.

## Validating the Shape

```javascript
// Just parsing isn't enough — the shape might be wrong
const raw = JSON.parse(apiResponse)
const name = raw.user.profile.name // TypeError if any property is missing!

// ✅ Validate before use
function parseUserResponse(json) {
  try {
    const data = JSON.parse(json)
    if (typeof data?.user?.profile?.name !== 'string') {
      throw new Error('Invalid user response shape')
    }
    return data
  } catch (error) {
    console.error('Failed to parse user response:', error)
    return null
  }
}
```

## Using Zod for Schema Validation

```javascript

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'moderator'])
})

function parseUser(json) {
  try {
    const raw = JSON.parse(json)
    return UserSchema.parse(raw) // Throws ZodError if shape is wrong
  } catch (error) {
    console.error('User parsing failed:', error)
    return null
  }
}

// Or use safeParse which returns { success, data, error }
const result = UserSchema.safeParse(raw)
if (result.success) {
  processUser(result.data) // Fully typed!
}
```

## JSON.stringify Edge Cases

```javascript
// Some values become undefined in JSON.stringify:
JSON.stringify(undefined)           // undefined (not a string!)
JSON.stringify({ a: undefined })    // '{}' — property dropped!
JSON.stringify({ fn: () => {} })    // '{}' — functions dropped!
JSON.stringify(new Date())          // '"2024-01-15T..."' — serialized as string
JSON.stringify(new Map([[1, 2]]))   // '{}' — Maps don't serialize!

// Safe serialization
function safeStringify(value, fallback = '{}') {
  try {
    const result = JSON.stringify(value)
    return result ?? fallback
  } catch {
    return fallback
  }
}
```

## Parsing API Responses

```javascript
async function fetchData(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  // response.json() already does JSON.parse() + try/catch
  // But it throws on non-JSON content types
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    throw new Error('Response is not JSON')
  }

  return response.json()
}
```

## Standards

- Use MDN: JavaScript Guide as the standard for how this JavaScript pattern should behave in production, not just in a small local example.
- Use web.dev: Learn JavaScript as the standard for how this JavaScript pattern should behave in production, not just in a small local example.

## Verification

### Automated Checks

- Verify the behavior in the browser after the code change, not only in static analysis.
- Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
- Test the primary user flow and one edge case triggered by the changed script path.

### Manual Checks

- Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.