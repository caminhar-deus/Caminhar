# Keep page titles unique

> Checks that the <title> tag is unique across all pages of the site to avoid duplicate title SEO issues.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
The `<title>` tag is the primary on-page signal for what a page is about. [Google's title link guidance](https://developers.google.com/search/docs/appearance/title-link) makes it clear that duplicate titles tell search engines multiple pages cover the same topic, forcing them to pick one arbitrarily and creating the same ambiguity this rule is meant to eliminate.

## Code Example

```html
<!-- Homepage -->
<title>Buy Running Shoes Online | ShoeShop</title>

<!-- Category page -->
<title>Women's Trail Running Shoes | ShoeShop</title>

<!-- Product page -->
<title>Brooks Ghost 16 Women's Running Shoe | ShoeShop</title>

<!-- Blog post -->
<title>How to Choose Running Shoes for Flat Feet | ShoeShop Blog</title>
```

## Why It Matters

Duplicate titles prevent Google from determining which page is the authoritative result for a given query, splitting ranking signals and reducing total organic visibility. They also make it harder to write a strong [page title strategy](/en/rules/seo/meta-title) that aligns with the snippet and title-link expectations Google documents in [Search results title and description controls](https://developers.google.com/search/docs/appearance/snippet).

## ❌ Duplicate Title Patterns

```html
<!-- All category pages share the same template without a unique element -->
<title>Category | ShoeShop</title>   <!-- /shoes -->
<title>Category | ShoeShop</title>   <!-- /boots -->
<title>Category | ShoeShop</title>   <!-- /sandals -->

<!-- CMS default not overridden -->
<title>Untitled | MyWebsite</title>
<title>Home | MyWebsite</title>   <!-- Used on 12 pages -->
```

## Title Best Practices

| Criterion | Recommendation |
|-----------|---------------|
| Length | 50–60 characters (truncated at ~580 px in results) |
| Uniqueness | Every page must have a distinct title |
| Keyword placement | Put the primary keyword near the start |
| Brand inclusion | Append brand at the end: `Topic | Brand` |
| Avoid keyword stuffing | One clear topic, not a comma-separated list of keywords |

## Dynamic Title Generation

#

## Next.js (App Router)

```tsx
// app/products/[slug]/page.tsx

  const product = await getProduct(params.slug)
  return {
    title: `${product.name} | ShoeShop`,
  }
}
```

### WordPress

Use SEO plugins (Yoast, RankMath) with per-page title templates that include the post/page title dynamically so the rendered title stays unique without drifting away from the page's H1 and search intent.

## Finding Duplicates

1. Crawl the site with Screaming Frog or a sitemap-based crawler
2. Export `<title>` values and use Excel/Sheets "COUNTIF" to find values appearing more than once
3. Google Search Console → Pages → filter by "Duplicate, Google chose different canonical-url"

## Exceptions

- Utility or intentionally noindex pages may keep minimal metadata when richer search presentation is not a goal.
- Template-driven pages can look repetitive in isolation; confirm the fully rendered production output before flagging duplication or omission.
- If a page is intentionally redirected or excluded from indexation, resolve that crawlability decision before treating metadata polish as the primary issue.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.