# Implement a content security policy

> A Content Security Policy is implemented to prevent XSS attacks and control resource loading.

**Priority:** high · **Difficulty:** advanced · **Time:** 45 min

---
Content Security Policy (CSP) is your primary defense against XSS attacks by controlling what resources browsers can load.

## Code Example

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';
```

## Why It Matters

Content Security Policy prevents cross-site scripting (XSS), clickjacking, and data injection attacks by controlling which resources can be loaded and executed on your pages.

## Sanitize Untrusted HTML Before Rendering

CSP reduces exploitability, but it should never be the only protection when you render rich text from a CMS, markdown pipeline, comments system, or WYSIWYG editor. Sanitize untrusted HTML before it reaches a DOM sink such as `innerHTML` or `dangerouslySetInnerHTML`.

```tsx

function RichContent({ html }: { html: string }) {
  const safeHtml = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  })

  return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
}
```

If an application renders attacker-controlled HTML directly into the DOM, an overly broad policy, legacy browser, or later config drift can still leave exploitable XSS paths. Sanitize first, then let CSP reduce the remaining blast radius.

## CSP Directives Overview

| Directive | Controls | Example |
|-----------|----------|---------|
| `default-src` | Fallback for all fetch directives | `'self'` |
| `script-src` | JavaScript sources | `'self' 'nonce-abc123'` |
| `style-src` | CSS sources | `'self' 'unsafe-inline'` |
| `img-src` | Image sources | `'self' data: https:` |
| `connect-src` | Fetch, XHR, WebSocket | `'self' <trusted-api-origin>` |
| `font-src` | Font file sources | `'self' <approved-font-origin>` |
| `frame-src` | iframe sources | `'none'` |
| `object-src` | Plugins (Flash, etc.) | `'none'` |
| `base-uri` | `<base>` tag URLs | `'self'` |
| `form-action` | Form submission targets | `'self'` |

## Server Configuration

#

## Next.js

```typescript
// next.config.ts

const generateCSP = () => {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: https:`,
    `font-src 'self'`,
    `connect-src 'self' https://api.example.com`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ')

  return { csp, nonce }
}

const config: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: generateCSP().csp,
          },
        ],
      },
    ]
  },
}

```

### Next.js Middleware with Nonce

```typescript
// middleware.ts

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' blob: data: https:`,
    `font-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')

  const response = NextResponse.next()

  response.headers.set('Content-Security-Policy', cspHeader)
  response.headers.set('x-nonce', nonce)

  return response
}
```

### Nginx

```nginx
# /etc/nginx/snippets/csp.conf
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';" always;

# In server block
server {
    listen 443 ssl http2;
    server_name example.com;

    include snippets/csp.conf;

    # ... rest of config
}
```

### Apache

```apache
# .htaccess or httpd.conf

    Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';"

```

## Using Nonces for Inline Scripts

```tsx
// app/layout.tsx

  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') || ''

  return (
    <html lang="en">
      <head>
        
      </head>
      <body>{children}</body>
    </html>
  )
}
```

## Using Hashes for Static Inline Scripts

```typescript
// Generate hash for inline script

const script = `console.log('Hello, CSP!');`
const hash = crypto
  .createHash('sha256')
  .update(script)
  .digest('base64')

// Use in CSP header
const csp = `script-src 'self' 'sha256-${hash}'`
```

## CSP for Common Third-Party Services

```http
# Google Analytics + Google Fonts + YouTube embeds
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https://www.google-analytics.com;
  connect-src 'self' https://www.google-analytics.com;
  frame-src https://www.youtube.com https://www.youtube-nocookie.com;
  object-src 'none';
  base-uri 'self';
```

## Report-Only Mode for Testing

```http
# Test CSP without breaking anything
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self'; report-uri /csp-report; report-to csp-endpoint;
```

### CSP Report Endpoint

```typescript
// app/api/csp-report/route.ts

  try {
    const report = await request.json()

    // Log CSP violation
    console.error('CSP Violation:', JSON.stringify(report, null, 2))

    // Send to monitoring service
    // await sendToMonitoring(report)

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 })
  }
}
```

## Progressive CSP Implementation

### Phase 1: Report-Only

```http
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report;
```

### Phase 2: Relaxed Enforcement

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

### Phase 3: Strict Enforcement

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}' 'strict-dynamic'; style-src 'self' 'nonce-{random}'; object-src 'none'; base-uri 'self';
```

## Trusted Types for Larger Apps

Applications with many DOM injection points can add Trusted Types as an extra guardrail around script-creating sinks:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}' 'strict-dynamic';
  object-src 'none';
  base-uri 'self';
  require-trusted-types-for 'script';
  trusted-types app dompurify;
```

```typescript
// Example Trusted Types policy for a large app
const policy = window.trustedTypes?.createPolicy('app', {
  createHTML: (input) => DOMPurify.sanitize(input, {
    RETURN_TRUSTED_TYPE: true,
  }) as unknown as string,
})
```

## Additional Security Headers

```typescript
// Complete security headers
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: csp,
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
]
```

## Testing CSP

```bash
# Check CSP header
curl -I https://example.com | grep -i content-security-policy

# Test with browser DevTools
# Open Console - CSP violations appear as errors
# Open Network tab - check response headers
```

### Online Tools

- [CSP Evaluator (Google)](https://csp-evaluator.withgoogle.com/)
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

## Common CSP Mistakes

| Mistake | Risk | Fix |
|---------|------|-----|
| `unsafe-inline` for scripts | XSS attacks | Use nonces or hashes |
| `unsafe-eval` | Code injection | Avoid eval(), new Function() |
| Overly permissive `*` | Data exfiltration | Specify exact domains |
| Missing `object-src 'none'` | Flash exploits | Always set to 'none' |
| Missing `base-uri` | Base tag injection | Set to 'self' |
| Rendering raw untrusted HTML | DOM XSS | Sanitize before `innerHTML` |
| No Trusted Types on large app shell | Unsafe DOM sinks remain reachable | Add `require-trusted-types-for 'script'` where supported |

Always test CSP in report-only mode first. A misconfigured CSP can break your entire site. Monitor reports for at least a week before enforcing.

## Exceptions

- A missing or weak header should be evaluated against the live production response path, not only the framework or server config in isolation.
- Legacy integrations or embedded third-party content may require narrowly scoped exceptions, but they should be documented explicitly instead of left permissive by default.
- When multiple security headers are missing, prioritize the header that removes the highest exploitability or browser capability first.

## Standards

- Align the implementation with OWASP: HTTP Headers Cheat Sheet and verify the effective response or browser behavior, not only the configuration file.
- Align the implementation with MDN: Web security and verify the effective response or browser behavior, not only the configuration file.

## Support Notes

- The feature is supported across the current project browser matrix.
- Baseline-compatible minimums: chrome 115, edge 115, firefox 116, safari 16.4, safari_ios 16.4.
- Add a fallback or a narrower policy note when a required project target falls outside that support range.

## Verification

### Automated Checks

- Test the affected flow in a production-like environment, not just local development.
- Document any intentional exceptions explicitly.

### Manual Checks

- Inspect the final HTTP response or browser behavior to confirm the control is actually enforced.
- Verify third-party integrations or embeds still work after the restriction is applied.
- Attempt one representative rich-content render and confirm the HTML is sanitized before insertion.
- In larger apps, confirm Trusted Types violations appear during testing when unsafe DOM sinks are used.