# Set an X-Frame-Options header

> The X-Frame-Options header controls whether your page can be embedded in an iframe, frame, or object — preventing clickjacking attacks.

**Priority:** high · **Difficulty:** beginner · **Time:** 5 min

---
[Clickjacking](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html), also called UI redressing, is an attack where a malicious page embeds your application in a hidden or transparent iframe and tricks users into clicking elements they cannot see. [`X-Frame-Options`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options) prevents your page from being embedded as an iframe.
## Code Example

```
┌─────────────────────────────────────┐
│  attacker.com (visible page)        │
│                                     │
│  "Click here to win a prize!"       │
│                                     │
│  ┌─────────────────────────────┐    │  ← Invisible iframe
│  │  bank.com (opacity: 0.0)   │    │    positioned over the button
│  │  [Transfer $1000] button   │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

The user clicks "win a prize" but actually clicks the hidden "Transfer $1000" button on the bank's page.

## Why It Matters

Without framing protection, an attacker can embed your banking login page in a transparent iframe on a malicious site and trick users into clicking buttons they cannot see — transferring money, changing settings, or leaking credentials.

## X-Frame-Options Values

| Value | Behavior |
|-------|----------|
| `DENY` | Page cannot be embedded in any frame, regardless of origin |
| `SAMEORIGIN` | Page can only be embedded by a frame on the same origin |
| `ALLOW-FROM uri` | **Obsolete** — unsupported in Chrome, Firefox; use CSP `frame-ancestors` |

## Recommended Configuration

#

## Most sites — use DENY

```http
X-Frame-Options: DENY
```

Use this when your pages should never appear inside an iframe (logins, dashboards, payment pages).

### Sites with same-origin embeds

```http
X-Frame-Options: SAMEORIGIN
```

Use this if your own domain embeds the page (e.g., an admin panel loading pages in an internal iframe).

## Server Configuration

### Nginx

```nginx
add_header X-Frame-Options "DENY" always;
```

### Apache

```apache

    Header always set X-Frame-Options "DENY"

```

### Next.js

```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ]
  },
}
```

### Express.js (using Helmet)

```javascript

app.use(
  helmet.frameguard({
    action: 'deny',  // or 'sameorigin'
  })
)
```

## Modern Alternative: CSP `frame-ancestors`

The [`Content-Security-Policy: frame-ancestors`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors) directive supersedes `X-Frame-Options` and is more flexible:

```http
# Equivalent to DENY
Content-Security-Policy: frame-ancestors 'none'

# Equivalent to SAMEORIGIN
Content-Security-Policy: frame-ancestors 'self'

# Allow specific trusted domains (not possible with X-Frame-Options)
Content-Security-Policy: frame-ancestors 'self' https://trusted-partner.com
```

`frame-ancestors` takes precedence over `X-Frame-Options` in browsers that support both. For maximum compatibility, set both:

```nginx
add_header X-Frame-Options "DENY" always;
add_header Content-Security-Policy "frame-ancestors 'none'" always;
```

## Exceptions

- A missing or weak header should be evaluated against the live production response path, not only the framework or server config in isolation.
- Legacy integrations or embedded third-party content may require narrowly scoped exceptions, but they should be documented explicitly instead of left permissive by default.
- When multiple security headers are missing, prioritize the header that removes the highest exploitability or browser capability first.

## Standards

- Align the implementation with MDN: X-Frame-Options and verify the effective response or browser behavior, not only the configuration file.
- Align the implementation with OWASP: Clickjacking Defense Cheat Sheet and verify the effective response or browser behavior, not only the configuration file.
- Align the implementation with MDN: CSP frame-ancestors and verify the effective response or browser behavior, not only the configuration file.

## Verification

### Automated Checks

- Inspect the effective response headers with curl, a security header scanner, or equivalent tooling against representative live responses.

### Manual Checks

- Payment widgets (Stripe, PayPal) embedded in merchants' sites
- Analytics dashboards embedded in CMS admin panels
- Third-party video players