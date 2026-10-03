# Cite authoritative external sources

> Checks for citations to reputable external websites to back up factual claims and build trust.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
Linking to other authoritative sites shows that you are part of a broader community of knowledge and helps verify your claims.

## Code Example

```html
<article>
  <p>
    According to the latest report from the 
    <a href="https://www.who.int/publications" target="_blank" rel="noopener noreferrer">World Health Organization</a>, 
    urban air quality has become a primary concern for public health in 2024.
  </p>
</article>
```

## Why It Matters

- **E-E-A-T**: Demonstrates to search engines that your content is based on reliable data and expert consensus.
- **User Trust**: Readers are more likely to believe and share content that provides proof for its assertions.
- **Contextual Relevance**: Helps search engines understand the topic of your page by the "neighborhood" of sites you link to.
- **User Value**: Provides a path for users to learn more about specific details from primary sources.

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