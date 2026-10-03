# Add structured data markup

> Schema.org structured data (JSON-LD) is implemented for rich search results.

**Priority:** high · **Difficulty:** intermediate · **Time:** 25 min

---
Structured data helps search engines understand your content and enables rich results.

## Code Example

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Executive Widget",
  "description": "Premium quality widget for professionals",
  "image": "https://example.com/images/widget.jpg",
  "offers": {
    "@type": "Offer",
    "price": "49.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

## Why It Matters

Structured data enables rich snippets with stars, prices, images, and FAQ dropdowns in search results—significantly increasing click-through rates.

## Common Schema Types

| Type | Use For | Rich Result |
|------|---------|-------------|
| Article | Blog posts, news | Author, date, image |
| Product | E-commerce items | Price, rating, availability |
| FAQ | FAQ pages | Expandable questions |
| HowTo | Tutorials, guides | Step-by-step instructions |
| LocalBusiness | Physical locations | Map, hours, reviews |
| Organization | Company info | Logo, social profiles |
| BreadcrumbList | Navigation path | Breadcrumb trail |

## Article Schema

```tsx
// components/ArticleSchema.tsx
interface ArticleSchemaProps {
  title: string
  description: string
  image: string
  datePublished: string
  dateModified: string
  author: string
  url: string
}

  title,
  description,
  image,
  datePublished,
  dateModified,
  author,
  url,
}: ArticleSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image,
    datePublished,
    dateModified,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Example Company',
      logo: {
        '@type': 'ImageObject',
        url: 'https://example.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

## Product Schema

```tsx
interface ProductSchemaProps {
  name: string
  description: string
  image: string
  price: number
  currency: string
  availability: 'InStock' | 'OutOfStock' | 'PreOrder'
  rating?: number
  reviewCount?: number
  brand?: string
  sku?: string
}

  name,
  description,
  image,
  price,
  currency,
  availability,
  rating,
  reviewCount,
  brand,
  sku,
}: ProductSchemaProps) {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    sku,
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
    },
  }

  if (rating && reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      reviewCount,
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

## FAQ Schema

```tsx
interface FAQItem {
  question: string
  answer: string
}

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

## Breadcrumb Schema

```tsx
interface BreadcrumbItem {
  name: string
  url: string
}

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

## Organization Schema

```tsx

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Example Company',
    url: 'https://example.com',
    logo: 'https://example.com/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-555-555-5555',
      contactType: 'customer service',
    },
    sameAs: [
      'https://twitter.com/example',
      'https://www.linkedin.com/company/example',
      'https://github.com/example',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

## Next.js App Router Integration

```tsx
// app/blog/[slug]/page.tsx

  const post = await getPost(params.slug)

  return (
    <>
      
      <article>{/* Content */}</article>
    </>
  )
}
```

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Search Essentials before treating the rule as satisfied.
- Check the implementation against Google Search Central documentation before treating the rule as satisfied.

## Verification

### Automated Checks

- Use [Google Rich Results Test](https://search.google.com/test/rich-results)
- Validate with Schema Markup Validator
- Check Google Search Console for errors
- Test in multiple browsers

### Manual Checks

- Verify JSON syntax is valid