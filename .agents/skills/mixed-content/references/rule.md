# Avoid mixed content on HTTPS pages

> An HTTPS page that loads resources over HTTP has mixed content — browsers block or warn about these requests, breaking functionality and undermining transport security.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Mixed content occurs when an HTTPS page loads resources over HTTP. The browser has established a secure channel to your server, but part of the page data arrives over an unencrypted connection — potentially modified by a network attacker.

## Code Examples

#

## Active Mixed Content (Blocked)

Resources that can access and modify the page DOM are classified as active mixed content and are **blocked** by all modern browsers:

- `<script src="http://...">`
- `<link rel="stylesheet" href="http://...">`
- `<iframe src="http://...">`
- `XMLHttpRequest` / `fetch()` to `http://` URLs
- `<object data="http://...">`

```html
❌ Blocked — attacker can inject scripts into your HTTPS page
<script src="http://cdn.example.com/analytics.js"></script>

✅ Correct
<script src="https://cdn.example.com/analytics.js"></script>
```

### Passive Mixed Content (Warned or Upgraded)

Resources that cannot directly modify page content are passive mixed content. Modern browsers (Chrome 81+) auto-upgrade these to HTTPS and block them if the HTTPS version doesn't exist:

- `<img src="http://...">`
- `<audio src="http://...">`
- `<video src="http://...">`

```html
⚠️ Will be upgraded to HTTPS by Chrome (blocked if no HTTPS version exists)
<img src="http://example.com/photo.jpg" alt="Photo">

✅ Correct
<img src="https://example.com/photo.jpg" alt="Photo">
```

## Why It Matters

Active mixed content (scripts loaded over HTTP into an HTTPS page) gives network attackers the ability to execute arbitrary JavaScript on your page — the same power as XSS, despite the page itself being served over HTTPS.

## Fix: Update All HTTP URLs

### Search for HTTP Resources

```bash
# Find http:// references in HTML, CSS, JS files
grep -r 'http://' ./src --include="*.html" --include="*.css" --include="*.js" --include="*.jsx" --include="*.tsx"

# Focus on resource attributes
grep -rE 'src="http://|href="http://|url\(http://' ./src
```

### Common Locations

1. **HTML templates** — `<script>`, `<link>`, `<img>`, `<iframe>` attributes
2. **CSS files** — `url()` in `background-image`, `@import`, `@font-face`
3. **JavaScript** — hardcoded API endpoints, CDN URLs
4. **CMS content** — database-stored content with old HTTP asset URLs

## Fix: CSP `upgrade-insecure-requests`

The `upgrade-insecure-requests` directive tells the browser to upgrade all HTTP sub-resource requests to HTTPS before fetching them. This is especially useful when you have legacy content in a database with hardcoded HTTP asset URLs.

```http
Content-Security-Policy: upgrade-insecure-requests
```

```html
<!-- Equivalent meta tag (not recommended for CSP security headers, but works for upgrade-insecure-requests) -->
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
```

### Nginx

```nginx
add_header Content-Security-Policy "upgrade-insecure-requests" always;
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
            key: 'Content-Security-Policy',
            value: 'upgrade-insecure-requests',
          },
        ],
      },
    ]
  },
}
```

`upgrade-insecure-requests` does not fix your HTML — it just attempts a last-minute upgrade at the browser level. The correct fix is to update the source URLs to HTTPS. Resources that have no HTTPS version will still fail even with this directive.

## Detecting Mixed Content

### Browser DevTools

Open Chrome or Firefox DevTools in the Console tab. [MDN's mixed content guide](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content) and [web.dev's remediation guide](https://web.dev/articles/fixing-mixed-content) both show the same browser error pattern:

```
Mixed Content: The page at 'https://example.com' was loaded over HTTPS,
but requested an insecure resource 'http://cdn.example.com/script.js'.
This request has been blocked; the content must be served over HTTPS.
```

### Automated Tools

- Why No Padlock? (free online scanner)
- SSL Checker
- Chrome Lighthouse audit (Network tab)

```bash
# Lighthouse CLI
npx lighthouse https://example.com --only-categories=best-practices --output=json \
  | jq '.audits["mixed-content"]'
```

## Exceptions

- Local development or internal-only environments can differ, but production user-facing traffic should still satisfy the transport requirement strictly.
- A redirect or HTTPS control that fails on one hostname, subdomain, or CDN edge path is still a real failure for users and crawlers reaching that surface.
- Fix the strongest transport weakness first instead of treating every downstream symptom as a separate primary issue.

## Verification

### Automated Checks

- Test the affected flow in a production-like environment, not just local development.
- Document any intentional exceptions explicitly.

### Manual Checks

- Inspect the final HTTP response or browser behavior to confirm the control is actually enforced.
- Verify third-party integrations or embeds still work after the restriction is applied.