# Display a physical business address

> Checks for visible physical address information

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
A physical address on your website serves multiple purposes: it establishes trust with users, satisfies legal disclosure requirements, and is a key signal for local SEO.

## Code Examples

```html
<!-- ✅ Good: Complete address in <address> element -->
<address>
  <strong>Acme Corporation</strong><br />
  123 Main Street, Suite 4<br />
  Springfield, IL 62701<br />
  United States<br />
  <a href="tel:+15551234567">(555) 123-4567</a><br />
  <a href="mailto:info@acme.com">info@acme.com</a>
</address>
```

```html
<!-- ❌ Bad: Address in generic div, no semantic markup -->
<div class="footer-contact">
  123 Main St. | Springfield | IL
</div>
```

## Why It Matters

A visible physical address builds user trust (especially for e-commerce and YMYL sites), supports local SEO rankings, and is a requirement for compliance in many jurisdictions.

## Where to Display the Address

| Location | Required? |
|----------|----------|
| Contact page | Yes |
| Footer (every page) | Strongly recommended |
| About page | Recommended |
| LocalBusiness schema | Yes (structured data) |

## With HTML Microdata

```html
<div itemscope itemtype="https://schema.org/LocalBusiness">
  <span itemprop="name">Acme Corporation</span>
  <address itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
    <span itemprop="streetAddress">123 Main Street, Suite 4</span><br />
    <span itemprop="addressLocality">Springfield</span>,
    <span itemprop="addressRegion">IL</span>
    <span itemprop="postalCode">62701</span><br />
    <span itemprop="addressCountry">US</span>
  </address>
  <a itemprop="telephone" href="tel:+15551234567">(555) 123-4567</a>
</div>
```

## JSON-LD (Preferred)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Acme Corporation",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main Street, Suite 4",
    "addressLocality": "Springfield",
    "addressRegion": "IL",
    "postalCode": "62701",
    "addressCountry": "US"
  },
  "telephone": "+1-555-123-4567"
}
</script>
```

## Address Format Consistency

The address displayed on the page must exactly match:
1. Your Google Business Profile
2. Your LocalBusiness JSON-LD schema
3. Any other directory listings (Yelp, Yellow Pages, etc.)

Even minor differences like `St.` vs `Street` reduce local SEO confidence.

## Legal Requirements

Many jurisdictions require websites to display a business address:
- EU: Required under the e-Commerce Directive and various national laws
- UK: Required under The Electronic Commerce Regulations 2002
- US: Required for certain regulated industries and e-commerce

Always display the registered business address, not a PO Box for these purposes.

## Exceptions

- Local SEO guidance only applies when the business actually serves a geographic area or has public location information relevant to searchers.
- Service-area businesses may need service-area guidance instead of storefront-focused address markup or location-page patterns.
- Do not invent addresses, business categories, or geographic claims to satisfy local SEO recommendations; accuracy overrides completeness.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.