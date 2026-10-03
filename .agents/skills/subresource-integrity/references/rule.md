# Add Subresource Integrity to external scripts

> Use Subresource Integrity (SRI) hash attributes on external scripts and stylesheets loaded from CDNs to ensure the content hasn't been tampered with.

**Priority:** high · **Difficulty:** intermediate · **Time:** 15 min

---
Subresource Integrity (SRI) lets you tell the browser: "Only execute this script if its content exactly matches this cryptographic hash."
## Code Example

```html
<!-- ✅ Script with SRI -->
<script
  src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"
  integrity="sha384-1H217gwSVyLSIfaLxHbE7dRb3v4mYCKbpQvzx0cegeju1MVsGrX5xXxAvs/HgeFs"
  crossorigin="anonymous"
></script>

<!-- ✅ Stylesheet with SRI -->
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css"
  integrity="sha512-NhSC1YmyruXifcj/KFRWoC561YpHpc5Jtzgvbuzx5VozKpWvQ+4nXholtQVC+W5F5HFE2H7seCPUZOHkG8J0g=="
  crossorigin="anonymous"
>
```

The `crossorigin="anonymous"` attribute is **required** — SRI requires CORS for cross-origin resources.

## Why It Matters

When you load JavaScript from a CDN, you're trusting that CDN completely — if it's compromised, attackers can serve malicious JavaScript to all your users. SRI adds a cryptographic hash to the tag; the browser refuses to execute the script if the hash doesn't match the downloaded content, protecting users even if the CDN is compromised or the URL is hijacked.

## Generating Hash Values

```bash
# Generate SHA-384 hash from a local file
cat library.min.js | openssl dgst -sha384 -binary | openssl base64 -A

# Or from a URL
curl -s https://cdn.example.com/lib.js | openssl dgst -sha384 -binary | openssl base64 -A

# Output format for the integrity attribute:
# sha384-[base64-hash]
```

## Multiple Hash Algorithms

```html
<!-- Provide multiple hashes for forward compatibility -->
<script
  src="https://cdn.example.com/app.js"
  integrity="sha256-abc123... sha384-xyz789..."
  crossorigin="anonymous"
></script>
```

The browser uses the strongest algorithm it supports. The script executes only if at least one hash matches.

## What SRI Protects Against

```
Scenario: CDN compromise
Without SRI:
  CDN serves malicious-app.js instead of app.js
  → Browser downloads and executes it
  → Attacker has full JavaScript access to your page

With SRI:
  CDN serves malicious-app.js instead of app.js
  → Browser computes hash: doesn't match
  → Script is BLOCKED — your users are safe
```

## Limitations and Alternatives

**SRI limitations:**
- Only works when the file content is stable (versioned URLs, not `latest`)
- Can't be used with dynamically generated scripts
- CDN changes (even whitespace) break the hash

**Alternative strategies for self-hosted content:**
```
Content-Security-Policy: script-src 'self' 'sha384-abc123...'
```

## npm Package CDN Example

Many CDNs provide pre-computed SRI hashes in their copy-paste embed codes:

```html
<!-- From cdnjs.cloudflare.com — hash provided by the CDN -->
<script
  src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js"
  integrity="sha512-WFN04846sdKMIP5LKNphMaWzU7YpMyCU245etK3g/2ARYbPK9Ub18eG+ljU96qKRCWh+quCY7yefSmlkQw1ANQ=="
  crossorigin="anonymous"
  referrerpolicy="no-referrer"
></script>
```

## Standards

- Use MDN: HTML as the standard for the final rendered HTML and browser-facing behavior.
- Use WHATWG HTML Living Standard as the standard for the final rendered HTML and browser-facing behavior.

## Verification

### Automated Checks

- Inspect the final rendered HTML in the browser or page source to confirm the rule is satisfied.
- Validate the affected markup with browser tooling or an HTML validator where appropriate.
- Test one representative route or template that uses the pattern.
- Re-check shared components that emit the same markup so the fix is consistent.

### Manual Checks

- Verify the rendered browser behavior manually on representative routes and supported browsers so the user-facing outcome matches the rule.