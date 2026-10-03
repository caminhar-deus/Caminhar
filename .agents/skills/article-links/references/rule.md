# Optimize article link density

> Ensures articles have a healthy balance of internal and external links relative to their length.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Linking to other pages—both on your own site and on others—is a fundamental part of the web that search engines use to discover and rank content.

## Code Example

```html
<article>
  <p>According to a recent study by <a href="https://example-authority.com/study" rel="noopener noreferrer" target="_blank">Industry Research Group</a>, 70% of users prefer mobile-friendly websites.</p>
  
  <p>To help you optimize your site, check out our <a href="/blog/mobile-optimization">guide to mobile performance</a>.</p>
</article>
```

## Why It Matters

- **Topical Authority**: Linking to high-quality external sites shows your content is well-researched.
- **Crawlability**: Internal links help search engine bots find and index deeper pages on your site.
- **Reduced Bounce Rate**: Internal links encourage users to explore more of your site, increasing time-on-page.
- **User Value**: Providing links to further reading or cited sources improves the overall helpfulness of your content.

## Exceptions

- Only add or enforce schema types that the page can truthfully support; irrelevant structured data is worse than no structured data.
- A technically valid schema block can still be misleading if the page content does not visibly back it up; audit rendered content and schema together.
- If indexability, canonical-url, or main content quality is wrong, fix that foundation before optimizing schema details.

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