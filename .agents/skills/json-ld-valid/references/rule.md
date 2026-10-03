# Use valid JSON-LD structured data

> Validates JSON-LD structured data for syntax correctness, required properties, and schema.org compliance

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
JSON-LD structured data communicates facts about your page to Google in a machine-readable format. A single syntax error makes the entire block invisible to Google, which is why [structured data implementation](/en/rules/seo/structured-data) only matters when the JSON-LD itself is valid.

## Code Examples

#

## ❌ Avoid — invalid JSON (trailing comma)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "My Article",
  "author": {
    "@type": "Person",
    "name": "Jane Smith",   // <-- trailing comma: invalid JSON
  }
}
```

### ❌ Avoid — missing required properties

```json
{
  "@context": "https://schema.org",
  "@type": "Article"
  // Missing: headline, author, datePublished
}
```

### ✅ Correct — valid Article JSON-LD

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Optimise Core Web Vitals",
  "author": {
    "@type": "Person",
    "name": "Jane Smith",
    "url": "https://example.com/authors/jane-smith"
  },
  "datePublished": "2024-03-15T10:00:00Z",
  "dateModified": "2024-11-20T14:00:00Z",
  "publisher": {
    "@type": "Organization",
    "name": "Acme Blog",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  }
}
</script>
```

### ✅ Correct — valid BreadcrumbList

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://example.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Blog",
      "item": "https://example.com/blog/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "How to Optimise Core Web Vitals"
    }
  ]
}
</script>
```

### ✅ Programmatic generation to avoid syntax errors

```ts
// Always use JSON.stringify — never manually write JSON-LD strings
const schema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: article.title,
  author: { '@type': 'Person', name: article.authorName },
  datePublished: article.publishedAt,
  dateModified: article.updatedAt,
}

// In Next.js
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
/>
```

## Why It Matters

- **Rich results eligibility**: Valid structured data is required to appear as rich results (star ratings, FAQs, recipes, etc.) in Google Search, and [Google's structured data introduction](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) is the baseline reference for what Google expects.
- **Silent failure**: Invalid JSON-LD produces no visible error — only the absence of rich results.
- **Search Console errors**: Google Search Console's Rich Results Status report shows structured data errors, but only for pages Google has crawled recently, which is why Google Rich Results Test is still the fastest first check.

## Common Validation Errors

| Error | Cause |
|---|---|
| JSON parse error | Trailing comma, single quotes, unescaped characters |
| Missing `@context` | Omitted or wrong URL |
| Wrong `@type` value | Typo, or using a non-schema.org type |
| Missing required property | e.g., Article without `author` |
| Wrong value type | String where array expected, or vice versa |

## Validation Tools

- [Google Rich Results Test](https://search.google.com/test/rich-results) — validates against Google's requirements
- [Schema Markup Validator](https://validator.schema.org/) — validates against schema.org specification
- [JSONLint](https://jsonlint.com) — validates JSON syntax only
- Google Search Console → Enhancements → Rich results — ongoing monitoring

## Exceptions

- Only add or enforce schema types that the page can truthfully support; irrelevant structured data is worse than no structured data.
- A technically valid schema block can still be misleading if the page content does not visibly back it up; audit rendered content and schema together.
- If indexability, canonical-url, or main content quality is wrong, fix that foundation before optimizing schema details.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Introduction to structured data before treating the rule as satisfied.
- Check the implementation against Schema.org specification before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.