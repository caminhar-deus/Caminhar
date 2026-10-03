# Write a descriptive page title

> Validates page title presence and length

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
The `<title>` tag is the single most important on-page SEO element. It appears in browser tabs, bookmarks, and as the headline in search result listings.

## Code Examples

```html
<!-- ✅ Good: Descriptive, ~55 chars, keyword-first -->
<head>
  <title>Sourdough Bread Recipe — Step-by-Step Guide | BakeCo</title>
</head>
```

```html
<!-- ❌ Bad: Too short and non-descriptive -->
<head>
  <title>Page</title>
</head>

<!-- ❌ Bad: Keyword-stuffed -->
<head>
  <title>Bread Bread Recipes Bread Baking Best Bread</title>
</head>
```

## Why It Matters

The &lt;title&gt; tag is the most prominent element in search result listings and browser tabs—it directly influences click-through rates and is a confirmed Google ranking signal.

## Character Length Guidelines

| Length | Result |
|--------|--------|
| < 10 characters | Too short — not descriptive |
| 10–60 characters | Ideal — displays fully in SERPs |
| 61–70 characters | May be truncated |
| > 70 characters | Truncated in most search results |

Note: Google measures in pixels (~600px max), so exact character count varies with the characters used.

## Title Patterns by Page Type

| Page Type | Pattern | Example |
|-----------|---------|---------|
| Homepage | Brand name + tagline | `BakeCo – Artisan Bread Recipes` |
| Blog post | Topic + Brand | `How to Score Sourdough | BakeCo` |
| Product page | Product name + key attribute | `Cast Iron Dutch Oven 5.5 Qt – BakeCo` |
| Category | Category name + Brand | `Sourdough Recipes | BakeCo` |

## Next.js Implementation

```tsx
// app/blog/[slug]/page.tsx

  const post = await getPost(params.slug)
  return {
    title: `${post.title} | BakeCo`,
  }
}
```

```tsx
// app/layout.tsx — default title template

  title: {
    template: '%s | BakeCo',
    default: 'BakeCo – Artisan Bread Recipes',
  },
}
```

## Common Mistakes

```html
<!-- ❌ Bad: Missing title entirely -->
<head>
  <meta charset="UTF-8" />
  <!-- no <title> -->
</head>

<!-- ✅ Good: Unique title per page -->
<head>
  <title>Sourdough Starter Guide | BakeCo</title>
</head>

<!-- ❌ Bad: Same title on every page -->
<head>
  <title>BakeCo</title>  <!-- used on every page -->
</head>
```

## Exceptions

- Utility or intentionally noindex pages may keep minimal metadata when richer search presentation is not a goal.
- Template-driven pages can look repetitive in isolation; confirm the fully rendered production output before flagging duplication or omission.
- If a page is intentionally redirected or excluded from indexation, resolve that crawlability decision before treating metadata polish as the primary issue.

## Verification

### Automated Checks

- View page source and search for `<title>`
- Check SERP preview with a tool like [SERP Simulator](https://serpsim.com/)
- Use Google Search Console → Coverage → check for duplicate title warnings

### Manual Checks

- Verify character count (aim for 50–60)