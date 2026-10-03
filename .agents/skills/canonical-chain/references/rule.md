# Avoid redirect chains on canonical URLs

> Ensures that canonical tags point directly to the final destination URL without intermediate redirects.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
The canonical tag should be a definitive signal to search engines. Adding redirects into the mix creates ambiguity and reduces the tag's effectiveness.

## Code Example

```html
<!-- ❌ Bad: Canonical points to a URL that redirects -->
<!-- http://example.com/page-a (Redirects) -> http://example.com/page-b (Final) -->
<link rel="canonical" href="http://example.com/page-a">

<!-- ✅ Good: Canonical points directly to the final destination -->
<link rel="canonical" href="http://example.com/page-b">
```

## Why It Matters

- **Indexing Accuracy**: Ensures that search engines index exactly the version of the page you intend.
- **Crawl Efficiency**: Reduces the number of steps a bot has to take to find the "source of truth" for a page.
- **Signal Strength**: A direct canonical-url link provides a much stronger signal for consolidating link equity (PageRank).
- **Page Load Speed**: While primarily for bots, ensuring your primary URLs don't redirect is good practice for overall site performance.

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