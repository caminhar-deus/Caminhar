# Link directly to final destination URLs

> Detects URLs that redirect and links pointing to redirects

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
When your site has undergone URL migrations, domain changes, or structural reorganisation, internal links often still point to old redirecting URLs instead of the final destination. Updating those links passes more value forward and complements the server-side cleanup covered in [redirect-chain](/en/rules/seo/redirect-chain).

## Code Example

```
Page A links to → /old-url → (301) → /new-url

Instead of:
Page A links to → /new-url (direct, no redirect)
```

Every redirect in the path:
1. Adds latency for users
2. Uses crawl budget (Googlebot must make an extra request)
3. Partially reduces the PageRank passed to the final destination

## Why It Matters

Internal links that point to redirect URLs add latency, waste crawl budget, and pass less PageRank to the destination than a direct link would. [Google's redirect guidance](https://developers.google.com/search/docs/crawling-indexing/301-redirects) and [crawlable-link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) both point toward linking directly to the final URL whenever possible.

## Detection

**Using [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/):**
1. Crawl → All → filter "Response Code: 3xx"
2. Check the "Inlinks" tab for each redirect URL to see what is linking to it
3. Export the list of internal links → redirect destination

**Using curl:**
```bash
# Follow redirects and show each hop
curl -L -I https://example.com/old-url 2>&1 | grep -E "HTTP|Location"

# Expected for a clean URL (no redirect):
# HTTP/2 200

# Problem URL (redirect chain):
# HTTP/2 301
# Location: https://example.com/intermediate
# HTTP/2 301
# Location: https://example.com/new-url
# HTTP/2 200
```

## Fixing Internal Links

```html
<!-- ❌ Bad: Links to redirect URL -->
<a href="/old-product-url">Product Name</a>

<!-- After a URL migration, /old-product-url redirects to /new-product-url -->

<!-- ✅ Good: Link directly to final URL -->
<a href="/new-product-url">Product Name</a>
```

## Systematic Fix Process

1. Identify all 301 redirect rules currently in place (from nginx/Apache config, or redirect plugin)
2. Run a site crawl — identify internal links pointing to any of those redirect source URLs
3. For each match, update the internal link href to the redirect destination URL
4. Re-crawl to verify no internal links remain pointing to redirect URLs
5. Keep the 301 redirect rules in place (external links and bookmarks still need them)

## Sitemap Links

Also check your XML sitemap — it should contain only final destination URLs, never redirect URLs:

```xml
<!-- ❌ Bad: Sitemap entry points to redirect URL -->
<url>
  <loc>https://example.com/old-category/shoes</loc>
</url>

<!-- ✅ Good: Sitemap entry points to final URL -->
<url>
  <loc>https://example.com/shoes</loc>
</url>
```

## How Much PageRank Is Lost?

Google has not published exact figures, but has confirmed that each redirect in a chain results in some PageRank loss. A direct link passes the maximum available PageRank. A link → 301 → destination passes slightly less. A link → 301 → 301 → destination passes noticeably less.

For important pages, the difference matters. Always prefer direct links.

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Redirect and Google Search before treating the rule as satisfied.
- Check the implementation against Google Search Central: Links that Google follows before treating the rule as satisfied.

## Support Notes

- Search-facing behavior can differ between rendered HTML, crawlers, and browser environments, so verify the final output on live routes and not only in source templates.
- Document any platform or browser-specific limitation only when it materially changes the crawl, metadata, or indexing signal.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.