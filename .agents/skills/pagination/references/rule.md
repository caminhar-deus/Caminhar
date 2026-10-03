# Use canonicals on paginated pages

> Checks that paginated pages have proper canonicals

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
Pagination splits long content (blog archives, product grids, search results) across multiple URLs. Getting canonical tags right ensures that each page can be individually indexed, which is why pagination should be reviewed together with [canonical-url](/en/rules/seo/canonical-url) rather than treated as a generic duplicate-content problem.

## Code Example

```html
<!-- ❌ WRONG: Paginated pages all canonicalize to page 1 -->
<!-- On /products?page=2: -->
<link rel="canonical" href="https://example.com/products" />

<!-- On /products?page=3: -->
<link rel="canonical" href="https://example.com/products" />
```

This tells Google that pages 2 and 3 are duplicates of page 1. Google stops indexing them. Products only found on page 3 become unreachable from search.

## Why It Matters

Incorrect pagination canonicalization can prevent pages 2, 3, and later pages from being indexed. [Google's pagination guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls#use-case-pagination) makes it clear that later pages are not automatically duplicates of page 1.

## Correct Implementation

```html
<!-- ✅ Good: Each paginated page self-canonicalizes -->

<!-- On /products (page 1): -->
<link rel="canonical" href="https://example.com/products" />

<!-- On /products?page=2: -->
<link rel="canonical" href="https://example.com/products?page=2" />

<!-- On /products?page=3: -->
<link rel="canonical" href="https://example.com/products?page=3" />
```

## URL Pattern Consistency

Choose one pagination pattern and use it exclusively:

```
✅ /blog?page=2    (query parameter — consistent)
✅ /blog/page/2   (path segment — consistent)

❌ /blog?page=2   on some pages
❌ /blog/page/2   on other pages  (inconsistent — creates duplicates)
```

## Next.js Implementation

```tsx
// app/blog/page.tsx
interface Props {
  searchParams: { page?: string }
}

  const page = parseInt(searchParams.page || '1')
  const canonicalUrl = page === 1
    ? 'https://example.com/blog'
    : `https://example.com/blog?page=${page}`

  return {
    alternates: {
      canonical: canonicalUrl,
    },
  }
}
```

## What About rel=prev/next?

Google announced in March 2019 that they no longer use `rel="prev"` and `rel="next"` link tags as a hint for pagination. The deprecation note in [Google's Search blog](https://developers.google.com/search/blog/2019/09/google-no-longer-supports-relprex-next) is still the clearest reference for that change.

```html
<!-- Google ignores these since 2019, but other crawlers may still use them -->
<link rel="prev" href="https://example.com/blog?page=1" />
<link rel="next" href="https://example.com/blog?page=3" />
```

## Indexing Strategy

Not all paginated pages need to be indexed. Consider:

| Page | Strategy |
|------|---------|
| Page 1 | Always index |
| Pages 2–5 | Index if content is unique and valuable |
| Pages 6+ | Consider noindex for very deep pagination |
| Filtered variants | Often noindex + canonical-url to base category |

Some CMS themes automatically add noindex to all paginated pages. Check your page 2+ templates explicitly — this is a common cause of category pages being partially deindexed.

## Infinite Scroll Still Needs Crawlable Pagination

Infinite scroll is a UX enhancement, not a replacement for discoverable URLs. Provide real links such as `/blog?page=2` or `/blog/page/2` so crawlers and no-JS users can still reach later content.

```html
<!-- Visible or fallback pagination links -->
<nav aria-label="Pagination">
  <a href="/blog?page=1">1</a>
  <a href="/blog?page=2">2</a>
  <a href="/blog?page=3">3</a>
</nav>
```

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Pagination best practices before treating the rule as satisfied.
- Check the implementation against Google Blog: rel=prev/next deprecation before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.
- Disable JavaScript and confirm page 2+ content is still reachable through crawlable links or paginated URLs.