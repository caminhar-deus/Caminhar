# Add outgoing links to dead-end pages

> Pages with no outgoing internal links, potentially trapping users and crawlers

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Every page on your site should connect to at least a few other pages. [Google's crawler overview](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers) makes dead-end pages a crawl and UX problem, especially when they also weaken your broader [internal linking strategy](/en/rules/seo/internal-links).

## Code Examples

#

## ❌ Avoid — article with no body links

```html
<article>
  <h1>Understanding CSS Grid</h1>
  <p>CSS Grid is a two-dimensional layout system for the web.
     It lets you lay out items in rows and columns.</p>
  <!-- No links to related topics anywhere in the content -->
</article>
```

### ✅ Correct — contextual internal links in body

```html
<article>
  <h1>Understanding CSS Grid</h1>
  <p>CSS Grid is a two-dimensional layout system for the web.
     Unlike <a href="/blog/css-flexbox-guide">Flexbox</a>, which is
     primarily one-dimensional, Grid lets you control both rows and columns.</p>

  <p>For responsive designs, combine Grid with
     <a href="/blog/responsive-design-breakpoints">strategic breakpoints</a>.</p>

  <section>
    <h2>Related Articles</h2>
    <ul>
      <li><a href="/blog/css-flexbox-guide">A Complete Guide to CSS Flexbox</a></li>
      <li><a href="/blog/responsive-design-breakpoints">Choosing Responsive Breakpoints</a></li>
      <li><a href="/blog/css-container-queries">CSS Container Queries in 2024</a></li>
    </ul>
  </section>
</article>
```

### ✅ Related content section as a fallback

```html
<!-- When inline links are not natural, a "See also" section works -->
<aside aria-label="Related content">
  <h2>See Also</h2>
  <ul>
    <li><a href="/docs/grid-template-areas">Grid Template Areas</a></li>
    <li><a href="/docs/auto-placement">CSS Grid Auto-Placement</a></li>
  </ul>
</aside>
```

## Why It Matters

- **Crawl coverage**: Googlebot navigates by following `<a href>` links. A dead-end page means the crawler cannot reach other pages from that starting point during that session, which is part of the broader crawl flow described in [Google's crawler overview](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers).
- **User experience**: Users who land on a dead-end page have no contextual next step, increasing bounce rate and reducing session depth.
- **PageRank flow**: Internal links distribute ranking signals. Pages that link to nothing do not pass authority forward to your other content, and they often sit next to the same weak architecture patterns flagged in [weak internal links](/en/rules/seo/weak-internal-links).

## What to Check

Use a crawler (Screaming Frog, Sitebulb, or a custom script) to:
1. Identify pages where the body content (`<main>`, `<article>`) contains fewer than 2 internal `<a href>` links.
2. Exclude global navigation, header, and footer links that are identical across all pages — these are not contextual signals.

## How to Fix Dead-End Pages

1. Crawl your site and filter for pages with 0–1 internal links in body content.
2. For each dead-end page, identify 2–5 topically related pages.
3. Add inline links naturally within the body where the connection is contextually relevant.
4. If the content does not allow natural inline linking, add a "Related", "See also", or "Next steps" section at the bottom.
5. Re-crawl after deployment to verify link counts have improved.

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Links best practices before treating the rule as satisfied.
- Check the implementation against Google Search Central: Crawling and indexing before treating the rule as satisfied.

## Support Notes

- Search-facing behavior can differ between rendered HTML, crawlers, and browser environments, so verify the final output on live routes and not only in source templates.
- Document any platform or browser-specific limitation only when it materially changes the crawl, metadata, or indexing signal.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.