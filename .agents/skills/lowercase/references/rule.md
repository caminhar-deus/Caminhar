# Use lowercase URLs

> Checks that URLs are lowercase

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
URL paths on the web are case-sensitive by specification in [RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986#section-6.2.2.1). While many servers normalize case for you, inconsistent casing creates duplicate pages that split PageRank and often needs the same cleanup plan as [canonical URL consolidation](/en/rules/seo/canonical-url).

## Code Example

On Linux servers (used by most web hosts), `/Products` and `/products` are genuinely different URLs. Both may be served, indexed separately, and compete against each other:

```
https://example.com/Products/shoes     → 200 OK  ← duplicate
https://example.com/products/shoes     → 200 OK  ← canonical-url
```

Even on Windows/macOS (case-insensitive), Googlebot treats them as separate URLs.

## Why It Matters

Mixed-case URLs can create duplicate content. Search engines may index both `/Product` and `/product` as separate pages, splitting link equity and diluting rankings, which is why [Google's URL structure best practices](https://developers.google.com/search/docs/crawling-indexing/url-structure) still recommend simple, normalized paths.

## Correct Pattern

```
✅ https://example.com/products/running-shoes
✅ https://example.com/blog/how-to-pick-shoes
✅ https://example.com/about-us

❌ https://example.com/Products/Running-Shoes
❌ https://example.com/Blog/How-To-Pick-Shoes
❌ https://example.com/About-Us
```

## Server-Level Fix

**Nginx:**
```nginx
# Redirect uppercase URLs to lowercase
if ($uri != $uri_lower) {
  rewrite ^(.*)$ $uri_lower permanent;
}
```

**Apache (.htaccess):**
```apache
RewriteEngine On
RewriteMap lc int:tolower
RewriteCond %{REQUEST_URI} [A-Z]
RewriteRule (.*) ${lc:$1} [R=301,L]
```

## Framework-Level Fix

**Next.js** — `next.config.js`:
```js
module.exports = {
  async redirects() {
    return [
      {
        source: '/Products/:path*',
        destination: '/products/:path*',
        permanent: true,
      },
    ]
  },
}
```

**Express.js middleware:**
```js
app.use((req, res, next) => {
  const lower = req.path.toLowerCase()
  if (req.path !== lower) {
    return res.redirect(301, lower + (req.search || ''))
  }
  next()
})
```

## Sitemap and Internal Links

After enforcing lowercase URLs, audit with [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/) or an equivalent crawler:
1. XML sitemap entries — all `<loc>` values must be lowercase
2. Internal `<a href="">` links — update any uppercase links
3. Canonical tags — `<link rel="canonical">` must match the lowercase URL

If uppercase URLs currently have inbound links or are indexed, implement 301 redirects before removing the old URLs. Dropping uppercase URLs without redirects destroys existing link equity.

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: URL structure best practices before treating the rule as satisfied.
- Check the implementation against RFC 3986: URI syntax — case normalization before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.