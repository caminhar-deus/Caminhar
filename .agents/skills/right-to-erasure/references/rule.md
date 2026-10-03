# Implement a user-facing data deletion mechanism

> Provide users with a clear way to request deletion of their personal data, fulfilling GDPR Article 17 (right to erasure / right to be forgotten).

**Priority:** medium · **Difficulty:** intermediate · **Time:** 60 min

---
The right to erasure (often called the "right to be forgotten") requires controllers to delete a user's personal data when requested, unless a legal ground for continued processing exists. For frontend applications this has two dimensions: clearing all client-side storage, and triggering deletion on the server.
## Code Example

The deletion option must be discoverable. Place it in account settings under a clearly labelled section such as "Privacy" or "Your data". Use a two-step confirmation pattern to prevent accidental deletions:

```tsx
// DeletionRequestButton.tsx

type DeletionState = 'idle' | 'confirming' | 'pending' | 'done' | 'error';

  const [state, setState] = useState('idle');

  async function handleConfirm() {
    setState('pending');
    try {
      // 1. Clear all client-side storage immediately
      clearUserData();

      // 2. Send deletion request to the server
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Server deletion request failed');

      setState('done');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <p role="status">
        Your deletion request has been received. Your data will be removed
        within 30 days. You have been signed out.
      </p>
    );
  }

  if (state === 'confirming') {
    return (
      <div role="alertdialog" aria-labelledby="delete-confirm-title">
        <h2 id="delete-confirm-title">Delete your account and all data?</h2>
        <p>This action cannot be undone. You will be signed out immediately.</p>
        <button onClick={handleConfirm} disabled={state === 'pending'}>
          {state === 'pending' ? 'Deleting…' : 'Yes, delete my data'}
        </button>
        <button onClick={() => setState('idle')}>Cancel</button>
      </div>
    );
  }

  return (
    <button onClick={() => setState('confirming')}>
      Delete my account and data
    </button>
  );
}
```

## Why It Matters

GDPR Article 17 gives EU residents the right to have their personal data erased when it is no longer necessary for the purpose it was collected, or when they withdraw consent. Failing to honour this right can result in regulatory fines of up to €20 million or 4% of global annual turnover. Providing a clear deletion flow also builds trust with users who value control over their data.

## What Must Be Deleted

A compliant deletion covers every location where personal data may be stored:

| Storage Location | API to clear |
|---|---|
| `localStorage` | `localStorage.clear()` or per-key `removeItem` |
| `sessionStorage` | `sessionStorage.clear()` |
| IndexedDB | `indexedDB.deleteDatabase(name)` |
| Cookies | Set each cookie's `Max-Age=0; expires=Thu, 01 Jan 1970` |
| Service Worker caches | `caches.delete(cacheName)` |
| Server-side data | DELETE / POST request to your deletion API |

## Clearing All Client-Side Storage

The `clearUserData()` helper should be a single function that handles every client-side storage mechanism. Centralising this logic makes it easy to audit and extend:

```typescript
// lib/privacy.ts

/**
 * Removes all personal data from client-side storage.
 * Call this immediately when a deletion request is confirmed — do not wait
 * for the server response, as the user has already expressed intent to delete.
 */

  // 1. localStorage
  localStorage.clear();

  // 2. sessionStorage
  sessionStorage.clear();

  // 3. IndexedDB — delete every database the application has created
  const databases = await indexedDB.databases();
  await Promise.all(
    databases.map((db) => {
      if (!db.name) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(db.name!);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    })
  );

  // 4. Cookies — clear known application cookies
  const cookiesToDelete = ['session', 'refresh_token', 'user_prefs', '__stripe_mid'];
  for (const name of cookiesToDelete) {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  }

  // 5. Cache Storage (Service Worker caches)
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }
}
```

Clear client-side storage before awaiting the server response. If the network request fails, the user's local data is still gone — which is the correct behaviour. Retrying the server call is separate from the local clearance.

## Server-Side Deletion API

The server must accept deletion requests and schedule them within the 30-day GDPR window. A typical REST implementation:

```typescript
// app/api/account/delete/route.ts (Next.js App Router)

  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  // Queue deletion — process asynchronously within 30 days
  await scheduleDeletion({
    userId: session.user.id,
    requestedAt: new Date().toISOString(),
    // GDPR deadline: 30 calendar days from request
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Send confirmation email to the address on record before it is deleted
  await sendDeletionConfirmationEmail(session.user.email);

  return NextResponse.json({ received: true });
}
```

## Confirmation and Timeline Communication

After a deletion request is submitted, inform the user:

- That the request has been received
- The deadline by which data will be removed (e.g. "within 30 days")
- That they have been signed out of all devices
- A reference number for their records (if your system supports it)

Your application likely passes personal data to third-party processors (analytics, CRM, email tools). Deletion requests must also be forwarded to these processors. Check each processor's API for a deletion endpoint and include those calls in your deletion workflow.

## Standards

- Use these references as the standard for the legal or product-facing privacy behavior that users actually experience.
- Check the implementation against GDPR Article 17 — Right to erasure before treating the rule as satisfied.
- Check the implementation against ICO: Right to erasure before treating the rule as satisfied.

## Support Notes

- Privacy features can differ by browser storage, cookie, and embed behavior, so verify the user-facing outcome in the supported environments rather than relying only on server logic.
- Document any fallback or platform-specific limitation when a privacy control is interpreted differently across browsers.

## Verification

### Automated Checks

- Sign in as a test user, then trigger the deletion flow. Confirm `localStorage`, `sessionStorage`, and cookies are empty in DevTools Application panel immediately after confirmation.
- Open the IndexedDB panel in DevTools and verify all databases are removed.

### Manual Checks

- Check the server receives a deletion request by inspecting the Network tab — the POST to `/api/account/delete` should return 200.
- Verify a confirmation message is displayed to the user with a reference to the 30-day timeline.