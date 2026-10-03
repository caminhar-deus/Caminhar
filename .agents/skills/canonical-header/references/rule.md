# Sync HTML canonical tags and Link headers

> Ensures consistency between HTML rel="canonical" tags and HTTP Link canonical-url headers.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Consistency across all technical signals is crucial for ensuring search engines interpret your site's structure correctly. If the HTML canonical tag and HTTP `Link` header disagree, they create the same ambiguity addressed in [canonical URL selection](/en/rules/seo/canonical-url).

## Code Example

```bash
# ✅ Good: HTTP Header and HTML tag provide the same URL

# HTTP Response Header:
# Link: <https://example.com/target-page>; rel="canonical"

# HTML <head> section:
# <link rel="canonical" href="https://example.com/target-page">
```

## Why It Matters

- **Signal Reliability**: Consistent signals ensure that search engines trust and follow your canonicalization instructions.
- **Duplicate Content**: Prevents different versions of a page from competing with each other in search results.
- **Technical Integrity**: Reduces the likelihood of "canonical-url mismatch" errors in [Google Search Console](https://search.google.com/search-console/about) reports.
- **Predictable Indexing**: Ensures that the URL you want to rank is the one that search engines actually choose.

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Search Essentials before treating the rule as satisfied.
- Check the implementation against Google Search Central documentation before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.