# Schema + Noindex Conflict

> Detects pages that carry rich result schema markup but are blocked from indexing via noindex or robots.txt.

**Priority:** high · **Difficulty:** intermediate · **Time:** 10 min

---
Structured data markup only influences search appearance on pages that Google can crawl and index. A `noindex` directive or a robots.txt block renders schema markup ineffective, which is why schema work should be reviewed together with [indexability](/en/rules/seo/indexability) before investing more effort in validation details.

## Code Example

```html
<!-- Page: /product/headphones-pro -->
<head>
  <meta name="robots" content="noindex">  <!-- ← Prevents indexing -->
</head>

<script type="application/ld+json">
{
  "@type": "Product",
  "name": "Headphones Pro",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "203"
  }
}
</script>
<!-- ↑ AggregateRating schema has zero effect — page is noindexed -->
```

## Why It Matters

Investing in rich result schema on pages that are blocked from indexing wastes development effort. [Google's structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) make it clear that rich results depend on pages being eligible for indexing in the first place.

## Three Types of Conflict

#

## 1. Meta Robots Noindex + Schema

```html
<meta name="robots" content="noindex">
<script type="application/ld+json">{ "@type": "Recipe", ... }</script>
```

Google fetches and processes the page but does not index it. Schema markup is parsed but no rich result is generated.

### 2. robots.txt Block + Schema

```
# robots.txt
User-agent: *
Disallow: /products/
```

Google never fetches `/products/` URLs, so schema inside those pages is never seen at all.

### 3. Non-Self Canonical + Schema

```html
<!-- /products/headphones?color=red -->
<link rel="canonical" href="https://example.com/products/headphones">
<script type="application/ld+json">{ "@type": "Product", ... }</script>
```

Google treats this page as a duplicate. Rich results are attributed to the canonical URL, which must have its own valid schema.

## ✅ Correct Pattern

```html
<!-- Page is indexable: no noindex, not blocked, self-canonical-url -->
<head>
  <link rel="canonical" href="https://example.com/products/headphones">
  <!-- No noindex meta tag -->
</head>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Headphones",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "150"
  }
}
</script>
```

## Audit Approach

1. Crawl the site and collect all pages with JSON-LD or Microdata schema
2. For each schema page, check `meta[name=robots]` for `noindex`
3. Check whether the URL path matches any `robots.txt` Disallow rules
4. Check the `link[rel=canonical]` href matches the current URL
5. Flag any page where schema exists but one of the above conditions blocks indexing

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: Structured data general guidelines before treating the rule as satisfied.
- Check the implementation against Google: robots meta tag before treating the rule as satisfied.

## Verification

### Automated Checks

- Google Search Console → Rich Results: schema-carrying pages should appear here if indexed
- [Google Rich Results Test](https://search.google.com/test/rich-results): run it on the live URL. If the tool reports "not indexable," no rich result will be generated

### Manual Checks

- Review representative live pages manually and confirm there is no stronger conflicting signal that changes the intended SEO outcome.