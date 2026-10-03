# Avoid implicit type coercion

> Use strict equality (===), explicit type conversion, and Number/String/Boolean constructors to avoid JavaScript's implicit type coercion producing unexpected results.

**Priority:** medium · **Difficulty:** beginner · **Time:** 15 min

---
JavaScript will silently convert types when you use operators that expect a specific type. The results are often surprising, especially with equality comparisons.

## Code Example

```javascript
// ❌ == performs type coercion before comparing
0 == false    // true (both coerce to 0)
'' == false   // true
null == undefined // true
'5' == 5      // true
[] == false   // true
[] == ![]     // true (this is famously confusing)

// ✅ === compares value AND type
0 === false   // false
'5' === 5     // false
null === undefined // false
```

## Why It Matters

JavaScript's implicit type coercion produces results that look like bugs to anyone who doesn't know the exact coercion rules. `==` comparisons with mixed types silently convert values in ways that fail to catch genuine errors. Explicit conversions make code intent clear and catch real type mismatches at the point where they occur.

## Explicit Type Conversion

```javascript
// Converting to Number
const input = document.getElementById('price').value // '12.50' (string)

// ❌ Implicit — relies on coercion
const total = input * 100

// ✅ Explicit — intent is clear
const total = Number(input) * 100
const total = parseFloat(input) * 100

// parseInt for integers (always provide radix)
const pageNum = parseInt(params.get('page'), 10)
```

## The + Operator Trap

```javascript
// + prefers string concatenation when one operand is a string
'5' + 3      // '53' — string concatenation!
5 + '3'      // '53'
5 + 3        // 8 — numeric addition

// Force numeric addition
Number('5') + 3  // 8
+'5' + 3         // 8 (unary + converts to number)
parseInt('5', 10) + 3 // 8
```

## Type Checking

```javascript
// typeof has surprises
typeof null       // 'object' — historical bug
typeof []         // 'object' — not helpful
typeof function(){} // 'function'

// ✅ Specific checks
Array.isArray([])           // true
value === null              // true for null
value instanceof Date       // true for Date objects
Object.prototype.toString.call(value) === '[object RegExp]' // for RegExp
```

## Falsy Values to Know

```javascript
// These are all falsy in JavaScript:
false, 0, -0, 0n, '', null, undefined, NaN

// Common trap — 0 is falsy!
const count = 0
if (count) {
  // This block never runs for count = 0
}

// ✅ Be explicit for numeric checks
if (count !== 0) { /* runs for count = 0 */ }
if (count > 0) { /* only positive */ }

// Another trap — empty array and object are truthy!
if ([])  { /* runs! */ }
if ({})  { /* runs! */ }
```

## ESLint Rules

```json
{
  "rules": {
    "eqeqeq": ["error", "always"],
    "no-implicit-coercion": "warn"
  }
}
```

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