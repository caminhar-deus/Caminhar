# Add internal links to key pages

> Validates that key pages receive adequate internal links from other site pages

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Internal links do two things: they help Googlebot discover and navigate your site, and they pass PageRank from one page to another. [Google's crawlable-link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) and a deliberate [anchor-text strategy](/en/rules/seo/anchor-text) both matter when deciding which pages should receive the strongest internal support.

## Code Examples

#

## ❌ Avoid — generic anchor text

```html
<p>We have written about CSS Grid.
   <a href="/blog/css-grid-guide">Click here</a> to read more.</p>
<!-- "Click here" provides no keyword context to Google -->
```

### ❌ Avoid — important page never linked internally

```html
<!-- /ultimate-css-grid-guide exists but no other page links to it -->
<!-- Google will find it only from the sitemap, not from contextual links -->
```

### ✅ Correct — descriptive anchor text in context

```html
<p>For a two-dimensional layout,
   <a href="/blog/css-grid-guide">CSS Grid</a> is more powerful than
   <a href="/blog/css-flexbox-guide">Flexbox</a> for complex page structures.</p>
```

### ✅ Correct — related articles section at end of post

```html
<aside aria-label="Related articles">
  <h2>Related Articles</h2>
  <ul>
    <li><a href="/blog/css-grid-guide">The Complete CSS Grid Guide</a></li>
    <li><a href="/blog/responsive-design">Responsive Design with CSS</a></li>
    <li><a href="/blog/layout-patterns">Modern CSS Layout Patterns</a></li>
  </ul>
</aside>
```

### ✅ Pillar page linking to cluster pages (topic cluster model)

```html
<!-- Pillar page: /css-guide -->
<article>
  <h1>The Complete CSS Guide</h1>
  <p>CSS offers several layout systems. Our detailed guides cover:</p>
  <ul>
    <li><a href="/css-guide/flexbox">CSS Flexbox — Complete Reference</a></li>
    <li><a href="/css-guide/grid">CSS Grid — Complete Reference</a></li>
    <li><a href="/css-guide/animations">CSS Animations and Transitions</a></li>
  </ul>
</article>
```

## Why It Matters

- **PageRank distribution**: Every internal link passes a portion of the source page's authority to the target. Pages with more links from high-authority pages rank better, which is why [Google's explanation of crawling and ranking](https://developers.google.com/search/docs/fundamentals/how-search-works#ranking) still matters in modern audits.
- **Discovery**: Googlebot discovers most pages through links. Pages with no internal links are effectively hidden from crawlers and often turn into [orphan pages](/en/rules/seo/orphan-pages).
- **Anchor text signals**: The clickable text of an internal link provides keyword context about the destination page's topic.

## Link Types and Their Value

| Link type | Relative value | Notes |
|---|---|---|
| Contextual inline (body) | Highest | Relevant, editorial links in content |
| Related articles section | High | Contextual but structured |
| Top navigation | Medium | Sitewide links pass authority broadly |
| Footer links | Lower | Sitewide; lower editorial weight |
| Sidebar links | Medium | Contextual to page section |

## How to Audit Internal Links

1. Crawl your site and build an internal link graph (source URL → destination URL + anchor text).
2. Compute in-degree (incoming link count) for each page.
3. Sort by in-degree ascending — the bottom pages are your most under-linked.
4. Cross-reference with your most important pages (by revenue, traffic target, or content investment).
5. For each under-linked important page, find 3–5 existing pages with relevant content and add contextual links.
6. Measure in-degree again after 1–2 crawl cycles to confirm improvement.

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Links — crawlable links before treating the rule as satisfied.
- Check the implementation against Google SEO Starter Guide: Use anchor text before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.