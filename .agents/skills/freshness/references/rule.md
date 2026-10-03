# Show content freshness signals

> Checks for last-modified and published date signals that help Google assess content currency

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Content freshness is a ranking factor for time-sensitive queries. [Google's ranking systems guide](https://developers.google.com/search/docs/appearance/ranking-systems-guide) and the visible date patterns in [content-date markup](/en/rules/seo/content-dates) work best together, ensuring Google can recognize a real update instead of inferring one.

## Code Examples

#

## ❌ Avoid — no freshness signals

```html
<!-- No JSON-LD dateModified, no visible date, no Last-Modified header -->
<article>
  <h1>React Hooks Best Practices</h1>
  <p>Updated this year with new examples...</p>
</article>
```

### ✅ Correct — full freshness stack

```html
<!-- In <head> -->
<meta property="article:published_time" content="2022-06-01T09:00:00Z">
<meta property="article:modified_time" content="2024-11-15T14:00:00Z">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "datePublished": "2022-06-01T09:00:00Z",
  "dateModified": "2024-11-15T14:00:00Z"
}
</script>

<!-- In article body -->
<article>
  <p class="byline">
    Published <time datetime="2022-06-01">June 1, 2022</time>
    · Last updated <time datetime="2024-11-15">November 15, 2024</time>
  </p>
  <h1>React Hooks Best Practices</h1>
</article>
```

### ✅ Nginx Last-Modified header configuration

```nginx
location ~* \.(html|htm)$ {
    add_header Last-Modified $date_gmt;
    add_header Cache-Control "public, must-revalidate";
}
```

### ✅ Next.js — updating dateModified in frontmatter

```ts
// In your MDX/content file frontmatter
---
title: "React Hooks Best Practices"
publishedAt: "2022-06-01"
updatedAt: "2024-11-15"  // Update this when content substantially changes
---

// In page component — generate Article JSON-LD
const articleSchema = {
  '@type': 'Article',
  datePublished: frontmatter.publishedAt,
  dateModified: frontmatter.updatedAt,
}
```

## Why It Matters

- **QDF boost**: Google elevates fresh content for queries where recency matters (news, product releases, tutorials, regulations).
- **Accurate dating**: Without machine-readable dates, Google guesses from HTML text — often displaying wrong dates in search snippets.
- **Competitive edge**: For evergreen content you periodically update, surfacing the `dateModified` means Google sees your updated version as more authoritative than stale competitors, particularly when the page also shows [published and updated dates](/en/rules/seo/content-dates) clearly to users.

## Freshness Signal Hierarchy

Google reads freshness signals in this approximate order:
1. `dateModified` in Article/BlogPosting JSON-LD
2. `Last-Modified` HTTP response header
3. `article:modified_time` Open Graph tag
4. Visible date text parsed from the page body (least reliable)

## Best Practices

- Update `dateModified` only when content **substantively** changes — adding a new section, updating statistics, fixing inaccuracies.
- Do not update `dateModified` on every deploy or for minor formatting changes — Google may penalise artificially refreshed dates.
- Ensure all three signals (JSON-LD, HTTP header, visible date) are consistent with each other.

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Ranking systems guide before treating the rule as satisfied.
- Check the implementation against Schema.org: dateModified before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.