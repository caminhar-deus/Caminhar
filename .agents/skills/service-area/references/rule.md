# Service Area Pages

> Checks for properly structured service-area or location pages for businesses serving multiple geographic regions.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Service-area pages help businesses rank for location-based searches in cities where they operate but have no physical address. [Google's doorway-page policy](https://developers.google.com/search/docs/essentials/spam-policies#doorway-pages) is the key boundary here, and the strongest implementations usually pair service pages with [LocalBusiness schema](/en/rules/seo/local-business).

## Code Example

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Plumber",
  "name": "Acme Plumbing",
  "url": "https://acmeplumbing.com",
  "telephone": "+15121234567",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "100 Main St",
    "addressLocality": "Austin",
    "addressRegion": "TX",
    "postalCode": "78701",
    "addressCountry": "US"
  },
  "areaServed": [
    {
      "@type": "City",
      "name": "Austin"
    },
    {
      "@type": "City",
      "name": "Round Rock"
    },
    {
      "@type": "City",
      "name": "Cedar Park"
    }
  ]
}
</script>
```

## Why It Matters

Service-area pages allow businesses to rank for geo-modified queries in areas where they have no physical storefront, but thin templated pages are penalised as doorway pages. [Schema.org's `areaServed`](https://schema.org/areaServed) helps explain service coverage, while the visible page still needs unique local value.

## What Makes a Good Service-Area Page

✅ **Unique, locally relevant content**:
- Description of services specific to that region
- Local regulations or considerations (e.g., "Austin plumbing codes require...")
- Client testimonials or case studies from that area
- Local contact information (or a local phone number)
- References to local landmarks, neighborhoods, or context

❌ **Thin, templated clones** (doorway pages):
- Same content with only the city name swapped
- No unique value beyond what the main services page offers
- No local signals or specifics

## URL Structure

```
/services/plumbing/austin-tx
/services/plumbing/round-rock-tx
/services/plumbing/cedar-park-tx
```

Each should have its own unique `<title>`, `<meta description>`, `<h1>`, and body content.

## ✅ Content Checklist Per Service-Area Page

- [ ] Unique `<title>`: `[Service] in [City, State] | [Brand]`
- [ ] Unique `<h1>` referencing the service and location
- [ ] At least 300 words of unique body content
- [ ] At least one local-specific detail (testimonial, local project, area reference)
- [ ] LocalBusiness schema with `areaServed` for that city
- [ ] Local phone number or service-area note
- [ ] Internal links to the main service page and the homepage

## Google's Doorway Page Policy

Google's spam policies explicitly identify "many similar pages targeting different geographic regions" as a doorway page pattern when the pages don't add unique value. The distinguishing factor is whether "users would prefer to land on that page rather than the intermediate page as part of a search result."

## Exceptions

- Local SEO guidance only applies when the business actually serves a geographic area or has public location information relevant to searchers.
- Service-area businesses may need service-area guidance instead of storefront-focused address markup or location-page patterns.
- Do not invent addresses, business categories, or geographic claims to satisfy local SEO recommendations; accuracy overrides completeness.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: LocalBusiness structured data before treating the rule as satisfied.
- Check the implementation against Schema.org: areaServed before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.