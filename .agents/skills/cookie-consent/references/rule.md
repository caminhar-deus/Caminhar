# Show a cookie consent notice

> Websites that set non-essential cookies must obtain prior, informed user consent under GDPR, CCPA, and similar privacy regulations before cookies are placed.

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
The EU's General Data Protection Regulation (GDPR) and ePrivacy Directive require websites to obtain informed consent before placing non-essential cookies on a user's device. Similar requirements exist in CCPA (California), LGPD (Brazil), PIPEDA (Canada), and PECR (UK).
## Code Examples

#

## Using a Consent Management Platform (CMP)

Recommended CMPs that handle GDPR compliance:
- **Cookiebot** — automated cookie scanning + consent management
- **OneTrust** — enterprise-grade compliance
- **CookieYes** — small-to-medium sites
- **Osano** — open source friendly

### Manual Implementation Pattern

```html
<!-- Do NOT load analytics before consent -->
<!-- ❌ Wrong: loads before consent -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>

<!-- ✅ Correct: analytics loaded only after consent -->
<script>
  // Check consent before loading analytics
  if (getConsentStatus('analytics') === 'granted') {
    loadGoogleAnalytics()
  }
</script>
```

### Consent Storage and Script Loading

```typescript
// consent.ts
const CONSENT_KEY = 'cookie-consent'
const CONSENT_VERSION = 'v2' // Bump when purposes change

interface ConsentPreferences {
  version: string
  analytics: boolean
  advertising: boolean
  functional: boolean
  timestamp: number
}

  try {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as ConsentPreferences
    // Invalidate old consent versions
    if (parsed.version !== CONSENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

  const consent: ConsentPreferences = {
    ...preferences,
    version: CONSENT_VERSION,
    timestamp: Date.now(),
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
  applyConsentDecision(consent)
}

function applyConsentDecision(consent: ConsentPreferences) {
  if (consent.analytics) {
    loadGoogleAnalytics()
  } else {
    disableAnalyticsCookies()
  }
  if (consent.advertising) {
    loadAdvertisingPixels()
  } else {
    disableAdvertisingCookies()
  }
}

function loadGoogleAnalytics() {
  const script = document.createElement('script')
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXX'
  script.async = true
  document.head.appendChild(script)
}
```

### React Consent Banner Component

```tsx
'use client'

  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [advertising, setAdvertising] = useState(false)

  useEffect(() => {
    // Show banner only if no consent has been recorded
    if (!getConsent()) {
      setVisible(true)
    }
  }, [])

  const acceptAll = () => {
    setConsent({ analytics: true, advertising: true, functional: true })
    setVisible(false)
  }

  const rejectAll = () => {
    setConsent({ analytics: false, advertising: false, functional: false })
    setVisible(false)
  }

  const savePreferences = () => {
    setConsent({ analytics, advertising, functional: true })
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="cookie-consent-banner"
    >
      <h2 id="consent-title">We use cookies</h2>
      <p>
        We use cookies to improve your experience. Some are essential; others
        help us understand how you use our site.{' '}
        <a href="/privacy">Privacy Policy</a>
      </p>

      {showDetails && (
        <div className="consent-details">
          <label>
            <input type="checkbox" checked disabled readOnly />
            <strong>Strictly necessary</strong> — required for the site to work
          </label>
          <label>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
            <strong>Analytics</strong> — helps us understand usage patterns
          </label>
          <label>
            <input
              type="checkbox"
              checked={advertising}
              onChange={(e) => setAdvertising(e.target.checked)}
            />
            <strong>Advertising</strong> — personalised ads
          </label>
        </div>
      )}

      <div className="consent-actions">
        <button onClick={rejectAll}>Reject non-essential</button>
        <button onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? 'Hide' : 'Manage preferences'}
        </button>
        {showDetails && (
          <button onClick={savePreferences}>Save preferences</button>
        )}
        <button onClick={acceptAll} className="primary">
          Accept all
        </button>
      </div>
    </div>
  )
}
```

## Why It Matters

GDPR violations can result in fines up to €20 million or 4% of global annual turnover. Regulators across the EU have actively fined organizations for deploying tracking cookies without valid consent.

## Cookie Categories

| Category | Examples | Consent Required |
|----------|----------|-----------------|
| **Strictly necessary** | Session cookies, CSRF tokens, login state | No |
| **Functional** | Language preference, accessibility settings | Depends — essential if core to service |
| **Analytics** | Google Analytics, Mixpanel | Yes |
| **Advertising** | Google Ads, Facebook Pixel, remarketing | Yes |
| **Social media** | Twitter/LinkedIn share buttons, embeds | Yes |

## What Valid Consent Requires

The GDPR Article 4(11) definition of consent requires that it be:

- **Freely given** — declining must be as easy as accepting; no cookie wall blocking access
- **Specific** — separate consent for each purpose (analytics vs. advertising)
- **Informed** — the user understands what they are consenting to
- **Unambiguous** — requires a clear affirmative action; pre-ticked boxes are not valid

Users must also be able to revisit and change that choice later from a stable entry point such as the footer, account settings, or privacy center.

## Google Consent Mode v2

For sites using Google Analytics or Google Ads, implement Google Consent Mode to signal consent state:

```javascript
// Initialize consent mode BEFORE loading GTM or GA
window.dataLayer = window.dataLayer || []
function gtag() { dataLayer.push(arguments) }

// Set default state — deny all until consent is given
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500, // milliseconds to wait for consent update
})
```

```javascript
// After user grants consent
gtag('consent', 'update', {
  analytics_storage: userConsent.analytics ? 'granted' : 'denied',
  ad_storage: userConsent.advertising ? 'granted' : 'denied',
})
```

Many sites display a cookie banner but load analytics and advertising scripts in the page regardless of user choice. This is not GDPR-compliant. Scripts must not execute until after the user has actively accepted their category.

## Standards

- Use these references as the standard for the legal or product-facing privacy behavior that users actually experience.
- Check the implementation against GDPR Article 6 - Lawfulness of processing before treating the rule as satisfied.
- Check the implementation against GDPR Recital 32 - Consent before treating the rule as satisfied.

## Verification

### Automated Checks

- Test the affected flow in a production-like environment, not just local development.
- Document any intentional exceptions explicitly.

### Manual Checks

- Inspect the final HTTP response or browser behavior to confirm the control is actually enforced.
- Verify third-party integrations or embeds still work after the restriction is applied.
- Accept analytics, then revoke it, and confirm the tracker stops initializing on the next page load.
- Confirm a visible "Cookie settings" or equivalent control remains available after the banner is dismissed.