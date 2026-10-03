# Submit forms over HTTPS

> All HTML form actions must point to HTTPS URLs to ensure form data is encrypted in transit and cannot be intercepted by network attackers.

**Priority:** critical · **Difficulty:** beginner · **Time:** 10 min

---
Every form that collects user input, whether login, registration, contact, payment, or search, must submit its data over HTTPS. Both [MDN's form submission guidance](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Sending_and_retrieving_form_data) and [web.dev's HTTPS guidance](https://web.dev/articles/why-https-matters) assume transport security is already in place before a browser sends user data.

## Code Example

A login form posting to an `http://` endpoint transmits:

```
POST /login HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

username=alice&password=hunter2
```

Anyone on the network between the user and server (ISP, Wi-Fi router, MITM proxy) can read `username=alice&password=hunter2`.

## Why It Matters

A login form that posts credentials to an HTTP endpoint sends usernames and passwords as plain text over the network. The [OWASP transport cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html) treats that as a fundamental confidentiality failure, because anyone on the same Wi-Fi, the ISP, or a network proxy can read those values without special tooling.

## Checking Form Security

#

## HTML Form Actions

```html
❌ Insecure — credentials sent in plain text
<form method="POST" action="http://example.com/login">
  <input type="text" name="username">
  <input type="password" name="password">
  <button type="submit">Login</button>
</form>

✅ Secure — data encrypted by TLS
<form method="POST" action="https://example.com/login">
  <input type="text" name="username" autocomplete="username">
  <input type="password" name="password" autocomplete="current-password">
  <button type="submit">Login</button>
</form>

✅ Also secure — relative URL submits to the current page URL
<form method="POST" action="/login">
  <!-- Only secure if the page itself is served over HTTPS -->
</form>
```

### JavaScript Form Submissions

```javascript
❌ Insecure
const response = await fetch('http://api.example.com/login', {
  method: 'POST',
  body: JSON.stringify({ username, password })
})

✅ Secure
const response = await fetch('https://api.example.com/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
})
```

## Audit Script

```bash
# Find HTTP form actions in HTML files
grep -rn 'action=["\']http://' ./src --include="*.html" --include="*.jsx" --include="*.tsx" --include="*.vue"

# Find HTTP fetch/XHR calls
grep -rn "fetch\(['\"]http://" ./src --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx"
grep -rn "XMLHttpRequest" ./src --include="*.js" --include="*.ts"
```

## Browser Security Indicators

| Scenario | Chrome behavior |
|----------|----------------|
| HTTPS page with HTTPS form action | Green padlock, autofill works |
| HTTP page with any form | "Not Secure" in address bar |
| HTTPS page with HTTP form action | "Not Secure" warning may appear |
| Password field on HTTP | Autofill disabled (Chrome 86+), warning shown |

## Forms Without an Explicit Action

When `<form>` has no `action` attribute, it submits to the current page URL:

```html
<!-- Submits to whatever URL the page is served on -->
<form method="POST">
  <input type="email" name="email">
  <button type="submit">Subscribe</button>
</form>
```

This is safe only if your server enforces HTTPS for all requests (HTTP→HTTPS redirect + HSTS).

A server that redirects a `POST` from an `http://` login endpoint to the HTTPS version does not protect the credentials. The original HTTP request containing the plaintext password was already made, so forms must submit securely from the start.

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