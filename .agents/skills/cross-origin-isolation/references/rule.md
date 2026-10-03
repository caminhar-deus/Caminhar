# Use COOP, COEP, and CORP for cross-origin isolation when needed

> Sensitive or high-capability applications use COOP, COEP, and CORP deliberately, audit third-party embeds, and verify cross-origin isolation in the browser before relying on it.

**Priority:** medium · **Difficulty:** advanced · **Time:** 30 min

---
Cross-origin isolation is not a blanket requirement for every app, but it is a meaningful hardening step when you handle sensitive data, want stronger opener isolation, or need features that browsers gate behind `crossOriginIsolated`. The key is to deploy it intentionally, because one incompatible third-party resource can break the page.

## Code Example

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

```http
Cross-Origin-Resource-Policy: same-origin
```

```javascript
if (!self.crossOriginIsolated) {
  console.warn('This page is not cross-origin isolated yet.')
}
```

## Why It Matters

COOP and COEP change how the browser groups documents and what cross-origin resources may be embedded. Combined with compatible subresource responses, they reduce classes of opener-based and cross-origin leak risks and unlock isolated-only APIs.

- better protection against opener-based cross-origin attacks and XS-Leaks
- required for certain high-capability features such as SharedArrayBuffer
- clearer trust boundaries around what third-party resources can join the page
- higher deployment risk if assets, popups, or embeds are not audited first

## Best Practices

### Roll out COOP and COEP together when the document truly needs isolation

For full cross-origin isolation, the common pattern is:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Then verify in the browser:

```javascript
console.log(self.crossOriginIsolated)
```

### Audit every cross-origin dependency first

COEP changes what your page is allowed to embed. Review:

- scripts
- fonts
- images
- iframes
- workers
- analytics and tag-manager integrations

Any cross-origin resource loaded under COEP must opt in through CORS or CORP.

### Be deliberate about popup flows

OAuth, payment, and support popup flows often rely on opener relationships. If your app depends on those behaviors, test them explicitly before enforcing COOP and choose the narrowest compatible setting.

## Thresholds

- Pass if intended routes return compatible COOP and COEP headers and `self.crossOriginIsolated === true` where isolation is required.
- Fail if the app depends on isolated-only APIs but the runtime is not actually cross-origin isolated.
- Fail if critical popup or embed flows break under the enforced header set.

## Exceptions

- Most sites do not need full cross-origin isolation. Add it when you need the security boundary or the gated browser capabilities, not as a fashionable default.
- A route-specific rollout can be safer than enabling the headers globally if only a small subset of the app needs isolated-only features.
- Some third-party content simply will not work under COEP. Replacing or isolating that dependency may be required before rollout.

## Support Notes

- Compatibility and third-party breakage matter more than the header syntax alone, so verify against the project's actual browser support policy and dependency set.
- Isolation should be proven by runtime behavior such as `self.crossOriginIsolated`, not only by seeing headers in the response.

## Verification

### Automated Checks

- Inspect representative document responses and confirm COOP and COEP are present where intended.
- Inspect critical subresource responses and confirm they provide compatible CORS or CORP behavior.

### Manual Checks

- Open the page in a browser and check `self.crossOriginIsolated`.
- Test popup, OAuth, payment, analytics, and embed flows in a staging environment.
- Fail the rollout if the app depends on isolated-only APIs but `self.crossOriginIsolated` is still `false`, or if critical third-party integrations stop working.