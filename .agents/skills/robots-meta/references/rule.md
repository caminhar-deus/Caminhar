# Set robots meta directives correctly

> Checks robots meta tag for valid indexing directives in the page head.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
The robots meta tag gives per-page control over indexing and link following, unlike `robots.txt` which operates at the URL path level. [Google's robots-meta guide](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) and broader [indexability checks](/en/rules/seo/indexability) should agree on the same intent for every page.

## Code Example

```html
<head>
  <!-- Default: allow indexing and link following -->
  <meta name="robots" content="index, follow">

  <!-- Prevent this page from appearing in search results -->
  <meta name="robots" content="noindex, follow">

  <!-- Index but don't pass link equity through outbound links -->
  <meta name="robots" content="index, nofollow">

  <!-- Block entirely: no index, no link following -->
  <meta name="robots" content="noindex, nofollow">
</head>
```

## Why It Matters

An accidental `noindex` on a key landing page silently removes it from search results. Auditing those directives in [Google Search Console](https://search.google.com/search-console/about) is often the quickest way to confirm whether a disappearance is technical rather than content-related.

## Supported Directives

| Directive | Meaning |
|-----------|---------|
| `index` | Page may appear in search results (default) |
| `noindex` | Page must not appear in search results |
| `follow` | Crawlers may follow links (default) |
| `nofollow` | Crawlers must not follow links on this page |
| `noarchive` | Do not show a cached link in results |
| `nosnippet` | Do not show a text snippet or video preview |
| `max-snippet:-1` | No limit on snippet length |
| `max-image-preview:large` | Allow large image previews |
| `noimageindex` | Do not index images on this page |

## Crawler-Specific Tags

```html
<!-- Only applies to Googlebot -->
<meta name="googlebot" content="noindex">

<!-- Only applies to Bingbot -->
<meta name="bingbot" content="noindex">
```

Crawler-specific tags take precedence over the generic `robots` tag for that crawler.

## ✅ Correct Usage

```html
<!-- Public article page -->
<meta name="robots" content="index, follow">

<!-- Thank-you page after purchase -->
<meta name="robots" content="noindex, nofollow">

<!-- Paginated page — index but limit snippet -->
<meta name="robots" content="index, follow, max-snippet:150">
```

## ❌ Common Mistakes

```html
<!-- Accidentally left on production from staging -->
<meta name="robots" content="noindex">

<!-- Conflicts: two robots tags on the same page -->
<meta name="robots" content="index, follow">
<meta name="robots" content="noindex">

<!-- Blocking a page in robots.txt AND adding noindex is redundant -->
<!-- robots.txt block prevents the noindex from even being seen -->
```

## robots.txt vs. Meta Robots

- `robots.txt` blocks *access* — the page is never fetched
- `meta robots noindex` blocks *indexing* — the page is fetched but excluded from results
- For pages you want indexed: neither block nor noindex
- For pages you want deindexed: use `noindex` (not robots.txt, which prevents Google from seeing the directive)

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: robots meta tag, data-nosnippet, and X-Robots-Tag before treating the rule as satisfied.
- Check the implementation against Google: Valid indexing and serving rules before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.