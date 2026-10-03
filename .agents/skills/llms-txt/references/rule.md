# Publish llms.txt for documentation-heavy sites

> Offer an optional llms.txt index that points AI tools to high-value documentation pages and, when useful, a fuller llms-full.txt companion.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
`llms.txt` is an optional plain-text or Markdown file that can give AI tools a cleaner starting point for navigating large documentation sets. It is most useful for public API docs, help centers, SDK references, and knowledge bases where the most important content would otherwise be buried inside navigation trees or app-like UIs.

## Code Examples

```md
# Example API Docs

> Official documentation for Example API, including quickstarts, concepts, and reference material.

## Docs

- [Getting Started](https://docs.example.com/getting-started): Setup, authentication, and your first request.
- [Concepts](https://docs.example.com/concepts): Core mental model, resources, and lifecycle concepts.
- [API Reference](https://docs.example.com/api): Endpoint-by-endpoint request and response details.
- [Examples](https://docs.example.com/examples): Copy-paste examples for common integration patterns.

## Optional

- [Full Reference](https://docs.example.com/llms-full.txt): Expanded documentation index for tools that can handle larger context files.
```

```md
# ❌ Poor example

- [Home](https://example.com/)
- [Blog](https://example.com/blog)
- [Pricing](https://example.com/pricing)
- [Login](https://example.com/login)
- [Random changelog entry](https://example.com/changelog/2024-01-11)
```

## Why It Matters

Documentation portals often bury the most important pages behind dense navigation, search UIs, or framework-specific layouts. A curated `llms.txt` gives AI tools a cleaner entry point without replacing the normal crawl and indexing mechanisms of the web.

## Best Practices

- Publish the file at exactly `/llms.txt` on the production domain.
- Keep it short and curated: link to the most useful guides, concepts, references, and examples first.
- Use absolute URLs and one-sentence descriptions so each entry makes sense on its own.
- Link only to public, stable content that returns HTTP 200 and does not require login.
- If you provide `llms-full.txt`, treat it as an optional companion file and link to it from `llms.txt`.

## Common Mistakes

- Treating `llms.txt` as a replacement for `robots.txt`, XML sitemaps, or structured data.
- Dumping every page from the sitemap instead of curating the highest-signal documentation URLs.
- Listing marketing pages, pricing pages, or login flows instead of task-oriented documentation.
- Linking to content that is only visible after search, tabs, or client-side rendering complete.
- Claiming that `llms.txt` is required for search ranking, AI Overviews, or chat assistant inclusion.

## Implementation Notes

Use `llms.txt` when your site already has substantial documentation and you can maintain a curated index over time. Small brochure sites, landing pages, and simple marketing sites usually do not benefit enough to justify another public file.

`llms-full.txt` is commonly used in the ecosystem as a larger companion file, but it is optional. Only publish it if you can keep it synchronized with the documentation that you actually want AI tools to consume.

```ts
// app/llms.txt/route.ts

  const body = `# Example Docs

> Public documentation for Example product.

## Docs

- [Getting Started](https://docs.example.com/getting-started): Setup and first steps.
- [API Reference](https://docs.example.com/api): Request and response details.

## Optional

- [Full Reference](https://docs.example.com/llms-full.txt): Expanded docs index.
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
```

## Tools & Validation

- Fetch `/llms.txt` on the production domain and confirm it returns HTTP 200.
- Spot-check every listed URL and remove links that redirect, 404, or require authentication.
- Compare `llms.txt` against your sitemap and docs IA to make sure it highlights the most useful public docs rather than duplicating everything, and check the overall shape against the [llms.txt convention](https://llmstxt.org/).
- If you publish `llms-full.txt`, verify that it is linked from `llms.txt` and clearly positioned as an expanded companion file.
- Directories such as `llmstxthub.com` can help you compare real-world implementations before you define your own file structure.
- Helper tooling such as `npx -y @thedaviddias/mcp-llms-txt-explorer` can speed up audits when you want to inspect sites that already publish these files.

## Exceptions

- Small marketing sites, portfolios, or single-page sites often do not need `llms.txt`; strong page-level structure is usually enough.
- Private documentation behind authentication may need an internal equivalent rather than a public `llms.txt`.
- If your docs platform already exposes a clean, stable, public documentation index and your team cannot maintain another file, skipping `llms.txt` is reasonable.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against llms.txt before treating the rule as satisfied.
- Check the implementation against Google Search Central: AI features and your website before treating the rule as satisfied.

## Verification

### Automated Checks

- Fetch [the live `/llms.txt` file](https://llmstxt.org/) and confirm your production version returns HTTP 200 from the exact root path.
- Validate that every URL listed in the file returns HTTP 200 and resolves to a canonical-url public page.
- If `llms-full.txt` is present, fetch `/llms-full.txt` on the production domain and confirm it also returns HTTP 200.

### Manual Checks

- Confirm the file is curated around developer or support tasks, not generic site navigation.
- Confirm that the most important docs pages are understandable without requiring a site search box, hidden tabs, or authentication.
- Confirm that crawl and indexing rules are still managed through `robots.txt`, canonical URLs, sitemaps, and page-level metadata.