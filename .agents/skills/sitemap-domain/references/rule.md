# Keep sitemap URLs on the correct domain

> Checks that all URLs in the sitemap belong to the same domain and protocol as the sitemap itself.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
The sitemaps protocol requires that all `<loc>` URLs belong to the same domain as the sitemap file. Google enforces this as a security boundary — only verified domain owners can influence crawling of a domain.
## Code Example

Sitemap hosted at the main production sitemap URL:

```xml
<url>
  <loc>https://old-domain.com/page</loc>   <!-- Wrong domain — ignored -->
</url>
<url>
  <loc>http://www.example.com/page</loc>   <!-- Wrong protocol — inconsistent -->
</url>
<url>
  <loc>https://example.com/page</loc>      <!-- Missing www — canonicalization issue -->
</url>
```

## Why It Matters

Google ignores sitemap entries from domains it cannot verify as yours — cross-domain URLs are simply skipped, meaning those pages lose the crawl-discovery benefit of the sitemap.

## Domain Consistency Rules

- All `<loc>` values must match the domain of the sitemap file itself
- All URLs must use the same protocol (`https://`)
- `www` vs non-`www` must be consistent (use whichever is the canonical-url version)

## ✅ Correct Domain-Consistent Sitemap

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.example.com/</loc>
  </url>
  <url>
    <loc>https://www.example.com/about</loc>
  </url>
  <url>
    <loc>https://www.example.com/blog/my-post</loc>
  </url>
</urlset>
```

## Common Causes of Domain Mismatches

#

## HTTP → HTTPS Migration

After migrating, a statically generated sitemap may still contain old protocol values. Regenerate the sitemap with the new base URL instead of leaving stale protocol variants behind.

### www vs. non-www

If the non-`www` host redirects to the `www` host, all sitemap URLs should use the final canonical-url host. Check your canonical URL configuration in the CMS or framework so the sitemap and canonicals match.

### Domain Rename / Rebrand

After moving from `old-brand.com` to `new-brand.com`, update the sitemap generator's base URL config and resubmit. Remove the old sitemap from Search Console.

## Automated Prevention

Always configure sitemaps with an explicit base URL rather than relative paths:

```js
// Next.js: next.config.js
module.exports = {
  env: {
    NEXT_PUBLIC_SITE_URL: 'https://www.example.com',
  },
}

// sitemap.ts
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL

  return pages.map(page => ({
    url: `${baseUrl}/${page.slug}`,
  }))
}
```

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: Sitemap best practices before treating the rule as satisfied.
- Check the implementation against Sitemaps XML format before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.