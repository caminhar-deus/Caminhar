# Set X-Content-Type-Options: nosniff

> The X-Content-Type-Options: nosniff header prevents browsers from MIME-sniffing a response away from the declared Content-Type, blocking a class of drive-by download and XSS attacks.

**Priority:** high · **Difficulty:** beginner · **Time:** 5 min

---
[`X-Content-Type-Options: nosniff`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options) is a simple, one-line security header that prevents browsers from interpreting files differently from the `Content-Type` declared by the server.
## Code Example

```http
X-Content-Type-Options: nosniff
```

The only valid value is `nosniff`. There are no other directives.

#

## Effect on Different Response Types

| Response | Effect of `nosniff` |
|----------|---------------------|
| `Content-Type: text/html` | Processed as HTML |
| `Content-Type: image/png` | Processed as image — never as script |
| `Content-Type: application/json` | Blocked from being loaded as a script tag |
| Script with wrong MIME type | Blocked — not executed |
| Stylesheet with wrong MIME type | Blocked — not applied |

## Why It Matters

Browsers that MIME-sniff can be tricked into executing malicious JavaScript uploaded as an image — even if the server sends `Content-Type: image/png`. `nosniff` forces the browser to honor the declared type.

## The MIME Sniffing Problem

Early browsers implemented MIME sniffing to work around misconfigured servers that served HTML files with incorrect `Content-Type` headers. An attacker can exploit this behavior:

1. User uploads a file named `photo.png` containing `<script>alert(1)</script>`
2. Server stores it and serves it with `Content-Type: image/png`
3. Without `nosniff`, Internet Explorer (and older browsers) may sniff the content, identify it as HTML/JavaScript, and execute it
4. Script runs in the context of your domain — full XSS

With `nosniff`, the browser strictly enforces the declared `Content-Type` and refuses to execute the file as script, which lines up with the [Fetch standard's MIME-type blocking rules](https://fetch.spec.whatwg.org/#should-response-to-request-be-blocked-due-to-mime-type) and [OWASP's security-header baseline](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html).

## Server Configuration

### Nginx

```nginx
# Add to http {}, server {}, or location {} block
add_header X-Content-Type-Options "nosniff" always;
```

### Apache

```apache

    Header always set X-Content-Type-Options "nosniff"

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
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}
```

### Express.js (using Helmet)

```javascript

// noSniff is enabled by default in Helmet
app.use(helmet())

// Or explicitly:
app.use(helmet.noSniff())
```

## Complete Security Headers Bundle

`X-Content-Type-Options` is typically deployed alongside other hardening headers:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

## Exceptions

- A missing or weak header should be evaluated against the live production response path, not only the framework or server config in isolation.
- Legacy integrations or embedded third-party content may require narrowly scoped exceptions, but they should be documented explicitly instead of left permissive by default.
- When multiple security headers are missing, prioritize the header that removes the highest exploitability or browser capability first.

## Support Notes

- Older browsers may ignore `X-Content-Type-Options`, so correct `Content-Type` headers and safe file handling remain the primary defense.
- Verify the effective header on the final response path, including static assets and CDN-served files.

## Verification

### Automated Checks

- Inspect the effective response headers with curl, a security header scanner, or equivalent tooling against representative live responses.

### Manual Checks

- Verify the browser or user-facing behavior manually in a production-like flow and confirm there is no stronger conflicting security signal.