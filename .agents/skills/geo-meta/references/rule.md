# Geo Meta Tags

> Checks for geographic meta tags for local or regional targeting

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Geo meta tags are HTML meta elements that declare a page's geographic region, place name, and coordinates. They are a lightweight regional signal, primarily relevant for Bing, and should sit behind stronger systems such as [hreflang](/en/rules/i18n/hreflang) and Google's international targeting guidance.

## Code Examples

#

## ❌ Avoid — incorrect format

```html
<!-- Wrong: using full country name instead of ISO code -->
<meta name="geo.region" content="United States, California">

<!-- Wrong: comma separator instead of semicolon for geo.position -->
<meta name="geo.position" content="37.7749, -122.4194">
```

### ✅ Correct — properly formatted geo meta tags

```html
<head>
  <!-- ISO 3166-2 region code: country-subdivision -->
  <meta name="geo.region" content="US-CA">

  <!-- Human-readable city/place name -->
  <meta name="geo.placename" content="San Francisco, California">

  <!-- Coordinates: latitude;longitude (semicolon separator) -->
  <meta name="geo.position" content="37.7749;-122.4194">

  <!-- ICBM: same coordinates, comma separator (legacy tag) -->
  <meta name="ICBM" content="37.7749, -122.4194">
</head>
```

### ✅ Common ISO 3166-2 region codes

```html
<!-- United Kingdom — England -->
<meta name="geo.region" content="GB-ENG">

<!-- United States — New York -->
<meta name="geo.region" content="US-NY">

<!-- Germany — Bavaria -->
<meta name="geo.region" content="DE-BY">

<!-- Australia — New South Wales -->
<meta name="geo.region" content="AU-NSW">
```

### ✅ Complete local targeting stack (recommended)

```html
<head>
  <!-- Geo meta tags (Bing signal) -->
  <meta name="geo.region" content="US-CA">
  <meta name="geo.placename" content="San Francisco">
  <meta name="geo.position" content="37.7749;-122.4194">
  <meta name="ICBM" content="37.7749, -122.4194">
</head>

<!-- LocalBusiness JSON-LD (Google signal — more impactful) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Acme Corp SF",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "San Francisco",
    "addressRegion": "CA",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 37.7749,
    "longitude": -122.4194
  }
}
</script>
```

## Why It Matters

While Google does not officially support geo meta tags, Bing and other search engines may use them for geographic targeting. [Bing Webmaster Tools](https://learn.microsoft.com/bingwebmaster/) make them more relevant there, while Google-focused local targeting still relies more on [LocalBusiness schema](/en/rules/seo/local-business) and NAP consistency.

## Important Context

Google does not use geo meta tags as a documented ranking signal. For Google-focused geo targeting:
- Use **hreflang** for language/regional variants
- Use **LocalBusiness JSON-LD** for local business signals
- Use **Google Search Console's International Targeting** settings for country targeting, alongside the broader [international targeting documentation](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)

Geo meta tags remain useful for Bing and as a supplementary signal for regional pages.

## When to Use Geo Meta Tags

- Regional news sites targeting readers in a specific area
- Service businesses operating in a defined geographic area
- E-commerce sites with country-specific inventory or pricing
- Any site that benefits from Bing's geo-targeting features

When your primary search engine target is Google, invest more in hreflang configuration and LocalBusiness structured data.

## Exceptions

- Local SEO guidance only applies when the business actually serves a geographic area or has public location information relevant to searchers.
- Service-area businesses may need service-area guidance instead of storefront-focused address markup or location-page patterns.
- Do not invent addresses, business categories, or geographic claims to satisfy local SEO recommendations; accuracy overrides completeness.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Bing Webmaster Guidelines before treating the rule as satisfied.
- Check the implementation against Google Search Central: International targeting before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.