# Reduce Time to First Byte (TTFB)

> Measures and optimizes server response time (TTFB) to ensure a fast initial response

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Time to First Byte (TTFB) is the time it takes for a user's browser to receive the first byte of page content from the server. It includes the network latency and the server's processing time.

## Code Examples

#

## Setting Cache Headers
```javascript
// ✅ Good: Use Cache-Control to reduce TTFB for static content
res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
```

### Optimizing Database Queries (SQL)
```sql
-- ❌ Bad: Selecting everything
SELECT * FROM users WHERE active = true;

-- ✅ Good: Selecting only what's needed and using indexes
SELECT id, name, email FROM users WHERE active = true;
```

### Using a CDN (Next.js Example)
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['cdn.example.com'],
  },
}
```

## Why It Matters

- **Foundational Metric**: Everything else in the page load process waits for the first byte to arrive.
- **User Perception**: A high TTFB causes users to see a blank screen or loading spinner for longer, leading to frustration.
- **SEO Impact**: Search engines like Google use TTFB as part of their ranking algorithms, particularly for Core Web Vitals.
- **Server Load**: Optimizing TTFB often means reducing the server's resource usage, which can save on infrastructure costs.

## Best Practices

✅ **Leverage CDN Caching**: Cache as much as possible at the edge to avoid hitting your origin server.
✅ **Optimize Server Logic**: Profile your backend code to find and fix slow functions.
✅ **Efficient Database Access**: Ensure your database queries are optimized and indexed correctly.
✅ **Static Site Generation (SSG)**: For content that doesn't change often, use SSG to serve static files instantly.

## Tools & Validation

- [Lighthouse](https://developers.google.com/web/tools/lighthouse) (check for "server-response-time")
- [PageSpeed Insights](https://pagespeed.web.dev/)
- Browser DevTools Network tab (look at the "TTFB" in the timing breakdown)
- [WebPageTest](https://www.webpagetest.org/)
- [KeyCDN TTFB Checker](https://tools.keycdn.com/performance)

## Verification

### Automated Checks

- Capture a fresh request in DevTools, WebPageTest, or your APM and confirm `TTFB < 800ms` for key pages.
- Inspect server logs or tracing spans for slow queries, upstream API calls, or expensive render steps before the first byte is sent.
- Re-test from multiple geographic regions if you rely on a CDN or edge network.

### Manual Checks

- Compare cache-hit and cache-miss responses so you know whether the bottleneck is origin work or caching strategy.