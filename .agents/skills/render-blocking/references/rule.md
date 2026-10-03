# Eliminate render-blocking resources

> Checks for render-blocking CSS and JavaScript that prevent the initial page render

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Render-blocking resources are not just "files in the head". They are any resources the browser must fetch, parse, and apply before it can paint meaningful content.

## Code Examples

#

## Defer JavaScript That Does Not Belong on the Paint Path

```html
<!-- Good: parser continues while the script downloads -->
<script defer src="/app.js"></script>
<script async src="/analytics.js"></script>
```

### Keep Only Critical CSS in the Initial Path

```html
<!-- Good: minimal CSS required for the first screen -->
<style>
  body { font-family: sans-serif; }
  .hero { min-height: 60vh; }
  .hero-title { font-size: clamp(2rem, 6vw, 4rem); }
</style>

<!-- Good: the rest can load later -->
<link rel="stylesheet" href="/styles/non-critical.css" media="print" onload="this.media='all'">
```

### Anti-Pattern: Create Extra Request Chains

```css
/* Bad: nested discovery delays paint */
@import url("/styles/reset.css");
@import url("/styles/components.css");
```

```html
<!-- Bad: optional preloads compete with more important assets -->
<link rel="preload" href="/chat-widget.js" as="script">
<link rel="preload" href="/reviews.js" as="script">
```

## Why It Matters

- **Direct impact on first paint**: if the browser cannot render text, layout, or the hero section, users see a blank or incomplete screen longer.
- **Serial discovery makes delays worse**: CSS, `@import`, fonts, and synchronous scripts can turn one request into a chain of dependent work.
- **Bad prioritization steals time from visible content**: loading optional CSS, widgets, or scripts too early delays what users actually need first.

## What Must Be Ready for First Paint

Usually worth keeping on the first-render path:

- minimal CSS for above-the-fold layout and typography
- the LCP image or LCP text styling
- small amounts of bootstrap JavaScript only if the route cannot function without it

Usually safe to defer:

- analytics and most third-party scripts
- below-the-fold CSS or component-specific styles
- chat widgets, reviews, carousels, maps, and heavy interaction code
- assets preloaded for later interactions rather than the initial render

## Common Mistakes

- **Leaving synchronous third-party scripts in the head**: these often block parsing for no good reason.
- **Inlining too much CSS**: "critical CSS" should stay critical; dumping the full stylesheet into the HTML increases bytes and parse cost.
- **Using `@import` in production CSS**: it creates serial discovery and deeper request chains.
- **Preloading non-critical assets**: preloads are powerful, but misused preloads can effectively become render-blocking competition.
- **Assuming `async` and `defer` are interchangeable**: use `defer` for ordered application code and `async` for independent scripts.

## Pass-Fail Guidance

- The first paint path should include only the assets needed to render meaningful above-the-fold content.
- Keep blocking third-party scripts at `0` on normal content routes.
- Treat CSS discovered through nested `@import` as a failure on the critical path.
- If Lighthouse or DevTools still shows parser-blocking resources before meaningful paint, the route is not passing this rule yet.

## Tools & Validation

The waterfall matters more than the source code here, so validate the route in [PageSpeed Insights](https://pagespeed.web.dev/) or a browser trace after any change to asset ordering.

- [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/) (check for "eliminate-render-blocking-resources")
- [PageSpeed Insights](https://pagespeed.web.dev/)
- Critical CSS generators can help create an initial inline block, but the live waterfall should decide whether the result is actually better.
- WebPageTest is useful when you need a deeper parser-blocking waterfall than Lighthouse provides.

## Verification

### Automated Checks

- Record a network waterfall and confirm only first-screen CSS and truly essential assets start before or around first paint.

### Manual Checks

- Verify scripts required only after interactivity use `defer`, `async`, idle loading, or later triggers instead of blocking the parser.
- Inspect CSS delivery and confirm nested `@import` or other serial discovery patterns are removed from the critical path.
- Re-test on a throttled mobile profile and confirm FCP, LCP, or render-start timing improves without regressing layout stability.