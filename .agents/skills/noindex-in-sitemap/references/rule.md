# Noindex in Sitemap

> Checks for noindexed pages listed in sitemap

**Priority:** high · **Difficulty:** intermediate · **Time:** 15 min

---
An XML sitemap tells search engines which pages to prioritise for crawling and indexing. A `noindex` directive tells them not to index a page. [Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview) and page-level [robots-meta controls](/en/rules/seo/robots-meta) should never point in opposite directions on the same URL.

## Code Examples

```xml
<!-- sitemap.xml — says "please index this" -->
<urlset>
  <url>
    <loc>https://example.com/thank-you</loc>
  </url>
</urlset>
```

```html
<!-- /thank-you page — says "do NOT index this" -->
<head>
  <meta name="robots" content="noindex, nofollow" />
</head>
```

Google will follow the `noindex` directive, but the URL still gets crawled — wasting crawl budget.

## Why It Matters

Listing noindexed pages in your sitemap sends contradictory signals to Googlebot. It wastes crawl budget and usually shows up next to the same contradictions flagged in [indexability-conflicts](/en/rules/seo/indexability-conflicts).

## Decision Tree

```
Is this URL listed in the sitemap?
         ↓
Does it have a noindex directive?
         ↓ YES
Do you WANT it indexed?
   ↓ YES                    ↓ NO
Remove noindex          Remove from sitemap
```

## What Belongs in a Sitemap

```xml
<!-- ✅ Good: Only indexable, canonical-url, 200 URLs -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/products/shoes</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

**Exclude from sitemap:**
- Pages with `noindex` meta tag or `X-Robots-Tag: noindex`
- Pages that return non-200 status codes (301, 404, 410)
- Duplicate pages (use canonical-url on the original)
- Paginated pages beyond page 1 (optional, depends on strategy)
- Admin, login, checkout thank-you pages

## Automated Detection

Use [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/) or a similar crawler:
1. Crawl the site
2. Export the sitemap URL list
3. Filter for URLs with `noindex` in the meta robots column
4. Remove each match from the sitemap or remove the noindex directive

## Next.js Sitemap Example

```ts
// app/sitemap.ts

  const pages = await getAllPages()

  // Only include indexable pages
  return pages
    .filter(page => !page.noindex)
    .map(page => ({
      url: `https://example.com${page.path}`,
      lastModified: page.updatedAt,
    }))
}
```

Per Google's documentation, if a URL appears in both the sitemap and has a noindex directive, Google will follow the noindex and not index the page. However, it will still crawl it — removing it from the sitemap reduces unnecessary crawl budget consumption.

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.