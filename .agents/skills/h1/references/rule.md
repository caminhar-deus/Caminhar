# Use a single descriptive H1

> Validates that each page has exactly one H1 tag containing a descriptive, keyword-relevant heading

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
The `<h1>` element is the primary heading of a page. [Google's heading guidance](https://developers.google.com/search/docs/appearance/title-link) and the page's [title strategy](/en/rules/seo/meta-title) should reinforce the same topic, so each page needs one H1 that clearly names what the page is about.

## Code Examples

#

## ❌ Avoid — no H1 on the page

```html
<main>
  <h2>Welcome to Acme Corp</h2>
  <!-- No H1 — Google has no primary heading to use -->
  <p>We build enterprise software...</p>
</main>
```

### ❌ Avoid — multiple H1 tags

```html
<main>
  <h1>Acme Corp</h1>  <!-- Brand name only -->
  <article>
    <h1>Project Management Software for Teams</h1>  <!-- Second H1! -->
  </article>
</main>
```

### ❌ Avoid — H1 with only brand name

```html
<h1>Acme Corp</h1>
<!-- Does not tell Google or users what this specific page is about -->
```

### ✅ Correct — single descriptive H1

```html
<main>
  <h1>Project Management Software for Enterprise Teams</h1>
  <p>Acme Corp helps teams of 50+ manage projects with Kanban,
     time tracking, and automated reporting.</p>

  <h2>Key Features</h2>
  <!-- H2 and below for sub-topics -->
</main>
```

### ✅ H1 and title aligned but not identical

```html
<head>
  <!-- Title includes brand; H1 is content-focused -->
  <title>Project Management Software — Acme Corp</title>
</head>
<body>
  <h1>Project Management Software for Enterprise Teams</h1>
</body>
```

## Why It Matters

- **On-page SEO**: Google uses headings to understand page structure and topical relevance. The H1 is weighted most heavily, and [MDN's heading-element reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements) is still a useful baseline for the underlying HTML contract.
- **Accessibility**: Screen readers announce H1 as the page's main heading, helping users with assistive technology understand page context immediately.
- **User experience**: A clear H1 anchors the page content, helping readers confirm they found what they searched for and preventing the same ambiguity that appears when titles are reused across multiple pages.

## What to Check

| Issue | Problem |
|---|---|
| No `<h1>` | Google has no clear heading signal for the page |
| Multiple `<h1>` | Dilutes the primary topic signal |
| Empty `<h1>` | Structural element with no content |
| Brand-name-only H1 | Not topic-specific; misses ranking opportunity |
| H1 hidden via CSS | Google may ignore it |

## How to Fix H1 Issues

1. Run a site crawl or use browser DevTools to find pages with 0 or 2+ H1 elements.
2. For pages with no H1: add one that describes the page topic, demoting the current top heading to H2.
3. For pages with multiple H1s: choose the most topically specific one, demote the rest, and keep it aligned with the page title strategy.
4. For brand-name-only H1s: incorporate the page topic alongside or replace the brand name.
5. Verify the fix by inspecting the rendered DOM (not just source), as JavaScript frameworks may alter heading structure, and compare the final output against [MDN's heading element reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements).

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Headings and title tags before treating the rule as satisfied.
- Check the implementation against MDN: The HTML Section Heading elements before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.