# Avoid thin content on key pages

> Checks content length on key pages to identify thin content that may underperform in search results.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
Thin content refers to pages that provide little unique value relative to the user's search intent. Google's guidance on [helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) evaluates depth and usefulness, not just word count, so thin pages often overlap with broader [content-quality issues](/en/rules/seo/quality).

## Code Example

```
1. Identify pages ranking on page 2–4 for target keywords
2. Compare your word count and topic coverage to top 3 results
3. Check if your page answers the implied questions in the query
4. Look for boilerplate, duplicate, or auto-generated sections
```

## Why It Matters

Google's quality systems penalise pages that provide little original value — thin pages on important topics lose rankings to competitors with more comprehensive, useful content. The [thin content spam policy](https://developers.google.com/search/docs/essentials/spam-policies#thin-content) is especially relevant when templated or [AI-assisted drafts](/en/rules/seo/ai-content) never move beyond generic boilerplate.

## What Google Means by "Thin Content"

Google's [spam policies](https://developers.google.com/search/docs/essentials/spam-policies#thin-content) identify these as thin content patterns:

- **Automatically generated content**: Text produced by scraping or template-filling without editorial value
- **Affiliate pages with no added value**: Product listing pages that duplicate the manufacturer's description
- **Doorway pages**: Pages created solely to rank for a keyword, not to serve users
- **Scraped content**: Content copied from other sites without transformation or added value

These are distinct from a well-written 150-word page that fully answers a specific question, which is why this rule should be judged against search intent and usefulness rather than a fixed minimum alone.

## Practical Content Depth Guidelines

| Page Type | Minimum Useful Content | Target |
|-----------|----------------------|--------|
| Homepage | 100–300 words | Clear value proposition, key CTAs |
| Product page | 200–400 words | Unique description, specs, reviews |
| Category page | 200–400 words | Unique intro, filtered navigation |
| Blog post (informational) | 500–1,500 words | Depends on query complexity |
| Long-form guide | 1,500+ words | Comprehensive topic coverage |
| FAQ answer | 50–200 words | Accurate, complete answer |

These are guidelines, not rules. A 100-word page that completely addresses a simple question is not thin.

## ❌ Thin Content Examples

```html
<!-- Product page with only the manufacturer description -->
<h1>Blue Widget Pro</h1>
<p>The Blue Widget Pro is available in blue. SKU: BWP-001. Buy now.</p>
<!-- 14 words — provides no value beyond what a product listing would show -->

<!-- Category page with no content, just a grid of products -->
<h1>Shoes</h1>
<div class="product-grid"><!-- 48 products listed --></div>
<!-- 0 words of body content — Google may not index this page prominently -->
```

## ✅ Content Expansion Patterns

```html
<!-- Expanded product page -->
<h1>Blue Widget Pro</h1>
<p>The Blue Widget Pro is engineered for [specific use case]...</p>

<h2>Key Features</h2>
<ul>
  <li>Feature 1: explains the benefit, not just the spec</li>
  <li>Feature 2: ...</li>
</ul>

<h2>Who It's For</h2>
<p>Ideal for [specific audience] who need [specific outcome]...</p>

<h2>Frequently Asked Questions</h2>
<!-- FAQ schema-marked questions and answers -->
```

## When to Consolidate Instead

If a thin page cannot be meaningfully expanded, consider:
1. **301 redirect** it to a more comprehensive page on the same topic
2. **Merge** it with a related thin page into one stronger page
3. **Noindex** it if it serves a functional purpose but is not meant to rank

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: Creating helpful, reliable, people-first content before treating the rule as satisfied.
- Check the implementation against Google: Thin content spam policy before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.