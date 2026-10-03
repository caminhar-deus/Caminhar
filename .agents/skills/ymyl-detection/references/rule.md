# Identify YMYL content on your site

> Detects Your Money or Your Life (YMYL) content that is subject to Google's elevated E-E-A-T quality standards.

**Priority:** high · **Difficulty:** intermediate · **Time:** 10 min

---
YMYL (Your Money or Your Life) is Google's term for content that could significantly affect a person's health, safety, financial stability, or wellbeing. In [Google's Quality Rater Guidelines](https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf), these pages face the highest scrutiny, which is why they usually need stronger [trust signals](/en/rules/seo/trust-signals) than general informational content.

## Code Examples

#

## Experience

Show real, first-hand engagement with the topic:

```html
<!-- Author bio excerpt -->
<p>This article was written by Dr. Sarah Chen, who has treated over 1,000 patients
with Type 2 diabetes in her 15 years of clinical practice.</p>
```

### Expertise

Demonstrate formal or deep practical knowledge:

```html
<!-- Author credentials block -->
<div class="author-credentials">
  <img src="/photos/dr-chen.jpg" alt="Dr. Sarah Chen">
  <h3>Dr. Sarah Chen, MD</h3>
  <p>Board-certified endocrinologist, Stanford Medical School graduate,
     member of the American Diabetes Association.</p>
  <a href="/about/dr-sarah-chen">Full bio</a>
</div>
```

### Authoritativeness

Reference recognized external sources:

```html
<!-- In-text citation example -->
<p>According to the
  <a href="https://www.cdc.gov/diabetes/data/statistics-report/index.html">
    CDC's 2023 National Diabetes Statistics Report
  </a>, 37.3 million Americans have diabetes.
</p>
```

### Trustworthiness

Make the page's basis verifiable:

```html
<!-- Medical page footer -->
<footer class="content-trust">
  <p><strong>Reviewed by:</strong> Dr. James Park, MD, Endocrinologist</p>
  <p><strong>Last reviewed:</strong> January 2025</p>
  <p><strong>Sources:</strong> <a href="#references">View references</a></p>
</footer>
```

## Why It Matters

Google's Quality Rater Guidelines require YMYL pages to meet higher E-E-A-T standards than general content — a YMYL page without visible expertise and trust signals will be rated low quality regardless of technical SEO. Google's explanation of [what E-E-A-T means in practice](https://developers.google.com/search/docs/fundamentals/creating-helpful-content#what-is-eeeat) is useful here because it turns abstract quality language into visible page requirements.

## YMYL Topic Categories

Per Google's Quality Rater Guidelines (QRG):

| Category | Examples |
|----------|---------|
| **Health & Medical** | Symptoms, treatments, medications, mental health, medical procedures |
| **Financial** | Taxes, investing, insurance, loans, retirement planning |
| **Legal** | Contracts, immigration, criminal law, family law |
| **Safety** | Emergency procedures, product safety, dangerous activities |
| **News & Civics** | Elections, government policy, breaking news |
| **Shopping** | High-value purchases, product safety |
| **Other** | Parenting, nutrition, housing decisions |

## ❌ YMYL Pages That Fail Quality Standards

```html
<!-- Medical article with no author attribution -->
<article>
  <h1>How to Treat Type 2 Diabetes at Home</h1>
  <!-- No author name, no credentials, no review date -->
  <p>You can manage diabetes by eating less sugar...</p>
  <!-- No citations, no sources, no expert review -->
</article>
```

This would be rated low quality by a Quality Rater regardless of technical SEO, and in most real audits it also coincides with missing [disclaimers](/en/rules/seo/disclaimers) or weak editorial review.

## YMYL Content Checklist

- [ ] Named author with relevant credentials displayed prominently
- [ ] Author bio page describing qualifications, experience, institutional affiliations
- [ ] "Reviewed by" credit if the author is not the subject-matter expert
- [ ] Last-reviewed or last-updated date visible on the page
- [ ] In-text citations to primary sources (government data, peer-reviewed studies, official guidelines)
- [ ] References/sources section at the bottom
- [ ] Clear editorial policy (link to it from YMYL pages)
- [ ] No misleading, exaggerated, or dangerous claims

## Schema for Author Credentials

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  "author": {
    "@type": "Person",
    "name": "Dr. Sarah Chen",
    "honorificSuffix": "MD",
    "medicalSpecialty": "Endocrinology",
    "url": "https://example.com/about/dr-sarah-chen"
  },
  "reviewedBy": {
    "@type": "Person",
    "name": "Dr. James Park"
  },
  "dateModified": "2025-01-15"
}
</script>
```

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google: Quality Rater Guidelines before treating the rule as satisfied.
- Check the implementation against Google: Creating helpful, reliable, people-first content before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.