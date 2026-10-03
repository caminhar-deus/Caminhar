---
name: improve-rule
description: "Use when reviewing or improving a Front-End Checklist rule MDX file to raise its quality score, fix stub prompts, add missing fields, or enrich content with real code examples."
metadata:
  category: meta
  source: frontendchecklist.io
  url: https://frontendchecklist.io
---

# Improve a Front-End Checklist Rule

This skill helps you review and improve the quality of rule MDX files in the Front-End Checklist project. Use it to fix stub content, write better AI prompts, and enrich rules so they score well against the quality rubric.

## Quality Dimensions

Every rule is scored across these dimensions (see `references/scoring-rubric.md` for full details):

| Dimension | Max | What "good" looks like |
|-----------|-----|------------------------|
| `prompts.check` | 10 | Specific audit instruction, not generic |
| `prompts.fix` | 10 | Actionable fix steps with CSS/HTML/JS specifics |
| `prompts.explain` | 10 | Explains the *why*, not just restates the title |
| `tldr` | 5 | 3+ concise bullets, each a standalone takeaway |
| `whyItMatters` | 5 | 1–2 sentences, concrete user impact |
| `aiContext` | 5 | "Applies to…" — when should an agent use this? |
| `relatedRules` | 5 | 2+ slug + reason pairs |
| `codeExamples` | 10 | 3+ ✅/❌ annotated blocks in the body |
| `bodyDepth` | 10 | 300+ words, not a stub |
| `resources` | 5 | External links (MDN, WCAG, articles) |
| `prompts.codeReview` | 5 | Code review workflow prompt (optional) |

**Base score: 100 with additional conditional V2 points. Target: ≥ 50 (passing).**

## Stub Prompts — What to Avoid

These patterns are automatically detected as low-quality:
- "Verify if the project adheres to: [Rule Title]"
- "Update the codebase to align with: [Rule Title]"
- "Explain the importance of [Rule Title]"

Replace them with specific, actionable instructions that name the exact HTML attributes, CSS properties, or JavaScript patterns involved.

## Check

Run the quality scorer on a specific rule to see its current score:
```bash
pnpm score:rules packages/content/rules/en/{category}/{slug}.mdx
```

Then open the MDX file and identify which dimensions are failing.

Run the structure validator as well:
```bash
pnpm validate:rule-structure packages/content/rules/en/{category}/{slug}.mdx
```

The rule body must follow this order:
- intro paragraph before any H2
- `## Code Example` or `## Code Examples`
- `## Why It Matters`
- optional guidance sections
- final `## Verification`

Rule Contract V2 adds conditional sections:
- `## Exceptions` for false positives, caveats, or valid exceptions
- `### Automated Checks` and `### Manual Checks` inside `## Verification` when both matter
- `## Browser Support`, `## Support Notes`, or `## Standards` when compatibility or compliance changes implementation decisions

Use the repo browser policy plus package-backed compatibility data for browser-support notes. Do not guess support ranges from memory.

## Fix

When improving a rule:

1. **Fix stub prompts first** — they have the highest point value (30 pts combined)
   - `check`: name the exact attributes/patterns to audit
   - `fix`: give step-by-step remediation with code snippets
   - `explain`: explain the user impact, not just the technical detail

2. **Add `aiContext`** — one sentence: "Applies to any HTML page with [X]" or "Use when reviewing [Y] in [Z] context"

3. **Add/expand `tldr`** — 3 bullets minimum, each ending with a concrete rule of thumb

4. **Enrich body content** — add ✅ good example and ❌ bad example code blocks for each concept

5. **Add `relatedRules`** — link 2+ rules with a reason explaining the connection

6. **Add `resources`** — MDN docs, WCAG success criteria, relevant articles

7. **Fix structure lint issues** — rename final `Testing`/`Checklist`-style headings to `## Verification`, keep optional guidance between `Why It Matters` and `Verification`, and never place H2 sections after `Verification`

8. **Add contract clarity where needed** — use `Exceptions`, verification split, and standards/support notes only when the rule type actually benefits from them

## Explain

The quality score is a proxy for how useful the rule is to both human developers and AI agents.

- A rule with stub prompts gives Claude generic instructions — the AI can't provide targeted help
- A rule without code examples is hard to learn from
- A rule without `aiContext` won't trigger at the right moment when used as a Claude Code skill
- A rule without `relatedRules` is an island — agents can't traverse the knowledge graph

High-quality rules become high-quality skills that Claude can use proactively and precisely.

## Code Review

When reviewing a PR that adds or modifies rule MDX files, check:
- No stub prompts (grep for "Verify if the project adheres to")
- At least 3 `tldr` bullets
- `whyItMatters` is specific (mentions user impact, not just "improves quality")
- Body has at least one ✅ and one ❌ code example
- `## Verification` is the final H2 and `## Why It Matters` appears before it
- `pnpm validate:rule-structure {file}` passes
- Score is ≥ 50: `pnpm score:rules {file}`

---

See `references/scoring-rubric.md` for the full scoring specification.
Rule page: https://frontendchecklist.io
