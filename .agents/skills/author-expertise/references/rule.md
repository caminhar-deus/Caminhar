# Highlight author credentials and expertise

> Checks for author bios and credentials to establish expertise and trust.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Providing evidence of an author's expertise helps validate the content and build trust with your audience.

## Code Example

```html
<section class="author-bio" aria-labelledby="author-name">
  <h3 id="author-name">About Jane Smith</h3>
  <p>
    <strong>Jane Smith</strong> is a Senior Security Researcher with over 15 years of experience. 
    She holds a CISSP certification and has led security audits for global technology firms.
  </p>
  <nav class="author-social" aria-label="Author social links">
    <a href="https://linkedin.com/in/janesmith" target="_blank" rel="noopener noreferrer">LinkedIn</a>
    <a href="https://twitter.com/janesmith" target="_blank" rel="noopener noreferrer">Twitter</a>
  </nav>
</section>
```

## Why It Matters

- **E-E-A-T**: Directly supports the "Expertise" pillar of Google's search quality guidelines.
- **User Trust**: Users are more likely to follow advice or purchase products when the information comes from a verified expert.
- **Conversion Rates**: Credible authors can significantly improve the conversion rate of informative or promotional content.
- **Brand Reputation**: Showcasing a team of experts builds the overall authority of your brand in your niche.

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

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.