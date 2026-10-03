# Add LocalBusiness schema markup

> Validates LocalBusiness schema for local SEO

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
`LocalBusiness` schema is JSON-LD structured data that tells search engines the key facts about a physical business: name, address, phone, hours, and location. [Google's local business structured data documentation](https://developers.google.com/search/docs/appearance/structured-data/local-business) and visible [NAP consistency](/en/rules/seo/nap-consistency) should reinforce the same business details.

## Code Examples

```html
<!-- ✅ Good: Complete LocalBusiness schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "Mario's Pizzeria",
  "url": "https://mariospizzeria.com",
  "telephone": "+1-555-123-4567",
  "image": "https://mariospizzeria.com/images/storefront.jpg",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main Street",
    "addressLocality": "Springfield",
    "addressRegion": "IL",
    "postalCode": "62701",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 39.7817,
    "longitude": -89.6501
  },
  "openingHours": [
    "Mo-Fr 11:00-22:00",
    "Sa-Su 12:00-23:00"
  ],
  "hasMap": "https://maps.google.com/?cid=1234567890"
}
</script>
```

```html
<!-- ❌ Bad: Missing address details, no telephone -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Mario's"
}
</script>
```

## Why It Matters

LocalBusiness schema enables Google to show your business details (hours, address, phone, rating) directly in search results and Google Maps, improving local visibility without requiring a click. The underlying vocabulary comes from [Schema.org's LocalBusiness type](https://schema.org/LocalBusiness), but the page still needs matching on-page business information.

## Required Properties

| Property | Type | Example |
|----------|------|---------|
| `@type` | Text | `"Restaurant"` or `"LocalBusiness"` |
| `name` | Text | `"Mario's Pizzeria"` |
| `address` | PostalAddress | see below |
| `telephone` | Text | `"+1-555-123-4567"` |
| `url` | URL | `"https://example.com"` |

## Recommended Properties

| Property | Purpose |
|----------|---------|
| `openingHours` | Business hours (Mo-Fr 09:00-17:00) |
| `geo` | GeoCoordinates (latitude/longitude) |
| `image` | Business photo URL |
| `priceRange` | Price range symbol ($ to $$$$) |
| `currenciesAccepted` | Currency codes |
| `paymentAccepted` | Cash, Credit Card, etc. |
| `areaServed` | Geographic area |

## LocalBusiness Sub-Types

Use the most specific type available:

- `Restaurant`, `CafeOrCoffeeShop`, `FastFoodRestaurant`
- `DentalClinic`, `Physician`, `Hospital`
- `AutoDealer`, `AutoRepair`
- `Hotel`, `LodgingBusiness`
- `ShoppingCenter`, `Store`, `ClothingStore`
- `Gym`, `SportsActivityLocation`

Full list: [Schema.org LocalBusiness hierarchy](https://schema.org/LocalBusiness)

## Next.js Implementation

```tsx
// app/layout.tsx or app/page.tsx

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'My Business',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '123 Main St',
      addressLocality: 'Springfield',
      addressRegion: 'IL',
      postalCode: '62701',
      addressCountry: 'US',
    },
    telephone: '+1-555-000-0000',
    url: 'https://example.com',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {/* page content */}
    </>
  )
}
```

## Validation

Use [Google's Rich Results Test](https://search.google.com/test/rich-results) to confirm the schema is valid and eligible for rich results.

## Exceptions

- Only add or enforce schema types that the page can truthfully support; irrelevant structured data is worse than no structured data.
- A technically valid schema block can still be misleading if the page content does not visibly back it up; audit rendered content and schema together.
- If indexability, canonical-url, or main content quality is wrong, fix that foundation before optimizing schema details.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Schema.org: LocalBusiness before treating the rule as satisfied.
- Check the implementation against Google Search Central: Local business structured data before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.