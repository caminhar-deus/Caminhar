# Rule Quality Scoring Rubric

Full specification for how `pnpm score:rules` evaluates Front-End Checklist rules.

**Maximum score: 80 points**

---

## Prompts (30 pts)

### `prompts.check` — 10 pts

| Score | Condition |
|-------|-----------|
| 10 | Present and not a stub |
| 3 | Present but matches a stub pattern |
| 0 | Missing |

**Stub patterns (auto-detected):**
- "Verify if the project adheres to: [title]"
- "Ensure [title] is implemented correctly"
- Any prompt under ~20 words that just restates the rule name

**Good check prompt:**
> "Audit all `<img>` elements for missing or decorative-but-present `alt` attributes. Flag images where alt is missing entirely, where alt contains 'image of' or 'photo of', and where decorative images have non-empty alt text."

### `prompts.fix` — 10 pts

Same scoring as check. A good fix prompt gives step-by-step remediation that references actual HTML/CSS/JS syntax.

### `prompts.explain` — 10 pts

Same scoring as check. A good explain prompt asks for the *why* — user impact, browser behavior, accessibility consequences — not just a restatement of the rule.

---

## Metadata (20 pts)

### `tldr` — 5 pts

| Score | Condition |
|-------|-----------|
| 5 | 3 or more bullets |
| 2 | 1–2 bullets |
| 0 | Missing |

Each bullet should be a standalone, actionable rule of thumb. Avoid bullets that just restate the rule title.

### `whyItMatters` — 5 pts

| Score | Condition |
|-------|-----------|
| 5 | Present and > 40 characters |
| 2 | Present but ≤ 40 characters |
| 0 | Missing |

Should explain *user impact*, not technical correctness. Prefer: "Screen readers announce..." over "This improves accessibility."

### `aiContext` — 5 pts

| Score | Condition |
|-------|-----------|
| 5 | Present |
| 0 | Missing |

A single sentence starting with "Applies to..." or "Use when..." that tells an AI agent when to activate this skill. Examples:
- "Applies to any HTML page with `<img>` or `<picture>` elements."
- "Use when reviewing form markup with `<input>`, `<select>`, or `<textarea>` elements."

### `relatedRules` — 5 pts

| Score | Condition |
|-------|-----------|
| 5 | 2 or more entries |
| 2 | 1 entry |
| 0 | Missing |

Each entry: `{ slug: "rule-slug", reason: "one sentence why they're related" }`

---

## Body Content (20 pts)

### `codeExamples` — 10 pts

| Score | Condition |
|-------|-----------|
| 10 | 3 or more fenced code blocks |
| 5 | 1–2 code blocks |
| 0 | No code blocks |

Best practice: pair ✅ correct and ❌ incorrect examples. Use real-world patterns, not trivial snippets.

### `bodyDepth` — 10 pts

| Score | Condition |
|-------|-----------|
| 10 | 300+ words |
| 5 | 100–299 words |
| 2 | 30–99 words |
| 0 | < 30 words (stub) |

---

## Bonus (10 pts)

### `resources` — 5 pts

| Score | Condition |
|-------|-----------|
| 5 | 2 or more resources/tools |
| 2 | 1 resource or tool |
| 0 | None |

Prefer: MDN docs, WCAG success criteria, browser compatibility tables, authoritative articles.

### `prompts.codeReview` — 5 pts

| Score | Condition |
|-------|-----------|
| 5 | Present and not a stub |
| 0 | Missing or stub |

Used in code review workflows. Should describe what to look for when reviewing a PR diff, not just general auditing.

---

## Grade Thresholds

| Grade | Score Range | % of max |
|-------|-------------|----------|
| A | 68–80 | ≥ 85% |
| B | 56–67 | ≥ 70% |
| C | 44–55 | ≥ 55% |
| D | 32–43 | ≥ 40% |
| F | 0–31 | < 40% |

**Minimum passing score: 50 (enforced by `pnpm score:rules` in CI)**
