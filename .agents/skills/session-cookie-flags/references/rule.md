# Set Secure, HttpOnly, and SameSite flags on session cookies

> All session and authentication cookies are issued with the Secure, HttpOnly, and an appropriate SameSite flag to prevent interception, JavaScript exfiltration, and cross-site request forgery.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
Session cookies are the keys to the kingdom. The three security flags are independent mechanisms that each block a distinct attack vector.

## Code Example

```http
Set-Cookie: session_id=abc123xyz;
            HttpOnly;
            Secure;
            SameSite=Strict;
            Path=/;
            Max-Age=86400
```

## Why It Matters

Missing cookie flags are one of the most common and easily fixed authentication weaknesses. Without Secure, session tokens are transmitted in plain text over HTTP and can be captured by network eavesdroppers. Without HttpOnly, any XSS payload can exfiltrate the session token in one line. Without SameSite, any website can trigger authenticated actions on behalf of the victim without their knowledge.

## Flag Reference

| Flag | What it prevents | When to omit |
|---|---|---|
| `Secure` | Transmission over plain HTTP | Never (on production) |
| `HttpOnly` | JavaScript access (XSS token theft) | Only for cookies that JS must read (e.g., CSRF token) |
| `SameSite=Strict` | All cross-site requests | When your app uses cross-site navigation or OAuth redirects |
| `SameSite=Lax` | Non-safe cross-site requests (POST, PUT, DELETE) | When you need `Strict` level protection |
| `SameSite=None; Secure` | (no CSRF protection) | Third-party cookie scenarios (embeds, iframes) |

## Server Implementations

#

## Next.js (App Router)

```typescript
// lib/cookies.ts — reusable cookie options

const isProd = process.env.NODE_ENV === 'production'

  httpOnly: true,
  secure: isProd,          // false in dev (localhost has no HTTPS)
  sameSite: 'strict',
  path: '/',
  maxAge: 60 * 60 * 24,    // 24 hours
}

  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  path: '/api/auth',       // Restrict to auth endpoints only
  maxAge: 60 * 60 * 24 * 7, // 7 days
}
```

```typescript
// app/api/auth/login/route.ts

  // ... authenticate user ...

  const response = NextResponse.json({ ok: true })

  response.cookies.set('session_id', sessionToken, SESSION_COOKIE_OPTIONS)

  return response
}
```

### Express.js

```typescript

const app = express()

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    name: '__session',    // Rename from default 'connect.sid'
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,  // 24 hours in milliseconds
    },
  })
)
```

### Node.js (raw Set-Cookie header)

```typescript

function setSecureCookie(
  res: ServerResponse,
  name: string,
  value: string,
  maxAgeSeconds = 86400
) {
  const flags = [
    `${name}=${value}`,
    `Max-Age=${maxAgeSeconds}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ]

  res.setHeader('Set-Cookie', flags.join('; '))
}
```

### Nginx (for session cookies set by upstream)

```nginx
# Ensure the upstream's Set-Cookie has the right flags
# (Better to set flags in the application, but this adds a safety net)
proxy_cookie_flags ~ httponly secure samesite=strict;
```

## SameSite Behaviour Details

```
SameSite=Strict:
  ✅ Same-site GET, POST, etc.
  ❌ Cross-site navigation (typing URL, clicking link from another site)
  ❌ Cross-site POST, DELETE, PUT, PATCH

SameSite=Lax (browser default in modern browsers):
  ✅ Same-site requests
  ✅ Top-level cross-site GET navigation (clicking a link)
  ❌ Cross-site POST, DELETE, PUT, PATCH (subresource requests)

SameSite=None:
  ✅ All requests (same-site and cross-site)
  ⚠️ Requires Secure; provides NO CSRF protection
```

### When to use Lax instead of Strict

Use `SameSite=Lax` when your authentication flow involves cross-site redirects — for example, OAuth 2.0 where the user is redirected from a third-party identity provider back to your site. `Strict` would drop the session cookie on that final redirect, logging the user out immediately after they authenticate.

```typescript
// For OAuth callback routes, use Lax to survive the cross-site redirect

  httpOnly: true,
  secure: true,
  sameSite: 'lax',     // Survives the redirect from the identity provider
  maxAge: 60 * 10,     // 10-minute PKCE state lifetime
  path: '/api/auth',
}
```

## Cookie Prefixes

Cookie prefixes are a browser mechanism that enforces security constraints by naming convention:

```
__Host-session_id   → Forces Secure, forbids Domain, requires Path=/
__Secure-session_id → Forces Secure
```

```typescript
// Using the __Host- prefix for maximum security
response.cookies.set('__Host-session', sessionToken, {
  httpOnly: true,
  secure: true,      // Required by the prefix
  sameSite: 'strict',
  path: '/',         // Required by __Host-
  // domain: must NOT be set (required by __Host-)
})
```

## Auditing Existing Cookies

```bash
# Check cookie flags via curl
curl -I -s https://example.com/api/login -d '{"email":"test"}' \
  -H 'Content-Type: application/json' | grep -i set-cookie

# Expected output:
# set-cookie: session_id=...; Path=/; HttpOnly; Secure; SameSite=Strict
```

Browsers without SameSite support treat the absence of the flag as `None` (sending cookies on all cross-site requests). Modern browsers default to `Lax`, but you should always set SameSite explicitly rather than relying on browser defaults, which change across versions.

## Exceptions

- Client-side storage for non-sensitive UI state is not equivalent to storing credentials, session identifiers, or long-lived secrets.
- Framework defaults are not exceptions by themselves; only documented constraints with compensating controls should suppress the finding.
- When several storage protections fail together, prioritize the control that most directly prevents credential theft or replay.

## Standards

- Align the implementation with MDN: Set-Cookie and verify the effective response or browser behavior, not only the configuration file.
- Align the implementation with OWASP: Session Management Cheat Sheet and verify the effective response or browser behavior, not only the configuration file.

## Verification

### Automated Checks

- Run `curl -I` on the login endpoint and verify the `Set-Cookie` header includes all three flags.
- Use [Mozilla Observatory](https://observatory.mozilla.org/) to scan the site and verify the cookie security score.

### Manual Checks

- Log in to the application, then open DevTools → **Application** → **Cookies** and confirm session cookies show the `HttpOnly` and `Secure` checkboxes ticked and `SameSite` set to `Strict` or `Lax`.
- Check that session cookies are absent from `document.cookie` output in the browser console.