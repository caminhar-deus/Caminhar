# Create and submit an XML sitemap

> An XML sitemap is available at /sitemap.xml and includes all important pages.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
XML sitemaps help search engines discover and index all your pages.

## Code Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2024-01-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

## Why It Matters

Search engines may not discover all your pages through links alone—a sitemap ensures every important page gets indexed, especially for large or newly launched sites.

## Sitemap Elements

| Element | Purpose | Required |
|---------|---------|----------|
| `loc` | Full URL of the page | Yes |
| `lastmod` | Last modification date | Recommended |
| `changefreq` | Update frequency hint | Optional |
| `priority` | Relative importance (0.0-1.0) | Optional |

## Next.js Dynamic Sitemap

```typescript
// app/sitemap.ts

  const baseUrl = 'https://example.com'

  // Static pages
  const staticPages = [
    '',
    '/about',
    '/contact',
    '/pricing',
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }))

  // Dynamic pages from database
  const products = await getProducts()
  const productPages = products.map(product => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Blog posts
  const posts = await getPosts()
  const blogPages = posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...productPages, ...blogPages]
}
```

## Large Sites: Sitemap Index

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
    <lastmod>2024-01-15</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-products.xml</loc>
    <lastmod>2024-01-14</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-blog.xml</loc>
    <lastmod>2024-01-13</lastmod>
  </sitemap>
</sitemapindex>
```

```typescript
// app/sitemap.ts - Multiple sitemaps

  const productCount = await getProductCount()
  const numSitemaps = Math.ceil(productCount / 50000)

  return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }))
}

  id,
}: {
  id: number
}): Promise ({
    url: `https://example.com/products/${product.slug}`,
    lastModified: product.updatedAt,
  }))
}
```

## Priority Guidelines

| Page Type | Suggested Priority |
|-----------|-------------------|
| Homepage | 1.0 |
| Main category pages | 0.8-0.9 |
| Product/service pages | 0.7-0.8 |
| Blog posts | 0.5-0.7 |
| Legal pages | 0.3-0.5 |
| Archive/tag pages | 0.3-0.4 |

## Reference in robots.txt

```text
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

## Image Sitemap Extension

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://example.com/products/widget</loc>
    <image:image>
      <image:loc>https://example.com/images/widget.jpg</image:loc>
      <image:title>Widget Product Photo</image:title>
    </image:image>
    <image:image>
      <image:loc>https://example.com/images/widget-side.jpg</image:loc>
      <image:title>Widget Side View</image:title>
    </image:image>
  </url>
</urlset>
```

## Submit to Search Engines

```bash
# Google Search Console
# 1. Go to https://search.google.com/search-console
# 2. Select property
# 3. Sitemaps → Add new sitemap
# 4. Enter: sitemap.xml

# Bing Webmaster Tools
# 1. Go to https://www.bing.com/webmasters
# 2. Submit sitemap URL

# Programmatic submission (ping)
curl "https://www.google.com/ping?sitemap=https://example.com/sitemap.xml"
curl "https://www.bing.com/ping?sitemap=https://example.com/sitemap.xml"
```

## What NOT to Include

| Exclude | Reason |
|---------|--------|
| Noindex pages | Won't be indexed anyway |
| Duplicate content | May cause issues |
| 404/error pages | Bad user experience |
| Login-required pages | Can't be indexed |
| Parameter variations | Use canonical URLs |

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Verification

### Automated Checks

- Validate XML format with online validators
- Check Google Search Console sitemap status

### Manual Checks

- Access sitemap at yourdomain.com/sitemap.xml
- Verify all important pages are included
- Ensure URLs match canonical-url versions