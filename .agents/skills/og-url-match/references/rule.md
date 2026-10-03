# OG URL Match

> Checks that og:url matches canonical URL

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
`og:url` defines the canonical identifier for a page as understood by social platforms. It should always match the `<link rel="canonical">` tag.

## Code Example

When a page is shared via different URL variants (with UTM parameters, session IDs, or www vs non-www differences), each variant gets its own share count unless `og:url` unifies them to a single URL.

```
User A shares: https://example.com/blog/post?utm_source=twitter  → 45 shares
User B shares: https://example.com/blog/post                     → 23 shares
User C shares: https://www.example.com/blog/post                 → 12 shares
```

Total: 80 shares, but Facebook shows 45, 23, and 12 separately.

## Why It Matters

When og:url doesn't match the canonical URL, social platforms track share counts separately for each URL variant—published share counts get split across multiple URLs and appear lower than they actually are.

## Correct Implementation

```html
<!-- ✅ Good: og:url matches canonical-url exactly -->
<head>
  <link rel="canonical" href="https://example.com/blog/sourdough-recipe" />
  <meta property="og:url" content="https://example.com/blog/sourdough-recipe" />
</head>
```

```html
<!-- ❌ Bad: og:url has tracking params that canonical-url doesn't -->
<head>
  <link rel="canonical" href="https://example.com/blog/sourdough-recipe" />
  <meta property="og:url" content="https://example.com/blog/sourdough-recipe?utm_source=homepage" />
</head>

<!-- ❌ Bad: og:url uses www, canonical-url doesn't -->
<head>
  <link rel="canonical" href="https://example.com/blog/sourdough-recipe" />
  <meta property="og:url" content="https://www.example.com/blog/sourdough-recipe" />
</head>

<!-- ❌ Bad: og:url uses HTTP, canonical-url uses HTTPS -->
<head>
  <link rel="canonical" href="https://example.com/blog/sourdough-recipe" />
  <meta property="og:url" content="http://example.com/blog/sourdough-recipe" />
</head>
```

## Next.js Implementation

```tsx
// app/blog/[slug]/page.tsx

  const post = await getPost(params.slug)
  const canonicalUrl = `https://example.com/blog/${params.slug}`

  return {
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      url: canonicalUrl,   // ← must match canonical-url
      title: post.title,
      description: post.excerpt,
    },
  }
}
```

## Checklist

| Check | Expected |
|-------|----------|
| Protocol | Both use `https://` |
| Domain | Both use same domain (www or non-www) |
| Path | Identical paths |
| Query string | Neither has tracking parameters |
| Trailing slash | Consistent between both |

## Exceptions

- Utility or intentionally noindex pages may keep minimal metadata when richer search presentation is not a goal.
- Template-driven pages can look repetitive in isolation; confirm the fully rendered production output before flagging duplication or omission.
- If a page is intentionally redirected or excluded from indexation, resolve that crawlability decision before treating metadata polish as the primary issue.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against The Open Graph Protocol before treating the rule as satisfied.
- Check the implementation against Facebook: Sharing best practices before treating the rule as satisfied.

## Verification

### Automated Checks

- View page source — compare `og:url` content and `canonical` href manually
- Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) — shows the resolved og:url
- Use a site crawler (Screaming Frog) to export both fields and compare them in bulk

### Manual Checks

- Review representative live pages manually and confirm there is no stronger conflicting signal that changes the intended SEO outcome.