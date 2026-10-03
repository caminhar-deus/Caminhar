# Add hreflang tags for multilingual sites

> Hreflang tags indicate language and regional variations for multilingual sites.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
Hreflang tags help search engines serve the correct language version to users.

## Code Example

```html
<link rel="alternate" hreflang="language-region" href="URL" />
```

| Code | Meaning |
|------|---------|
| `en` | English (any region) |
| `en-US` | English (United States) |
| `en-GB` | English (United Kingdom) |
| `es` | Spanish (any region) |
| `es-ES` | Spanish (Spain) |
| `es-MX` | Spanish (Mexico) |
| `x-default` | Default/fallback page |

## Why It Matters

Without hreflang, users searching in French might see your English page—proper implementation ensures the right language version appears in search results for each region.

## Basic Implementation

```html
<head>
  <!-- Current page is English (US) -->
  <link rel="alternate" hreflang="en-US" href="https://example.com/en/about" />
  <link rel="alternate" hreflang="es-ES" href="https://example.com/es/sobre" />
  <link rel="alternate" hreflang="fr-FR" href="https://example.com/fr/a-propos" />
  <link rel="alternate" hreflang="x-default" href="https://example.com/about" />
</head>
```

## Next.js Implementation

```tsx
// app/[lang]/about/page.tsx

const LANGUAGES = {
  'en-US': '/en/about',
  'es-ES': '/es/sobre',
  'fr-FR': '/fr/a-propos',
}

  return {
    alternates: {
      languages: LANGUAGES,
    },
  }
}
```

```tsx
// Dynamic hreflang generation
// lib/seo.ts
interface HreflangConfig {
  baseUrl: string
  path: string
  translations: Record<string, string>
}

  const hreflangTags = Object.entries(translations).map(([locale, localePath]) => ({
    hreflang: locale,
    href: `${baseUrl}${localePath}`,
  }))

  // Add x-default pointing to main language
  hreflangTags.push({
    hreflang: 'x-default',
    href: `${baseUrl}${path}`,
  })

  return hreflangTags
}
```

## Reciprocal Links Requirement

```html
<!-- On English page (/en/about): -->
<link rel="alternate" hreflang="en-US" href="https://example.com/en/about" />
<link rel="alternate" hreflang="es-ES" href="https://example.com/es/sobre" />

<!-- On Spanish page (/es/sobre): -->
<link rel="alternate" hreflang="en-US" href="https://example.com/en/about" />
<link rel="alternate" hreflang="es-ES" href="https://example.com/es/sobre" />

<!-- Both pages must include both links! -->
```

## XML Sitemap Alternative

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://example.com/en/about</loc>
    <xhtml:link rel="alternate" hreflang="en-US" href="https://example.com/en/about"/>
    <xhtml:link rel="alternate" hreflang="es-ES" href="https://example.com/es/sobre"/>
    <xhtml:link rel="alternate" hreflang="fr-FR" href="https://example.com/fr/a-propos"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/about"/>
  </url>
  <url>
    <loc>https://example.com/es/sobre</loc>
    <xhtml:link rel="alternate" hreflang="en-US" href="https://example.com/en/about"/>
    <xhtml:link rel="alternate" hreflang="es-ES" href="https://example.com/es/sobre"/>
    <xhtml:link rel="alternate" hreflang="fr-FR" href="https://example.com/fr/a-propos"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/about"/>
  </url>
</urlset>
```

## Common Mistakes

```html
<!-- ❌ Bad: Invalid language code -->
<link rel="alternate" hreflang="english" href="..." />

<!-- ✅ Good: ISO 639-1 code -->
<link rel="alternate" hreflang="en" href="..." />

<!-- ❌ Bad: Non-reciprocal (missing on Spanish page) -->
<!-- English page links to Spanish, but Spanish doesn't link back -->

<!-- ❌ Bad: Self-referencing missing -->
<!-- Page doesn't include hreflang for its own language -->

<!-- ❌ Bad: Different domains without proper setup -->
<link rel="alternate" hreflang="de" href="https://example.de/about" />
<!-- Requires proper domain verification -->
```

## Regional Targeting Strategies

| Strategy | Example | Use When |
|----------|---------|----------|
| Language only | `hreflang="es"` | Same content for all Spanish speakers |
| Language + region | `hreflang="es-MX"` | Different content per region |
| Region with language fallback | Both `es-MX` and `es` | Regional variations with fallback |

## Standards

- Use these references as the standard for the rendered internationalization behavior, not just the source strings or config.
- Check the implementation against Google Search Central: Search Essentials before treating the rule as satisfied.
- Check the implementation against Google Search Central documentation before treating the rule as satisfied.

## Verification

### Automated Checks

- Use Google Search Console International Targeting report
- Validate with hreflang testing tools
- Check all pages have reciprocal links
- Test search results from different regions

### Manual Checks

- Verify x-default is present