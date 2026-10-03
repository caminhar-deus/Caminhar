# Set canonical URLs for all pages

> A canonical URL tag is present to prevent duplicate content issues.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
Canonical URLs prevent duplicate content issues by specifying the preferred page version. [Google's canonicalization guidance](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) works best when URL normalization rules such as [lowercase paths](/en/rules/seo/lowercase) and trailing-slash policy already point to the same preferred URL.

## Code Example

```html
<head>
  <link rel="canonical" href="https://example.com/products/widget" />
</head>
```

## Why It Matters

Duplicate content from URL parameters, www vs non-www, or pagination dilutes ranking signals. Canonical tags consolidate those signals to the preferred URL, but they also need to stay consistent with broader [canonical-chain cleanup](/en/rules/seo/canonical-chain).

## When to Use Canonical Tags

| Scenario | Example | Canonical To |
|----------|---------|--------------|
| URL parameters | `?sort=price&page=1` | Base URL |
| HTTP vs HTTPS | `http://` and `https://` | HTTPS version |
| www vs non-www | Both exist | Preferred version |
| Trailing slash | `/page` and `/page/` | Consistent version |
| Syndicated content | Same content on multiple sites | Original source |

## Next.js Implementation

```tsx
// app/products/[slug]/page.tsx

interface Props {
  params: { slug: string }
}

  return {
    alternates: {
      canonical: `https://example.com/products/${params.slug}`,
    },
  }
}
```

```tsx
// pages/products/[slug].tsx (Pages Router)

  const router = useRouter()
  const canonicalUrl = `https://example.com${router.asPath.split('?')[0]}`

  return (
    
      <link rel="canonical" href={canonicalUrl} />
    
  )
}
```

## Dynamic Canonical URLs

```tsx
// Handle pagination and filters
function getCanonicalUrl(path: string, page?: number): string {
  const baseUrl = 'https://example.com'

  // Remove query parameters for canonical-url
  const cleanPath = path.split('?')[0]

  // Include page number for paginated content
  if (page && page > 1) {
    return `${baseUrl}${cleanPath}?page=${page}`
  }

  return `${baseUrl}${cleanPath}`
}
```

## Common Mistakes

```html
<!-- ❌ Bad: Relative URL -->
<link rel="canonical" href="/products/widget" />

<!-- ✅ Good: Absolute URL -->
<link rel="canonical" href="https://example.com/products/widget" />

<!-- ❌ Bad: Wrong protocol -->
<link rel="canonical" href="http://example.com/products/widget" />

<!-- ✅ Good: HTTPS protocol -->
<link rel="canonical" href="https://example.com/products/widget" />

<!-- ❌ Bad: Includes tracking parameters -->
<link rel="canonical" href="https://example.com/products/widget?utm_source=google" />

<!-- ✅ Good: Clean URL -->
<link rel="canonical" href="https://example.com/products/widget" />
```

## Self-Referencing Canonicals

```tsx
// Every page should have a canonical-url, even if self-referencing
function PageHead({ path }: { path: string }) {
  const canonicalUrl = `https://example.com${path}`

  return (
    <head>
      <link rel="canonical" href={canonicalUrl} />
    </head>
  )
}
```

## Cross-Domain Canonicals

```html
<!-- When content is syndicated to partner sites -->
<!-- On partner site: -->
<link rel="canonical" href="https://original-site.com/article" />

<!-- Original site should NOT link to partner -->
```

## Canonical vs Redirects

| Use Canonical When | Use 301 Redirect When |
|-------------------|----------------------|
| Same content, different parameters | Permanent page move |
| Content syndication | Domain migration |
| Print versions of pages | URL structure change |
| Session IDs in URLs | HTTP to HTTPS migration |

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Verification

### Automated Checks

- View page source—verify canonical tag is present
- Check that canonical URL is absolute with HTTPS
- Use [Google Search Console](https://search.google.com/search-console/about) URL Inspection
- Test with [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/) or a similar crawler

### Manual Checks

- Verify canonical-url matches preferred URL version