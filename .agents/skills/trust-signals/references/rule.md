# Show trust signals on key pages

> Checks for trust badges, certifications, client logos, testimonials, and social proof on high-conversion pages.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Trust signals are visible cues that demonstrate your organization's credibility, expertise, and reliability. [Google's Quality Rater Guidelines](https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf) explicitly evaluate these signals when assessing page quality, especially on [YMYL pages](/en/rules/seo/ymyl-detection) where trust failures carry more weight.

## Code Examples

#

## Social Proof

```html
<!-- Customer review count from a verified platform -->
<div class="trust-reviews">
  <img src="/icons/google-stars.svg" alt="Google Reviews">
  <span>4.8/5 from 312 Google Reviews</span>
  <a href="https://g.page/your-business/review">Read reviews</a>
</div>
```

### Security Badges (near forms)

```html
<!-- Near checkout or contact forms -->
<div class="security-trust">
  <img src="/icons/ssl-secure.svg" alt="SSL Secured">
  <span>256-bit SSL encryption</span>
</div>
```

### Industry Certifications

```html
<div class="certifications">
  <a href="https://certification-body.com/verify/your-cert-id" rel="noopener">
    <img src="/badges/iso-27001.png" alt="ISO 27001 Certified">
  </a>
  <a href="https://another-body.com/member/your-id" rel="noopener">
    <img src="/badges/bbb-accredited.png" alt="BBB Accredited Business">
  </a>
</div>
```

### Testimonials

```html
<!-- Named testimonials with photo carry more weight than anonymous quotes -->
<blockquote>
  <p>"Reduced our page load time by 60% in two weeks."</p>
  <footer>
    <img src="/photos/sarah-jones.jpg" alt="Sarah Jones">
    <cite>Sarah Jones, CTO at TechCorp</cite>
  </footer>
</blockquote>
```

## Why It Matters

Google's Quality Rater Guidelines explicitly evaluate trustworthiness as a core page quality signal; pages lacking visible trust evidence score lower in manual quality assessments that influence ranking systems. In practice, that usually means pairing on-page proof with clear [author bylines](/en/rules/seo/author-byline) and the E-E-A-T expectations described in Google's guidance on [helpful, reliable content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content#what-is-eeeat).

## E-E-A-T and YMYL Pages

Google's Quality Rater Guidelines (Section 3) describe four dimensions of quality, and [Google's E-E-A-T overview](https://developers.google.com/search/docs/fundamentals/creating-helpful-content#what-is-eeeat) is a useful companion reference when turning those dimensions into page elements:

| Dimension | How to Demonstrate |
|-----------|-------------------|
| **Experience** | First-hand accounts, author credentials, case studies |
| **Expertise** | Professional qualifications, educational background, detailed accurate content |
| **Authoritativeness** | Third-party mentions, backlinks from authoritative sites, industry recognition |
| **Trustworthiness** | Accurate information, clear authorship, security signals, review transparency |

For **YMYL pages** (health, finance, legal, safety), Google applies elevated scrutiny. Missing trust signals on these pages is treated as a quality deficiency, and weak or unverifiable claims usually need the same remediation work as missing disclaimers or editorial review.

## ❌ Avoid These Trust-Damaging Patterns

- Generic badge images with no link to a verifiable source
- Testimonials without attribution (name, company, or photo)
- Outdated review counts (e.g., "500+ reviews" from several years ago)
- Certifications that have lapsed or cannot be verified
- Misleading guarantees without clear terms

## Placement Guidelines

| Page Type | Key Trust Signals to Include |
|-----------|------------------------------|
| Homepage | Client logos, overall review rating, key certifications |
| Pricing/Services | Guarantee language, testimonials, security badge |
| Contact/Lead Form | Security badge, response time commitment, privacy statement |
| Checkout | Payment icons, SSL badge, return/refund policy |
| About Page | Team credentials, company history, awards |
| YMYL pages | Author credentials, citations, medical/legal disclaimer |

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