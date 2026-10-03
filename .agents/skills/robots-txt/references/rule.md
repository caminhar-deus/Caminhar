# Publish a robots.txt file

> Checks if robots.txt exists at the root, is accessible, and contains valid directives.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
`robots.txt` is a plain-text file at the root of your domain that tells crawlers which paths they are allowed to access. All major search engines respect it before crawling any other resource.

## Code Example

```
User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /

Sitemap: https://www.example.com/sitemap.xml
```

## Why It Matters

robots.txt is the first file crawlers fetch; misconfigured directives can silently block search engines from crawling your entire site, killing organic visibility.

## Common Mistakes

#

## ❌ Blocking the entire site

```
User-agent: *
Disallow: /
```

This prevents any page from being crawled and indexed. Remove or replace with specific paths.

### ❌ Blocking CSS and JavaScript

```
User-agent: Googlebot
Disallow: /assets/
```

Googlebot renders pages with JavaScript. Blocking `/assets/` prevents it from seeing your actual content.

### ✅ Blocking admin and internal paths only

```
User-agent: *
Disallow: /admin/
Disallow: /cart/
Disallow: /checkout/
Allow: /

User-agent: Googlebot-Image
Disallow: /images/internal/

Sitemap: https://www.example.com/sitemap.xml
```

## Rules

- The file must be served at exactly `/robots.txt` on the production domain
- Return HTTP 200; a 404 or 5xx tells Google there are no restrictions (Google treats 4xx as "no restrictions"; 5xx blocks crawling)
- `User-agent: *` applies to all crawlers; use specific bot names for targeted rules
- `Disallow:` with an empty value means "allow everything" — this is the default
- The `Sitemap:` directive must be an absolute URL

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: robots.txt introduction before treating the rule as satisfied.
- Check the implementation against Robots Exclusion Protocol (RFC 9309) before treating the rule as satisfied.

## Verification

### Automated Checks

- Use [Google Search Console](https://search.google.com/search-console/about) → Settings → Robots.txt tester
- Fetch `/robots.txt` directly in a browser on the production domain
- Use `curl -I "$ORIGIN/robots.txt"` against the live host to confirm the production file returns HTTP 200

### Manual Checks

- Review representative live pages manually and confirm there is no stronger conflicting signal that changes the intended SEO outcome.