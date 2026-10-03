# Add disclaimers to sensitive content

> Checks for appropriate disclaimers on sensitive content types such as medical, legal, financial, and affiliate pages

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Sensitive content — medical advice, financial guidance, legal information, affiliate recommendations — requires clear disclaimers. [Google's Quality Rater Guidelines](https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf) and page-level [YMYL detection](/en/rules/seo/ymyl-detection) both treat these disclaimers as trust signals, not just legal boilerplate.

## Code Examples

#

## ❌ Avoid — sensitive content with no disclaimer

```html
<article>
  <h1>How to Lower Blood Pressure Naturally</h1>
  <p>Reducing sodium intake to under 1,500mg per day can significantly
     lower systolic blood pressure...</p>
  <!-- No medical disclaimer anywhere on the page -->
</article>
```

### ✅ Correct — prominent disclaimer before sensitive content

```html
<article>
  <aside class="disclaimer" role="note">
    <strong>Medical Disclaimer:</strong> This content is for informational
    purposes only and does not constitute medical advice. Always consult a
    qualified healthcare professional before making health-related decisions.
  </aside>

  <h1>How to Lower Blood Pressure Naturally</h1>
  <p>Reducing sodium intake to under 1,500mg per day can significantly
     lower systolic blood pressure...</p>
</article>
```

### ✅ Affiliate disclosure before first affiliate link

```html
<article>
  <p class="affiliate-disclosure">
    <em>Disclosure: This post contains affiliate links. If you purchase
    through these links, we earn a small commission at no extra cost to you.
    <a href="/affiliate-policy">Read our full affiliate policy.</a></em>
  </p>

  <h1>Best Project Management Tools in 2024</h1>
  <p>We recommend <a href="https://example.com/?ref=affiliate">ToolName</a>
     for its ease of use...</p>
</article>
```

## Why It Matters

- **E-E-A-T Trustworthiness**: Google's quality raters mark pages without appropriate disclaimers as untrustworthy, which suppresses rankings for YMYL topics.
- **Legal compliance**: FTC rules (US), ASA guidelines (UK), and GDPR (EU) require specific disclosures for affiliate content, advertising, and data collection, which is why [FTC disclosure guidance](https://www.ftc.gov/sites/default/files/attachments/press-releases/ftc-staff-revises-online-advertising-disclosure-guidelines/130312dotcomdisclosures.pdf) should inform affiliate and sponsored pages.
- **User trust**: Readers make better decisions when they understand the nature of the content they are reading.

## Content Types Requiring Disclaimers

| Content Type | Required Disclaimer |
|---|---|
| Medical / health | Not a substitute for professional medical advice |
| Financial | Not financial advice; past performance caveat |
| Legal | General information only; not legal advice |
| Affiliate / sponsored | Affiliate relationship disclosure |
| AI-generated | Content was AI-assisted/generated |

## Placement Guidelines

- Place disclaimers **before** the relevant content — not in footers after users have already read the advice.
- Use a visually distinct style (box, background colour, italic) so disclaimers are not missed.
- Link to a fuller policy page when a brief inline disclaimer is insufficient.
- Do not bury disclaimers in 8pt font or collapse them behind a "Read more" toggle.

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Quality Rater Guidelines before treating the rule as satisfied.
- Check the implementation against FTC: .com Disclosures — How to Make Effective Disclosures in Digital Advertising before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.