# Write at a clear reading level

> Analyzes content readability using Flesch-Kincaid

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
Readability measures how easily your target audience can understand your content. Complex writing causes users to leave quickly, which harms engagement metrics and weakens the same user-focused signals measured in [content quality](/en/rules/seo/quality).

## Code Examples

#

## Passive to Active Voice

```
❌ "The configuration must be updated by the administrator before the deployment can be initiated."

✅ "The administrator must update the configuration before starting the deployment."
```

### Simplifying Jargon

```
❌ "Utilise the subsequent methodological framework to iteratively optimise your content strategy."

✅ "Use this framework to gradually improve your content strategy."
```

### Breaking Long Sentences

```
❌ "When you are designing a website and you want to ensure that users who visit your pages
   find the content easy to read and understand, which is important for both user experience
   and search engine optimisation, you should consider the reading level of your audience."

✅ "Clear writing improves both user experience and SEO. Write for your audience's reading
   level. Consider their background knowledge when choosing vocabulary and sentence length."
```

## Why It Matters

Content written beyond the reading level of the target audience increases bounce rates and reduces time-on-page—both engagement signals that correlate with search rankings.

## Flesch Reading Ease Scale

| Score | Level | Audience |
|-------|-------|---------|
| 90–100 | Very easy | 5th grade / age 11 |
| 80–90 | Easy | 6th grade |
| 70–80 | Fairly easy | 7th grade |
| 60–70 | Standard | 8th–9th grade ← target for general content |
| 50–60 | Fairly difficult | 10th–12th grade |
| 30–50 | Difficult | College level |
| < 30 | Very difficult | Professional / academic |

**Target for most websites**: score 60–70 (Grade 8–9)

## What Affects Readability

| Factor | Reduces Readability | Improves Readability |
|--------|-------------------|---------------------|
| Sentence length | Long sentences (25+ words) | Short sentences (15–20 words) |
| Vocabulary | Rare, technical words | Common, everyday words |
| Paragraph length | 6+ sentences | 2–4 sentences |
| Sentence structure | Complex, nested clauses | Simple subject-verb-object |
| Voice | Passive voice | Active voice |

## Readability Tools

| Tool | Type | Score Type |
|------|------|-----------|
| Hemingway App (hemingwayapp.com) | Web | Grade level, passive voice, adverbs |
| Yoast SEO (WordPress) | Plugin | Flesch-Kincaid |
| Grammarly | Web/Extension | Readability score |
| Microsoft Word | Desktop | Flesch-Kincaid on review |

## Structuring for Scanners

Research by Nielsen Norman Group shows 79% of users scan rather than read web content. Structure accordingly:

```
✅ Use subheadings every 200–300 words
✅ Use bullet points for lists of 3+ items
✅ Bold key terms or takeaways
✅ Lead with the conclusion (inverted pyramid)
✅ One idea per paragraph
```

## Industry Context

Reading level targets vary by audience:
- **Medical / legal / technical**: Grade 10–12 may be appropriate
- **Consumer products / blogs**: Grade 6–8 is ideal
- **Children's content**: Grade 3–5
- **Academic / professional**: Grade 12+ may be appropriate

Always match the expected reading level of your target audience.

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