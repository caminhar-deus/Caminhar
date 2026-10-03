# URL Special Characters

> Checks for problematic special characters in URL paths that can cause crawling, parsing, or canonicalization issues.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
URL characters fall into two categories in [RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986): **unreserved** characters are safe as-is, while **reserved** characters have special meaning and must be encoded when used literally in path segments. This rule sits right next to [clean URL structure](/en/rules/seo/length) and slug-formatting hygiene.

## Code Example

```
A-Z  a-z  0-9  -  _  .  ~
```

## Why It Matters

Special characters in URL paths cause inconsistent crawling, broken links when shared, and canonicalization failures when different systems encode them differently. [MDN's percent-encoding reference](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding) is the practical baseline for understanding those failures.

## Reserved Characters (Special Meaning)

| Character | Reserved Meaning | Encoded Form |
|-----------|-----------------|-------------|
| `?` | Start of query string | `%3F` |
| `#` | Fragment identifier | `%23` |
| `&` | Query parameter separator | `%26` |
| `=` | Key-value separator | `%3D` |
| `+` | Space (in query strings only) | `%2B` in paths |
| `/` | Path segment separator | `%2F` if literal |
| `%` | Encoding prefix | `%25` |

## ❌ Problematic URL Examples

```
/blog/my post title               # Space — breaks parsers
/products/shoes#best              # Fragment lost during crawling
/search?q=shoes&page=1/results    # Query chars in path
/café-parisien                    # Non-ASCII — encoding inconsistency
/products/C++ tips                # Special chars + space
```

## ✅ Clean URL Examples

```
/blog/my-post-title
/products/shoes-best-sellers
/search-results/shoes
/cafe-parisien               # Transliterated to ASCII
/products/cpp-tips
```

## Non-ASCII Characters in URLs

For content in non-English languages (e.g., `/über-uns`, `/产品`), modern browsers display the decoded form but transmit the percent-encoded form. Inconsistencies arise when:

- Some tools encode and others don't
- The server treats `/über-uns` and `/%C3%BCber-uns` as different URLs

**Best practice**: Use ASCII slugs (transliterate accented chars) or ensure your server normalizes all encodings to a single canonical-url form.

## URL Slug Sanitization (Node.js)

```js
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')                   // Decompose accented chars
    .replace(/[\u0300-\u036f]/g, '')    // Remove accent marks
    .replace(/[^a-z0-9\s-]/g, '')      // Remove non-slug chars
    .trim()
    .replace(/\s+/g, '-')             // Spaces to hyphens
    .replace(/-+/g, '-')              // Collapse multiple hyphens
}

slugify('Café & Restaurant — Paris!')  // → 'cafe-restaurant-paris'
```

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against RFC 3986: Uniform Resource Identifier (URI) — Generic Syntax before treating the rule as satisfied.
- Check the implementation against Google: Keep a simple URL structure before treating the rule as satisfied.

## Verification

### Automated Checks

- Crawl the site and export all URLs; filter for characters outside `[A-Za-z0-9/\-_.]`
- Test both encoded and decoded versions of a URL to ensure they return the same canonical-url response
- Check server logs for crawl errors caused by misencoded URLs

### Manual Checks

- Review representative live pages manually and confirm there is no stronger conflicting signal that changes the intended SEO outcome.