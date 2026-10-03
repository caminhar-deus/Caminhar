# Audit dependencies for known vulnerabilities

> Dependencies are regularly scanned for known security vulnerabilities using automated tooling, and critical findings are remediated before deployment.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
Every `node_modules` directory is a potential attack surface. Auditing dependencies identifies packages with known CVEs (Common Vulnerabilities and Exposures) so you can upgrade or patch them before they are exploited.

## Code Example

```bash
# pnpm (recommended)
pnpm audit

# With severity filter — only report high and critical
pnpm audit --audit-level=high

# Show the full dependency path for each vulnerability
pnpm audit --audit-level=moderate

# Output machine-readable JSON for scripting
pnpm audit --json > audit-report.json
```

## Why It Matters

Third-party packages are the most common attack surface in modern web applications. The 2021 Log4Shell incident, the 2022 node-ipc supply-chain attack, and countless npm package hijackings demonstrate that a single vulnerable transitive dependency can compromise every application that depends on it. Automated, continuous scanning drastically reduces the window between a CVE being published and your team being aware of it.

## Interpreting Audit Results

```
┌─────────────────────────────────────────────────────────────────┐
│                       npm audit report                          │
│                                                                 │
│ critical  Prototype Pollution in lodash                         │
│           Package:   lodash                                     │
│           Patched in: >=4.17.21                                 │
│           Dependency of: your-project > some-lib > lodash       │
│           More info: https://npmjs.com/advisories/1523          │
└─────────────────────────────────────────────────────────────────┘

found 3 vulnerabilities (1 moderate, 2 critical) in 1337 audited packages
```

| Severity | Action |
|---|---|
| **Critical** | Block deployment; fix immediately |
| **High** | Fix before next release |
| **Moderate** | Fix in current sprint |
| **Low** | Schedule for next dependency update cycle |

## Fixing Vulnerabilities

#

## Option 1: Upgrade the direct dependency

```bash
pnpm update some-lib --latest
```

### Option 2: Override a transitive dependency (pnpm)

When the vulnerable package is a transitive dependency and the direct dependency has not released a fix yet, use `pnpm.overrides` in `package.json`:

```json
{
  "pnpm": {
    "overrides": {
      "lodash": ">=4.17.21",
      "semver": ">=7.5.2"
    }
  }
}
```

### Option 3: `npm audit fix`

```bash
# Automatically upgrade to the minimum patched version
pnpm audit --fix

# Allow major version bumps (use with caution — may introduce breaking changes)
pnpm audit --fix --force
```

## CI Integration

### GitHub Actions — fail on high/critical

```yaml
# .github/workflows/security.yml
name: Dependency Audit

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    # Run every Monday at 09:00 UTC
    - cron: '0 9 * * 1'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Security audit
        run: pnpm audit --audit-level=high
```

### GitHub Dependabot

Add `.github/dependabot.yml` to receive automated PRs when new patch versions are available:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 10
    groups:
      # Group minor/patch updates into a single PR
      dependencies:
        update-types:
          - minor
          - patch
    ignore:
      # Skip major version bumps (review manually)
      - dependency-name: '*'
        update-types: ['version-update:semver-major']
```

## Snyk Integration

[Snyk](https://snyk.io/) provides deeper analysis than `npm audit`, including:
- License compliance checks
- Reachability analysis (is the vulnerable code actually called?)
- Automated fix PRs

```bash
# Install the CLI
pnpm add -g snyk

# Authenticate
snyk auth

# Test the project
snyk test

# Monitor continuously (sends results to the Snyk dashboard)
snyk monitor
```

Add to CI:

```yaml
- name: Snyk security scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high
```

## Lock File Best Practices

```bash
# Always commit the lock file
git add pnpm-lock.yaml

# Install with frozen lock file in CI (fails if lock file is out of sync)
pnpm install --frozen-lockfile

# Audit the lock file specifically (includes transitive deps)
pnpm audit
```

`npm audit` / `pnpm audit` reports vulnerabilities from the npm advisory database, which can lag behind the NVD. Some advisories affect only specific call patterns that may not be present in your code. Conversely, new supply-chain attacks (malicious code injections) are often not in the advisory database at all. Use Snyk or Socket for broader coverage.

## Exceptions

- Scanner output, leaked-secret detections, or stack traces should be confirmed as production-relevant before being escalated as blockers.
- Archived dependencies, sample values, or test fixtures can create false positives, but they should still be documented and bounded clearly.
- If multiple findings overlap, prioritize the issue that most directly enables compromise or data exposure.

## Verification

### Automated Checks

- Check CI logs to confirm the audit step runs on every pull request and blocks merges on failures.

### Manual Checks

- Run `pnpm audit --audit-level=high` — the command should exit with code 0 (no high/critical findings).
- Open your repository's **Security** tab in GitHub and confirm Dependabot alerts are enabled and any open alerts are triaged.
- Verify `pnpm-lock.yaml` (or equivalent) is committed and not in `.gitignore`.