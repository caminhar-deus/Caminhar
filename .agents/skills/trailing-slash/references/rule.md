# Use trailing slashes consistently

> Checks for consistent trailing slash usage across all URLs to avoid duplicate content and canonicalization issues.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
A trailing slash makes `/page/` different from `/page` at the HTTP level. Without consistent handling, you have two URLs serving the same content — a classic duplicate content problem.
## Code Examples

#

## Option A: Prefer no trailing slash (common for frameworks like Next.js)

```
preferred URL → 200 OK
alternate slash variant → 301 → preferred URL
```

### Option B: Prefer trailing slash (common for WordPress, Apache-based sites)

```
preferred slash URL → 200 OK
alternate no-slash variant → 301 → preferred slash URL
```

## Why It Matters

Inconsistent trailing slashes create duplicate content — Google sees `/page` and `/page/` as two separate URLs competing for the same ranking, splitting PageRank between them.

## The Problem

| URL | HTTP Status | Issue |
|-----|-------------|-------|
| `/about` | 200 OK | Content served |
| `/about/` | 200 OK | Same content — DUPLICATE |

Both versions appear in Google's index as separate pages, splitting link equity and creating canonicalization ambiguity.

## Implementation

### Next.js

```js
// next.config.js
module.exports = {
  trailingSlash: false,   // 'true' for trailing slash preference
}
```

### Nginx

```nginx
# Redirect trailing slash to no-slash
rewrite ^/(.*)/$ /$1 permanent;
```

### Apache

```apache
# Remove trailing slash
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)/$ /$1 [R=301,L]
```

## Canonical Tags

Regardless of server redirects, add canonical tags pointing to the preferred version:

```html
<!-- On https://example.com/about (preferred) -->
<link rel="canonical" href="https://example.com/about">

<!-- If the trailing slash version also serves: -->
<!-- On https://example.com/about/ -->
<link rel="canonical" href="https://example.com/about">
```

## ❌ Common Mistakes

```html
<!-- Canonical points to trailing slash but all internal links omit it -->
<link rel="canonical" href="https://example.com/about/">
<a href="/about">About</a>   <!-- Creates a redirect per navigation -->

<!-- Sitemap mixes conventions -->
<loc>https://example.com/about</loc>
<loc>https://example.com/contact/</loc>
```

## Checking Consistency

```
curl -I https://example.com/about
curl -I https://example.com/about/
```

One must return `HTTP/1.1 301` with a `Location:` header pointing to the preferred URL.

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: Trailing slashes on URLs before treating the rule as satisfied.
- Check the implementation against Google: Consolidate duplicate URLs before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.