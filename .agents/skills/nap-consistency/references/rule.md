# Keep NAP details consistent

> Checks for consistent Name, Address, Phone across site

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
NAP stands for **Name, Address, Phone**. These three pieces of information must be identical across every page of your website, your [Google Business Profile](https://business.google.com), and external directory listings, especially when they also feed into [LocalBusiness schema](/en/rules/seo/local-business).

## Code Example

Google cross-references business information from multiple sources to confirm a business's legitimacy and location. Inconsistencies — even minor formatting differences — create data confidence issues:

```
❌ Footer says:    "123 Main St, Suite 4"
❌ Contact says:   "123 Main Street, Ste 4"
❌ Schema says:    "123 Main Street Suite 4"
✅ All should say: "123 Main Street, Suite 4" (pick one, use everywhere)
```

## Why It Matters

Inconsistent NAP information across a website signals to search engines that the business details are unreliable. That inconsistency can suppress local rankings and undermine the same entity confidence described in [Schema.org PostalAddress](https://schema.org/PostalAddress).

## Common Inconsistency Patterns

| Element | Inconsistent | Consistent |
|---------|-------------|-----------|
| Phone format | `555-123-4567` vs `(555) 123-4567` | Pick one format |
| Street abbrev. | `St.` vs `Street` | Pick one |
| Suite notation | `Suite 4` vs `Ste 4` vs `#4` | Pick one |
| Business name | `Mario's Pizzeria` vs `Mario's Pizza` | Exact match |
| State | `IL` vs `Illinois` | Pick one |

## Where to Check

1. **Footer** — most sites display NAP in the footer
2. **Contact page** — dedicated contact information
3. **About page** — often includes address and phone
4. **JSON-LD schema** — `LocalBusiness` or `Organization` markup
5. **Google Business Profile** — must match site exactly
6. **Page titles / headers** for multi-location sites

## Correct Implementation

```html
<!-- ✅ Consistent NAP in HTML (footer) -->
<address>
  <span itemprop="name">Mario's Pizzeria</span><br />
  <span itemprop="streetAddress">123 Main Street, Suite 4</span><br />
  <span itemprop="addressLocality">Springfield</span>,
  <span itemprop="addressRegion">IL</span>
  <span itemprop="postalCode">62701</span><br />
  <a href="tel:+15551234567" itemprop="telephone">(555) 123-4567</a>
</address>
```

```json
// ✅ Matching JSON-LD schema
{
  "@type": "LocalBusiness",
  "name": "Mario's Pizzeria",
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
```

## Multi-Location Sites

Each location should have its own dedicated page with that location's NAP:

```
/locations/springfield/  — Springfield NAP
/locations/chicago/      — Chicago NAP
```

Never mix multiple location NAPs on a single page.

## Audit Process

1. Export all instances of your phone number from the site using a site-wide text search
2. Export all instances of your street address
3. Compare formats — create a canonical-url format document
4. Update all pages to match the canonical-url format
5. Update Google Business Profile to match

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