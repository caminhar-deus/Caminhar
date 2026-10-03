# Add thumbnail images to videos

> HTML5 video elements should have a poster attribute providing a thumbnail image displayed before the video loads or is played.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
The `poster` attribute on `<video>` displays a thumbnail image before the video loads or plays. It prevents blank video placeholders and communicates content at a glance.

## Code Example

```html
<!-- ✅ Good: video with poster, dimensions, and performance attributes -->
<video
  controls
  width="1280"
  height="720"
  poster="thumbnail-intro-video.jpg"
  preload="none">
  <source src="intro-video.mp4" type="video/mp4">
  <source src="intro-video.webm" type="video/webm">
  <track kind="captions" srclang="en" src="captions.vtt" label="English" default>
  <p>Your browser does not support HTML video.
     <a href="intro-video.mp4">Download the video</a>.</p>
</video>

<!-- ❌ Incorrect: no poster — blank black rectangle before play -->
<video controls>
  <source src="intro-video.mp4" type="video/mp4">
</video>

<!-- ❌ Incorrect: poster present but no dimensions — causes layout shift -->
<video controls poster="thumbnail.jpg">
  <source src="intro-video.mp4" type="video/mp4">
</video>
```

## Why It Matters

- **Perceived Performance**: Users see meaningful content immediately; a blank rectangle appears broken on slow connections.
- **User Decision-Making**: Thumbnails communicate video content before the user commits to playing.
- **Layout Stability**: Explicit dimensions combined with a poster prevent Cumulative Layout Shift (a Core Web Vital).
- **Autoplay Alternatives**: When autoplay is blocked by the browser (most mobile), the poster is the only visual shown — make it count.

## Poster Image Best Practices

| Attribute | Recommendation |
|---|---|
| Dimensions | 1280×720px (16:9) for HD; 640×360px minimum |
| Format | JPEG for photos; WebP with JPEG fallback for performance |
| File size | Keep under 100KB for fast loading |
| Content | Representative of the video topic; avoid clickbait |
| Aspect ratio | Match the video's native aspect ratio |

## Preventing Layout Shift (CLS)

Without explicit dimensions, the browser does not know how much space to reserve for the video until the poster or first frame loads, causing a Cumulative Layout Shift:

```css
/* ✅ Responsive video that maintains aspect ratio without CLS */
.video-wrapper {
  aspect-ratio: 16 / 9;
  width: 100%;
  background-color: #000; /* Shows black placeholder while poster loads */
}

.video-wrapper video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

```html
<!-- Or: set width and height directly on the element -->
<video
  poster="thumbnail.jpg"
  width="1280"
  height="720"
  style="width: 100%; height: auto;"
  controls>
```

## Verification

### Automated Checks

- Inspect the final rendered HTML in the browser or page source to confirm the rule is satisfied.
- Validate the affected markup with browser tooling or an HTML validator where appropriate.
- Test one representative route or template that uses the pattern.
- Re-check shared components that emit the same markup so the fix is consistent.

### Manual Checks

- Verify the rendered browser behavior manually on representative routes and supported browsers so the user-facing outcome matches the rule.