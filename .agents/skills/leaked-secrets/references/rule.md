# Leaked Environment Variables

> Checks for exposed API keys, tokens, passwords, and other secrets embedded in HTML source, JavaScript bundles, or client-accessible files.

**Priority:** critical · **Difficulty:** intermediate · **Time:** 20 min

---
Any secret placed in client-side JavaScript, HTML, or any file served to browsers is effectively public. Attackers routinely scan public sites and repositories for leaked credentials, and platforms like [GitHub secret scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning) are built around how quickly those exposures get abused.
## Code Examples

#

## Framework Environment Variables

```bash
# .env.local — SAFE: only available server-side
DATABASE_URL=postgres://user:pass@host/db
STRIPE_SECRET_KEY=sk_live_xxxxx

# DANGEROUS: NEXT_PUBLIC_ prefix exposes to browser bundle
NEXT_PUBLIC_STRIPE_SECRET=sk_live_xxxxx  # ❌ Anyone can read this
NEXT_PUBLIC_STRIPE_PUBLISHABLE=pk_live_xxxxx  # ✅ This one IS meant to be public
```

In Next.js, `NEXT_PUBLIC_` variables are inlined into the JavaScript bundle. Only publishable/public keys belong there, which is the same separation described in the [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html): secrets stay on the server, public identifiers do not.

### Hardcoded in Source Code

```javascript
❌ Secret hardcoded in client code
const apiKey = 'sk_live_abc123xyz'
fetch(`https://api.stripe.com/v1/charges`, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
})

✅ Secret stays server-side
// API route (server-side)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
```

### Committed to Git

```bash
# Find secrets in git history
git log --all --full-history -- .env
git log -S 'sk_live' --all --oneline
git log -S 'password' --all --oneline

# Check current tracked files
git grep -i 'api_key\|secret\|password\|token' -- '*.js' '*.ts' '*.env'
```

## Why It Matters

An API key embedded in client-side JavaScript gives anyone with a browser devtools tab full access to your cloud services, databases, or third-party APIs — leading to data breaches, unexpected charges, or account takeover.

## Common Secret Patterns

| Service | Pattern Example |
|---------|----------------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` |
| AWS Secret | 40-character alphanumeric |
| Stripe Live Secret | `sk_live_[0-9a-zA-Z]{24}` |
| Stripe Publishable (safe to expose) | `pk_live_[0-9a-zA-Z]{24}` |
| GitHub PAT | `ghp_[A-Za-z0-9]{36}` |
| Google API Key | `AIza[0-9A-Za-z-_]{35}` |
| JWT token | `eyJ...` (base64-encoded JSON header) |
| Generic bearer token | `Bearer [A-Za-z0-9-._~+/]+=*` |

## Architecture: Keep Secrets Server-Side

```
❌ Direct client → third-party API (with embedded secret key)

✅ Client → Your API proxy → Third-party API
   (proxy runs server-side, holds the secret)
```

```typescript
// ✅ Server-side API route (Next.js)
// app/api/create-payment/route.ts

  const { amount } = await request.json()

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
  })
  // STRIPE_SECRET_KEY never leaves the server
  return Response.json({ clientSecret: paymentIntent.client_secret })
}
```

## Preventing Future Leaks

### Git Pre-commit Hook with git-secrets

```bash
# Install git-secrets
brew install git-secrets  # macOS

# Configure for a repository
git secrets --install
git secrets --register-aws  # Add AWS patterns

# Add custom patterns
git secrets --add 'sk_live_[0-9a-zA-Z]{24}'
git secrets --add 'ghp_[A-Za-z0-9]{36}'
```

### .gitignore

```gitignore
# Always exclude environment files
.env
.env.local
.env.*.local
.env.production
.env.development

# Credential files
*.pem
*.key
credentials.json
service-account.json
```

## If a Secret Is Leaked

1. **Rotate immediately** — assume it is compromised the moment it was committed or deployed, because [cryptographic failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/) often start with exposed material that teams leave active too long.
2. **Revoke** the old credential in the service dashboard
3. **Remove from git history** using `git filter-repo` (preferred) or `BFG Repo Cleaner`
4. **Notify** affected services (AWS, Stripe, etc.) if there is evidence of misuse
5. **Audit access logs** for unauthorized usage

Once a secret is pushed to a remote repository — even briefly — it may have been cloned, forked, or cached by the platform. Rotation is mandatory. History rewriting is secondary cleanup.

## Exceptions

- Scanner output, leaked-secret detections, or stack traces should be confirmed as production-relevant before being escalated as blockers.
- Archived dependencies, sample values, or test fixtures can create false positives, but they should still be documented and bounded clearly.
- If multiple findings overlap, prioritize the issue that most directly enables compromise or data exposure.

## Standards

- Align the implementation with OWASP: Secrets Management Cheat Sheet and verify the effective response or browser behavior, not only the configuration file.
- Align the implementation with OWASP Top 10 A02:2021 - Cryptographic Failures and verify the effective response or browser behavior, not only the configuration file.
- Align the implementation with GitHub: Secret Scanning and verify the effective response or browser behavior, not only the configuration file.

## Verification

### Automated Checks

- Test the affected flow in a production-like environment, not just local development.
- Document any intentional exceptions explicitly.

### Manual Checks

- Inspect the final HTTP response or browser behavior to confirm the control is actually enforced.
- Verify third-party integrations or embeds still work after the restriction is applied.