# Set a Referrer-Policy header

> The Referrer-Policy header controls how much referrer information is sent when navigating from your site to another, protecting user privacy and preventing leaking sensitive URL parameters.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
When a user clicks a link or a page loads a resource, browsers send a `Referer` header to the destination server. The `Referrer-Policy` header controls how much of the originating URL is included in that header.

## Code Example

```http
Referrer-Policy: strict-origin-when-cross-origin
```

## Why It Matters

Without a Referrer-Policy, a password reset link such as `/reset?token=abc123` is included in the `Referer` header when the user clicks an external link on that page, leaking the token to third parties.

## Available Policy Values

| Value | Same-origin requests | Cross-origin HTTPS | HTTPS → HTTP |
|-------|---------------------|-------------------|--------------|
| `no-referrer` | Nothing | Nothing | Nothing |
| `no-referrer-when-downgrade` | Full URL | Full URL | Nothing |
| `origin` | Origin only | Origin only | Origin only |
| `origin-when-cross-origin` | Full URL | Origin only | Origin only |
| `same-origin` | Full URL | Nothing | Nothing |
| `strict-origin` | Origin only | Origin only | Nothing |
| **`strict-origin-when-cross-origin`** | **Full URL** | **Origin only** | **Nothing** |
| `unsafe-url` | Full URL | Full URL | Full URL |

**Recommended: `strict-origin-when-cross-origin`** — this is the browser default as of Chrome 85+ and Firefox 87+. Set it explicitly to ensure consistent behavior across all browsers.

## Server Configuration

#

## Nginx

```nginx
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Apache

```apache

    Header always set Referrer-Policy "strict-origin-when-cross-origin"

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
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
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
  helmet.referrerPolicy({
    policy: 'strict-origin-when-cross-origin',
  })
)
```

## HTML Meta Tag (Page-level)

```html
<meta name="referrer" content="strict-origin-when-cross-origin">
```

## Per-Element Control

Override the policy for specific links or resources:

```html
<!-- No referrer for this external link -->
<a href="https://external.com" referrerpolicy="no-referrer">External</a>

<!-- Send full URL only to same origin -->
<a href="https://partner.com/track" referrerpolicy="origin">Partner</a>

<!-- No referrer for this image request -->
<img src="https://analytics.example.com/pixel.gif" referrerpolicy="no-referrer">
```

## What Gets Leaked Without a Policy

Consider a user on `/reset-password?token=xK9mP2qR&user=42` who clicks an external link. Without a strict [Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy):

```http
Referer: https://app.example.com/reset-password?token=xK9mP2qR&user=42
```

The third-party site receives the full URL including the password reset token.

Even with a good Referrer-Policy, placing sensitive tokens in query strings is a security smell — they may appear in server logs, browser history, and shared links. Prefer tokens in the URL path or HTTP POST bodies, and rotate tokens immediately after use.

## Exceptions

- A missing or weak header should be evaluated against the live production response path, not only the framework or server config in isolation.
- Legacy integrations or embedded third-party content may require narrowly scoped exceptions, but they should be documented explicitly instead of left permissive by default.
- When multiple security headers are missing, prioritize the header that removes the highest exploitability or browser capability first.

## Support Notes

- The feature is supported across the current project browser matrix.
- Baseline-compatible minimums: chrome 115, edge 115, firefox 116, safari 16.4, safari_ios 16.4.
- Add a fallback or a narrower policy note when a required project target falls outside that support range.

## Verification

### Automated Checks

- Inspect the effective response headers with curl, a security header scanner, or equivalent tooling against representative live responses.

### Manual Checks

- Verify the browser or user-facing behavior manually in a production-like flow and confirm there is no stronger conflicting security signal.