# Add share buttons to content pages

> Checks for social sharing buttons on articles, blog posts, and other shareable content pages.

**Priority:** low · **Difficulty:** beginner · **Time:** 10 min

---
Social sharing buttons give readers a one-click way to share content to their networks, extending reach beyond organic search. The share endpoints for [X/Twitter](https://developer.twitter.com/en/docs/twitter-for-websites/tweet-button/overview), LinkedIn, and Facebook are enough for most implementations without adding heavy SDKs.

## Code Example

Construct share links using each platform's URL scheme — no JavaScript SDK needed:

```html
<!-- X (Twitter) -->
<a
  href="https://twitter.com/intent/tweet?text=Article+Title&url=https%3A%2F%2Fexample.com%2Farticle"
  target="_blank"
  rel="noopener noreferrer"
>
  Share on X
</a>

<!-- LinkedIn -->
<a
  href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.com%2Farticle"
  target="_blank"
  rel="noopener noreferrer"
>
  Share on LinkedIn
</a>

<!-- Facebook -->
<a
  href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com%2Farticle"
  target="_blank"
  rel="noopener noreferrer"
>
  Share on Facebook
</a>

<!-- WhatsApp -->
<a
  href="https://wa.me/?text=Check%20this%20out%3A%20https%3A%2F%2Fexample.com%2Farticle"
  target="_blank"
  rel="noopener noreferrer"
>
  Share on WhatsApp
</a>
```

## Why It Matters

Social sharing extends content reach organically. Shared articles can attract the same previews and off-platform attention supported by [Open Graph tags](/en/rules/seo/og-tags), which is where the indirect SEO value usually shows up.

## Dynamic Share URL Generation

```js
const pageUrl = encodeURIComponent(window.location.href)
const pageTitle = encodeURIComponent(document.title)

const shareLinks = {
  twitter: `https://twitter.com/intent/tweet?text=${pageTitle}&url=${pageUrl}`,
  linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`,
  facebook: `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`,
}
```

## Platform Guide by Content Type

| Platform | Best For |
|---------|---------|
| X (Twitter) | Tech, news, developer content |
| LinkedIn | B2B, professional, career content |
| Facebook | Consumer, lifestyle, local business |
| WhatsApp | Consumer, mobile-first, international |
| Reddit | Technical, community-driven content |

## What Happens When Shared

For share links to generate rich previews (image + title + description), the shared page must have Open Graph meta tags:

```html
<meta property="og:title" content="Article Title">
<meta property="og:description" content="A brief description.">
<meta property="og:image" content="https://example.com/article-cover.jpg">
<meta property="og:url" content="https://example.com/article">
```

## Performance Consideration

Avoid loading third-party share widget scripts (Facebook Like button SDK, AddThis, ShareThis). These:
- Add 50–300 KB of JavaScript
- Set third-party cookies
- Introduce privacy compliance obligations

Use plain `<a>` tags with share URLs instead — they work on all devices without loading any external resources.

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