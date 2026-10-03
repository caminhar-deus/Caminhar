# Publish high-quality content

> LLM-based content quality analysis for SEO

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
Content quality is the most significant long-term SEO factor. [Google's people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) evaluates whether pages provide genuine value to users, and low-quality content can suppress an entire site's rankings.

## Code Example

#

## Primary Intent
- [ ] The page clearly answers the most common search query that would bring a user here
- [ ] The content goes beyond the question to satisfy related follow-up needs
- [ ] The page doesn't leave users needing to visit other sites to complete their task

### Depth and Accuracy
- [ ] Claims are specific, not generic ("Research shows..." without citation = weak)
- [ ] Data and statistics are cited with sources and dates
- [ ] Common misconceptions in the topic are addressed
- [ ] Instructions, if any, are complete and actionable

### Authorship and Trust
- [ ] A named author with relevant credentials is identified
- [ ] Publication and last-updated dates are visible
- [ ] Sources and references are linked

### Thin Content Red Flags

```
❌ Word count under 300 words for informational pages
❌ Content that could apply to any business ("We deliver quality service")
❌ Automatically generated or templated text with variable substitution
❌ Content copied or paraphrased from a single source
❌ Multiple pages covering the same topic with slight variations
```

## Why It Matters

Google's Search Quality Rater Guidelines and Helpful Content system reward pages that demonstrate genuine expertise and fully satisfy user intent—low-quality pages are algorithmically suppressed site-wide.

## E-E-A-T Framework

Google evaluates content quality using four dimensions:

| Dimension | Meaning | Signals |
|-----------|---------|---------|
| **Experience** | First-hand, real-world engagement with the topic | Personal stories, original photos, case studies |
| **Expertise** | Knowledge and skill in the subject matter | Credentials, depth of coverage, accuracy |
| **Authoritativeness** | Recognition as a go-to source | Backlinks, mentions, author reputation |
| **Trustworthiness** | Honesty and transparency | Sources cited, corrections policy, accurate claims |

## Improving Low-Quality Content

### Before (thin):
```
Sourdough Bread

Sourdough bread is a type of bread made with a fermentation process.
It has a distinctive sour taste. Many people enjoy sourdough bread.
```

### After (quality):
```
How to Make Sourdough Bread: A Complete Guide

Sourdough is leavened by wild yeast and lactic acid bacteria cultured
in a starter — a mixture of flour and water you feed daily. The
fermentation process typically takes 12–18 hours at room temperature,
producing bread with a tangy flavor, chewy crumb, and blistered crust.

This guide covers building a starter from scratch, hydration ratios,
bulk fermentation, shaping, and baking in a Dutch oven. I've been
baking sourdough for six years and tested each of these methods.
```

## Helpful Content Self-Assessment

Per [Google's people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), ask:
1. Does this content provide original information, research, reporting, or analysis?
2. Does it provide a substantial, complete, or comprehensive description of the topic?
3. Does it provide insightful analysis or interesting information beyond the obvious?
4. Would you be comfortable having created this content?
5. Is the content primarily created to attract search engine visits, or does it genuinely help people?

If the answer to any of questions 1–4 is "no," the content needs improvement.

Google's Helpful Content system applies quality signals at the site level, not just the page level. A large proportion of low-quality content on your site can suppress rankings for your best pages too.

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against Google Search Central: Creating helpful, reliable, people-first content before treating the rule as satisfied.
- Check the implementation against Google: Search Quality Rater Guidelines before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.