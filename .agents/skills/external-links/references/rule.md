# Add relevant external links

> Validates that pages include outgoing links to authoritative external sources where appropriate

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Linking out to authoritative external sources is a mark of quality content. It supports your claims, helps users verify information, and reinforces the same trust expectations covered in [content citations](/en/rules/seo/citations) and [Google's outbound-link qualification guidance](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links).

## Code Examples

#

## ❌ Avoid — unsupported claim with no source

```html
<p>Studies show that 70% of websites have accessibility issues.</p>
<!-- No link to the study; readers cannot verify -->
```

### ❌ Avoid — external link missing security attributes

```html
<a href="https://example.com/research">View the research</a>
<!-- Missing rel="noopener noreferrer" — security risk -->
```

### ✅ Correct — cited claim with proper link attributes

```html
<p>According to the
  <a href="https://webaim.org/projects/million/"
     rel="noopener noreferrer">WebAIM Million report</a>,
  over 96% of home pages have detectable WCAG failures.</p>
```

### ✅ Correct — sponsored link with correct rel value

```html
<p>We recommend
  <a href="https://partner.example.com/"
     rel="sponsored noopener noreferrer">ToolName</a>
  for its ease of use. (Affiliate link)</p>
```

## Why It Matters

- **Trust signals**: Google's quality guidelines identify citation of credible sources as evidence of E-E-A-T. Unsupported claims lower trust scores, particularly on informational pages that need the same credibility signals as [trust-signals pages](/en/rules/seo/trust-signals).
- **User value**: Readers can verify claims, explore topics further, and trust content more when sources are cited.
- **Link equity**: Outbound links to reputable sites do not drain your PageRank. Google treats responsible external linking positively, and [MDN's `rel` reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel) helps clarify when to add `nofollow`, `sponsored`, or `noopener`.

## Link Attribute Reference

| Scenario | `rel` attribute |
|---|---|
| Regular external link | `noopener noreferrer` |
| Paid or sponsored link | `sponsored noopener noreferrer` |
| User-generated content | `nofollow noopener noreferrer` |
| Link you cannot vouch for | `nofollow noopener noreferrer` |

## How to Audit External Links

1. Crawl the site and extract all `<a href>` tags pointing to external domains.
2. Check each external link for `rel="noopener noreferrer"`.
3. Identify paid/affiliate links missing `rel="sponsored"`.
4. Review long-form content pages with zero external links — add citations where factual claims are made.
5. Periodically re-check external links for 404s (use broken link checkers).

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.