# Optimize CSS file size

> Keep individual CSS files small and remove unused styles to accelerate the critical rendering path.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
CSS is a render-blocking resource. The browser must download and parse all CSS files before it can start painting pixels to the screen. Keeping these files lean is critical for fast page loads.

## Code Examples

#

## 1. Removing Unused CSS with PurgeCSS
If you use a framework like Tailwind or Bootstrap, you likely have thousands of unused classes.

```javascript
// postcss.config.js
const purgecss = require('@fullhuman/postcss-purgecss')

module.exports = {
  plugins: [
    purgecss({
      content: ['./src/**/*.html', './src/**/*.js', './src/**/*.vue']
    })
  ]
}
```

### 2. Minifying CSS
Always minify CSS for production to remove whitespace and comments.

```css
/* Development */
.header {
  background-color: #ffffff;
  margin: 10px;
}

/* Production (Minified) */
.header{background-color:#fff;margin:10px}
```

### 3. Splitting CSS by Route
Instead of one giant `app.css`, load only the CSS needed for the current page.

```html
<!-- Only on the contact page -->
<link rel="stylesheet" href="/css/contact-page.css">
```

## Why It Matters

- **Rendering Performance**: Smaller CSS files mean faster CSSOM construction and quicker First Contentful Paint (FCP).
- **Network Efficiency**: Reducing file size lowers the time spent in the "download" phase of the network request.
- **Parsing Overhead**: Browsers must parse the entire CSS file even if only a fraction of the styles are used on the current page.
- **Mobile Experience**: Large files are particularly detrimental on mobile devices with limited CPU power and slower network connections.

## Best Practices

Use [PageSpeed Insights](https://pagespeed.web.dev/) or the browser coverage view after trimming CSS so you can confirm the route is actually shipping less render-blocking code instead of just reorganizing styles.

✅ **Use Minification**: Ensure your build process includes a CSS minifier like CSSNano.
✅ **Purge Unused Styles**: Use tools to remove CSS rules that aren't used in your HTML/templates.
✅ **Atomic CSS**: Consider methodologies like Tailwind CSS which encourage highly reusable, small utility classes.
✅ **Inline Critical CSS**: Inline the styles for the above-the-fold content to eliminate a network request.

❌ **Don't Include Large Frameworks Whole**: Avoid linking to the full Bootstrap or Foundation CDN files if you only use a few components.
❌ **Avoid Deep Nesting in Preprocessors**: Deeply nested Sass/Less can generate unnecessarily long and complex CSS selectors, increasing file size.

## Tools & Validation

- [PurgeCSS](https://purgecss.com/): Remove unused CSS from your bundles.
- [CSSNano](https://cssnano.co/): A modular minifier based on PostCSS.
- **Chrome DevTools Coverage Tab**: Identify exactly what percentage of your CSS is unused on the current page.
- [Lighthouse](https://developers.google.com/web/tools/lighthouse): Warns about large CSS files and unused CSS rules.

## Verification

### Automated Checks

- Measure the affected page or flow in Lighthouse, PageSpeed Insights, or DevTools and confirm the targeted metric improves.
- Inspect the network waterfall or performance timeline to confirm the intended resource or execution change actually took effect.

### Manual Checks

- Verify the change on a throttled mobile profile, not just local desktop.
- If this rule maps to a budget or Web Vital, confirm the page now stays within that threshold.