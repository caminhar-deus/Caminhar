# Add a favicon to every page

> Checks for favicon presence and correct link element configuration

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
A favicon is the small icon shown in browser tabs, bookmarks, and Google Search results. Google uses the favicon declared in your page's `<head>` to identify your site across its products.

## Code Examples

#

## ❌ Avoid — no favicon declared (browser default fallback only)

```html
<head>
  <title>My Site</title>
  <!-- No <link rel="icon"> — relies on browser checking /favicon.ico -->
  <!-- Google may not detect it reliably -->
</head>
```

### ❌ Avoid — only ICO format, no modern variants

```html
<head>
  <link rel="shortcut icon" href="/favicon.ico">
  <!-- Works for legacy browsers but no SVG for modern browsers -->
</head>
```

### ✅ Correct — full favicon stack

```html
<head>
  <!-- ICO fallback for older browsers -->
  <link rel="icon" href="/favicon.ico" sizes="any">

  <!-- SVG for modern browsers (scales to any size, supports dark mode) -->
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">

  <!-- iOS and Android home screen icon -->
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">

  <!-- Web app manifest for installable apps -->
  <link rel="manifest" href="/site.webmanifest">
</head>
```

### ✅ SVG favicon with dark mode support

```xml
<!-- favicon.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <style>
    @media (prefers-color-scheme: dark) {
      circle { fill: #ffffff; }
    }
  </style>
  <circle cx="50" cy="50" r="50" fill="#0070f3"/>
  <text x="50" y="65" text-anchor="middle" font-size="60" fill="white">A</text>
</svg>
```

## Why It Matters

- **SERP visibility**: Google displays favicons next to mobile search results, making your brand recognisable at a glance.
- **User recognition**: Favicons in browser tabs help users identify your site among many open tabs.
- **Professionalism**: A missing favicon is often a sign of an unfinished or unmaintained site.

## Google's Requirements

Google has specific rules for favicons displayed in search results:
- The favicon must be accessible to Googlebot (not blocked by robots.txt)
- The image must be at least 48×48px (Google scales it to 16×16 for display)
- The favicon must follow Google's [safe search policies](https://developers.google.com/search/docs/appearance/favicon-in-search)
- A new favicon may take several weeks to appear in search after deployment

## Exceptions

- Utility or intentionally noindex pages may keep minimal metadata when richer search presentation is not a goal.
- Template-driven pages can look repetitive in isolation; confirm the fully rendered production output before flagging duplication or omission.
- If a page is intentionally redirected or excluded from indexation, resolve that crawlability decision before treating metadata polish as the primary issue.

## Support Notes

- Search-facing behavior can differ between rendered HTML, crawlers, and browser environments, so verify the final output on live routes and not only in source templates.
- Document any platform or browser-specific limitation only when it materially changes the crawl, metadata, or indexing signal.

## Verification

### Automated Checks

- Open your page source and confirm `<link rel="icon">` is present.
- Use Google Search Console's URL Inspection tool on your homepage to see whether Google can fetch the favicon.

### Manual Checks

- Visit `yourdomain.com/favicon.ico` and confirm it returns a valid image.
- Check robots.txt does not disallow your favicon path.