# Link to your terms of service in the footer

> Websites offering services to users should publish Terms of Service and link to them from every page — this establishes the legal agreement governing use of the service.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
Terms of Service (ToS), also called Terms and Conditions or Terms of Use, define the legal relationship between your service and its users. They sit alongside disclosures users reasonably need before acting, which is why both the [FTC disclosure guidance](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers) and [GDPR Article 13](https://gdpr-info.eu/art-13-gdpr/) push teams toward visible, accessible legal information rather than burying it.
## Code Example

```html
<footer>
  <nav aria-label="Legal">
    <ul>
      <li><a href="/terms">Terms of Service</a></li>
      <li><a href="/privacy">Privacy Policy</a></li>
      <li><a href="/cookies">Cookie Policy</a></li>
    </ul>
  </nav>
  <p>&copy; 2025 Example Corp. All rights reserved.</p>
</footer>
```

## Why It Matters

Terms of Service protect your business by limiting liability, establishing jurisdiction, setting rules for user conduct, and specifying your rights to user-generated content — but only if users could reasonably discover and read them.

## When You Need Terms of Service

| Scenario | ToS Recommended |
|----------|----------------|
| Informational website only (no accounts, no purchases) | Optional |
| Website with user accounts | Yes |
| E-commerce / payments | Yes — required by most payment processors |
| Software as a Service (SaaS) | Yes |
| Platform with user-generated content | Yes — specifies content ownership and moderation rights |
| Mobile app | Yes — required by Apple App Store and Google Play |

## Enforceable Acceptance: Clickwrap vs Browsewrap

#

## Browsewrap (Weak — Link Only)

Simply linking to terms without requiring acknowledgment. Courts have found these difficult to enforce because users may not have seen them:

```html
<!-- Browsewrap — weak legal enforceability -->
<footer>
  <a href="/terms">Terms of Service</a>
</footer>
```

### Clickwrap (Stronger — Explicit Acceptance)

Requiring a checkbox during signup makes it harder to claim the user was unaware of the terms:

```html
<!-- Clickwrap during registration — stronger enforceability -->
<form method="POST" action="/register">
  <input type="text" name="email" placeholder="Email" required>
  <input type="password" name="password" placeholder="Password" required>

  <label>
    <input type="checkbox" name="terms_accepted" required>
    I agree to the
    <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
    and
    <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
  </label>

  <button type="submit">Create account</button>
</form>
```

```typescript
// Server: record acceptance
const termsAccepted = formData.get('terms_accepted')
if (!termsAccepted) {
  return Response.json({ error: 'You must accept the terms' }, { status: 400 })
}

// Store acceptance with timestamp and version
await db.user.create({
  data: {
    email,
    passwordHash,
    termsAcceptedAt: new Date(),
    termsVersion: '2025-01-15', // Current version date
  }
})
```

## Terms URL Conventions

Use a stable, predictable URL:

```
https://example.com/terms
https://example.com/terms-of-service
https://example.com/legal/terms
```

Store the current version date in the document and in your database so you can notify users when terms change and re-obtain consent if required.

## Key Clauses in Terms of Service

| Clause | Purpose |
|--------|---------|
| Acceptance of terms | How users agree to be bound |
| User conduct | What users can/cannot do |
| Intellectual property | Who owns content and IP |
| Limitation of liability | Cap on your legal exposure |
| Dispute resolution | Arbitration, jurisdiction, governing law |
| Termination | Conditions for account suspension |
| Changes to terms | How and when you can update them |
| Contact information | How users can reach you |

Terms of Service that describe features, data practices, or pricing that no longer apply can create legal liability. Review your terms annually and whenever your data practices or service changes significantly.

## Exceptions

- Scanner output, leaked-secret detections, or stack traces should be confirmed as production-relevant before being escalated as blockers.
- Archived dependencies, sample values, or test fixtures can create false positives, but they should still be documented and bounded clearly.
- If multiple findings overlap, prioritize the issue that most directly enables compromise or data exposure.

## Verification

### Automated Checks

- Test the affected flow in a production-like environment, not just local development.
- Document any intentional exceptions explicitly.

### Manual Checks

- Inspect the final HTTP response or browser behavior to confirm the control is actually enforced.
- Verify third-party integrations or embeds still work after the restriction is applied.