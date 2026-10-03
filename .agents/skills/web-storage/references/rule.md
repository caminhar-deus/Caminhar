# Use Web Storage API safely

> Use localStorage and sessionStorage with proper serialization, error handling, and security awareness to avoid data corruption and storage quota errors.

**Priority:** medium · **Difficulty:** beginner · **Time:** 15 min

---
Web Storage provides a simple synchronous key-value store, but its synchronous nature and quota limits require defensive coding.

## Code Example

```javascript
// A defensive localStorage wrapper
const storage = {
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(key)
      if (item === null) return fallback
      return JSON.parse(item)
    } catch {
      return fallback
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded')
      }
      return false
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch { /* ignore */ }
  }
}

// Usage
storage.set('user-preferences', { theme: 'dark', fontSize: 16 })
const prefs = storage.get('user-preferences', { theme: 'light', fontSize: 14 })
```

## Why It Matters

localStorage and sessionStorage have a 5–10 MB quota per origin, and any write can throw a QuotaExceededError. Private browsing modes in some browsers disable storage entirely and throw on all writes. Applications that don't handle these errors crash silently, leaving users unable to use the app.

## localStorage vs sessionStorage

```javascript
// localStorage — persists across browser sessions (until cleared)
localStorage.setItem('theme', 'dark')
// User closes browser, reopens: theme is still 'dark'

// sessionStorage — cleared when the tab is closed
sessionStorage.setItem('draft-post', JSON.stringify(postContent))
// Tab closes: draft is gone
// New tab: cannot see the previous tab's sessionStorage
```

## What NOT to Store

```javascript
// ❌ Never store security-sensitive data in localStorage
localStorage.setItem('auth-token', jwtToken)
// Any XSS attack on any script on your site can read this!

// ❌ Never store passwords, credit card numbers, PII
localStorage.setItem('user-password', password)

// ✅ Authentication tokens belong in httpOnly cookies (set by the server)
// The browser sends them automatically and JS cannot read them

// ✅ Fine to store: UI preferences, cached non-sensitive data, feature flags
localStorage.setItem('sidebar-collapsed', 'true')
localStorage.setItem('last-viewed-category', 'javascript')
```

## Quota Management

```javascript
// Check available space (not universally supported but useful)
function estimateStorageUsage() {
  let total = 0
  for (const key of Object.keys(localStorage)) {
    total += localStorage.getItem(key)?.length ?? 0
  }
  return `~${(total / 1024).toFixed(2)} KB used`
}

// Evict old cache entries when quota is exceeded
function setWithEviction(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Remove oldest cached items and retry
    const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith('cache:'))
    if (cacheKeys.length > 0) {
      localStorage.removeItem(cacheKeys[0])
      localStorage.setItem(key, JSON.stringify(value))
    }
  }
}
```

## Exceptions

- A framework default or browser behavior is not an exception by itself; only documented constraints with compensating controls should suppress the finding.
- When a JavaScript pattern looks unsafe but the data is fully constrained, validated, and never attacker-controlled, document that boundary explicitly instead of treating it as implicit.
- If a rule overlaps with a stronger exploit path or runtime failure, fix the issue that most directly enables compromise or user-visible breakage first.

## Verification

1. Verify the behavior in the browser after the code change, not only in static analysis.
2. Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
3. Test the primary user flow and one edge case triggered by the changed script path.
4. Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.