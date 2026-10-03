# Link to active social profiles

> Checks for links to the organization's social media profiles to help search engines connect the site to its social entity and build E-E-A-T signals.

**Priority:** low · **Difficulty:** beginner · **Time:** 10 min

---
Linking to your organization's social media profiles helps search engines connect your website to your brand entity across the web. [Schema.org's `sameAs`](https://schema.org/sameAs) and [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization) are the main mechanisms that turn those profile URLs into a coherent entity signal.

## Code Example

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Acme Inc.",
  "url": "https://www.acme.com",
  "logo": "https://www.acme.com/logo.png",
  "sameAs": [
    "https://www.linkedin.com/company/acme-inc",
    "https://twitter.com/AcmeInc",
    "https://www.facebook.com/AcmeInc",
    "https://www.youtube.com/@AcmeInc",
    "https://github.com/acme-inc"
  ]
}
</script>
```

## Why It Matters

Google uses social profile links and `sameAs` schema to verify an organization's identity and build entity associations that strengthen E-E-A-T. The trust benefit is strongest when those profiles are active and align with broader [trust signals](/en/rules/seo/trust-signals).

## Personal Brand / Author

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Jane Smith",
  "url": "https://janesmith.dev",
  "sameAs": [
    "https://twitter.com/janesmith",
    "https://www.linkedin.com/in/janesmith",
    "https://github.com/janesmith"
  ]
}
</script>
```

## Footer Link Implementation

```html
<footer>
  <nav aria-label="Social media profiles">
    <a href="https://www.linkedin.com/company/acme" rel="noopener" target="_blank">
      LinkedIn
    </a>
    <a href="https://twitter.com/AcmeInc" rel="noopener" target="_blank">
      X (Twitter)
    </a>
    <a href="https://www.facebook.com/AcmeInc" rel="noopener" target="_blank">
      Facebook
    </a>
  </nav>
</footer>
```

## Active vs. Inactive Profiles

Only link to and list profiles that are:

- ✅ Regularly updated (at least monthly)
- ✅ Using the correct brand name and logo
- ✅ Verified/official accounts

Do not link to:
- ❌ Abandoned accounts (last post years ago)
- ❌ Personal accounts of former employees
- ❌ Unofficial or fan pages

An outdated linked profile signals poor brand maintenance and can undermine trust assessments.

## Platforms to Prioritize

| Platform | Best For |
|----------|---------|
| LinkedIn | B2B companies, professional services |
| X (Twitter) | Tech, media, developer brands |
| Facebook | Consumer businesses, local businesses |
| YouTube | Video-forward brands, tutorials |
| Instagram | Visual products, lifestyle brands |
| GitHub | Developer tools, open source |

Include all platforms where your organization has an established, active presence.

## Exceptions

- Local SEO guidance only applies when the business actually serves a geographic area or has public location information relevant to searchers.
- Service-area businesses may need service-area guidance instead of storefront-focused address markup or location-page patterns.
- Do not invent addresses, business categories, or geographic claims to satisfy local SEO recommendations; accuracy overrides completeness.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Schema.org: sameAs before treating the rule as satisfied.
- Check the implementation against Google: Organization structured data before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.