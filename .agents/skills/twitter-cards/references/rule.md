# Add Twitter Card meta tags

> Validates Twitter (X) Card meta tags for correct card type, image dimensions, and required fields.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
Twitter Cards (now X Cards) control how your page appears when shared as a link on the X platform. Without them, shared links appear as plain text URLs.

## Code Example

```html
<head>
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="My Article Title">
  <meta name="twitter:description" content="A brief description under 200 characters.">
</head>
```

## Why It Matters

Pages shared on X without Twitter Cards show only a bare link; Cards add an image and description that significantly increase click-through rates from social traffic.

## Card Types

| Type | Description | Best For |
|------|-------------|---------|
| `summary` | Square thumbnail (200×200 min), title, description | Profiles, products |
| `summary_large_image` | Large landscape image (1200×630), title, description | Articles, blog posts |

`app` and `player` card types exist for mobile apps and video, but are less commonly needed.

## Full Recommended Implementation

```html
<head>
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@YourBrand">
  <meta name="twitter:creator" content="@AuthorHandle">
  <meta name="twitter:title" content="How to Improve Core Web Vitals">
  <meta name="twitter:description" content="Practical steps to improve LCP, CLS, and INP for better search ranking.">
  <meta name="twitter:image" content="https://example.com/images/article-cover.jpg">
  <meta name="twitter:image:alt" content="Screenshot of a PageSpeed Insights score of 98">
</head>
```

## Open Graph Fallback

If Twitter-specific tags are absent, X reads Open Graph tags:

```html
<!-- These are read by X if twitter: tags are missing -->
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="...">
```

Best practice: provide both `og:` and `twitter:` tags for maximum compatibility.

## Image Requirements

- **`summary_large_image`**: minimum 300×157 px, recommended 1200×630 px, max 5 MB
- **`summary`**: minimum 144×144 px, recommended 400×400 px, max 5 MB
- **Formats**: JPG, PNG, WebP, GIF (static only for cards)
- Image URL must be absolute, using a full HTTPS URL rather than a relative path

## ❌ Common Mistakes

```html
<!-- Wrong: missing twitter:card — no card will render -->
<meta name="twitter:title" content="My Page">

<!-- Wrong: relative image URL -->
<meta name="twitter:image" content="/images/cover.jpg">

<!-- Wrong: invalid card type -->
<meta name="twitter:card" content="large_image">
```

## Exceptions

- Utility or intentionally noindex pages may keep minimal metadata when richer search presentation is not a goal.
- Template-driven pages can look repetitive in isolation; confirm the fully rendered production output before flagging duplication or omission.
- If a page is intentionally redirected or excluded from indexation, resolve that crawlability decision before treating metadata polish as the primary issue.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers with a crawler, validator, or curl-based check against representative live URLs.

### Manual Checks

- Review representative live pages manually and confirm there is no stronger conflicting signal that changes the intended SEO outcome.