# Keep URLs concise

> Checks URL length for optimal crawlability and usability

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
URL length and structure affect readability, shareability, and how easily crawlers navigate your site. [Google's URL structure guidance](https://developers.google.com/search/docs/crawling-indexing/url-structure) favors short, descriptive paths, and the same cleanup work usually overlaps with [stop-word removal](/en/rules/seo/stop-words) and other slug-hygiene rules.

## Code Examples

#

## ❌ Avoid — long slug with stop words

```
/blog/a-comprehensive-step-by-step-guide-to-the-basics-of-css-grid-layout-for-beginners
```

### ❌ Avoid — deep nesting with date components in evergreen content

```
/blog/2024/03/15/technology/css/a-guide-to-css-grid
```

### ✅ Correct — concise descriptive slug

```
/blog/css-grid-guide
```

### ✅ Correct — flat category structure

```
/css-grid-guide          (no category prefix if not needed)
/blog/css-grid           (one level of category)
/docs/css/grid-layout    (two levels for documentation is fine)
```

### ✅ Slug generation — removing stop words

```js
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at',
  'to', 'for', 'of', 'with', 'how', 'what', 'your', 'is'
])

function toSlug(title) {
  return title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => !STOP_WORDS.has(word))
    .join('-')
    .replace(/[^a-z0-9-]/g, '')
}

toSlug('A Comprehensive Guide to the Basics of CSS Grid')
// → 'comprehensive-guide-basics-css-grid'
```

### ✅ Next.js — concise dynamic routes

```ts
// Prefer flat routes:
// app/blog/[slug]/page.tsx → /blog/css-grid-guide

// Over deeply nested routes:
// app/blog/[year]/[month]/[category]/[slug]/page.tsx
// → /blog/2024/03/css/css-grid-guide
```

## Why It Matters

- **Readability**: Short URLs are easier to copy, share, and remember, leading to more organic sharing.
- **Crawl efficiency**: Deeply nested URLs signal larger crawl distance from the root, potentially reducing crawl frequency for deep pages.
- **Search snippet display**: Long URLs are truncated in search results, making the displayed breadcrumb less informative and often creating the same usability issues as inconsistent [lowercase URL handling](/en/rules/seo/lowercase).

## URL Length Guidelines

| Path length | Status |
|---|---|
| Under 60 characters | Ideal |
| 60–100 characters | Acceptable |
| 100–150 characters | Consider shortening |
| Over 150 characters | Shorten |

## When to Use Dates in URLs

Include dates in URLs only for content where the date is a meaningful identifier:
- News articles: `/news/2024-03-15/budget-announcement`
- Event coverage: `/events/2024/react-conf-recap`

For evergreen tutorials, guides, and documentation, omit dates — they signal that content may become outdated.

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: URL structure best practices before treating the rule as satisfied.
- Check the implementation against Google SEO Starter Guide before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.