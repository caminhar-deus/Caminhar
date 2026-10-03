# Show published and updated dates

> Checks for published and modified dates on content pages

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Showing when content was published and last updated is a trust signal for readers and a freshness signal for search engines. [Google's Article structured data guidance](https://developers.google.com/search/docs/appearance/structured-data/article) and your broader [freshness signal strategy](/en/rules/seo/freshness) both depend on these dates being visible and machine-readable.

## Code Examples

#

## ❌ Avoid — no date markup

```html
<article>
  <h1>How to Optimise Core Web Vitals</h1>
  <p>Last updated March 2024</p>
  <!-- No machine-readable date; Google cannot reliably parse this -->
</article>
```

### ✅ Correct — visible date with machine-readable markup

```html
<article>
  <h1>How to Optimise Core Web Vitals</h1>
  <p>Published <time datetime="2024-03-15">March 15, 2024</time>
     · Updated <time datetime="2024-11-20">November 20, 2024</time></p>
</article>
```

### ✅ Article JSON-LD with dates

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Optimise Core Web Vitals",
  "datePublished": "2024-03-15T10:00:00Z",
  "dateModified": "2024-11-20T14:30:00Z",
  "author": { "@type": "Person", "name": "Jane Smith" }
}
</script>
```

### ✅ Open Graph article times in `<head>`

```html
<meta property="article:published_time" content="2024-03-15T10:00:00Z">
<meta property="article:modified_time" content="2024-11-20T14:30:00Z">
```

## Why It Matters

- **Freshness ranking**: Google rewards fresh content for time-sensitive queries. Accurate `dateModified` helps Google assess how current your content is, especially when it matches the same freshness signals surfaced in [Schema.org's `dateModified`](https://schema.org/dateModified).
- **Snippet dates**: Google shows publication dates next to search results. Without structured markup, it guesses from page text — often incorrectly.
- **User trust**: Readers evaluate whether information is current before clicking. A visible date reduces bounce rate from people who find content too old.

## What to Check

For every article, blog post, or news page, verify:
1. A visible `<time>` element with a `datetime` attribute in the byline
2. `datePublished` and `dateModified` in the page's Article JSON-LD
3. Optional but helpful: Open Graph `article:published_time` and `article:modified_time`

## How to Fix Missing Dates

1. Identify all article and blog pages that lack a visible or structured date.
2. Add a `<time datetime="...">` element to each article template.
3. Update your Article JSON-LD template to include `datePublished` and `dateModified`.
4. Ensure your CMS stores and exposes both dates, and that `dateModified` updates on substantive edits.
5. Validate with [Google's Rich Results Test](https://search.google.com/test/rich-results).

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Article structured data before treating the rule as satisfied.
- Check the implementation against Schema.org: dateModified before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.