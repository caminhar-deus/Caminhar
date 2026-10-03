# Use hyphens in URLs

> Checks that URL slugs use hyphens as word separators, not underscores or spaces

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Google explicitly recommends hyphens over underscores as word separators in URLs. This is because Google's tokeniser treats hyphens as word breaks and underscores as word joiners.

## Code Examples

#

## ❌ Avoid — underscores in URL slugs

```
/blog/seo_best_practices
/products/product_name_here
/docs/api_reference_guide
```

### ❌ Avoid — spaces or encoded spaces

```
/blog/seo best practices        (invalid)
/blog/seo%20best%20practices    (browsers handle but not ideal)
/blog/seo+best+practices        (query string convention, not path)
```

### ✅ Correct — hyphens throughout

```
/blog/seo-best-practices
/products/product-name-here
/docs/api-reference-guide
```

### ✅ Slug generation function

```js
function toSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // Remove special characters
    .replace(/[\s_]+/g, '-')    // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '')    // Remove leading/trailing hyphens
}

toSlug('SEO Best Practices (2024)') // → 'seo-best-practices-2024'
toSlug('API_Reference_Guide')       // → 'api-reference-guide'
```

### ✅ 301 redirect for underscore to hyphen migration

```nginx
# Nginx: redirect underscore URLs to hyphenated equivalents
rewrite ^/blog/(.*)_(.*)$ /blog/$1-$2 permanent;

# Or use a more general map approach
map $uri $new_uri {
  ~/blog/seo_best_practices  /blog/seo-best-practices;
}
```

```js
// Next.js: redirects in next.config.js
module.exports = {
  async redirects() {
    return [
      {
        source: '/blog/seo_best_practices',
        destination: '/blog/seo-best-practices',
        permanent: true,
      },
    ]
  },
}
```

## Why It Matters

- **Keyword matching**: `/best-seo-practices` matches queries for "best seo practices", "seo practices", and "best practices". `/best_seo_practices` matches only "best_seo_practices" as a compound token.
- **Readability**: Hyphenated URLs are easier to read, copy, and share, which affects click-through rates.
- **Consistency**: Mixing separators (some with hyphens, some with underscores) creates duplicate content risk.

## Migration Checklist

When migrating from underscores to hyphens:
1. Export all current underscore URLs from your sitemap or crawl
2. Generate the hyphenated equivalents
3. Implement 301 redirects for each old URL
4. Update all internal links to use the new URLs
5. Update the sitemap.xml
6. Request re-indexing in Google Search Console
7. Monitor for 404s in Search Console for 3–4 weeks post-migration

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.