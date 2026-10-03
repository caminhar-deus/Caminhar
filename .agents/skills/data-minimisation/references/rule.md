# Collect only the minimum personal data necessary

> Limit data collection to only what is strictly required for the stated purpose, in line with GDPR Article 5(1)(c) data minimisation principles.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 30 min

---
Data minimisation means only collecting the personal data that is directly necessary to deliver a specific, documented feature — nothing more. It is one of the foundational principles of GDPR and applies to every layer of a frontend application: form fields, analytics events, localStorage keys, cookies, and API payloads.
## Code Example

```typescript
// ❌ Over-collecting — phone and date of birth are not used by the newsletter feature
interface NewsletterFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;       // never read after submission
  dateOfBirth: string; // never read after submission
}

// ✅ Minimal — only what the feature requires
interface NewsletterFormData {
  email: string;
}

async function subscribeToNewsletter(data: NewsletterFormData): Promise<void> {
  await fetch('/api/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Only send what the server actually uses
    body: JSON.stringify({ email: data.email }),
  });
}
```

## Why It Matters

Collecting more data than necessary increases the blast radius of a breach, exposes your organisation to regulatory fines, and erodes user trust. GDPR Article 5(1)(c) makes data minimisation a legal obligation for any controller processing EU residents' data — but it is also sound engineering practice regardless of jurisdiction.

## Why Over-Collection Happens

Forms are the most common source of over-collection. It is tempting to add "nice to have" fields such as phone numbers for a newsletter sign-up, or date of birth for a simple account registration. These fields are rarely used but become a liability the moment they are stored.

Other common sources include:

- Analytics events capturing full URLs with query strings that contain user identifiers
- localStorage keys that store entire user objects when only a user ID is needed
- API responses that return full records when only a subset of fields is consumed

## Identifying Unnecessary Data Collection

Before writing any fix, audit what you actually collect:

1. List every form field, localStorage key, cookie name, and analytics property
2. For each item, write down the specific feature that reads and uses it
3. Flag any item that has no active consumer — it is a candidate for removal

## Anonymous vs Pseudonymous Data

**Anonymous data** cannot be re-linked to an individual even with additional information. Aggregate statistics (e.g. "42% of users clicked button X") are anonymous.

**Pseudonymous data** replaces direct identifiers with a token (e.g. a hashed user ID). It is still personal data under GDPR, but it reduces the impact of a breach because the token alone is not useful to an attacker without the mapping table.

Prefer pseudonymous identifiers in analytics and logs over raw email addresses or names.

## Client-Side Storage Retention Policy

Every value written to `localStorage` or `sessionStorage` should have a documented purpose and a retention window. A simple pattern is to store metadata alongside the value:

```typescript
interface StorageEntry {
  value: T;
  purpose: string;
  expiresAt: number; // Unix timestamp in ms
}

function setWithExpiry entry.expiresAt) {
    localStorage.removeItem(key);
    return null;
  }
  return entry.value;
}

// Usage — store only the user ID, not the full profile object
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
setWithExpiry('userId', 'u_abc123', 'Re-authenticate returning users', ONE_WEEK_MS);
```

Storing an entire user profile object in localStorage is a common mistake. If a field is added to the profile in the future (e.g. home address) it will be persisted client-side without any deliberate decision. Store only the minimum identifier needed to re-fetch data from the server.

## Purpose Limitation

Each piece of data should be collected for a specific purpose and not reused for a different purpose without fresh consent. In code, this often manifests as analytics events being fed into ad-targeting pipelines without the user's knowledge. Document the intended purpose in a comment or a data inventory spreadsheet, and enforce a review before repurposing data.

## Pseudonymising Analytics Events

```typescript
// ❌ Sending PII to analytics
analytics.track('form_submitted', {
  email: user.email,
  name: user.fullName,
});

// ✅ Send only a pseudonymous identifier

function pseudonymise(email: string): string {
  return createHash('sha256').update(email).digest('hex').slice(0, 16);
}

analytics.track('form_submitted', {
  userId: pseudonymise(user.email), // Not reversible without the original email
});
```

The same rule applies to client-side logs and error monitoring. Capture opaque user IDs, route names, and coarse context rather than raw email addresses, phone numbers, or free-form user input.

## Standards

- Use these references as the standard for the legal or product-facing privacy behavior that users actually experience.
- Check the implementation against GDPR Article 5 — Principles relating to processing of personal data before treating the rule as satisfied.
- Check the implementation against ICO: Data minimisation before treating the rule as satisfied.

## Verification

1. Open the Network tab in DevTools and submit every form. Inspect the request body — remove any field not consumed by the backend handler.
2. Run `Object.keys(localStorage)` in the browser console after sign-up. Each key should map to a documented purpose.
3. Search the codebase for `localStorage.setItem` and `sessionStorage.setItem`. Every call should pass through a retention-aware helper like `setWithExpiry` above.
4. Check that analytics event payloads contain pseudonymous identifiers, not raw email addresses or names.
5. Confirm each analytics, logging, or monitoring payload has a documented retention period in code comments, config, or policy docs.