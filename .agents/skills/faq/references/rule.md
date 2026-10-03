# Add FAQPage schema markup

> Validates FAQPage JSON-LD structured data for question-and-answer content

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
FAQPage structured data tells Google that a page contains question-and-answer content. When valid, it can generate rich results in search with expandable Q&A pairs displayed directly in the SERP.

## Code Examples

#

## ❌ Avoid — FAQ content with no structured data

```html
<section>
  <h2>Frequently Asked Questions</h2>
  <h3>How do I reset my password?</h3>
  <p>Click 'Forgot password' on the login page...</p>
  <!-- No JSON-LD; Google cannot generate FAQ rich results -->
</section>
```

### ❌ Avoid — invalid schema (missing acceptedAnswer)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I reset my password?"
      // Missing acceptedAnswer — schema is invalid
    }
  ]
}
```

### ✅ Correct — valid FAQPage JSON-LD

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I reset my password?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Click 'Forgot password' on the login page and enter your registered email address. You will receive a reset link within 5 minutes."
      }
    },
    {
      "@type": "Question",
      "name": "What payment methods do you accept?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We accept Visa, Mastercard, American Express, PayPal, and bank transfers. All payments are processed securely via Stripe."
      }
    }
  ]
}
</script>
```

### ✅ Dynamic generation in Next.js

```tsx
// Generate FAQPage JSON-LD from your content
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(faq => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}

// In your component
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
/>
```

## Why It Matters

- **Rich results**: FAQPage schema can trigger expandable question/answer pairs in search results, significantly increasing your visible SERP real estate.
- **Click-through rate**: Q&A rich results display below your standard search snippet, offering users more information before clicking — often increasing CTR.
- **Voice search**: FAQ-style answers are a common source for voice search responses.

## Required Structure

Google requires these properties for FAQPage rich results:

| Property | Required | Type |
|---|---|---|
| `@type` | Yes | `"FAQPage"` |
| `mainEntity` | Yes | Array of `Question` |
| `Question.name` | Yes | String (the question) |
| `Question.acceptedAnswer` | Yes | `Answer` object |
| `Answer.text` | Yes | String (the answer) |

## Important Constraints

- Only add FAQPage schema when the page genuinely contains visible FAQ content.
- Do not add FAQPage schema to pages where Q&A is behind a tab, accordion hidden from initial load, or requires interaction — Google must be able to see the content.
- Do not use FAQPage for advertising purposes or to answer questions that are not genuinely asked by users.
- Validate with the [Rich Results Test](https://search.google.com/test/rich-results) before deploying.

## Exceptions

- Only add or enforce schema types that the page can truthfully support; irrelevant structured data is worse than no structured data.
- A technically valid schema block can still be misleading if the page content does not visibly back it up; audit rendered content and schema together.
- If indexability, canonical-url, or main content quality is wrong, fix that foundation before optimizing schema details.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: FAQPage structured data before treating the rule as satisfied.
- Check the implementation against Schema.org: FAQPage before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.