# Do not link from HTTPS to HTTP

> Detects links from HTTPS pages to HTTP destinations, which trigger mixed content warnings and lose ranking signals

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
When a page is served over HTTPS, every link and resource on that page should also use HTTPS. [Google's HTTPS guidance](https://developers.google.com/search/blog/2014/08/https-as-ranking-signal) and [MDN's mixed-content reference](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content) make protocol mismatches both a trust problem and a technical SEO problem.

## Code Examples

#

## ❌ Avoid — HTTP link from an HTTPS page

```html
<!-- Page served at https://yoursite.com -->
<a href="http://yoursite.com/about">About Us</a>
<!-- Triggers redirect; sends wrong protocol signal -->

<a href="http://partner.example.com/offer">View Offer</a>
<!-- Mixed context; browser may warn -->
```

### ❌ Avoid — HTTP resource on HTTPS page

```html
<!-- These will be blocked by modern browsers -->
<script src="http://cdn.example.com/analytics.js"></script>
<img src="http://images.example.com/logo.png" alt="Logo">
```

### ✅ Correct — relative or HTTPS links

```html
<!-- Internal links: use relative paths -->
<a href="/about">About Us</a>

<!-- Internal links: use absolute HTTPS if needed -->
<a href="https://yoursite.com/about">About Us</a>

<!-- External links: verify the destination supports HTTPS -->
<a href="https://partner.example.com/offer" rel="noopener noreferrer">View Offer</a>

<!-- Resources: always HTTPS -->
<script src="https://cdn.example.com/analytics.js"></script>
<img src="https://images.example.com/logo.png" alt="Logo">
```

### ✅ Protocol-relative URLs for third-party scripts (legacy approach)

```html
<!-- Protocol-relative: inherits the page's protocol -->
<!-- Note: prefer explicit https:// in modern code -->
<script src="//cdn.example.com/script.js"></script>
```

## Why It Matters

- **Browser blocking**: Modern browsers block "active" mixed content (scripts, stylesheets from HTTP on HTTPS pages) entirely.
- **User warnings**: Browsers show security warnings for pages with mixed content, reducing user trust.
- **Redirect overhead**: HTTP links on an HTTPS page mean every navigation adds an extra redirect (HTTP 301 → HTTPS), slowing page loads.
- **Ranking signals**: The SEO value passed through a link is reduced when crossing from HTTPS to HTTP, and these mismatches often show up alongside [sitemap-domain issues](/en/rules/seo/sitemap-domain) during migrations.

## Content Types and Risk Levels

| Resource type | Risk level | Browser behaviour |
|---|---|---|
| `<script src="http://...">` | Critical | Blocked silently |
| `<link href="http://...">` (CSS) | Critical | Blocked silently |
| `<img src="http://...">` | Warning | Blocked in strict mode |
| `<a href="http://...">` (navigation) | Warning | Redirected (if target has HTTPS) |

## How to Find HTTP Links

```bash
# Find HTTP links in HTML templates
grep -rn 'href="http://' ./src/templates/
grep -rn 'src="http://' ./src/templates/

# In a browser: open DevTools → Console and run:
Array.from(document.querySelectorAll('a[href^="http://"]'))
  .map(a => a.href)
```

After fixing, use a browser security report (DevTools → Security tab) to confirm no mixed content warnings remain.

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: HTTPS as a ranking signal before treating the rule as satisfied.
- Check the implementation against MDN: Mixed content — what is mixed content? before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.