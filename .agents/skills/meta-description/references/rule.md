# Write a meta description for each page

> Validates meta description presence and length

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
The meta description is the short paragraph shown beneath your page title in search results. While not a direct ranking signal, it is your primary organic ad copy.

## Code Examples

```html
<!-- ✅ Good: Unique, 145 characters, describes value clearly -->
<head>
  <meta name="description" content="Learn to bake sourdough bread at home with our step-by-step guide. Covers starter, shaping, scoring, and baking in a Dutch oven." />
</head>
```

```html
<!-- ❌ Bad: Missing description -->
<head>
  <title>Sourdough Bread Recipe | BakeCo</title>
  <!-- no meta description -->
</head>

<!-- ❌ Bad: Identical description on every page -->
<head>
  <meta name="description" content="BakeCo – the best baking website." />
</head>
```

## Why It Matters

A compelling meta description acts as organic ad copy in search results—well-written descriptions improve click-through rates even though they are not a direct ranking signal.

## Length Guidelines

| Length | Result |
|--------|--------|
| < 70 characters | Too short — wasted opportunity |
| 120–160 characters | Ideal for desktop SERPs |
| > 160 characters | Truncated with "…" |

Google measures in pixels (~920px max for desktop), so exact character limits vary.

## Writing Effective Descriptions

- **Answer the user's intent**: What problem does this page solve?
- **Include a natural CTA**: "Learn how to…", "Discover…", "Shop our…"
- **Avoid keyword stuffing**: Write for users, not robots
- **Match the page**: Google may replace your description if it doesn't match the query

## Next.js Implementation

```tsx
// app/blog/[slug]/page.tsx

  const post = await getPost(params.slug)
  return {
    description: post.excerpt.slice(0, 155),
  }
}
```

```tsx
// app/layout.tsx — site-wide fallback

  description: 'BakeCo – Step-by-step artisan bread recipes for home bakers.',
}
```

## Common Mistakes

```html
<!-- ❌ Bad: Content attribute missing -->
<meta name="description" />

<!-- ❌ Bad: HTML tags inside description -->
<meta name="description" content="<b>Best</b> sourdough recipes" />

<!-- ✅ Good: Plain text, clear value -->
<meta name="description" content="Master sourdough at home. Our guide walks you through every stage, from building a starter to your first perfect loaf." />
```

## Exceptions

- Utility or intentionally noindex pages may keep minimal metadata when richer search presentation is not a goal.
- Template-driven pages can look repetitive in isolation; confirm the fully rendered production output before flagging duplication or omission.
- If a page is intentionally redirected or excluded from indexation, resolve that crawlability decision before treating metadata polish as the primary issue.

## Verification

### Automated Checks

- View page source and search for `name="description"`
- Use Google Search Console → Enhancements → check for missing or duplicated descriptions
- Use Google's Rich Results Test to verify metadata is readable

### Manual Checks

- Preview with a SERP simulator to check truncation