# Set an HSTS header

> The Strict-Transport-Security response header tells browsers to always use HTTPS for your domain, preventing protocol downgrade attacks and cookie hijacking.

**Priority:** high · **Difficulty:** intermediate · **Time:** 15 min

---
[HTTP Strict Transport Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security) (HSTS) instructs browsers to always use HTTPS for your domain, even if the user types an `http://` URL or clicks an unencrypted link. Defined in [RFC 6797](https://www.rfc-editor.org/info/rfc6797/), it eliminates the window of vulnerability present in HTTP-to-HTTPS redirects.

## Code Example

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

| Directive | Required | Description |
|-----------|----------|-------------|
| `max-age=<seconds>` | Yes | How long (in seconds) the browser caches the HSTS policy. Use `31536000` (1 year) at minimum. |
| `includeSubDomains` | Recommended | Applies HSTS to all subdomains. Required for HSTS preload submission. |
| `preload` | Optional | Signals intent to be in the HSTS preload list. See warnings below. |

## Why It Matters

Without HSTS, an attacker on the same network can intercept the first HTTP request and strip TLS (SSL stripping), silently downgrading the connection before the browser ever sees a redirect.

## How HSTS Works

Without HSTS, the first visit to the HTTP version of your site triggers a redirect to HTTPS. An attacker performing a man-in-the-middle (MITM) attack can intercept that first HTTP request and strip TLS, which is the classic SSL-stripping problem the [OWASP HSTS guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html) is designed to prevent.

With HSTS:

1. The browser receives `Strict-Transport-Security` on the first HTTPS response.
2. It caches the HSTS policy for `max-age` seconds.
3. All subsequent navigations to the HTTP version are internally upgraded to HTTPS **before any network request is made** — the attacker never sees the plain HTTP traffic.

## Server Configuration

#

## Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### Apache

```apache

    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

```

### Next.js (`next.config.js`)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

### Express.js (using Helmet)

```javascript

app.use(
  helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
  })
)
```

## HSTS Preloading

The `preload` directive plus submission to the browser preload list extends the [RFC 6797](https://www.rfc-editor.org/info/rfc6797/) behavior even further by hardcoding your domain into shipping browsers. This means browsers **never** make a plain HTTP request to your domain, even on first visit.

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Requirements to be accepted into the preload list:
- Serve a valid TLS certificate
- Redirect HTTP to HTTPS on the same host
- Serve HSTS with `max-age` of at least 31536000 (1 year)
- Include `includeSubDomains`
- Include `preload`
- All subdomains must be accessible over HTTPS

Once in the preload list, removal takes weeks to months to propagate. All subdomains must serve valid HTTPS before adding `preload`. Test thoroughly — a misconfigured subdomain will become inaccessible to browsers in the list.

## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Sending HSTS over HTTP | Header is ignored; any browser that cached it will be locked out | Only send HSTS over HTTPS |
| Short `max-age` (e.g., 300) | Provides minimal protection | Use `31536000` (1 year) |
| Missing `includeSubDomains` | Subdomains remain vulnerable to downgrade attacks | Add `includeSubDomains` if all subdomains serve HTTPS |
| Using `preload` without testing | Subdomains become unreachable if they lack HTTPS | Only add `preload` after confirming all subdomains work |

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