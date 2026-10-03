# Implement valid Article structured data

> Validates that articles use the correct Schema.org properties for improved search visibility.

**Priority:** high · **Difficulty:** intermediate · **Time:** 15 min

---
Structured data provides explicit clues about the meaning of a page to search engines, enabling enhanced features in search results.

## Code Example

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "10 SEO Tips for 2024",
  "image": ["https://example.com/photos/16x9/photo.jpg"],
  "datePublished": "2024-01-05T08:00:00+08:00",
  "dateModified": "2024-01-05T09:20:00+08:00",
  "author": [{
      "@type": "Person",
      "name": "Jane Doe",
      "url": "https://example.com/profile/janedoe"
    }]
}
</script>
```

## Why It Matters

- **Rich Results**: Enables headlines, images, and author info to appear directly in search results.
- **Google Discover**: Properly marked-up articles are much more likely to be featured in user-personalized feeds.
- **Author Attribution**: Helps search engines connect the content to a specific author's entity.
- **CTR Improvement**: Rich snippets often have a higher click-through rate than plain text results.

## Exceptions

- Only add or enforce schema types that the page can truthfully support; irrelevant structured data is worse than no structured data.
- A technically valid schema block can still be misleading if the page content does not visibly back it up; audit rendered content and schema together.
- If indexability, canonical-url, or main content quality is wrong, fix that foundation before optimizing schema details.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Search Essentials before treating the rule as satisfied.
- Check the implementation against Google Search Central documentation before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.