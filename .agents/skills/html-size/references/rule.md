# Keep HTML documents under crawl limits

> Checks HTML document size against Googlebot crawl limits

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Googlebot has a documented parse limit of approximately 15MB per HTML document. Content beyond this threshold is silently ignored. Even well below that limit, large HTML documents waste crawl budget.

## Code Examples

#

## ❌ Avoid — massive inline JSON payload

```html
<!-- Next.js pages router with too much data in getServerSideProps -->
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "allProducts": [/* 5,000 products × 2KB each = 10MB of JSON */]
    }
  }
}
</script>
```

### ✅ Fix — fetch only what you render

```ts
// pages/products/index.tsx

  // Only pass the 20 products visible on this page
  const products = await getProducts({ limit: 20, page: 1 })
  return { props: { products } }
  // Load additional pages via client-side API calls
}
```

### ❌ Avoid — inline SVG that should be an external file

```html
<!-- 200KB SVG inlined directly in HTML -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500">
  <!-- thousands of path elements... -->
</svg>
```

### ✅ Fix — external SVG file

```html
<!-- Serve as an image (cannot be styled with CSS) -->
<img src="/images/illustration.svg" alt="Product illustration" width="500" height="250">

<!-- Or as an inline SVG sprite for icons (small, reusable) -->
<svg aria-hidden="true"><use href="/icons.svg#arrow-right"></use></svg>
```

## Why It Matters

- **Index completeness**: Content after Googlebot's parse limit is not indexed.
- **Crawl budget**: Large pages take longer to fetch and parse, leaving fewer resources for other pages.
- **Core Web Vitals**: Large HTML documents delay Time to First Byte (TTFB) and Largest Contentful Paint (LCP).

## Common Causes of Oversized HTML

| Cause | Typical Size Contribution |
|---|---|
| Inline Next.js `__NEXT_DATA__` JSON | 100KB–5MB |
| Inline SVG files | 10KB–500KB each |
| Base64-encoded images | Varies (33% larger than binary) |
| Unminified `<script>` blocks | 50KB–1MB |
| Massive inline CSS (utility classes) | 50KB–300KB |

## How to Measure HTML Size

```bash
# Measure uncompressed HTML size
curl -so /dev/null -w '%{size_download}\n' https://yoursite.com/page

# Measure with Accept-Encoding to see what Googlebot receives
curl -H 'Accept-Encoding: gzip, br' -so /dev/null -w '%{size_download}\n' https://yoursite.com/page
```

Target ranges:
- Under 100KB: Excellent
- 100KB–2MB: Acceptable (investigate large sections)
- 2MB–5MB: Needs optimisation
- Over 5MB: Critical — risk of partial indexing

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.