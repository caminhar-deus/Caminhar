# Fix or remove broken external links

> Detects and resolves external links that return error codes or have timed out.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Maintaining the integrity of your outbound links is essential for a high-quality user experience and professional site reputation.

## Code Example

```html
<!-- Regular auditing is required -->
<article>
  <p>
    <!-- ✅ Good: Updated link to a live resource -->
    Learn more in the <a href="https://modern-docs.com/guide">latest documentation</a>.
    
    <!-- ❌ Bad: Linking to a known broken or archived resource without context -->
    Read this <a href="https://dead-site.com/old-post">old post</a>.
  </p>
</article>
```

## Why It Matters

- **User Experience**: Prevents visitors from encountering frustrating "Page Not Found" errors when following your references.
- **Site Quality**: A high frequency of broken links suggests to search engines that the site is abandoned or not regularly audited.
- **SEO Authority**: Linking to high-quality, live resources is a positive signal; linking to dead ends is a negative one.
- **Security**: Expired domains you link to can be bought by malicious actors to serve malware or phishing content.

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