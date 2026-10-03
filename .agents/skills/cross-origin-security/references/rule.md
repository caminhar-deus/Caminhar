# Handle cross-origin requests securely

> Use CORS correctly, validate message origins with postMessage, and understand the Same-Origin Policy to prevent cross-origin attacks.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Cross-origin communication is common in modern web apps — embedded iframes, third-party widgets, and cross-subdomain messaging all require it. Each mechanism has specific security requirements.

## Code Example

```javascript
// ❌ Dangerous: accepts messages from any origin
window.addEventListener('message', (event) => {
  const data = JSON.parse(event.data)
  processCommand(data.command) // Attacker's page can send any command!
})

// ✅ Always validate the origin
const ALLOWED_ORIGINS = ['https://app.example.com', 'https://admin.example.com']

window.addEventListener('message', (event) => {
  if (!ALLOWED_ORIGINS.includes(event.origin)) {
    console.warn('Rejected message from:', event.origin)
    return
  }

  let data
  try {
    data = JSON.parse(event.data)
  } catch {
    return
  }

  processCommand(data.command)
})

// ✅ Always specify target origin when sending
iframe.contentWindow.postMessage(
  JSON.stringify({ type: 'AUTH_SUCCESS', token }),
  'https://embedded.example.com' // Don't use '*' for sensitive data
)
```

## Why It Matters

The Same-Origin Policy is the browser's primary defense against malicious sites stealing data or performing actions on behalf of your users. Misconfiguring CORS or failing to validate postMessage origins can allow attackers to bypass this protection — reading private data, submitting forms as users, or injecting content into your pages.

## CORS Configuration

```javascript
// ❌ Overly permissive — allows any site to make authenticated requests
app.use(cors({
  origin: '*',
  credentials: true  // This combination is invalid per spec, but dangerous if misconfigured
}))

// ✅ Explicit allowlist for authenticated endpoints
app.use(cors({
  origin: (origin, callback) => {
    const allowed = ['https://app.example.com', 'https://admin.example.com']
    if (!origin || allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

// ✅ Public APIs can use wildcard (without credentials)
app.use('/api/public', cors({ origin: '*' }))
```

## fetch with Credentials

```javascript
// Include cookies in cross-origin requests (requires CORS allow-credentials)
const response = await fetch('https://api.example.com/user', {
  credentials: 'include',  // Sends cookies
  headers: { 'Content-Type': 'application/json' }
})

// 'same-origin' (default) — only sends credentials on same-origin requests
// 'omit' — never sends credentials
// 'include' — always sends credentials (requires server CORS configuration)
```

## CSRF Protection

```javascript
// SameSite cookies prevent cross-origin form submissions from sending cookies
// Set on the server:
// Set-Cookie: session=abc123; SameSite=Strict; Secure; HttpOnly

// For APIs that receive cross-origin requests, validate CSRF tokens:
async function submitForm(data) {
  const csrfToken = document.querySelector('meta[name="csrf-token"]').content

  await fetch('/api/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify(data)
  })
}
```

## Prevent Open Redirects

Return-to flows often accept `next`, `redirect`, or `callbackUrl` parameters. Never navigate to them blindly:

```typescript
// ❌ Bad: attacker controls the destination
const destination = new URLSearchParams(location.search).get('next')
window.location.assign(destination ?? '/dashboard')

// ✅ Good: allow-list internal destinations only
const nextParam = new URLSearchParams(location.search).get('next')
const safeDestination = nextParam?.startsWith('/') ? nextParam : '/dashboard'
window.location.assign(safeDestination)
```

## Exceptions

- A framework default or browser behavior is not an exception by itself; only documented constraints with compensating controls should suppress the finding.
- When a JavaScript pattern looks unsafe but the data is fully constrained, validated, and never attacker-controlled, document that boundary explicitly instead of treating it as implicit.
- If a rule overlaps with a stronger exploit path or runtime failure, fix the issue that most directly enables compromise or user-visible breakage first.

## Standards

- Use MDN: JavaScript Guide as the standard for how this JavaScript pattern should behave in production, not just in a small local example.
- Use web.dev: Learn JavaScript as the standard for how this JavaScript pattern should behave in production, not just in a small local example.

## Verification

1. Verify the behavior in the browser after the code change, not only in static analysis.
2. Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
3. Test the primary user flow and one edge case triggered by the changed script path.
4. Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.
5. Try a malicious external redirect target such as `?next=https://attacker.example` and confirm the app rejects or rewrites it.