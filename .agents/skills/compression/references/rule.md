# Enable text-based compression

> Compress text resources (HTML, CSS, JS) using Gzip or Brotli to reduce data transfer size.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
Text-based assets like HTML, CSS, and JavaScript are highly repetitive and can be compressed significantly (often by 70% or more) before being sent over the network.

## Code Examples

#

## Nginx Configuration
```nginx
# Enable Gzip compression
gzip on;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;
gzip_min_length 1000;

# Enable Brotli (requires module)
brotli on;
brotli_types text/plain text/css application/javascript application/json image/svg+xml;
```

### Express.js (Node.js)
```javascript
const compression = require('compression');
const express = require('express');
const app = express();

// Enable Gzip compression for all responses
app.use(compression());

app.get('/', (req, res) => {
  res.send('Hello World!');
});
```

## Why It Matters

- **Faster Downloads**: Smaller files transfer much faster, especially on high-latency or low-bandwidth connections.
- **Reduced Costs**: Lowers bandwidth usage, which can reduce hosting or CDN costs.
- **Improved Core Web Vitals**: Directly impacts First Contentful Paint (FCP) and Largest Contentful Paint (LCP).
- **Universal Support**: All modern browsers support Gzip, and most support the even more efficient Brotli.

## Compression Tradeoffs

Compression guidance from [web.dev](https://web.dev/learn/performance) is useful here because transfer savings only solve the network side of the problem; parsing and execution cost still remain on the client after the bytes arrive.

Compression reduces transfer size, but it does not solve every performance problem:

- **Network vs CPU**: Brotli or Gzip lowers bytes on the wire, but the browser still has to decompress, parse, compile, and execute the downloaded code.
- **Large bundles still hurt**: A heavily compressed 300 KB JavaScript bundle can still block the main thread long after the download finishes.
- **Splitting still matters**: Use compression together with code splitting and lazy loading so users do not download code they do not need on the initial route.
- **Server cost matters**: Higher on-the-fly compression levels can increase CPU usage and TTFB on the origin. Pre-compress static assets where possible.

## Best Practices

Validate transfer savings in [PageSpeed Insights](https://pagespeed.web.dev/) after enabling Brotli or Gzip so you can confirm the smaller payloads translate into better route-level delivery rather than just a config checkbox.

✅ **Prioritize Brotli**: Brotli typically results in 15-20% smaller files than Gzip.
✅ **Compress All Text Formats**: Don't forget SVG, JSON, and XML files in addition to HTML, CSS, and JS.
✅ **Pre-compress Static Assets**: For maximum efficiency, compress files during the build process rather than on-the-fly.
✅ **Check Minimum Size**: Don't compress very small files (e.g., < 1KB), as the overhead may outweigh the benefits.
✅ **Keep Compression in Context**: Treat compression as a transfer optimization, not a substitute for smaller bundles and less work on the main thread.

❌ **Don't Compress Binary Formats**: Never try to Gzip images (JPG, PNG) or videos, as they are already compressed. Re-compressing them can actually increase file size and waste CPU.
❌ **Avoid High Compression Levels on the Fly**: Using the maximum compression level in real-time can increase TTFB (Time to First Byte) due to CPU overhead.

## Tools & Validation

- **Chrome DevTools**: Check the "Network" tab, look for the `Content-Encoding` header in resource responses.
- [Check GZIP compression](https://www.giftofspeed.com/gzip-test/): Online tool to verify if compression is enabled.
- [Brotli Test](https://tools.keycdn.com/brotli-test): Verify Brotli support for a specific URL.

## Verification

### Automated Checks

- Measure the affected page or flow in Lighthouse, PageSpeed Insights, or DevTools and confirm the targeted metric improves.
- Inspect the network waterfall or performance timeline to confirm the intended resource or execution change actually took effect.

### Manual Checks

- Verify the change on a throttled mobile profile, not just local desktop.
- If this rule maps to a budget or Web Vital, confirm the page now stays within that threshold.