# Optimize pages for back/forward cache

> Pages avoid back/forward cache blockers such as unload listeners and restore state correctly when a browser resumes them from memory.

**Priority:** high · **Difficulty:** advanced · **Time:** 25 min

---
Back/forward cache, usually shortened to bfcache, is a browser optimization that restores an earlier page from memory when the user clicks the back or forward button. The fastest history navigation is the one that does not need to re-run your app boot sequence at all.

## Code Example

```javascript
// Bad: unload listeners commonly make a page ineligible for bfcache
window.addEventListener('unload', () => {
  navigator.sendBeacon('/analytics/leave')
})

// Good: pagehide runs for normal unloads and bfcache attempts
window.addEventListener('pagehide', () => {
  navigator.sendBeacon('/analytics/leave')
})

// Good: detect a restore and refresh only what is time-sensitive
window.addEventListener('pageshow', async (event) => {
  if (!event.persisted) return

  await refreshUnreadCount()
  closeTransientOverlays()
})
```

## Why It Matters

History navigation is common, especially on mobile. When a page is bfcache-eligible, the browser can resume it almost instantly. When it is not, the user pays for another round of network, parsing, and JavaScript execution just to get back to something they already saw moments earlier.

- Faster perceived navigation for back and forward actions
- Less network transfer because the page does not need to be rebuilt
- Better UX on slower devices where full app startup is expensive
- Fewer accidental regressions from lifecycle code that assumes every navigation is a hard reload

## Best Practices

### Never use `unload`

If you only make one change, make it this one. The `unload` event is the clearest, most common bfcache blocker. Use `pagehide` for teardown work and `pageshow` for resume work instead.

### Treat a restore differently from a fresh load

Use `pageshow` and check `event.persisted`:

```javascript
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    syncSessionExpiryBanner()
    refreshCsrfTokenIfNeeded()
  }
})
```

Do not blindly hard-reload on every restore. Refresh only the state that can become stale, such as auth warnings, inbox counts, or short-lived tokens.

### Keep `beforeunload` conditional

If you need a navigation warning for unsaved work, add `beforeunload` only while the page is dirty and remove it immediately once the user saves:

```javascript
function toggleUnsavedChangesProtection(isDirty) {
  if (isDirty) {
    window.addEventListener('beforeunload', handleBeforeUnload)
  } else {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
}
```

Persistent `beforeunload` usage makes restores less reliable and is usually a sign that the page is not tracking dirty state precisely enough.

### Avoid long-lived work that survives badly across restores

Pages restored from memory resume pending work. Keep page-level lifecycle code resilient:

- close transient UI such as drawers, popovers, and stale toasts on restore when appropriate
- revalidate short-lived data instead of assuming the in-memory copy is still current
- avoid leaving important cleanup tied only to hard unload behavior

## Thresholds

- Pass if the route has no unconditional `unload` listeners and a back navigation restores from memory in the target browser.
- Pass if time-sensitive state refreshes after `pageshow.persisted === true` without forcing a full reload.
- Fail if history navigation always rebuilds the page because lifecycle code blocks bfcache eligibility.

## Support Notes

- bfcache behavior is browser-specific, so validate the real target browser matrix instead of assuming one engine's behavior applies everywhere.
- Use the browser's back/forward cache diagnostics as the source of truth for eligibility and blockers on a given route.

## Exceptions

- Some routes genuinely need a conditional `beforeunload` warning while unsaved data exists, but it should not remain attached once the page is clean.
- If a page handles sensitive or rapidly changing data, it may need targeted revalidation on restore. That still does not justify forcing every restore into a full reload.
- Third-party libraries can attach lifecycle listeners on your behalf, so verify the effective runtime behavior in the browser instead of assuming your source files tell the whole story.

## Verification

### Automated Checks

- Search the codebase and built output for `addEventListener('unload'` or equivalent unload hooks.
- Run Lighthouse or equivalent diagnostics and confirm there are no unload-listener warnings on the route.

### Manual Checks

- Open the page in a browser, navigate to a second page, then use the back button.
- Pass if the page restores immediately and your `pageshow` handler reports `event.persisted === true`.
- Open DevTools and inspect the route with the browser's back/forward cache tooling to confirm the page is eligible and to see any blockers.