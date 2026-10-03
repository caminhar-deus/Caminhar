# Redirect HTTP to HTTPS

> All HTTP requests must be permanently redirected (301) to HTTPS to prevent users from accessing your site over an insecure connection.

**Priority:** critical · **Difficulty:** beginner · **Time:** 10 min

---
Redirecting HTTP to HTTPS ensures that any user who arrives at your site over plain HTTP is immediately upgraded to an encrypted connection. [HTTP redirections](https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections) belong at the server or CDN edge, and [HTTPS transport](https://web.dev/articles/why-https-matters) should be in place before you ship any login, payment, or form flow.
## Code Examples

#

## Nginx

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    # Redirect all HTTP to HTTPS, preserving path and query
    return 301 https://$host$request_uri;
}
```

### Apache

```apache
# Option 1: Using mod_rewrite

    ServerName example.com
    RewriteEngine On
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Option 2: Simpler Redirect directive

    ServerName example.com
    Redirect permanent / https://example.com/

```

### Caddy

Caddy handles HTTPS and redirects automatically. Explicit configuration:

```caddyfile
http://example.com {
    redir https://{host}{uri} permanent
}
```

### Cloudflare

Dashboard → SSL/TLS → Edge Certificates → **Always Use HTTPS** toggle.

This applies at the CDN edge before requests reach your origin server.

### Vercel

Automatic — all Vercel deployments redirect HTTP to HTTPS by default.

### AWS CloudFront

In the distribution settings, set **Viewer Protocol Policy** to "Redirect HTTP to HTTPS" on each cache behavior.

## Why It Matters

Without an HTTP-to-HTTPS redirect, users who type the domain without `https://` or follow old links land on the insecure version of the site, exposing session cookies and form data to network attackers.

## 301 vs 302: Why It Matters

| Status | Meaning | Browser behavior | Search engine |
|--------|---------|-----------------|---------------|
| **301 Permanent** | The resource has moved permanently | Browser caches redirect; future requests skip HTTP | Transfers link equity to HTTPS URL |
| **302 Temporary** | The resource has moved temporarily | Browser re-requests HTTP each time | May continue indexing HTTP URL |

Always use **301** for HTTP-to-HTTPS redirects. The browser will cache it, meaning after the first visit, the browser goes directly to HTTPS without ever making an HTTP request.

## Redirect Chain Issues

Avoid multiple hops:

```
❌ Bad: http://example.com → http://www.example.com → https://www.example.com
✅ Good: http://example.com → https://example.com
```

Each hop adds latency. Configure your server to consolidate the `www`/non-www preference and HTTP-to-HTTPS redirect into a single 301.

Never rely on JavaScript (`window.location.href = 'https://...'`) for security redirects. JavaScript runs after the HTTP response is received — the insecure request has already been made.

## After Redirects: Add HSTS

Once HTTPS and redirects are verified and stable, add the `Strict-Transport-Security` header to eliminate future HTTP requests entirely. The [OWASP transport guidance](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html) recommends this pairing because browsers that have seen HSTS will upgrade connections internally before making any network request.

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Exceptions

- Local development or internal-only environments can differ, but production user-facing traffic should still satisfy the transport requirement strictly.
- A redirect or HTTPS control that fails on one hostname, subdomain, or CDN edge path is still a real failure for users and crawlers reaching that surface.
- Fix the strongest transport weakness first instead of treating every downstream symptom as a separate primary issue.

## Verification

### Automated Checks

- Run an automated security check, scripted probe, or log-based validation against a representative live flow.

### Manual Checks

- Verify the browser or user-facing behavior manually in a production-like flow and confirm there is no stronger conflicting security signal.