# MIME Type Validation

> Detects Content-Type header mismatches with file extensions

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
The `Content-Type` HTTP response header tells the browser and search crawlers what type of content is in the response body. [MDN's MIME type reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/MIME_types) and the IANA registry both matter here, because a mismatch can break rendering and undermine crawl quality.

## Code Example

```bash
# Check a page's Content-Type header
curl -I https://example.com/page

# Check a CSS file
curl -I https://example.com/styles/main.css
# Expected: content-type: text/css

# Check a JS file
curl -I https://example.com/js/app.js
# Expected: content-type: text/javascript
```

## Why It Matters

Incorrect MIME types cause browsers to block stylesheets and scripts, especially when [`X-Content-Type-Options`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options) disables sniffing. That turns a server-header mistake into a visible rendering failure.

## Common Correct MIME Types

| File Type | Correct Content-Type |
|-----------|---------------------|
| HTML page | `text/html; charset=utf-8` |
| CSS stylesheet | `text/css` |
| JavaScript | `text/javascript` |
| JSON | `application/json` |
| SVG | `image/svg+xml` |
| JPEG image | `image/jpeg` |
| PNG image | `image/png` |
| WebP image | `image/webp` |
| Web font (WOFF2) | `font/woff2` |
| PDF | `application/pdf` |

## Common Misconfigurations

```bash
# ❌ Bad: CSS served as text/plain
HTTP/1.1 200 OK
Content-Type: text/plain

# ✅ Good: CSS served correctly
HTTP/1.1 200 OK
Content-Type: text/css

# ❌ Bad: JS served as text/html
HTTP/1.1 200 OK
Content-Type: text/html

# ✅ Good: JS served correctly
HTTP/1.1 200 OK
Content-Type: text/javascript
```

## Nginx Configuration

```nginx
# nginx.conf or mime.types
include /etc/nginx/mime.types;

# Ensure charset is set for HTML
charset utf-8;
```

## Next.js / Vercel

Next.js automatically sets correct MIME types for static assets. For custom headers:

```js
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
        ],
      },
    ]
  },
}
```

## Security: MIME Sniffing

Always set `X-Content-Type-Options: nosniff` to prevent browsers from guessing content types when headers are wrong:

```nginx
add_header X-Content-Type-Options "nosniff" always;
```

Without this header, a browser may execute a file uploaded as an image if it detects JavaScript content—a security vulnerability.

With `X-Content-Type-Options: nosniff` (a security best practice), browsers will refuse to execute CSS or JavaScript served with the wrong MIME type. This is the correct behaviour—fix the server config rather than removing the security header.

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against MDN: MIME types (IANA media types) before treating the rule as satisfied.
- Check the implementation against MDN: X-Content-Type-Options before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.