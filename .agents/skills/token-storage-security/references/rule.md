# Store authentication tokens securely

> Sensitive authentication tokens are stored in httpOnly cookies rather than localStorage or sessionStorage to prevent theft via cross-site scripting attacks (OWASP A07).

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
Where you store authentication credentials determines your entire XSS attack surface. [HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies) and browser storage APIs do not offer the same guarantees, and the [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) treats that distinction as a core architectural decision rather than an implementation detail.
## Code Examples

The server sets the token as a cookie, the browser sends it automatically on every request, and no JavaScript can read it. That separation is exactly what reduces the [A07 authentication-failure](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/) risk from token theft after an XSS bug.

#

## Server: Set the cookie after authentication

```typescript
// app/api/auth/login/route.ts (Next.js)

  const { email, password } = await request.json()

  const user = await authenticateUser(email, password)
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const accessToken = signJwt({ sub: user.id }, { expiresIn: '15m' })
  const refreshToken = signJwt({ sub: user.id, type: 'refresh' }, { expiresIn: '7d' })

  const response = NextResponse.json({ user: { id: user.id, name: user.name } })

  // Access token — short-lived, httpOnly
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 15,          // 15 minutes
    path: '/',
  })

  // Refresh token — longer-lived, restricted path
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/api/auth',         // Only sent to the refresh endpoint
  })

  return response
}
```

### Server: Validate the cookie on protected routes

```typescript
// middleware.ts

  const token = request.cookies.get('access_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const payload = verifyJwt(token)
    const response = NextResponse.next()
    // Forward user ID to route handlers via header
    response.headers.set('x-user-id', payload.sub as string)
    return response
  } catch {
    // Token expired or invalid — attempt refresh
    return NextResponse.redirect(new URL('/api/auth/refresh', request.url))
  }
}

  matcher: ['/dashboard/:path*', '/account/:path*'],
}
```

### Server: Refresh token rotation

```typescript
// app/api/auth/refresh/route.ts

  const refreshToken = request.cookies.get('refresh_token')?.value

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
  }

  try {
    const payload = verifyJwt(refreshToken)

    // Invalidate the old refresh token (token rotation)
    await invalidateRefreshToken(refreshToken)

    // Issue new token pair
    const newAccessToken = signJwt({ sub: payload.sub }, { expiresIn: '15m' })
    const newRefreshToken = signJwt(
      { sub: payload.sub, type: 'refresh' },
      { expiresIn: '7d' }
    )

    const response = NextResponse.json({ ok: true })

    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 15,
    })

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/api/auth',
    })

    return response
  } catch {
    // Refresh token invalid/expired — force re-login
    const response = NextResponse.json({ error: 'Session expired' }, { status: 401 })
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    return response
  }
}
```

### Clearing tokens on logout

```typescript
// app/api/auth/logout/route.ts

  const response = NextResponse.json({ ok: true })

  response.cookies.set('access_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })

  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/api/auth',
  })

  return response
}
```

## Why It Matters

localStorage is accessible to any JavaScript running on the page. A single XSS vulnerability — including one in a third-party script — can exfiltrate all tokens silently. httpOnly cookies are completely invisible to JavaScript; even if an attacker executes arbitrary code on the page, they cannot read the cookie. This single architectural choice eliminates the most common token theft vector.

## Storage Mechanism Comparison

| Storage | Readable by JS | Persists across tabs | Sent automatically | XSS risk |
|---|---|---|---|---|
| `localStorage` | Yes | Yes | No | **High** |
| `sessionStorage` | Yes | No (tab-scoped) | No | **High** |
| `document.cookie` (without httpOnly) | Yes | Yes | Yes | **High** |
| **httpOnly cookie** | **No** | Yes | Yes | **Low** |
| Memory (JS variable) | Yes (same tab) | No | No | Medium |

## When Is localStorage Acceptable?

Some tokens have lower sensitivity and are acceptable in localStorage:

| Token type | localStorage OK? | Reasoning |
|---|---|---|
| Session token / JWT (auth) | **No** | High-value target for XSS |
| Refresh token | **No** | Grants long-lived access |
| Short-lived CSRF token | Yes (with care) | Intentionally readable by JS |
| OAuth state parameter | Yes | Short-lived, non-secret |
| UI preferences, theme | Yes | Not a security credential |
| Analytics/telemetry IDs | Yes | Not a security credential |

## CSRF Protection

httpOnly cookies are sent automatically — including on cross-site requests if `SameSite` is `None`. Always use `SameSite=Strict` or `Lax`, and add a CSRF token for every state-changing request when cookies can be sent by the browser:

```typescript
// Generate a CSRF token and store it in a separate, readable cookie
response.cookies.set('csrf_token', generateCsrfToken(), {
  httpOnly: false,    // Must be readable by JS to include in request headers
  secure: true,
  sameSite: 'strict',
  maxAge: 60 * 60,
})

// Client reads the CSRF token and sends it as a header
const csrfToken = document.cookie
  .split('; ')
  .find((row) => row.startsWith('csrf_token='))
  ?.split('=')[1]

await fetch('/api/transfer', {
  method: 'POST',
  headers: { 'X-CSRF-Token': csrfToken ?? '' },
})
```

Also validate the `Origin` or `Referer` header server-side for sensitive browser-initiated requests so your server rejects forged submissions even if client code is bypassed.

An httpOnly cookie prevents JavaScript from reading the token, but the browser still sends it on cross-site requests. Always combine httpOnly with `SameSite=Strict` or `SameSite=Lax` to prevent cross-site request forgery. They are complementary protections, not alternatives.

## Exceptions

- Client-side storage for non-sensitive UI state is not equivalent to storing credentials, session identifiers, or long-lived secrets.
- Framework defaults are not exceptions by themselves; only documented constraints with compensating controls should suppress the finding.
- When several storage protections fail together, prioritize the control that most directly prevents credential theft or replay.

## Standards

- Align the implementation with OWASP: Session Management Cheat Sheet and verify the effective response or browser behavior, not only the configuration file.
- Align the implementation with OWASP: A07:2021 – Identification and Authentication Failures and verify the effective response or browser behavior, not only the configuration file.
- Align the implementation with MDN: Using HTTP cookies and verify the effective response or browser behavior, not only the configuration file.

## Verification

1. Open DevTools → **Application** → **Cookies** and confirm session tokens have the `HttpOnly` flag checked.
2. In the browser Console, run `document.cookie` and verify the session token does **not** appear.
3. Verify `localStorage` and `sessionStorage` do not contain tokens: run `Object.keys(localStorage)` and `Object.keys(sessionStorage)` in the Console.
4. Test the login → refresh → logout cycle and confirm cookies are set, updated, and cleared correctly.
5. Trigger one state-changing request without the CSRF header and confirm the server rejects it.