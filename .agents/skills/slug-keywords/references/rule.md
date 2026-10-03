# Include keywords in URL slugs

> Checks if URL slugs contain descriptive, keyword-relevant words instead of IDs, random strings, or vague terms.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
URL slugs are the human-readable portion of a URL path. Including relevant keywords makes URLs self-describing for both users and search engines, especially when the slug also stays short and clean under [URL length](/en/rules/seo/length) rules.

## Code Example

```
/blog/how-to-train-for-a-marathon
/products/wireless-noise-cancelling-headphones
/services/web-design-london
/about/our-team
```

## Why It Matters

Descriptive URL slugs help users and search engines understand page content before visiting. [Google's URL structure guidance](https://developers.google.com/search/docs/crawling-indexing/url-structure) treats those words as a lightweight relevance hint and a strong UX cue.

## ❌ Poor Slug Patterns

```
/p?id=48392                          # Numeric ID, no context
/blog/post-1                         # Sequential number, no topic
/products/SKU-A4B9X                  # Internal code, meaningless to users
/2024/12/25/                         # Date only, no topic
/blog/the-10-best-ways-to-optimize-your-website-for-search-engines-in-2024
# ↑ Too long — trim to core keywords
```

## Slug Guidelines

| Guideline | Recommendation |
|-----------|---------------|
| Case | Always lowercase (`/my-page`, not `/My-Page`) |
| Word separator | Use hyphens (`-`), not underscores (`_`) or spaces |
| Length | 3–5 words; enough to be descriptive, not stuffed |
| Keyword placement | Put primary keyword early in the slug |
| Stop words | Omit filler words (`a`, `the`, `of`, `in`) when possible |
| Special characters | Avoid `%`, `#`, `?`, `&`, `+`, spaces |

Google has stated that hyphens are treated as word separators, while underscores join words (so `running_shoes` is read as one word, `running-shoes` as two).

## Changing Slugs Safely

1. Identify the new, keyword-optimized slug
2. Create a 301 redirect from the old URL to the new URL
3. Update internal links across the site
4. Update the canonical tag
5. Update the sitemap
6. Monitor Google Search Console for crawl errors after the change

## Framework Examples

#

## Next.js (file-based routing)

```
app/blog/[slug]/page.tsx
→ URL: /blog/how-to-improve-core-web-vitals
```

### WordPress

Settings → Permalinks → set to "Post name" (`/%postname%/`)

This replaces `/?p=123` with `/post-title/`.

## Note on Existing URLs

If a URL is already indexed and has backlinks, weigh the SEO benefit of a better slug against the risk of losing link equity during a redirect. For high-traffic pages, the redirect preserves most equity, but monitor rankings after the change.

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: Keep a simple URL structure before treating the rule as satisfied.
- Check the implementation against Google: URLs and their structure before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.