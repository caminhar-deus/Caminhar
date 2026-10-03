# Limit unnecessary URL parameters

> Checks for excessive URL parameters

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
URL parameters are query string values appended to a URL path. While often necessary for functionality, they can generate hundreds or thousands of near-duplicate URLs, so parameter handling usually belongs in the same discussion as [canonical-url](/en/rules/seo/canonical-url) and paginated URL strategy.

## Code Examples

#

## Tracking Parameters — Always Strip

```html
<!-- URL: /products?utm_source=newsletter&utm_campaign=summer -->

<!-- ✅ Canonical strips tracking params -->
<link rel="canonical" href="https://example.com/products" />
```

### Filter Parameters — Canonicalize to Base

```html
<!-- URL: /shoes?color=red&size=10 -->

<!-- ✅ Canonical points to base category page -->
<link rel="canonical" href="https://example.com/shoes" />

<!-- OR self-canonicalize if filtered content is indexable -->
<link rel="canonical" href="https://example.com/shoes?color=red&size=10" />
```

### Pagination — Self-Canonicalize

```html
<!-- URL: /blog?page=3 -->

<!-- ✅ Each page self-references -->
<link rel="canonical" href="https://example.com/blog?page=3" />
```

### Search Results — Often Noindex

```html
<!-- URL: /search?q=sourdough -->

<!-- ✅ Search result pages are usually noindexed to avoid thin content -->
<meta name="robots" content="noindex, follow" />
```

## Why It Matters

Uncontrolled URL parameters generate duplicate content that wastes crawl budget and splits PageRank across URL variants. [Google's URL parameter guidance](https://developers.google.com/search/docs/crawling-indexing/url-parameters) is the main reference for deciding which parameterized URLs deserve canonical-url consolidation.

## Parameter Categories

| Type | Examples | SEO Impact |
|------|---------|-----------|
| Tracking | `utm_source`, `fbclid`, `gclid`, `ref` | Duplicate content, always strip from canonical-url |
| Session | `sessionid`, `sid`, `PHPSESSID` | Duplicate content, strip from canonical-url |
| Filtering | `color=red`, `size=large` | May change content; canonicalize to base |
| Sorting | `sort=price`, `order=asc` | Same items, different order; canonicalize to base |
| Pagination | `page=2`, `p=3` | Different content; self-canonicalize or include |
| Search | `q=shoes`, `search=dress` | Unique results; usually noindex |

## Next.js Canonical with Clean URL

```tsx
// Strip tracking params before setting canonical-url
function getCanonicalUrl(url: URL): string {
  const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign',
    'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref']

  const cleanUrl = new URL(url)
  trackingParams.forEach(p => cleanUrl.searchParams.delete(p))

  return cleanUrl.toString()
}

  const canonical-url = getCanonicalUrl(new URL(request.url))
  return {
    alternates: { canonical-url },
  }
}
```

## Parameter Detection Audit

1. Use Google Search Console → Legacy tools → URL Parameters (if available)
2. Use [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/): Configuration → Spider → Crawl within subfolder, check URLs containing `?`
3. Review your analytics for top parameter combinations
4. Check server logs for crawled parameter variants

Google's URL Parameters tool in Search Console was removed. Google now handles parameters automatically via canonical tags. Ensure every parameterized URL has an appropriate canonical tag.

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: URL parameters before treating the rule as satisfied.
- Check the implementation against Google Search Central: Consolidate duplicate URLs before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.