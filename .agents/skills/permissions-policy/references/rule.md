# Set a Permissions-Policy header

> The Permissions-Policy header lets servers restrict which browser features (camera, microphone, geolocation, etc.) can be used in a page or its embedded iframes.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
[`Permissions-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy) (formerly `Feature-Policy`) is an HTTP response header that controls access to browser features and APIs. It applies to the page itself and any iframes it embeds, and the [specification](https://w3c.github.io/webappsec-permissions-policy/) defines exactly how those inherited restrictions work.
## Code Example

```http
Permissions-Policy: <feature>=(<allowlist>), <feature>=(<allowlist>)
```

| Allowlist syntax | Meaning |
|-----------------|---------|
| `()` | Feature denied for all origins |
| `(self)` | Feature allowed only for same-origin |
| `("https://trusted.com")` | Feature allowed for this specific origin |
| `(self "https://trusted.com")` | Feature allowed for same-origin and trusted.com |
| `*` | Feature allowed for all origins (permissive — avoid) |

## Why It Matters

A site compromised by XSS that has unrestricted camera and microphone access can silently record the user. Permissions-Policy limits which browser APIs are available, reducing attacker capabilities even after a successful injection.

## Commonly Restricted Features

| Feature | Description | Deny if... |
|---------|-------------|------------|
| `camera` | `getUserMedia({ video: true })` | Site does not do video calls |
| `microphone` | `getUserMedia({ audio: true })` | Site does not record audio |
| `geolocation` | `navigator.geolocation` | Site does not need location |
| `payment` | Payment Request API | Site does not accept payments in-browser |
| `usb` | WebUSB API | No hardware interaction needed |
| `fullscreen` | Element.requestFullscreen() | No video player |
| `autoplay` | Media autoplay | No autoplay needed |
| `accelerometer` | Device orientation | No motion detection |
| `gyroscope` | Gyroscope sensor | No motion detection |

## Recommended Baseline Header

```http
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
```

The `interest-cohort=()` directive opts your site out of Google's deprecated FLoC tracking API, and [OWASP's security headers guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) is a good cross-check for the rest of your baseline header set.

## Server Configuration

#

## Nginx

```nginx
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
```

### Apache

```apache

    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"

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
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
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
  helmet.permittedCrossDomainPolicies()
  // Or configure manually:
)

// For granular control, set the header directly:
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  )
  next()
})
```

## Controlling iframe Permissions

When embedding a third-party iframe, use the HTML `allow` attribute to grant specific permissions:

```html
<!-- Deny all features to this iframe (default with Permissions-Policy: camera=()) -->
<iframe src="https://example.com/widget"></iframe>

<!-- Explicitly allow camera for a video call widget -->
<iframe
  src="https://video.example.com"
  allow="camera 'self' https://video.example.com; microphone 'self' https://video.example.com"
></iframe>

<!-- Allow fullscreen for a video player -->
<iframe
  src="https://player.example.com/embed/123"
  allow="fullscreen"
  allowfullscreen
></iframe>
```

## Legacy Feature-Policy (Deprecated)

The old `Feature-Policy` header used a different syntax and is deprecated. Do not use it for new sites:

```http
❌ Deprecated
Feature-Policy: camera 'none'; microphone 'none'; geolocation 'none'

✅ Current
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Exceptions

- A missing or weak header should be evaluated against the live production response path, not only the framework or server config in isolation.
- Legacy integrations or embedded third-party content may require narrowly scoped exceptions, but they should be documented explicitly instead of left permissive by default.
- When multiple security headers are missing, prioritize the header that removes the highest exploitability or browser capability first.

## Standards

- Align the implementation with MDN: Permissions-Policy and verify the effective response or browser behavior, not only the configuration file.
- Align the implementation with W3C: Permissions Policy specification and verify the effective response or browser behavior, not only the configuration file.
- Align the implementation with OWASP: Security Headers Cheat Sheet and verify the effective response or browser behavior, not only the configuration file.

## Support Notes

- Current project targets outside the feature support range: and_ff 147, firefox 148, firefox 147, firefox 140, ios_saf 26.3, ios_saf 26.2, ios_saf 18.5-18.7, safari 26.3, safari 26.2.
- Baseline-compatible minimums: chrome 115, edge 115, firefox 116, safari 16.4, safari_ios 16.4.
- Add a fallback or a narrower policy note when a required project target falls outside that support range.

## Verification

### Automated Checks

- Inspect the effective response headers with curl, a security header scanner, or equivalent tooling against representative live responses.

### Manual Checks

- Verify the browser or user-facing behavior manually in a production-like flow and confirm there is no stronger conflicting security signal.