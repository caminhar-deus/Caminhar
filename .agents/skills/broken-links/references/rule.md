# Resolve internal broken links

> Detects and fixes internal links that return 404 or 5xx errors to improve user experience.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
A healthy internal link structure is vital for both user navigation and efficient search engine indexing.

## Code Example

```html
<!-- Check your internal links regularly -->
<nav aria-label="Main Menu">
  <ul>
    <!-- ❌ Bad: Points to a non-existent page -->
    <li><a href="/our-servicez">Services</a></li>
    
    <!-- ✅ Good: Points to the correct, live URL -->
    <li><a href="/services">Services</a></li>
  </ul>
</nav>
```

## Why It Matters

- **User Satisfaction**: Prevents users from hitting dead ends, which reduces frustration and bounce rates.
- **Crawl Efficiency**: Ensures that search engine bots spend their time on your valuable, live content instead of error pages.
- **Site Authority**: A lack of broken links is a sign of a well-maintained, high-quality website.
- **Link Equity**: Ensures that 'link juice' flows correctly through your site to your most important pages.

## Exceptions

- Staging, utility, login, account, or internal search pages may intentionally use different crawl or index signals if they are not meant to rank.
- Temporary migration states can produce noisy intermediate signals; flag the live production URL pattern, not one-off transition artifacts.
- When redirects, canonicals, robots directives, or indexability signals conflict, fix the strongest final signal first instead of reporting every downstream symptom as a separate blocker.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Search Essentials before treating the rule as satisfied.
- Check the implementation against Google Search Central documentation before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.