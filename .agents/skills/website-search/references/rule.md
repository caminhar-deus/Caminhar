# WebSite Search Schema

> Checks for WebSite schema with SearchAction to enable the Sitelinks Searchbox in Google Search results.

**Priority:** low · **Difficulty:** beginner · **Time:** 10 min

---
The `WebSite` schema with a `SearchAction` tells Google your site has a search function, enabling it to display a Sitelinks Searchbox — a search field embedded directly in your brand's search result.

## Code Example

When a user searches for your brand (e.g., "Wikipedia"), Google may show:

```
Wikipedia
https://www.wikipedia.org
[___Search Wikipedia_____________] [Search]
The Free Encyclopedia...
```

## Why It Matters

The Sitelinks Searchbox lets users search your site directly from Google's search results page, reducing friction for brand-aware users and increasing the click-through quality from branded queries.

## Schema Implementation

```html
<!-- Place on homepage in <head> -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "My Site",
  "url": "https://www.example.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.example.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
</script>
```

## URL Template Format

The `urlTemplate` must contain `{search_term_string}` as a placeholder that Google fills with the user's query:

```
https://www.example.com/search?q={search_term_string}
https://www.example.com/search/{search_term_string}/
```

Replace the placeholder path with your actual site search URL structure.

## ❌ Common Mistakes

```json
// Wrong: missing query-input
{
  "@type": "SearchAction",
  "target": "https://example.com/search?q={search_term_string}"
}

// Wrong: query-input value incorrect
{
  "query-input": "name=q"   // Must be: "required name=search_term_string"
}

// Wrong: placed on inner page instead of homepage
// WebSite schema should be on the canonical-url homepage
```

## ✅ Verification

1. [Google's Rich Results Test](https://search.google.com/test/rich-results) → test your homepage URL
2. Look for "WebSite" as a detected item
3. Check for errors in the `potentialAction` properties

## Important Notes

- Google decides whether to show the Searchbox — valid schema is a signal, not a guarantee
- The Searchbox typically only appears for well-known brands with strong branded query volume
- Schema must be on the canonical-url homepage (or the URL that Google uses as the site root)
- The search URL must return relevant results — a broken or poor search experience may cause Google to suppress the Searchbox

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: Sitelinks Searchbox structured data before treating the rule as satisfied.
- Check the implementation against Schema.org: SearchAction before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.