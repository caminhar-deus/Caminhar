# Fix invalid links

> Detects malformed, empty, or syntactically invalid link formats on the page

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Not all `<a>` elements are crawlable by Googlebot. [Google's crawlable-link documentation](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) requires a valid `href`, so malformed anchors break discovery in the same way they undermine broader [internal linking](/en/rules/seo/internal-links).

## Code Examples

#

## ❌ Avoid — JavaScript void href (not crawlable)

```html
<a href="javascript:void(0)" onclick="navigate('/products')">Products</a>
<!-- Googlebot sees href="javascript:void(0)" and does not follow -->
```

### ❌ Avoid — missing href attribute

```html
<a onclick="goToPage('/about')">About Us</a>
<!-- No href: Googlebot cannot follow this link -->
```

### ❌ Avoid — empty href

```html
<a href="">Home</a>
<!-- Empty href: not a valid crawlable link -->
```

### ❌ Avoid — div/span navigation (common in SPAs)

```html
<div onclick="router.push('/contact')" class="nav-link">Contact</div>
<!-- Not an <a> element: completely invisible to crawlers -->
```

### ✅ Correct — valid crawlable link

```html
<a href="/products">Products</a>
<a href="https://example.com/about">About Us</a>
<a href="/contact">Contact</a>
```

### ✅ Correct — JavaScript-enhanced link that stays crawlable

```html
<!-- href provides the URL for crawlers; JS enhances the UX -->
<a href="/products/modal-details" onclick="openModal(event, '/products/modal-details')">
  View Details
</a>

<script>
function openModal(event, url) {
  event.preventDefault()
  // Open modal instead of navigating
  showModal(url)
}
</script>
```

### ✅ Correct — fragment links with valid targets

```html
<!-- The fragment must match an existing id on the page -->
<a href="#features">Jump to Features</a>

<section id="features">  <!-- id="features" exists -->
  <h2>Features</h2>
</section>
```

### ✅ Correct — React Router / Next.js links

```tsx
// ✅ React Router — renders as <a href="/products">
Products

// ✅ Next.js — renders as <a href="/about">
About Us

// ❌ Avoid — useNavigate without a corresponding <a>
<button onClick={() => navigate('/products')}>Products</button>
// This is not crawlable; use ` elements may never be discovered by Googlebot, even if the route exists in your frontend router.
- **PageRank blocking**: Invalid links cannot pass PageRank to destination pages.
- **Accessibility**: Invalid links also fail accessibility checks — screen readers and keyboard users cannot navigate them, and the underlying HTML behavior is covered in [MDN's anchor element reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a).

## Link Validity Rules (Google)

Google's crawlers can follow links that:
- Are `<a>` elements (not `<div>`, `<span>`, or `<button>` with click handlers)
- Have an `href` attribute
- Have an `href` value that is a valid relative or absolute URL (not `javascript:`, `void(0)`, or empty)

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Crawlable links before treating the rule as satisfied.
- Check the implementation against MDN: The anchor element before treating the rule as satisfied.

## Verification

### Automated Checks

- Run a site crawl and filter for links that are not followed.

### Manual Checks

- Use browser DevTools to query: `document.querySelectorAll('a:not([href]), a[href=""], a[href^="javascript:"]')`
- Review SPA navigation patterns — ensure all navigation uses `` elements.