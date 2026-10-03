# Avoid keyword stuffing

> Detects excessive keyword repetition in content, titles, or meta tags that signals manipulative SEO

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Keyword stuffing is the practice of overloading page content with target keywords to manipulate search rankings. [Google's keyword-stuffing spam policy](https://developers.google.com/search/policies/quality-guidelines/spam-policies#keyword-stuffing) explicitly prohibits it, and the same cleanup usually overlaps with broader [content quality](/en/rules/seo/quality) work.

## Code Examples

#

## ❌ Avoid — unnatural keyword repetition

```html
<article>
  <h1>Cheap Flights — Find Cheap Flights — Cheapest Flights Online</h1>
  <p>Looking for cheap flights? Our cheap flights search finds the cheapest
     cheap flights from hundreds of airlines. Get cheap flights now with
     our cheap flight deals. Cheap flights have never been easier to find.</p>
</article>
```

### ❌ Avoid — keyword-stuffed alt text

```html
<img src="flight.jpg"
     alt="cheap flights london paris affordable flights discount flights best price flights">
<!-- Should describe the image, not list keywords -->
```

### ❌ Avoid — hidden keyword list

```html
<div style="color: white; background: white; font-size: 1px;">
  cheap flights discount tickets affordable travel best airline deals
</div>
<!-- Invisible text stuffed with keywords — a serious spam violation -->
```

### ✅ Correct — natural language with topical variation

```html
<article>
  <h1>Find Affordable Flights — Compare Hundreds of Airlines</h1>
  <p>Searching for the best airfare deals? Our flight comparison engine
     scans hundreds of airlines and booking sites to surface the lowest
     prices for your route. Whether you are booking last-minute or planning
     months ahead, we help you travel for less.</p>
</article>
```

### ✅ Correct — descriptive alt text

```html
<img src="flight.jpg"
     alt="Economy cabin of a commercial aircraft with passengers boarding">
```

## Why It Matters

- **Spam classification**: Google's SpamBrain and Panda systems detect unnatural keyword density and classify pages as low-quality or spammy.
- **Ranking demotion**: Stuffed pages are ranked lower or removed from the index entirely.
- **Reader experience**: Unnatural repetition makes content hard to read, increasing bounce rate — itself a negative signal.

## What Counts as Keyword Stuffing

Google's definition includes:
- Repeating the same words or phrases so often that it sounds unnatural
- Blocks of text listing phone numbers or cities without substantive context
- Repeating keywords in hidden text or in metadata beyond natural usage
- Alt text that is a list of keywords rather than a description of the image

## Natural Keyword Density Guidelines

| Metric | Target |
|---|---|
| Primary keyword density | Under 2–3% |
| Secondary/related terms | Used naturally throughout |
| Keyword in `<title>` | Once, near the beginning |
| Keyword in H1 | Once, naturally incorporated |
| Keyword in meta description | Once if natural |

Use semantic variation: if targeting "content marketing", also use "content strategy", "blog marketing", "editorial calendar", "content distribution". Google's natural language understanding rewards topical depth over keyword repetition.

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