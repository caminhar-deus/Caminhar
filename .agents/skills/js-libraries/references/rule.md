# Use secure and up-to-date JS libraries

> Detects JavaScript libraries and checks for known vulnerabilities

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
JavaScript libraries can quickly accumulate and introduce security risks or performance bottlenecks if not managed carefully.

## Code Examples

#

## Checking for Vulnerabilities
```bash
# Using npm
npm audit

# Using pnpm
pnpm audit

# Using yarn
yarn audit
```

### Replacing Heavy Libraries
```javascript
// ❌ Bad: Importing a heavy library like Moment.js (280KB+)

console.log(moment().format('MMMM Do YYYY'));

// ✅ Good: Using a lightweight alternative like date-fns (modular imports)

console.log(format(new Date(), 'MMMM do yyyy'));
```

## Why It Matters

- **Security**: Outdated libraries are a primary vector for cross-site scripting (XSS) and other attacks.
- **Performance**: Many older libraries were designed for a different era and include redundant polyfills or non-tree-shakable code.
- **Maintenance**: Keeping dependencies up-to-date simplifies future upgrades and ensures access to the latest features and bug fixes.
- **Bundle Size**: Libraries often make up the bulk of a web application's JavaScript; optimizing them has a high impact.

## Best Practices

Run [npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit) or an equivalent scan before replacing libraries, because the biggest wins usually come from removing one outdated or oversized dependency rather than blindly rotating packages.

✅ **Regular Audits**: Run `npm audit` or use tools like Snyk as part of your CI/CD pipeline.
✅ **Modular Imports**: Choose libraries that support ES Modules and tree-shaking.
✅ **Check BundlePhobia**: Before adding a new library, check its impact on bundle size.
✅ **Native Alternatives**: Use native browser APIs (e.g., `Intl` for formatting, `fetch` for requests) instead of libraries when possible.

## Tools & Validation

- [npm-audit](https://docs.npmjs.com/cli/v7/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [BundlePhobia](https://bundlephobia.com/)
- [Dependabot](https://github.com/dependabot)

## Verification

### Automated Checks

- Measure the affected page or flow in Lighthouse, PageSpeed Insights, or DevTools and confirm the targeted metric improves.
- Inspect the network waterfall or performance timeline to confirm the intended resource or execution change actually took effect.

### Manual Checks

- Verify the change on a throttled mobile profile, not just local desktop.
- If this rule maps to a budget or Web Vital, confirm the page now stays within that threshold.