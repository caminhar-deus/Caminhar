# Optimize web font loading

> Use efficient font formats and loading strategies to prevent layout shifts and invisible text.

**Priority:** high · **Difficulty:** intermediate · **Time:** 15 min

---
Fonts are often discovered late by the browser because they are referenced inside CSS files. Optimizing how they are fetched and rendered is key to a stable and fast UI.

## Code Examples

#

## 1. Using `font-display: swap`
This tells the browser to show the fallback font immediately and swap it once the custom font is ready.

```css
@font-face {
  font-family: 'MyCustomFont';
  src: url('/fonts/my-font.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap; /* Crucial for performance */
}
```

### 2. Preloading Critical Fonts
Place this in your `<head>` to start the download as soon as possible.

```html
<link
  rel="preload"
  href="/fonts/my-font.woff2"
  as="font"
  type="font/woff2"
  crossorigin
>
```

### 3. Self-Hosting for Performance
Self-hosting fonts eliminates extra DNS lookups and TLS connections to third-party providers like Google Fonts.

```css
/* Better than linking to external CSS */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-subset.woff2') format('woff2');
}
```

## Why It Matters

- **Visual Stability**: Prevents layout shifts when a custom font replaces a fallback font with different dimensions (CLS).
- **Perceived Speed**: Using `font-display: swap` ensures users can read content immediately using a system font while the custom font loads.
- **Bandwidth Efficiency**: Modern formats like WOFF2 offer significantly better compression than older formats like WOFF or TTF.
- **Discovery Time**: Preloading fonts allows the browser to start the download before the CSS has even been parsed.

## Best Practices

Verify the font waterfall in [PageSpeed Insights](https://pagespeed.web.dev/) or DevTools after each change, because good font loading is about earlier discovery and stable fallback metrics rather than just flipping `font-display: swap`.

✅ **Use WOFF2**: It is the most efficient format and is supported by all modern browsers.
✅ **Subset Your Fonts**: Only include the characters you actually need (e.g., Latin characters only) to reduce file size.
✅ **Limit Font Variations**: Avoid loading every weight (100, 200, 300, etc.) if you only use Regular and Bold.
✅ **Variable Fonts**: Use a single variable font file instead of multiple separate files for different weights.

❌ **Don't Use FOIT**: Avoid the default browser behavior of hiding text until the font loads (Flash of Invisible Text).
❌ **Avoid Base64 Inlining**: Inlining fonts as Base64 in your CSS increases the CSS file size and prevents the font from being cached separately.

## Tools & Validation

- Google Fonts Helper can speed up self-hosting work when you need a quick export of font files and matching CSS.
- [FontSubsetter](https://font-subsetter.com/): Reduce font file size by removing unused characters.
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/): Checks if "All text remains visible during webfont loads."
- [Web Font Configurator](https://wakamaifondue.com/): Analyze what's inside your font files.

## Standards

- Use web.dev: Learn Performance as the standard for measuring the final production behavior, not just local synthetic output.
- Use Chrome Developers: Lighthouse overview as the standard for measuring the final production behavior, not just local synthetic output.

## Verification

### Automated Checks

- Measure the affected page or flow in Lighthouse, PageSpeed Insights, or DevTools and confirm the targeted metric improves.
- Inspect the network waterfall or performance timeline to confirm the intended resource or execution change actually took effect.

### Manual Checks

- Verify the change on a throttled mobile profile, not just local desktop.
- If this rule maps to a budget or Web Vital, confirm the page now stays within that threshold.