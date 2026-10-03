# Do not disable pinch zoom

> The viewport meta tag must not set user-scalable=no or maximum-scale=1 as these prevent users from zooming in to read content, violating WCAG 2.1 SC 1.4.4 (Resize Text).

**Priority:** high · **Difficulty:** beginner · **Time:** 5 min

---
The viewport meta tag controls how mobile browsers scale a page. Disabling zoom in this tag is a common but serious accessibility failure that prevents low-vision users from reading content.

## Code Example

```html
<!-- ✅ Correct: responsive viewport, zoom enabled -->
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- ❌ Incorrect: zoom disabled entirely -->
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">

<!-- ❌ Incorrect: maximum-scale=1 prevents any zoom beyond initial scale -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

<!-- ❌ Incorrect: combined restriction -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">

<!-- ✅ Acceptable if maximum-scale allows meaningful zoom -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
```

## Why It Matters

- **Low Vision**: Users who cannot read at default mobile font sizes rely entirely on pinch-to-zoom when browser text size settings are insufficient.
- **Fine Print**: Dense text (terms and conditions, footnotes, table data) is only readable when users can zoom in.
- **Image Detail**: Maps, charts, and diagrams require zoom to read labels and annotations.
- **WCAG AA Compliance**: This is one of the simplest violations to fix — a one-line HTML change — yet one of the most impactful for low-vision users.

## iOS Input Zoom — The Real Problem

The most common reason developers disable zoom is to prevent iOS Safari from zooming into form inputs on focus. The correct solution is not to disable zoom — it is to prevent the cause:

```css
/* ✅ Fix: set font-size to 16px on inputs to prevent iOS auto-zoom */
input[type="text"],
input[type="email"],
input[type="tel"],
input[type="password"],
input[type="number"],
input[type="search"],
select,
textarea {
  font-size: 1rem; /* 16px — iOS Safari does not zoom when font-size ≥ 16px */
}
```

## Browser Behavior Notes

| Browser | Honors `user-scalable=no`? |
|---|---|
| iOS Safari (10+) | No — ignores it (accessibility improvement) |
| Chrome for iOS | Yes — still restricts zoom |
| Chrome for Android | Yes — still restricts zoom |
| Firefox (Android) | Depends on version |
| Samsung Internet | Yes |

Because Chrome for iOS and Android still respect the attribute, removing it is required for full cross-browser accessibility.

## Verification

1. Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
2. Confirm the computed styles match the intended fix in DevTools.
3. Test at least one mobile and one desktop viewport before shipping.
4. If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.