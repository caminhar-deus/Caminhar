# Weak Internal Links

> Detects pages with very few dofollow internal links pointing to them, indicating poor link equity distribution and crawl discoverability.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Internal links serve two purposes: they help search engines discover pages through crawling, and they distribute ranking authority (PageRank) across the site. Pages that receive few internal links are both harder to discover and treated as less important, which is why [Google's link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) and your broader [dead-end page strategy](/en/rules/seo/dead-end-pages) should be reviewed together.

## Code Example

```html
<!-- Dofollow (default) — passes PageRank -->
<a href="/target-page">Anchor text</a>

<!-- Nofollow — does NOT pass PageRank or crawl priority -->
<a href="/target-page" rel="nofollow">Anchor text</a>
```

For internal linking purposes, only **dofollow** links pass ranking signals.

## Why It Matters

Internal links are how search engines discover pages and how PageRank flows through a site — pages with few internal links are effectively demoted in the crawl priority queue. Google's overview of [how crawling works](https://developers.google.com/search/docs/fundamentals/how-search-works) is useful context here because weak inlinks usually mean the page is both under-discovered and under-supported.

## Link Strength Thresholds

| Internal Links Pointing to Page | Assessment |
|--------------------------------|-----------|
| 0 | Orphan page — may not be crawled |
| 1 | Very weak — crawlable but low priority |
| 2–4 | Moderate — acceptable for supporting content |
| 5+ | Good — meaningful signal of page importance |
| 10+ | Strong — appropriate for key money pages |

## Finding Weak Pages

1. **Crawl the site** and build an inlink count for every URL
2. **Filter pages with inlinks ≤ 1** that are indexable (no noindex, no blocked)
3. **Cross-reference** with Google Search Console impressions/clicks to identify valuable underlinked pages
4. **Prioritize** pages that rank on page 2–3 of Google results — a few more internal links may push them to page 1

## Adding Internal Links Strategically

#

## ✅ Effective Internal Linking

```html
<!-- On a high-authority page like the blog index or homepage -->
<p>
  We've published a comprehensive guide on
  <a href="/guides/core-web-vitals-optimization">Core Web Vitals optimization</a>
  that covers all three metrics.
</p>
```

- Anchor text is descriptive and keyword-relevant, which aligns with the same keyword-context principles behind [strong internal links](/en/rules/seo/internal-links)
- Link placed in body content (not footer/nav, which are weighted less)
- The linking page is itself well-linked and authoritative

### ❌ Weak Internal Link Patterns

```html
<!-- Footer link — lower crawl/PageRank weight than body content -->
<footer>
  <a href="/guides/core-web-vitals-optimization">Core Web Vitals</a>
</footer>

<!-- Generic anchor text — misses keyword signal -->
<a href="/guides/core-web-vitals-optimization">Click here</a>

<!-- Nofollow internal link — passes no PageRank -->
<a href="/important-page" rel="nofollow">Important Page</a>
```

## Cornerstone Content Strategy

Identify 5–10 "cornerstone" pages (your most important content) and systematically link to them from related posts/pages. This creates a hub-and-spoke architecture where authority concentrates on your most valuable pages.

```
Homepage
  ↓
/guides/seo-fundamentals (cornerstone)
  ↑ ↑ ↑ ↑ ↑
/blog/title-tag-tips
/blog/meta-description-guide
/blog/robots-txt-explained
/blog/sitemap-best-practices
/blog/canonical-urls
```

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