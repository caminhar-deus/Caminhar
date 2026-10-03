# Protect public forms with CAPTCHA

> Public forms that accept user input without authentication must include bot protection to prevent spam, credential stuffing, and automated abuse.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 30 min

---
Automated bots constantly probe public web forms for weaknesses. Without bot protection, a single form can generate thousands of spam submissions, enable account takeover through [credential stuffing](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html), or exhaust your email-sending limits.
## Code Examples

#

## [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) (Recommended)

Privacy-friendly, requires no user interaction in most cases, and does not use Google's tracking infrastructure.

```html
<!-- 1. Include the script -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<!-- 2. Add the widget to your form -->
<form method="POST" action="/submit">
  <input type="text" name="email" placeholder="Email">

  <!-- Turnstile widget — renders automatically -->
  <div class="cf-turnstile"
       data-sitekey="YOUR_SITE_KEY"
       data-theme="auto">
  </div>

  <button type="submit">Submit</button>
</form>
```

```typescript
// 3. Validate server-side (Next.js API route)

  const formData = await request.formData()
  const token = formData.get('cf-turnstile-response') as string
  const ip = request.headers.get('CF-Connecting-IP') || ''

  // Verify with Cloudflare
  const verifyResponse = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
      }),
    }
  )

  const verification = await verifyResponse.json()

  if (!verification.success) {
    return Response.json({ error: 'CAPTCHA verification failed' }, { status: 400 })
  }

  // Process the form submission
  // ...
}
```

### Google [reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3) (Invisible)

Scores user interactions from 0.0 (bot) to 1.0 (human) without requiring user interaction.

```html
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>

<form id="contact-form" method="POST" action="/submit">
  <input type="text" name="email" placeholder="Email">
  <button type="submit" id="submit-btn">Submit</button>
</form>

<script>
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault()

  const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'contact' })

  // Add token to form data
  const formData = new FormData(e.target)
  formData.append('g-recaptcha-response', token)

  await fetch('/submit', { method: 'POST', body: formData })
})
</script>
```

```typescript
// Server-side validation
const verifyResponse = await fetch(
  `https://www.google.com/recaptcha/api/siteverify`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
  }
)
const { success, score } = await verifyResponse.json()

// Reject low-score requests (< 0.5 is typically a bot)
if (!success || score < 0.5) {
  return Response.json({ error: 'Suspicious request' }, { status: 400 })
}
```

### Honeypot Fields (Lightweight Alternative)

A honeypot adds a hidden field that real users never see or fill. Bots that blindly fill all fields will reveal themselves.

```html
<form method="POST" action="/contact">
  <input type="text" name="email" placeholder="Email">
  <textarea name="message" placeholder="Message"></textarea>

  <!-- Honeypot: hidden from users via CSS, not via display:none or visibility:hidden -->
  <div aria-hidden="true" style="position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden;">
    <label for="website">Website (leave blank)</label>
    <input type="text" id="website" name="website" tabindex="-1" autocomplete="off">
  </div>

  <button type="submit">Send</button>
</form>
```

```typescript
// Server: reject if honeypot is filled
const website = formData.get('website')
if (website) {
  // Bot detected — silently succeed to avoid revealing the trap
  return Response.json({ success: true })
}
```

CAPTCHA tokens verified only in the browser (client-side) provide no protection. Bots can bypass client-side checks by directly calling your API, which is why [OWASP's automated threats guidance](https://owasp.org/www-project-automated-threats-to-web-applications/) treats server-side validation as mandatory rather than optional hardening.

## Why It Matters

An unprotected registration form can create thousands of spam accounts per minute; an unprotected login form enables credential stuffing attacks that test millions of username/password combinations from data breaches.

## Forms That Need Protection

| Form Type | Primary Risk | CAPTCHA Priority |
|-----------|-------------|-----------------|
| Login | Credential stuffing, brute force | High |
| Registration | Fake account creation, spam | High |
| Password reset | Account takeover via email enumeration | High |
| Contact / feedback | Spam, phishing | Medium |
| Newsletter subscription | List bombing | Medium |
| Comment / review | Spam content | Medium |
| Search | Scraping, abuse | Low |

## Rate Limiting as Defense-in-Depth

Combine CAPTCHA with rate limiting to block even bots that solve CAPTCHAs:

```typescript
// Using Upstash Rate Limit (Redis-backed)

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute per IP
})

  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  // Continue with CAPTCHA validation and form processing
}
```

## Exceptions

- A weaker form control is only acceptable when the business requirement and compensating controls are documented explicitly.
- If the flow is already transport-insecure, inaccessible, or externally embedded in a way that changes the threat model, fix that stronger issue first.
- False positives are common on demo, sandbox, or intentionally constrained flows, but they should still be bounded and clearly labeled.

## Verification

### Automated Checks

- Test the affected flow in a production-like environment, not just local development.
- Document any intentional exceptions explicitly.

### Manual Checks

- Inspect the final HTTP response or browser behavior to confirm the control is actually enforced.
- Verify third-party integrations or embeds still work after the restriction is applied.