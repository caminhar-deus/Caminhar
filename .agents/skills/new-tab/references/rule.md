# External Link Security

> Links that open in a new tab using target='_blank' must include rel='noopener noreferrer' to prevent the opened page from accessing the opener's window context.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
When a link opens a new browser tab with `target="_blank"`, the new page receives a reference to the opener's `window` object via `window.opener`. A malicious destination can exploit that behavior in a [reverse tabnapping](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/14-Testing_for_Reverse_Tabnabbing) flow unless you explicitly add [`rel="noopener"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/noopener) or [`rel="noreferrer"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/noreferrer).
## Code Example

```
1. User is on bank.example.com
2. User clicks a link to malicious.com (opens in new tab)
3. malicious.com runs: window.opener.location = 'https://fake-bank.example.com/login'
4. User switches back to the original tab
5. Tab now shows the phishing site — user thinks the bank session expired and types credentials
```

## Why It Matters

A malicious site opened via target='_blank' can use window.opener.location to silently redirect your original tab to a phishing page — the user switches back and sees a fake login screen on what appears to be your domain.

## The Fix

```html
❌ Vulnerable to reverse tabnapping
<a href="https://example.com" target="_blank">Visit Example</a>

✅ Safe — no access to window.opener
<a href="https://example.com" target="_blank" rel="noopener noreferrer">Visit Example</a>
```

#

## React / JSX

```jsx
❌ Vulnerable
<a href="https://external.com" target="_blank">External Link</a>

✅ Safe
<a href="https://external.com" target="_blank" rel="noopener noreferrer">
  External Link
</a>
```

## Understanding the `rel` Values

| Value | What it does |
|-------|-------------|
| `noopener` | Sets `window.opener` to `null` in the new tab — the opened page cannot access the original window |
| `noreferrer` | Suppresses the `Referer` HTTP header sent to the destination; also implies `noopener` |
| Both together | Maximum privacy + security: no opener access, no referrer sent |

**Recommendation**: Use both `noopener noreferrer` for external links. Use `noopener` alone if you need the referrer for analytics on same-origin links.

## Browser Behavior

As of Chrome 88 and Firefox 79, cross-origin `target="_blank"` links implicitly get `noopener` behavior. However:

- **Same-origin** `_blank` links are **not** implicitly protected
- Older browsers still require the explicit attribute
- `noreferrer` is never added implicitly

For these reasons, always add the attribute explicitly.

## Automated Enforcement

### ESLint (React projects)

```bash
pnpm add -D eslint-plugin-react
```

```json
// .eslintrc.json
{
  "rules": {
    "react/jsx-no-target-blank": ["error", {
      "allowReferrer": false,
      "enforceDynamicLinks": "error"
    }]
  }
}
```

### Finding Violations in Existing Code

```bash
# Search HTML files
grep -rn 'target="_blank"' ./src --include="*.html" | grep -v 'new-tab'

# Search JSX/TSX files
grep -rn 'target="_blank"' ./src --include="*.jsx" --include="*.tsx" | grep -v 'new-tab'
```

## Internal Links

Internal links (same domain) are generally safe to open in new tabs without `noopener` because you control both pages. However, adding it is still a best practice for consistency:

```html
<!-- Internal link — window.opener risk is lower, but still good practice -->
<a href="/docs/guide" target="_blank" rel="noopener">Open Docs</a>
```

If you intentionally need the opened page to communicate back with the opener via `window.opener` (e.g., OAuth popup flows), omit `noopener`. This is a legitimate use case — document it clearly in code comments.

## Exceptions

- A weaker form control is only acceptable when the business requirement and compensating controls are documented explicitly.
- If the flow is already transport-insecure, inaccessible, or externally embedded in a way that changes the threat model, fix that stronger issue first.
- False positives are common on demo, sandbox, or intentionally constrained flows, but they should still be bounded and clearly labeled.

## Verification

### Automated Checks

- Test the affected flow in a production-like environment, not just local development.
- Document any intentional exceptions explicitly.

### Manual Checks

- Inspect the final HTTP response or browser behavior to confirm the control is actually enforced.
- Verify third-party integrations or embeds still work after the restriction is applied.