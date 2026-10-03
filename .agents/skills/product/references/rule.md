# Add Product schema markup

> Validates Product schema for e-commerce

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
Product schema markup enables Google to display rich results for your product pages, showing price, availability, ratings, and images directly in search results. [Google's product structured data guide](https://developers.google.com/search/docs/appearance/structured-data/product) and [valid JSON-LD](/en/rules/seo/json-ld-valid) need to line up for those rich results to work reliably.

## Code Examples

```html
<!-- ✅ Good: Complete Product schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Cast Iron Dutch Oven 5.5 Qt",
  "image": [
    "https://example.com/images/dutch-oven-front.jpg",
    "https://example.com/images/dutch-oven-top.jpg"
  ],
  "description": "Pre-seasoned cast iron Dutch oven with enamel coating. Perfect for sourdough baking and slow cooking.",
  "sku": "DO-55-BLK",
  "mpn": "DO550BK",
  "brand": {
    "@type": "Brand",
    "name": "BakeCo"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/products/dutch-oven",
    "priceCurrency": "USD",
    "price": 49.99,
    "priceValidUntil": "2026-12-31",
    "itemCondition": "https://schema.org/NewCondition",
    "availability": "https://schema.org/InStock",
    "shippingDetails": {
      "@type": "OfferShippingDetails",
      "shippingRate": {
        "@type": "MonetaryAmount",
        "value": 0,
        "currency": "USD"
      },
      "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": {
          "@type": "QuantitativeValue",
          "minValue": 0,
          "maxValue": 1,
          "unitCode": "DAY"
        },
        "transitTime": {
          "@type": "QuantitativeValue",
          "minValue": 3,
          "maxValue": 5,
          "unitCode": "DAY"
        }
      }
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.7,
    "reviewCount": 283
  },
  "review": [
    {
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": 5
      },
      "author": {
        "@type": "Person",
        "name": "Jane Smith"
      },
      "reviewBody": "Excellent Dutch oven — my sourdough has improved dramatically."
    }
  ]
}
</script>
```

```html
<!-- ❌ Bad: Missing offers, no image array -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Dutch Oven"
}
</script>
```

## Why It Matters

Product schema enables Google to show price, availability, ratings, and review count directly in search results. The vocabulary itself comes from [Schema.org Product](https://schema.org/Product), but the page still needs matching visible product data and pricing.

## Rich Results Eligibility

Google can show the following for products with valid schema:
- Price and currency
- Availability (In Stock / Out of Stock)
- Star ratings and review count
- Product images in image search
- Merchant listing experiences in Google Shopping

## Required Properties (for Rich Results)

| Property | Type | Example |
|----------|------|---------|
| `name` | Text | `"Cast Iron Dutch Oven 5.5 Qt"` |
| `image` | URL or Array | `["https://example.com/oven.jpg"]` |
| `description` | Text | Product description |
| `offers` | Offer | Price and availability object |
| `offers.price` | Number | `49.99` |
| `offers.priceCurrency` | Text | `"USD"` |
| `offers.availability` | URL | `"https://schema.org/InStock"` |

## Availability Values

```
https://schema.org/InStock
https://schema.org/OutOfStock
https://schema.org/PreOrder
https://schema.org/BackOrder
https://schema.org/Discontinued
```

## Next.js Implementation

```tsx
// app/products/[slug]/page.tsx

  const product = await getProduct(params.slug)

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images,
    description: product.description,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {/* product page content */}
    </>
  )
}
```

## Critical Rules

- Prices in schema must exactly match visible page prices
- Don't fake review counts or ratings
- Update `priceValidUntil` when running time-limited promotions
- Use `AggregateRating` only if you actually have user reviews

Google's Product rich result guidelines require that prices in structured data match the price visible on the page. Discrepancies can result in a manual action or loss of rich result eligibility.

## Exceptions

- Only add or enforce schema types that the page can truthfully support; irrelevant structured data is worse than no structured data.
- A technically valid schema block can still be misleading if the page content does not visibly back it up; audit rendered content and schema together.
- If indexability, canonical-url, or main content quality is wrong, fix that foundation before optimizing schema details.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Product structured data before treating the rule as satisfied.
- Check the implementation against Schema.org: Product before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.