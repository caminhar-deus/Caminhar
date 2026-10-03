# Serve all pages over HTTPS

> Every page and resource on your site must be delivered over HTTPS to protect user data in transit and enable modern browser features.

**Priority:** critical · **Difficulty:** beginner · **Time:** 30 min

---
[HTTPS](https://web.dev/articles/why-https-matters) (HTTP over TLS) encrypts all traffic between the browser and your server, providing confidentiality, integrity, and authentication. [MDN's transport security guidance](https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security) and the [OWASP transport cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html) both treat site-wide HTTPS as the baseline, not an optional hardening step.

## Code Example

#

## Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx  # Debian/Ubuntu
sudo yum install certbot python3-certbot-nginx  # RHEL/CentOS

# Obtain and auto-configure certificate for Nginx
sudo certbot --nginx -d example.com -d www.example.com

# Certbot automatically sets up renewal
# Test renewal with:
sudo certbot renew --dry-run
```

### Hosted / Managed TLS

Most platforms handle TLS automatically:
- **Vercel**: Automatic — certificates provisioned for all deployments
- **Netlify**: Automatic — one-click HTTPS via Let's Encrypt
- **AWS CloudFront**: Use AWS Certificate Manager (free for CloudFront)
- **Cloudflare**: Managed TLS included on all plans

## Why It Matters

Plain HTTP exposes every request and response to anyone on the network path — ISPs, Wi-Fi operators, and MITM attackers can read passwords, session tokens, and personal data without any warning to the user.

## What HTTPS Provides

- **Confidentiality**: Data cannot be read by third parties on the network path
- **Integrity**: Data cannot be modified in transit (prevents content injection by ISPs or MITM attackers)
- **Authentication**: The certificate proves the server is who it claims to be, preventing impersonation

## HTTP-to-HTTPS Redirect

### Nginx

```nginx
# Redirect all HTTP to HTTPS
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # ...
}
```

### Apache

```apache

    ServerName example.com
    Redirect permanent / https://example.com/

```

### Cloudflare

In the Cloudflare dashboard → SSL/TLS → Edge Certificates → enable **Always Use HTTPS** and set **Minimum TLS Version** to 1.2.

## Modern Features Requiring HTTPS

Both [MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security) and [web.dev](https://web.dev/articles/why-https-matters) treat these as secure-context features, so they are a practical way to spot pages that still rely on insecure origins.

Browsers block these APIs on non-secure origins:

| Feature | Why It Requires HTTPS |
|---------|----------------------|
| Service Workers | Prevent network interception of cached resources |
| Push Notifications | Authentication required |
| Geolocation API | Privacy protection |
| getUserMedia (camera/mic) | Privacy protection |
| Web Crypto API | Security requirement |
| Payment Request API | Financial data protection |
| HSTS, HTTP/2, HTTP/3 | Protocol requirements |

If your HTTPS page loads any resource over HTTP, the page is considered mixed content. Active mixed content such as scripts and iframes is blocked outright, so audit resource URLs and ensure they use HTTPS.

## Common Pitfalls

| Mistake | Impact | Fix |
|---------|--------|-----|
| Expired certificate | Browser blocks the page with a security warning | Configure auto-renewal (e.g., `certbot renew` via cron) |
| Certificate missing `www` | `www.example.com` shows a security error | Use a SAN certificate covering both `example.com` and `www.example.com` |
| HTTP redirect uses 302 | Browsers may not cache the redirect, slowing future requests | Use 301 (permanent) redirect |
| HTTPS only on login pages | Data on all other pages exposed in transit | Enable HTTPS site-wide |

## Exceptions

- Local development or internal-only environments can differ, but production user-facing traffic should still satisfy the transport requirement strictly.
- A redirect or HTTPS control that fails on one hostname, subdomain, or CDN edge path is still a real failure for users and crawlers reaching that surface.
- Fix the strongest transport weakness first instead of treating every downstream symptom as a separate primary issue.

## Support Notes

- Verify HTTPS behavior in a production-like environment with the real certificate chain, redirects, proxies, and CDN path in place.
- Modern secure-context features may appear to work locally while still failing or degrading on real production hosts.

## Verification

### Automated Checks

- Run an automated security check, scripted probe, or log-based validation against a representative live flow.

### Manual Checks

- Verify the browser or user-facing behavior manually in a production-like flow and confirm there is no stronger conflicting security signal.