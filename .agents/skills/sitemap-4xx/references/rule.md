# 4XX Pages in Sitemap

> Checks for sitemap URLs that return 4XX HTTP status codes, indicating broken or removed pages.

**Priority:** high · **Difficulty:** intermediate · **Time:** 10 min

---
A sitemap is a promise to search engines that the listed URLs are live, canonical-url, and indexable. [Google's sitemap best practices](https://developers.google.com/search/docs/crawling-indexing/sitemaps/best-practices) and your broader [sitemap-coverage checks](/en/rules/seo/sitemap-coverage) depend on that promise staying true.

## Code Example

```xml
<!-- sitemap.xml still references deleted blog posts -->
<url><loc>https://example.com/blog/old-post-deleted</loc></url>
<url><loc>https://example.com/blog/moved-to-new-section</loc></url>
```

These URLs return 404, but the sitemap was not updated after the posts were deleted.

## Why It Matters

Including 4XX URLs in a sitemap signals poor site maintenance to Google, wastes crawl budget on non-existent pages, and generates errors in [Google Search Console](https://search.google.com/search-console/about) that can mask real indexing issues.

## Why 4XX URLs Are Harmful

- **Crawl budget waste**: Googlebot spends time fetching dead URLs instead of discovering new content
- **Search Console errors**: 4XX URLs appear as errors in the Coverage report, obscuring genuine issues
- **Trust signal**: A sitemap with many broken URLs signals poor site quality

## Correct Status Code Expectations

| URL Condition | Expected HTTP Status | Sitemap Action |
|--------------|---------------------|----------------|
| Page exists and is indexable | `200 OK` | Include |
| Page permanently moved | `301 Moved Permanently` | Update `<loc>` to new URL |
| Page deleted | `410 Gone` or `404 Not Found` | Remove from sitemap |
| Page temporarily unavailable | `503 Service Unavailable` | Keep but fix quickly |

## ✅ After a Site Migration

1. Map all old URLs to new URLs
2. Implement 301 redirects from old to new
3. Update sitemap to use only the new URLs
4. Resubmit the sitemap in Google Search Console

## Automation

For dynamic sites, generate sitemaps programmatically from your database of live content rather than a static file. This ensures the sitemap always reflects real page existence.

```js
// Example: Only include published, non-deleted pages
const urls = await db.pages.findMany({
  where: { published: true, deletedAt: null }
})
```

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: Sitemap best practices before treating the rule as satisfied.
- Check the implementation against Google: HTTP status codes and SEO before treating the rule as satisfied.

## Verification

### Automated Checks

- Google Search Console → Sitemaps → view submitted sitemap details
- Search Console → Coverage → filter by "Submitted in sitemap"
- Use a crawl tool (Screaming Frog, sitebulb) to fetch all sitemap URLs and report status codes

### Manual Checks

- Review representative live pages manually and confirm there is no stronger conflicting signal that changes the intended SEO outcome.