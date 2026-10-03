# Prevent data loss from session timeouts

> Users are warned before session expiry, can extend time when appropriate, and can re-authenticate or resume work without losing entered data.

**Priority:** high · **Difficulty:** advanced · **Time:** 30 min

---
Authenticated flows should not silently erase work. The [WCAG guidance for timing-adjustable content](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) treats warning, recovery, and state preservation as part of the same user task.
## Code Examples

```html
<!-- Bad: silent timeout discards work -->
<form id="claim-form">
  <!-- Long form fields -->
</form>

<script>
  setTimeout(() => {
    window.location.href = "/login"
  }, 15 * 60 * 1000)
</script>
```

```tsx

const WARNING_MS = 14 * 60 * 1000
const LOGOUT_MS = 15 * 60 * 1000

  onExtend,
  onLogout,
}: {
  onExtend: () => Promise<void>
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(60)
  const extendButtonRef = useRefYour session is about to expire</h2>
      <p id="session-timeout-body">
        For security, you will be signed out in {remainingSeconds} seconds.
        Select "Stay signed in" to keep working without losing your draft.
      </p>

      <button ref={extendButtonRef} type="button" onClick={handleExtend}>
        Stay signed in
      </button>
      <button type="button" onClick={onLogout}>
        Sign out now
      </button>
    </div>
  )
}
```

```ts
// Good: preserve work before redirecting to re-authenticate
async function submitProtectedDraft(formData: Record<string, string>) {
  const response = await fetch('/api/secure-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  })

  if (response.status === 401) {
    const { draftId, loginUrl } = await response.json()
    window.location.href = `${loginUrl}?resume=${draftId}`
    return
  }

  return response.json()
}

async function resumeDraftAfterLogin(draftId: string) {
  const response = await fetch(`/api/drafts/${draftId}`)
  return response.json()
}
```

## Why It Matters

This is not just a convenience issue. The [WCAG guidance around time limits](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) is about preventing users from losing the context and data they need to complete a task.

Timeouts are often added for security or operational reasons, but many users need more time to read, think, switch devices, gather information, or use assistive technology. If a site logs them out without warning or clears their draft after re-authentication, the interaction becomes much harder or impossible to finish.

- **Cognitive accessibility**: Users may need extra time to understand instructions or gather required information.
- **Motor and speech input**: Entering data can take longer when using alternative input methods.
- **Low vision and screen readers**: Reading and navigating complex forms may require more time and repeated review.
- **Critical tasks**: Checkout, benefits applications, healthcare forms, support cases, and secure account flows often contain high-friction, high-cost data entry.

## Best Practices

### Warn before the timeout causes loss

If the time limit is controlled by the content, prefer letting the user turn it off, adjust it, or extend it. If you use a warning-based approach, follow WCAG-aligned thresholds:

- Show the warning before expiry, ideally at least **20 seconds** before the action that would cause data loss.
- Make extension available with a simple action such as pressing a button.
- If the time limit is content-controlled, allow repeated extension where feasible.
- Tell users up front how inactivity is measured and what will happen to their data.

### Preserve drafts and submitted data

[Technique G105](https://www.w3.org/WAI/WCAG21/Techniques/general/G105) is a practical recovery pattern when a session expires during a long task.

Do not force users to start over after a timeout. Preserve in-progress work on the server when possible. If client-side draft storage is used, limit it to non-sensitive data and document the retention behavior.

```ts
// Client-side draft persistence for non-sensitive fields
const DRAFT_KEY = 'support-ticket-draft'

function saveDraftLocally(formData: Record<string, string>) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(formData))
}

function restoreDraftLocally() {
  const draft = sessionStorage.getItem(DRAFT_KEY)
  return draft ? JSON.parse(draft) : null
}
```

### Restore the user to the same task state after login

After re-authentication, return the user to the same route, step, and draft state instead of dropping them on a generic dashboard or blank form.

| State to restore | Expected behavior |
|------------------|-------------------|
| Route | Return to the timed flow, not the home page |
| Step | Restore the current wizard or checkout step |
| Field values | Repopulate entered data |
| Error and help context | Re-show what the user needs to finish |
| Focus | Move focus to the restored heading, summary, or next required action |

### Make warning UI accessible

Timeout warnings are not just security UI. They are accessibility-critical dialogs or announcements and should be treated like any other important interaction:

- Use `role="alertdialog"` for blocking warnings that require action.
- Use a live region or `role="status"` for passive "session will expire soon" messages.
- Move focus into the warning when action is required.
- Ensure the warning works with keyboard only and has a clear accessible name.
- Do not hide the only recovery option in hover-only or pointer-only UI.

## Exceptions

The [timeouts understanding document](https://www.w3.org/WAI/WCAG21/Understanding/timeouts) is a useful baseline here: the policy reason for a timeout may be legitimate, but that does not remove the need to preserve user control where possible.

- Some time limits are essential, such as real-time auctions, exams with fixed timing, or other tasks where extending time would invalidate the activity.
- Security, fraud, or privacy requirements may require automatic logout after inactivity. That does not remove the need to warn users, explain the timeout, and preserve work where policy allows.
- Persisting sensitive data may require legal, privacy, or product review. If durable storage is not allowed, preserve the minimum safe state needed for re-authentication recovery or warn clearly before users begin.
- Background inactivity timeouts controlled outside the content are not always fully under the page author's control, but the authored flow should still avoid avoidable data loss.

## Verification

Use the [re-authentication guidance](https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html) to verify both the warning behavior and the recovery flow, not just the logout timer itself.

### Automated Checks

- In a test environment, shorten the inactivity timeout to a practical value such as 60 seconds so the warning and recovery flow can be exercised in CI.
- Add an end-to-end test that waits for the warning and confirms it appears before the destructive timeout boundary.
- Assert that the warning has an accessible name, an accessible description, and keyboard-operable actions.
- Assert that choosing "Stay signed in" keeps the user in the same flow with their current data intact.
- Assert that letting the session expire, then re-authenticating, restores the previous draft, step, and route.
- Fail the rule if the user is redirected to login and previously entered data is missing after a successful re-authentication.

### Manual Checks

1. Start a representative authenticated flow with meaningful data entry.
2. Stop interacting until the warning appears and confirm it explains the timeout and available recovery action.
3. Use keyboard only to extend the session and confirm focus remains logical.
4. Repeat the flow, allow the session to expire, re-authenticate, and confirm the draft and current step are restored.
5. Test with a screen reader and verify the warning is announced in time to act.
6. Pass only if the user never has to re-enter previously entered data because the session expired.