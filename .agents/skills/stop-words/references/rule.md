# URL Stop Words

> Flags common stop words in URL slugs that add length without improving keyword relevance.

**Priority:** low · **Difficulty:** beginner · **Time:** 10 min

---
Stop words are common function words that carry little semantic weight: articles (a, an, the), prepositions (of, in, for, to, on), and conjunctions (and, but, or). In URL slugs, they add length without improving relevance signals, so this rule often sits alongside [URL length cleanup](/en/rules/seo/length) and Google's advice to [keep URL structures simple](https://developers.google.com/search/docs/crawling-indexing/url-structure).

## Code Example

```
a, an, the, and, or, but, of, in, on, at, to, for, with, by, from,
is, are, was, were, be, been, being, have, has, had
```

## Why It Matters

Shorter, keyword-focused URL slugs are easier for users to read and share; removing stop words is a minor hygiene improvement, especially for new content. It is a low-stakes optimization, but it can make new slugs feel cleaner and more intentional than leaving every word from the title in place.

## Examples

#

## ❌ With Stop Words

```
/blog/the-best-ways-to-improve-the-performance-of-your-website
/articles/how-to-write-a-great-meta-description-for-your-page
/guide/an-introduction-to-the-basics-of-seo
```

### ✅ Without Stop Words

```
/blog/best-ways-improve-website-performance
/articles/how-write-great-meta-description
/guide/introduction-seo-basics
```

## When to Remove Stop Words

| Situation | Recommendation |
|-----------|---------------|
| Creating new content | ✅ Exclude stop words from slug |
| Existing page with backlinks | ❌ Do not change without full redirect plan |
| Established page ranking well | ❌ Leave it — do not risk disrupting rankings |
| Site-wide URL cleanup project | ✅ OK if all 301 redirects are implemented |

## Important Caveats

- Stop words in URL slugs are a **minor** SEO factor — they are not a ranking signal Google has explicitly cited
- Google's John Mueller has said URL structure is a very lightweight signal
- The redirect risk for established pages almost always outweighs the marginal benefit of shorter slugs
- Some stop words are load-bearing in meaning: `/how-to-cook-pasta` vs. `/cook-pasta` are meaningfully different, which is why [keyword-focused slug writing](/en/rules/seo/slug-keywords) should still preserve user intent.

## CMS Slug Configuration

### WordPress

Install a slug optimization plugin or use a custom filter:

```php
add_filter('sanitize_title', function($slug) {
    $stop_words = ['a', 'an', 'the', 'and', 'or', 'of', 'in', 'to'];
    $parts = explode('-', $slug);
    $filtered = array_filter($parts, fn($w) => !in_array($w, $stop_words));
    return implode('-', $filtered) ?: $slug; // fallback if all words removed
});
```

Apply this only to new content to avoid retroactively changing existing URLs.

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: Keep a simple URL structure before treating the rule as satisfied.
- Check the implementation against Moz: URL best practices before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.