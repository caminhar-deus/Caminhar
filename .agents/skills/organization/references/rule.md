# Add Organization schema markup

> Validates Organization schema for brand presence

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
`Organization` schema is JSON-LD markup that describes your brand to search engines. Google uses it to populate the Knowledge Panel for branded searches — the info box that appears on the right side of search results.

## Code Examples

```html
<!-- ✅ Good: Complete Organization schema on homepage -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Acme Corporation",
  "url": "https://acme.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://acme.com/images/logo.png",
    "width": 200,
    "height": 60
  },
  "description": "Acme Corporation makes innovative tools for professionals.",
  "foundingDate": "2010",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-555-000-0000",
    "contactType": "customer service",
    "availableLanguage": ["English", "Spanish"]
  },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "1 Acme Way",
    "addressLocality": "San Francisco",
    "addressRegion": "CA",
    "postalCode": "94105",
    "addressCountry": "US"
  },
  "sameAs": [
    "https://www.linkedin.com/company/acme",
    "https://twitter.com/acme",
    "https://www.facebook.com/acme",
    "https://www.youtube.com/@acme",
    "https://en.wikipedia.org/wiki/Acme_Corporation"
  ]
}
</script>
```

```html
<!-- ❌ Bad: Missing logo and sameAs — minimal value -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Acme"
}
</script>
```

## Why It Matters

Organization schema helps Google understand your brand, populate your Knowledge Panel with accurate information (logo, social links, contact details), and improve brand-related search appearance.

## Required Properties

| Property | Type | Example |
|----------|------|---------|
| `@type` | Text | `"Organization"` or `"Corporation"` |
| `name` | Text | `"Acme Corporation"` |
| `url` | URL | `"https://acme.com"` |
| `logo` | ImageObject | see below |

## Recommended Properties

| Property | Purpose |
|----------|---------|
| `sameAs` | Links to social profiles — helps Google verify identity |
| `contactPoint` | Customer service phone/email |
| `foundingDate` | Year founded |
| `numberOfEmployees` | Company size |
| `address` | Headquarters address |
| `description` | Short organisation description |

## Logo Requirements

Google's logo guidelines for Organization schema:
- Recommended size: at least 112×112 px, up to 1000×1000 px
- Aspect ratio should be square-ish (not extremely wide banners)
- Use a stable, permanent URL (no CDN versioning that changes frequently)
- JPEG, PNG, or WebP formats

## Next.js Implementation

```tsx
// app/page.tsx (homepage only)

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Acme Corporation',
    url: 'https://acme.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://acme.com/logo.png',
      width: 200,
      height: 60,
    },
    sameAs: [
      'https://www.linkedin.com/company/acme',
      'https://twitter.com/acme',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      {/* page content */}
    </>
  )
}
```

## Placement

Place Organization schema **only on the homepage**. Adding it to every page dilutes its signal and may confuse crawlers. If you also use LocalBusiness schema, it can coexist on the same page.

## Validation

Test with [Google's Rich Results Test](https://search.google.com/test/rich-results) to confirm valid markup.

## Exceptions

- Only add or enforce schema types that the page can truthfully support; irrelevant structured data is worse than no structured data.
- A technically valid schema block can still be misleading if the page content does not visibly back it up; audit rendered content and schema together.
- If indexability, canonical-url, or main content quality is wrong, fix that foundation before optimizing schema details.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.