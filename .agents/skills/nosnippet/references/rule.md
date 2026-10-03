# Avoid nosnippet on important pages

> Detects pages preventing search engine snippets

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
The `nosnippet` robots directive prevents search engines from showing a description under your page title in results. [Google's robots-meta documentation](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag#directives) treats it as an explicit instruction, so on most content pages it reduces click-through opportunity without offering a ranking benefit.

## Code Example

```html
<!-- ❌ Removes snippet from search results -->
<meta name="robots" content="nosnippet" />

<!-- ❌ Equivalent — max-snippet:0 = no snippet shown -->
<meta name="robots" content="max-snippet:0" />

<!-- ✅ Explicitly allows full-length snippet -->
<meta name="robots" content="max-snippet:-1" />

<!-- ✅ Also fine: no snippet directive = snippets allowed by default -->
<meta name="robots" content="index, follow" />
```

## Why It Matters

Pages with `nosnippet` display without a description in search results, reducing click-through rates and making it harder for users to judge relevance. That usually creates the opposite outcome of a strong [meta-description strategy](/en/rules/seo/meta-description).

## How It Appears in Search Results

**With snippet:**
```
Page Title – example.com
A clear 1–2 sentence description that helps users understand the page...
```

**With nosnippet:**
```
Page Title – example.com

```
(blank — no description shown)

## When nosnippet IS Appropriate

- Legal pages where displaying a text excerpt could be misleading out of context
- Pages with confidential or proprietary content summaries
- Pages protected behind authentication that are still indexed for navigation purposes

## All Snippet-Related Directives

| Directive | Effect |
|-----------|--------|
| `nosnippet` | No snippet at all |
| `max-snippet:0` | Same as nosnippet |
| `max-snippet:N` | Snippet limited to N characters |
| `max-snippet:-1` | Unlimited snippet (default) |
| `noarchive` | No cached copy, but snippet is still shown |

## Combined Usage

```html
<!-- Allow indexing but limit snippet to 150 chars -->
<meta name="robots" content="index, follow, max-snippet:150" />

<!-- Allow indexing with full snippet (recommended default) -->
<meta name="robots" content="index, follow" />
```

## Detection

Audit your robots meta tags across all important pages:

```bash
# Check for nosnippet directive using a site crawl
# Look for meta name="robots" content values containing "nosnippet"
```

Use [Google Search Console URL Inspection](https://search.google.com/search-console/inspect) to see what Google reads for any specific URL.

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Robots meta tag — nosnippet before treating the rule as satisfied.
- Check the implementation against Google Search Central: Control search result snippets before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.