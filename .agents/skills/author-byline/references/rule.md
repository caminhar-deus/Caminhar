# Display clear author bylines

> Checks for visible author names on content pages to establish transparency and trust.

**Priority:** medium · **Difficulty:** beginner · **Time:** 5 min

---
Identifying the creator of the content is essential for establishing the credibility of your website.

## Code Example

```html
<article>
  <header>
    <h1>The Impact of Web Performance on SEO</h1>
    <div class="author-byline" style="display: flex; gap: 10px; align-items: center;">
      <img src="/images/authors/jane-doe.jpg" alt="Jane Doe" width="40" height="40" style="border-radius: 50%;">
      <div>
        <span>By <a href="/authors/jane-doe" rel="author">Jane Doe</a></span>
        <br>
        <small class="role">Lead Performance Engineer • Nov 15, 2023</small>
      </div>
    </div>
  </header>
</article>
```

## Why It Matters

- **E-E-A-T**: Directly supports the "Expertise" and "Authoritativeness" pillars by naming the responsible individual.
- **Transparency**: Users are more likely to trust content when they know who wrote it and what their qualifications are.
- **Accountability**: Signals to search engines that the content is being stood behind by a real person.
- **Author Identity**: Helps search engines build an "Author Graph" which can benefit your rankings if your authors are recognized experts.

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.