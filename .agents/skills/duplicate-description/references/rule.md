# Avoid duplicate meta descriptions

> Checks for duplicate meta descriptions across the site

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Every page should tell search engines and users what makes it unique. When multiple pages share the same meta description, [Google's snippet guidance](https://developers.google.com/search/docs/appearance/snippet) often leads Google to rewrite the snippet, creating the same ambiguity you see when titles are not unique sitewide.

## Code Examples

#

## ❌ Avoid — same description on every page

```html
<!-- Homepage -->
<meta name="description" content="Acme Corp — Building better products.">

<!-- /products page — duplicate! -->
<meta name="description" content="Acme Corp — Building better products.">

<!-- /contact page — duplicate! -->
<meta name="description" content="Acme Corp — Building better products.">
```

### ✅ Correct — unique description per page

```html
<!-- Homepage -->
<meta name="description" content="Acme Corp builds enterprise project management software trusted by 10,000+ teams.">

<!-- /products page -->
<meta name="description" content="Explore Acme's suite of project tools: time tracking, Kanban boards, and automated reporting.">

<!-- /contact page -->
<meta name="description" content="Get in touch with the Acme Corp sales and support team — we respond within one business day.">
```

### ✅ Dynamic generation in Next.js

```ts
// app/products/page.tsx

  description: 'Explore Acme\'s suite of project tools: time tracking, Kanban boards, and automated reporting.',
}
```

## Why It Matters

- **Snippet quality**: Google uses the meta description as the search snippet when it considers it relevant. Unique descriptions mean more useful snippets, and [MDN's description-meta reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name) is a good baseline for validating the rendered tag.
- **Click-through rate**: A description tailored to the page's content matches user intent and earns more clicks.
- **Crawl signals**: Identical descriptions across pages suggest thin or duplicate content, which can suppress rankings and usually needs the same per-route treatment as [meta-title generation](/en/rules/seo/meta-title).

## What to Check

Crawl the site and collect all `<meta name="description" content="...">` values. Group by content value; any group with more than one URL is a violation.

Also flag descriptions that:
- Are identical to the homepage description
- Match the site tagline verbatim
- Are left as a CMS template placeholder

## How to Fix Duplicates

1. Run a site crawl with [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/), Sitebulb, or Google Search Console's Page Indexing report to identify duplicates.
2. Export the list of affected URLs and their shared descriptions.
3. Write a unique, page-specific description for each URL (50–160 characters).
4. Update your CMS, template, or code to inject these per-page values.
5. Re-crawl after deploying to confirm all duplicates are resolved.

## Exceptions

- Utility or intentionally noindex pages may keep minimal metadata when richer search presentation is not a goal.
- Template-driven pages can look repetitive in isolation; confirm the fully rendered production output before flagging duplication or omission.
- If a page is intentionally redirected or excluded from indexation, resolve that crawlability decision before treating metadata polish as the primary issue.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Snippet best practices before treating the rule as satisfied.
- Check the implementation against MDN: meta element name attribute — description before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.