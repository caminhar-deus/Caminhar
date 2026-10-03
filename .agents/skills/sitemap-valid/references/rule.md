# Keep XML sitemaps valid

> Validates sitemap XML structure against the sitemaps.org protocol, URL limits, and encoding requirements.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
A valid XML sitemap must conform to the sitemaps.org protocol. Invalid sitemaps cause submission errors in Google Search Console and prevent crawlers from processing the included URLs.

## Code Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.example.com/page/</loc>
    <lastmod>2025-03-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

## Why It Matters

An invalid or malformed sitemap is silently ignored by search engines, leaving newly published or orphaned pages undiscovered by crawlers.

## Element Reference

| Element | Required | Values |
|---------|----------|--------|
| `<loc>` | Yes | Absolute URL, max 2048 chars |
| `<lastmod>` | No | W3C Datetime format (e.g., `2025-03-01`) |
| `<changefreq>` | No | `always`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`, `never` |
| `<priority>` | No | `0.0` to `1.0` (default: `0.5`) |

Note: Google ignores `changefreq` and `priority` — include `lastmod` as it is used for crawl scheduling.

## Common Validation Errors

#

## ❌ Missing or wrong namespace

```xml
<!-- Wrong -->
<urlset>

<!-- Correct -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
```

### ❌ Unencoded ampersand in URL

```xml
<!-- Wrong — XML parse error -->
<loc>https://example.com/search?q=shoes&color=red</loc>

<!-- Correct -->
<loc>https://example.com/search?q=shoes&amp;color=red</loc>
```

### ❌ Relative URLs

```xml
<!-- Wrong -->
<loc>/about</loc>

<!-- Correct -->
<loc>https://www.example.com/about</loc>
```

### ❌ Exceeding URL limits

A sitemap with more than 50,000 URLs should be split into multiple files referenced by a sitemap index:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.example.com/sitemap-1.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://www.example.com/sitemap-2.xml</loc>
  </sitemap>
</sitemapindex>
```

## Validation Tools

- [Google Search Console](https://search.google.com/search-console/about) → Sitemaps (shows processing errors)
- [XML Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)
- `xmllint --noout sitemap.xml` via command line

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