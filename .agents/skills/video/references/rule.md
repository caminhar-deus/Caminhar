# Add VideoObject schema to video pages

> Checks for VideoObject structured data on pages containing video content to enable video rich results in Google Search.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
VideoObject schema markup tells Google exactly what a video is about, enabling it to surface your video in dedicated video carousels, the Video tab, and Google Discover.

## Code Example

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "How to Build a Next.js App from Scratch",
  "description": "A step-by-step tutorial covering Next.js 14 App Router, data fetching, and deployment.",
  "thumbnailUrl": "https://example.com/images/nextjs-tutorial-thumb.jpg",
  "uploadDate": "2025-02-15T10:00:00+00:00"
}
</script>
```

## Why It Matters

Pages with valid VideoObject schema are eligible for video-specific rich results and carousels in Google Search — a visibility advantage that pages without schema cannot access.

## Full Recommended Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "How to Build a Next.js App from Scratch",
  "description": "A step-by-step tutorial covering Next.js 14 App Router, data fetching, and deployment to Vercel.",
  "thumbnailUrl": [
    "https://example.com/images/nextjs-tutorial-thumb.jpg"
  ],
  "uploadDate": "2025-02-15T10:00:00+00:00",
  "duration": "PT12M30S",
  "contentUrl": "https://example.com/videos/nextjs-tutorial.mp4",
  "embedUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
  "interactionStatistic": {
    "@type": "InteractionCounter",
    "interactionType": { "@type": "WatchAction" },
    "userInteractionCount": 5482
  },
  "author": {
    "@type": "Person",
    "name": "Jane Smith"
  }
}
</script>
```

## Required Properties

| Property | Required | Format |
|----------|----------|--------|
| `name` | Yes | String — video title |
| `description` | Yes | String — video description |
| `thumbnailUrl` | Yes | Absolute URL(s), min 60×30 px |
| `uploadDate` | Yes | ISO 8601 (e.g., `2025-02-15T10:00:00+00:00`) |

## Recommended Properties

| Property | Format | Notes |
|----------|--------|-------|
| `contentUrl` | Absolute URL | Direct link to the video file |
| `embedUrl` | Absolute URL | YouTube/Vimeo embed iframe URL |
| `duration` | ISO 8601 duration (`PT1H2M30S`) | Used in search result display |
| `expires` | ISO 8601 datetime | If video will become unavailable |

## YouTube Embed Example

```html
<!-- Page with embedded YouTube video -->
<iframe
  src="https://www.youtube.com/embed/VIDEO_ID"
  title="How to Build a Next.js App"
  allowfullscreen>
</iframe>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "How to Build a Next.js App",
  "description": "Complete tutorial...",
  "thumbnailUrl": "https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg",
  "uploadDate": "2025-02-15",
  "embedUrl": "https://www.youtube.com/embed/VIDEO_ID"
}
</script>
```

Note: YouTube thumbnails follow the `img.youtube.com/vi/{VIDEO_ID}/maxresdefault.jpg` pattern.

## Validation

1. [Google Rich Results Test](https://search.google.com/test/rich-results) — check for VideoObject eligibility
2. Google Search Console → Rich Results → Video — monitor impressions after deployment

## Exceptions

- Only add or enforce schema types that the page can truthfully support; irrelevant structured data is worse than no structured data.
- A technically valid schema block can still be misleading if the page content does not visibly back it up; audit rendered content and schema together.
- If indexability, canonical-url, or main content quality is wrong, fix that foundation before optimizing schema details.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.