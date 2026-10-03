# Never use eval() or unsafe dynamic code execution

> Avoid eval(), new Function(), setTimeout/setInterval with string arguments, and innerHTML with untrusted content — they execute arbitrary code and create critical XSS vulnerabilities.

**Priority:** critical · **Difficulty:** beginner · **Time:** 10 min

---
[`eval()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval) and similar dynamic code execution functions such as the [`Function()` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function) run arbitrary strings as JavaScript code, creating security vulnerabilities and defeating JavaScript engine optimizations.
## Code Example

```javascript
// ❌ Critical: eval with user input — direct XSS
const userInput = "alert('hacked!')"
eval(userInput) // Executes arbitrary code

// ❌ Critical: new Function is equally dangerous
const fn = new Function('x', 'return ' + userExpression)

// ❌ Bad: string-based timers evaluate code
setTimeout('updateUI()', 1000) // Don't do this
setInterval('fetchData()', 5000) // Don't do this

// ❌ Bad: eval for JSON parsing (historically common, never safe)
const data = eval('(' + jsonString + ')')
```

## Why It Matters

eval() and its equivalents are the root cause of some of the most severe XSS vulnerabilities. If any user-controlled string reaches eval(), an attacker can execute arbitrary JavaScript in your users' browsers — stealing sessions, making requests as the user, or redirecting to malicious sites. A strict [Content Security Policy](/Users/thedaviddias/Projects/frontendchecklist.io/packages/content/rules/en/security/csp.mdx) adds a browser-level backstop, but there is still no legitimate use case here that cannot be solved more safely.

## Safe Alternatives

#

## Parsing Data

```javascript
// ✅ JSON.parse for JSON data
const data = JSON.parse(jsonString)

// ✅ URL parsing
const params = new URLSearchParams(queryString)
const value = params.get('key')
```

### Dynamic Property Access

```javascript
// ❌ Using eval for dynamic property access
const property = 'username'
const value = eval(`user.${property}`)

// ✅ Use bracket notation
const value = user[property]
// Add validation to ensure only expected properties are accessed
const ALLOWED = ['username', 'email', 'role']
if (ALLOWED.includes(property)) {
  const value = user[property]
}
```

### Dynamic Dispatch

```javascript
// ❌ Using eval to call a function by name
const actionName = 'save'
eval(`${actionName}Document()`)

// ✅ Use an explicit dispatch table
const actions = {
  save: saveDocument,
  load: loadDocument,
  export: exportDocument
}
if (actions[actionName]) {
  actions[actionName]()
}
```

### Timers

```javascript
// ❌ String-based timers
setTimeout('updateUI()', 1000)

// ✅ Function references
setTimeout(updateUI, 1000)
setTimeout(() => updateUI(), 1000)
```

## ESLint Configuration

Use [ESLint's `no-eval` rule](https://eslint.org/docs/rules/no-eval) together with `no-new-func` and `no-implied-eval` so these patterns fail in code review and CI rather than in production.

```json
{
  "rules": {
    "no-eval": "error",
    "no-new-func": "error",
    "no-implied-eval": "error"
  }
}
```

## Content Security Policy

Block eval at the browser level with a strict CSP:

```
Content-Security-Policy: script-src 'self'; object-src 'none'
```

Without `'unsafe-eval'`, `eval()` and `new Function()` will be blocked by the browser.

## Exceptions

- A framework default or browser behavior is not an exception by itself; only documented constraints with compensating controls should suppress the finding.
- When a JavaScript pattern looks unsafe but the data is fully constrained, validated, and never attacker-controlled, document that boundary explicitly instead of treating it as implicit.
- If a rule overlaps with a stronger exploit path or runtime failure, fix the issue that most directly enables compromise or user-visible breakage first.

## Verification

### Automated Checks

- Verify the behavior in the browser after the code change, not only in static analysis.
- Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
- Test the primary user flow and one edge case triggered by the changed script path.

### Manual Checks

- Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.