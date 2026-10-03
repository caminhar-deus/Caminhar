# OG Image Size

> Checks og:image meets recommended size (1200x630)

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
The `og:image` is the visual preview displayed when a link is shared on social platforms. An incorrect size leads to the image being cropped, distorted, skipped, or replaced with a blank card.

## Code Examples

```html
<!-- ✅ Good: Correct size, absolute URL, explicit dimensions -->
<head>
  <meta property="og:image" content="https://example.com/og/home.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="BakeCo – Artisan bread recipes" />
  <meta property="og:image:type" content="image/jpeg" />
</head>
```

```html
<!-- ❌ Bad: Relative URL, no dimensions, small image -->
<meta property="og:image" content="/images/logo.png" />
<!-- logo.png is 200×60 px — too small, wrong ratio -->
```

## Why It Matters

An incorrectly sized og:image is displayed poorly or not at all on social platforms—Facebook, Twitter/X, LinkedIn each crop or skip images that don't meet their requirements, resulting in blank or distorted link previews.

## Recommended Dimensions

| Platform | Recommended Size | Minimum Size | Aspect Ratio |
|----------|-----------------|--------------|--------------|
| Facebook | 1200×630 px | 600×315 px | 1.91:1 |
| LinkedIn | 1200×627 px | 1200×627 px | 1.91:1 |
| Twitter/X (summary_large_image) | 1200×628 px | 300×157 px | 2:1 |
| Slack | 1200×630 px | any | — |
| iMessage | 1200×630 px | any | — |

**Use 1200×630 px** to satisfy all major platforms.

## Next.js Dynamic OG Images

```tsx
// app/og/route.tsx — using @vercel/og

  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'Default Title'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          fontSize: 48,
        }}
      >
        {title}
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

```tsx
// app/blog/[slug]/page.tsx

  const post = await getPost(params.slug)
  return {
    openGraph: {
      images: [
        {
          url: `https://example.com/og?title=${encodeURIComponent(post.title)}`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
  }
}
```

## File Format and Size

```
✅ JPEG 1200×630 @ 80% quality  ≈ 100–300 KB  (recommended)
✅ PNG  1200×630                ≈ 300–600 KB  (for text/transparency)
⚠️ WebP 1200×630               ≈ 80–200 KB   (limited platform support)
❌ GIF                          ≈ varies      (not recommended)
```

## Exceptions

- Utility or intentionally noindex pages may keep minimal metadata when richer search presentation is not a goal.
- Template-driven pages can look repetitive in isolation; confirm the fully rendered production output before flagging duplication or omission.
- If a page is intentionally redirected or excluded from indexation, resolve that crawlability decision before treating metadata polish as the primary issue.

## Verification

### Automated Checks

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) — shows exact image dimensions and warnings
- [X Cards Getting Started](https://developer.x.com/en/docs/x-for-websites/cards/guides/getting-started)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

### Manual Checks

- Review representative live pages manually and confirm there is no stronger conflicting signal that changes the intended SEO outcome.