# Fix malformed HTML structure

> Ensures that the HTML document is well-formed with correctly nested and closed tags.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Well-formed HTML is the foundation of a stable and accessible website. It ensures that both browsers and search engines can interpret your content exactly as intended.

## Code Example

```html
<!-- ❌ Bad: Unclosed or incorrectly nested tags -->
<div>
  <p>This is a paragraph <span>with a nested span</div>
  </p>

<!-- ✅ Good: Properly nested and closed tags -->
<div>
  <p>This is a paragraph <span>with a nested span</span></p>
</div>
```

## Why It Matters

- **Crawlability**: Helps search engine bots navigate and understand the hierarchy of your content without errors.
- **Browser Consistency**: Ensures your site renders correctly across different browsers (Chrome, Safari, Firefox, etc.).
- **Accessibility**: Assistive technologies like screen readers rely on valid HTML structure to navigate pages correctly.
- **Performance**: Browsers can parse valid HTML faster than "tag soup," leading to slight improvements in rendering speed.

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