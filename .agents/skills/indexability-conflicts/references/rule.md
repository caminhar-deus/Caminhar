# Avoid conflicting indexability signals

> Detects conflicting signals between robots.txt, meta robots, X-Robots-Tag headers, and canonical tags

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Indexability signals such as robots.txt, meta robots, `X-Robots-Tag` headers, and canonicals each control a different part of crawling and indexing. [Google's robots-meta documentation](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) is explicit that these signals do different jobs, so conflicts between them create the same ambiguity addressed in [indexability checks](/en/rules/seo/indexability).

## Code Examples

#

## ❌ Avoid — robots.txt blocking a page that has noindex

```
# robots.txt
User-agent: *
Disallow: /private/   # Blocks crawling
```

```html
<!-- /private/page.html — never read because robots.txt blocked it -->
<meta name="robots" content="noindex">
```

### ✅ Correct — use only noindex (remove robots.txt block)

```
# robots.txt — no Disallow for /private/
User-agent: *
Disallow: /admin/   # Only block what truly must not be crawled
```

```html
<!-- /private/page.html — crawler reads noindex correctly -->
<meta name="robots" content="noindex, follow">
```

### ❌ Avoid — canonical pointing to a noindex page

```html
<!-- /product?color=red — the canonical-url page -->
<link rel="canonical" href="/product">

<!-- /product — the canonical-url destination is noindex! -->
<meta name="robots" content="noindex">
```

### ✅ Correct — canonical-url points to an indexable page

```html
<!-- /product?color=red -->
<link rel="canonical" href="/product">

<!-- /product — indexable, no noindex -->
<!-- (meta robots either absent or set to "index, follow") -->
```

### ✅ Consistent signal for pages to exclude

```html
<!-- For pages you want excluded from search: -->
<!-- Option A: noindex only (preferred — lets Google read the tag) -->
<meta name="robots" content="noindex, follow">

<!-- Option B: robots.txt block only (if the page must not be fetched) -->
<!-- Use this for pages with sensitive data or high crawl cost -->
```

## Why It Matters

- **Blocked + noindex = unresolvable**: If robots.txt blocks a URL, the `noindex` tag on that page is never read. Google knows the URL but can neither confirm nor deny it should be excluded.
- **Canonical to noindex**: Canonicalising to a `noindex` page tells Google "this is the preferred URL" while also saying "don't index it" — a contradiction.
- **Crawl budget waste**: Conflicting signals cause Google to repeatedly attempt to resolve the conflict by re-crawling the page, which is why the [robots.txt specification](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt) should be reviewed alongside page-level directives.

## Common Conflict Types

| Conflict | Effect |
|---|---|
| robots.txt blocks + `noindex` on page | `noindex` is never read |
| `noindex` in meta + `index` in X-Robots-Tag | Most restrictive wins (`noindex`) |
| Canonical → `noindex` page | Undefined behaviour; canonical-url may be ignored |
| Sitemap includes `noindex` URLs | Conflicting inclusion/exclusion signals |

## How to Audit

1. Parse your robots.txt to extract all Disallow patterns.
2. Crawl your site and, for each URL, check whether it matches a Disallow rule.
3. For matching URLs, attempt to fetch the page (to simulate what happens before the block) and check for `noindex` in the HTML or `X-Robots-Tag` header.
4. Use Google Search Console's Coverage report to find URLs in "Blocked by robots.txt" that are also receiving "noindex" signals.

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Robots meta tag, data-nosnippet, and X-Robots-Tag before treating the rule as satisfied.
- Check the implementation against Google Search Central: Robots.txt specification before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.