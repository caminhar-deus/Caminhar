# Add Review schema markup

> Validates Review and AggregateRating schema on product, service, and business pages to enable star-rating rich results.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Review and AggregateRating schema markup allows Google to display star ratings directly in search results, creating a rich snippet that stands out from plain blue links.

## Code Example

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Wireless Noise-Cancelling Headphones",
  "image": "https://example.com/headphones.jpg",
  "description": "Premium headphones with 30-hour battery life.",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "312",
    "bestRating": "5",
    "worstRating": "1"
  }
}
</script>
```

## Why It Matters

Star ratings in search results increase click-through rates by up to 35%; incorrect or missing schema means competitors with valid markup capture that visibility advantage.

## Individual Review Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Review",
  "itemReviewed": {
    "@type": "Product",
    "name": "Wireless Headphones"
  },
  "author": {
    "@type": "Person",
    "name": "Jane Smith"
  },
  "datePublished": "2025-02-14",
  "reviewBody": "Excellent sound quality and very comfortable for long sessions.",
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "5",
    "bestRating": "5"
  }
}
</script>
```

## Required Properties for Rich Results

#

## AggregateRating (within a supported type)

| Property | Required | Notes |
|----------|----------|-------|
| `ratingValue` | Yes | The average rating (numeric string) |
| `ratingCount` or `reviewCount` | Yes | Total number of ratings |
| `bestRating` | Recommended | Maximum possible rating (default: 5) |
| `worstRating` | Recommended | Minimum possible rating (default: 1) |

### Review

| Property | Required | Notes |
|----------|----------|-------|
| `author` | Yes | `Person` or `Organization` |
| `reviewRating` | Yes | A `Rating` with `ratingValue` |
| `itemReviewed` | Yes | The thing being reviewed |

## Supported Entity Types for Star Ratings

Google shows star ratings for reviews of: `Product`, `Recipe`, `Movie`, `Book`, `Software`, `LocalBusiness`, `Course`, `Event`.

## ❌ Policy Violations

- Self-authored reviews ("Review your own business")
- Reviews that don't reflect genuine user experiences
- `AggregateRating` with `reviewCount: 0`
- Markup on pages that don't display review content to users

## Validation

Use [Google's Rich Results Test](https://search.google.com/test/rich-results) to confirm:

1. Schema is detected without errors
2. The correct rich result type is eligible
3. All required properties are present

## Exceptions

- Only add or enforce schema types that the page can truthfully support; irrelevant structured data is worse than no structured data.
- A technically valid schema block can still be misleading if the page content does not visibly back it up; audit rendered content and schema together.
- If indexability, canonical-url, or main content quality is wrong, fix that foundation before optimizing schema details.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: Review snippet structured data before treating the rule as satisfied.
- Check the implementation against Schema.org: AggregateRating before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.