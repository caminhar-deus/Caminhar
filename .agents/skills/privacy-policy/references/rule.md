# Link to your privacy policy in the footer

> Websites that collect any personal data must publish a privacy policy and link to it prominently — this is a legal requirement under GDPR, CCPA, and most other privacy regulations.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
A privacy policy tells users what personal data your site collects, why you collect it, how it is used, who it is shared with, and what rights users have. It is both a legal requirement and a signal of trustworthiness.

## Code Examples

```html
<!-- Standard footer with privacy link -->
<footer>
  <nav aria-label="Legal">
    <ul>
      <li><a href="/privacy">Privacy Policy</a></li>
      <li><a href="/terms">Terms of Service</a></li>
      <li><a href="/cookies">Cookie Policy</a></li>
    </ul>
  </nav>
</footer>
```

#

## React/Next.js

```tsx
// components/footer.tsx

  return (
    <footer>
      <nav aria-label="Legal links">
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="/cookies">Cookie Settings</a>
      </nav>
    </footer>
  )
}
```

## Why It Matters

Collecting user data without a publicly accessible privacy policy violates GDPR (EU), CCPA (California), PIPEDA (Canada), and other regulations — even if the policy is technically published but not linked from the site.

## When Is a Privacy Policy Required

A privacy policy is required if you collect **any** of the following:
- Email addresses (contact forms, newsletter signup)
- Names or other identifying information
- IP addresses (even just for server logs)
- Cookies (especially analytics or advertising cookies)
- Payment information
- Usage data via analytics tools

If your site serves users in the EU, California, Canada, or the UK, a privacy policy is almost certainly required.

## Required Elements (GDPR Article 13)

A GDPR-compliant privacy policy must include:

| Requirement | Description |
|-------------|-------------|
| Data controller identity | Your company name and contact information |
| DPO contact | Data Protection Officer, if required |
| Data collected | What personal data is processed |
| Purpose of processing | Why you collect each type of data |
| Legal basis | Consent, contract, legitimate interest, legal obligation |
| Retention period | How long data is kept |
| Third-party sharing | Who receives the data |
| Data transfers | If data is transferred outside the EU/EEA |
| User rights | Access, rectification, erasure, portability, objection |
| Right to withdraw consent | How to do so |
| Right to complain | Contact information for supervisory authority |

If you use analytics, session replay, frontend monitoring, or CDN logs, state whether those systems receive personal data or pseudonymous identifiers and how long each class of data is retained.

## Privacy Policy Placement

The privacy policy link must be:
- **Visible on every page** — typically in the footer
- **Clearly labeled** — "Privacy Policy" or "Privacy Notice" (not buried in "Legal" dropdown)
- **Machine-readable** — accessible to crawlers and assistive technology
- **Up to date** — reflects current data practices

### Additional Required Placements

| Touchpoint | Why it's required |
|------------|------------------|
| Registration/signup form | Before collecting personal data |
| Contact form | Before collecting name/email |
| Cookie consent banner | Link to full privacy policy from banner |
| Email marketing | Unsubscribe link + privacy policy link |
| Login page | For new users unfamiliar with your practices |

## Privacy Policy URL Conventions

Search engines and privacy-scanning tools look for these paths:

```
https://example.com/privacy
https://example.com/privacy-policy
https://example.com/legal/privacy
```

Avoid `#` anchors on a different page or modal dialogs — privacy policies should have their own stable, crawlable URL.

A GDPR-compliant cookie consent banner is not the same as a privacy policy. You need both: the banner obtains consent for cookies; the privacy policy explains all data processing activities. They typically link to each other.

## Standards

- Use these references as the standard for the legal or product-facing privacy behavior that users actually experience.
- Check the implementation against GDPR Article 13 - Information to be provided before treating the rule as satisfied.
- Check the implementation against CCPA: California Consumer Privacy Act before treating the rule as satisfied.

## Support Notes

- Privacy features can differ by browser storage, cookie, and embed behavior, so verify the user-facing outcome in the supported environments rather than relying only on server logic.
- Document any fallback or platform-specific limitation when a privacy control is interpreted differently across browsers.

## Verification

### Automated Checks

- [iubenda Privacy Policy Generator](https://www.iubenda.com/) — generates compliant policies
- [PrivacyPolicies.com](https://privacypolicies.com/) — free generator

### Manual Checks

- Confirm the published policy includes a concrete retention statement for forms, analytics, logs, and account data.
- Confirm the policy matches the actual behavior of the cookie banner, analytics setup, and monitoring tools used in production.