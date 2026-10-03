# Implement valid BreadcrumbList schema

> Adds structured data to breadcrumb navigation for better site hierarchy and search appearance.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Breadcrumbs provide a secondary navigation path for users and a clear hierarchical map for search engines.

## Code Example

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [{
    "@type": "ListItem",
    "position": 1,
    "name": "Blog",
    "item": "https://example.com/blog"
  },{
    "@type": "ListItem",
    "position": 2,
    "name": "SEO Tips",
    "item": "https://example.com/blog/seo-tips"
  }]
}
</script>
```

## Why It Matters

- **Search Appearance**: Replaces long, messy URLs in search snippets with a clean, clickable navigation path.
- **Crawlability**: Helps search engines understand the relationship between different pages and categories.
- **User Experience**: Allows users to quickly navigate back to higher-level categories, and to the homepage when it is part of the visible trail.
- **Internal Linking**: Automatically creates a strong internal linking structure based on your site's hierarchy.

## Exceptions

- Only add or enforce schema types that the page can truthfully support; irrelevant structured data is worse than no structured data.
- A technically valid schema block can still be misleading if the page content does not visibly back it up; audit rendered content and schema together.
- If indexability, canonical-url, or main content quality is wrong, fix that foundation before optimizing schema details.
- Do not emit one-item `BreadcrumbList` schema on flat pages, landing pages, or top-level hub pages.
- Treat `Home` as optional: include it in schema only when it also appears in the visible breadcrumb navigation.

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
- Confirm the schema labels, order, and URLs match the visible breadcrumb trail.
- Confirm top-level pages without a meaningful trail do not output one-item `BreadcrumbList` data.