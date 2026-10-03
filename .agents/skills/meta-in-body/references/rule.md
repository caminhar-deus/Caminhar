# Meta Tags in Body

> Detects meta tags incorrectly placed in document body

**Priority:** high · **Difficulty:** beginner · **Time:** 5 min

---
The `<meta>` element is a metadata element defined in the HTML specification as valid only within `<head>`. Placing meta tags in `<body>` makes them invisible to search engines and may trigger HTML parse errors.

## Code Examples

```html
<!-- ✅ Good: All meta tags inside <head> -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="index, follow" />
  <meta name="description" content="Page description here." />
  <meta property="og:title" content="Page Title" />
  <link rel="canonical" href="https://example.com/page" />
  <title>Page Title</title>
</head>
<body>
  <!-- page content only -->
</body>
</html>
```

```html
<!-- ❌ Bad: meta tags scattered in <body> -->
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Page Title</title>
</head>
<body>
  <meta name="robots" content="noindex" />   <!-- IGNORED by Google -->
  <meta property="og:title" content="..." /> <!-- IGNORED by Facebook -->
  <div id="content">...</div>
</body>
</html>
```

## Why It Matters

Meta tags placed in the document body are ignored by search engines and most browsers—directives like noindex or canonical-url are silently ineffective, causing pages to be indexed or de-indexed unexpectedly.

## Why This Happens

- CMS plugins inject meta tags via JavaScript after the DOM loads, targeting `document.body`
- Template includes are assembled in the wrong order
- Dynamic rendering injects tags with `innerHTML` into a container inside `<body>`
- Copy-pasted snippets are added to the wrong section of a template

## Fixing JavaScript Injection

```js
// ❌ Bad: injecting into body
document.body.innerHTML += '<meta name="robots" content="noindex">';

// ✅ Good: inject into head
const meta = document.createElement('meta');
meta.name = 'robots';
meta.content = 'noindex';
document.head.appendChild(meta);
```

## Framework-Specific Notes

**Next.js**: Use the `metadata` export or `` component from `@unhead/vue`.

**WordPress**: Use `wp_head` action hook; never `wp_footer` or manual body injection.

## Detection

```bash
# Check rendered HTML for meta tags outside <head>
# Look for <meta> tags that appear after </head> or inside <body>
curl -s https://example.com/ | grep -o '<body.*<meta[^>]*>' | head
```

Use the [W3C Markup Validator](https://validator.w3.org/) or browser DevTools → Elements tab to inspect where meta tags are actually rendered in the DOM.

## Exceptions

- Utility or intentionally noindex pages may keep minimal metadata when richer search presentation is not a goal.
- Template-driven pages can look repetitive in isolation; confirm the fully rendered production output before flagging duplication or omission.
- If a page is intentionally redirected or excluded from indexation, resolve that crawlability decision before treating metadata polish as the primary issue.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against HTML Living Standard: The meta element before treating the rule as satisfied.
- Check the implementation against MDN: `&lt;meta&gt;` — The metadata element before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.