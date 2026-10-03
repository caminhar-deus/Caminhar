# Create a comprehensive Contact page

> Checks for a dedicated contact page with multiple methods for users to reach out.

**Priority:** medium · **Difficulty:** beginner · **Time:** 5 min

---
A Contact page proves that there are real people behind the website who are willing to be held accountable and provide support.

## Code Example

```html
<!-- Footer link for easy discovery -->
<footer>
  <nav aria-label="Support Navigation">
    <a href="/contact">Contact Us</a>
    <a href="/help">Help Center</a>
  </nav>
</footer>

<!-- Typical /contact page structure -->
<main>
  <h1>Get in Touch</h1>
  <section>
    <h2>Email</h2>
    <p><a href="mailto:support@example.com">support@example.com</a></p>
  </section>
  <section>
    <h2>Office</h2>
    <address>
      123 Tech Lane<br>
      San Francisco, CA 94105
    </address>
  </section>
</main>
```

## Why It Matters

- **Trustworthiness**: One of the simplest ways to prove a business is legitimate to both users and search engines.
- **User Experience**: Provides a clear destination for users who have questions, complaints, or business inquiries.
- **Local SEO**: Including a physical address and phone number (NAP) helps you rank better in local search results.
- **E-E-A-T**: Supports the "Trust" pillar by showing that the organization is transparent and accessible.

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