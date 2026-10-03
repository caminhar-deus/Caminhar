# Include indexable pages in your sitemap

> Checks for canonical-url, indexable pages that are missing from the XML sitemap.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Sitemap coverage measures how well your sitemap represents the pages you want indexed. [Google's sitemap best practices](https://developers.google.com/search/docs/crawling-indexing/sitemaps/best-practices) and your [noindex-in-sitemap policy](/en/rules/seo/noindex-in-sitemap) should align so search engines are not forced to guess which URLs matter.

## Code Examples

```xml
<!-- sitemap.xml includes a noindex page — wrong -->
<url>
  <loc>https://example.com/thank-you</loc>
</url>
```

```html
<!-- /thank-you carries noindex — contradicts sitemap inclusion -->
<meta name="robots" content="noindex">
```

Including a `noindex` page in the sitemap creates conflicting signals. Google's best practice is: sitemaps should only list pages you want indexed.

## Why It Matters

Pages absent from the sitemap rely entirely on crawl discovery via links, which can delay indexing of new content, especially on large sites or pages with few inbound links. [Google Search Console](https://search.google.com/search-console/about) is usually the quickest place to confirm whether the delay is sitemap coverage or broader crawl issues.

## Include in Sitemap

- ✅ Canonical pages returning HTTP 200
- ✅ Pages with `<meta name="robots" content="index, follow">` (or no robots tag)
- ✅ Pages with self-referencing canonical tags (`<link rel="canonical" href="[same URL]">`)
- ✅ New pages published in the last 7 days (high-priority for timely indexing)

## Exclude from Sitemap

- ❌ Pages with `<meta name="robots" content="noindex">`
- ❌ Pages blocked by `robots.txt` (they cannot be crawled anyway)
- ❌ Pages with canonical tags pointing to a different URL
- ❌ Redirect pages (3XX responses)
- ❌ Paginated subpages (e.g., `/category/?page=2`) unless they have unique, indexable content
- ❌ Faceted/filtered URLs that duplicate canonical-url category pages
- ❌ Login, checkout, and other private pages

## ✅ Automated Coverage

Generate sitemaps from your CMS or database by querying only published, indexable content:

```js
// Next.js sitemap.ts

  const posts = await fetchPublishedPosts() // Only published posts
  return posts.map(post => ({
    url: `https://example.com/blog/${post.slug}`,
    lastModified: post.updatedAt,
  }))
}
```

## Finding Gaps

1. **Google Search Console → Coverage**: Pages marked "Discovered – currently not indexed" may need sitemap entry
2. **Crawl your site**: Compare all crawled 200-OK pages against sitemap URLs
3. **Log analysis**: Check server logs for URLs Googlebot is visiting that are not in your sitemap

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: Sitemap best practices before treating the rule as satisfied.
- Check the implementation against Google: Build and submit a sitemap before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.