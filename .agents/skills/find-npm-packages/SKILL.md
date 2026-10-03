---
name: find-npm-packages
description: Use when you need to find the 2-3 most popular and well-maintained npm packages relevant to a frontend checklist rule, validate they meet quality thresholds, and add them to the rule's frontmatter.
metadata:
  version: "1.0.0"
  category: "content"
  tags: "npm,packages,rules,frontmatter"
---

# find-npm-packages

Identify, validate, and add npm package references to a Front-End Checklist rule.

## What this skill does

Given a rule file or rule slug, this skill will:

1. Understand what the rule is checking for
2. Research which npm packages are commonly used to implement, automate, or enforce the rule
3. Validate each candidate against quality thresholds (popularity + maintenance)
4. Select the best 2–3 packages
5. Add them to the rule's `npmPackages` frontmatter field

## Quality thresholds (mandatory — do not skip)

Before selecting any package, check it against these criteria using the npm registry:

| Criterion | Minimum |
|-----------|---------|
| Weekly downloads | >10,000/week |
| Last publish | Within 18 months |
| npm registry | Must be listed (`registry.npmjs.org/{name}`) |

Packages that fail any threshold must be excluded, regardless of how relevant they are.

## Research steps

### Step 1 — Understand the rule

Read the rule file: `packages/content/rules/en/{category}/{slug}.mdx`

Focus on:
- What problem does this rule solve?
- What technique, spec, or behavior does it enforce?
- What tools or linters are mentioned in the `tools:` field?

### Step 2 — Identify candidates

Search for packages that:
- **Detect** the issue (linters, audit tools, CLI scanners)
- **Fix or implement** the pattern (frameworks, utilities, polyfills)
- **Test** for compliance (test utilities, CI integrations)

Use `https://www.npmjs.com/search?q={keywords}` and knowledge of the ecosystem to find candidates.

Prefer packages that are:
- Part of the official toolchain (e.g., `eslint`, `stylelint`, official plugins)
- Widely adopted across the industry
- Actively maintained (recent commits, open issues responded to)

### Step 3 — Validate each candidate

For each candidate package, fetch and verify:

```bash
# Metadata
curl https://registry.npmjs.org/{package}/latest | jq '{name, version, description}'

# Weekly downloads
curl https://api.npmjs.org/downloads/point/last-week/{package} | jq '.downloads'
```

Record the weekly download count and last publish date. Reject any below threshold.

### Step 4 — Select 2–3 packages

- Do not add more than 3 packages per rule
- Prioritize diversity: prefer one detector, one fixer, one framework helper when relevant
- If fewer than 2 pass the threshold, it's acceptable to add only 1 or leave the field empty
- Never invent packages — only list packages that actually exist and pass validation

### Step 5 — Update the rule frontmatter

Add a `npmPackages` array to the frontmatter with the package names only (metadata is fetched at build time):

```yaml
npmPackages:
  - eslint
  - eslint-plugin-jsx-a11y
  - axe-core
```

Place it after `tools:` and before `resources:`.

## Validation after adding

Run the validation script to confirm all packages pass thresholds:

```bash
pnpm validate:packages packages/content/rules/en/{category}/{slug}.mdx
```

If any package fails, either remove it or replace it with a better alternative.

## Example output

For the rule `accessibility/form-labels`:

```yaml
npmPackages:
  - eslint-plugin-jsx-a11y
  - axe-core
  - @testing-library/jest-dom
```

All three have >100k weekly downloads and were published within the last 6 months.

## What NOT to do

- ❌ Do not add packages with <10k weekly downloads
- ❌ Do not add packages last published >18 months ago
- ❌ Do not add more than 3 packages
- ❌ Do not add general-purpose packages that are only tangentially related
- ❌ Do not invent package names — verify each one exists on npm
- ❌ Do not add the package version (it's fetched at build time)
