# Add internal links to orphan pages

> Detects pages with no internal links pointing to them

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
An orphan page is a page that exists on your site but receives no internal links from other pages. [Google's crawlable-links guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) explains why discovery through real links matters, and the same repair work usually overlaps with [internal-links](/en/rules/seo/internal-links).

## Code Example

```
Homepage → Category → Product A     ✅ Not an orphan
Homepage → Category → Product B     ✅ Not an orphan
                       Product C     ❌ Orphan — nothing links to it
```

Appearing in the XML sitemap does NOT make a page discoverable for PageRank purposes — only crawlable links do.

## Why It Matters

Orphan pages receive no PageRank from internal links and are rarely recrawled by Googlebot, which limits their ability to rank even when their content is excellent. A sitemap can expose the URL, but it cannot replace the authority and crawl cues passed by real internal links.

## Detection Methods

**Method 1: [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/)**
1. Crawl the site (Spider mode)
2. Go to Reports → Orphan Pages
3. Screaming Frog compares crawled pages against sitemap to identify orphans

**Method 2: Log file analysis**
Compare your server access logs (Googlebot hits) against your sitemap — pages crawled rarely or never are likely orphaned.

**Method 3: [Google Search Console](https://search.google.com/search-console)**
Pages in "Coverage" → "Excluded" with reason "Discovered – currently not indexed" are often orphans.

## Fixing Orphan Pages

#

## Add contextual links in body content

```html
<!-- ✅ On a related article: add a relevant inline link -->
<p>
  When choosing a Dutch oven, consider the volume you need.
  See our <a href="/products/dutch-oven-buying-guide">Dutch oven buying guide</a>
  for a full comparison.
</p>
```

### Add related content sections

```html
<!-- ✅ Related articles widget linking to orphan -->
<section aria-label="Related articles">
  <h2>Related Articles</h2>
  <ul>
    <li><a href="/blog/sourdough-starter-troubleshooting">Sourdough Starter Troubleshooting Guide</a></li>
  </ul>
</section>
```

### Update navigation or category pages

```html
<!-- ✅ Add orphan page to its category listing -->
<ul class="category-list">
  <li><a href="/blog/previously-orphaned-post">Article Title</a></li>
</ul>
```

## Priority Triage

Not all orphan pages need fixing:
- **Fix**: Important content pages, product pages, core blog posts
- **Ignore or delete**: Thank-you pages, one-time campaign pages, admin utilities
- **Noindex**: Pages intentionally hidden (login redirects, internal tools)

## Prevention

Build internal linking into your content workflow:
1. When publishing new content, identify 3 existing pages it relates to
2. Add links from those pages to the new content
3. Include the new page in its category or archive listing

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Links — internal and external before treating the rule as satisfied.
- Check the implementation against Google Search Central: How Googlebot crawls before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.