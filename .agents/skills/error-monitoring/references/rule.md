# Integrate real-time error monitoring in production

> A real-time error monitoring service captures, groups, and alerts on unhandled exceptions and promise rejections in production so issues are discovered before users report them.

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
Error monitoring closes the feedback loop between your production environment and your engineering team. Without it, you are flying blind — learning about bugs only when users complain.
## Code Examples

#

## Installation

```bash
pnpm add @sentry/nextjs
# or for plain React:
pnpm add @sentry/react
```

### Next.js (App Router)

```typescript
// sentry.client.config.ts

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production — avoids noise during development
  enabled: process.env.NODE_ENV === 'production',

  // Tag every event with the deployed version for release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'production',

  // Sample rate: 1.0 = capture 100% of errors (recommended to start)
  sampleRate: 1.0,

  // Performance monitoring — sample 10% of transactions
  tracesSampleRate: 0.1,

  // Session replays — capture 10% of sessions, 100% of errored sessions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and inputs to comply with privacy requirements
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  beforeSend(event, hint) {
    // Strip PII from error events before they leave the browser
    if (event.user?.email) {
      event.user.email = '[Filtered]'
    }
    return event
  },
})
```

```typescript
// sentry.server.config.ts

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  release: process.env.APP_VERSION,
  environment: process.env.ENVIRONMENT ?? 'production',
  sampleRate: 1.0,
  tracesSampleRate: 0.05,
})
```

### Identifying Users

Attach user context after authentication so errors can be traced to specific accounts (with appropriate privacy considerations):

```typescript
// After successful login

function onUserLogin(user: { id: string; plan: string }) {
  Sentry.setUser({
    id: user.id,          // Use an opaque ID, never email/name
    plan: user.plan,      // Non-PII attributes are useful for triage
  })
}

function onUserLogout() {
  Sentry.setUser(null)
}
```

### React Error Boundary

```tsx
// components/error-boundary.tsx

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  eventId: string | null
}

  state: State = { hasError: false, eventId: null }

  static getDerivedStateFromError(): PartialSomething went wrong.</h2>
            <button
              onClick={() =>
                Sentry.showReportDialog({ eventId: this.state.eventId ?? '' })
              }
            >
              Report feedback
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
```

### Capturing Custom Errors

```typescript

// Capture a specific error with extra context
async function processPayment(orderId: string, amount: number) {
  try {
    await paymentGateway.charge({ orderId, amount })
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('feature', 'checkout')
      scope.setContext('order', { orderId, amount })
      scope.setLevel('error')
      Sentry.captureException(error)
    })
    throw error  // Re-throw — never swallow errors silently
  }
}

// Log a message (non-exception) for important events
Sentry.captureMessage('Payment gateway returned unexpected status code 202', 'warning')
```

## Why It Matters

Production errors are invisible without monitoring. Users rarely file detailed bug reports — they simply leave. Error monitoring gives you actionable stack traces, breadcrumbs, and user context within seconds of an issue occurring, cutting mean time to detect (MTTD) from days to minutes and dramatically reducing the cost of incidents.

## What to Monitor

| Signal | Description |
|---|---|
| **Unhandled exceptions** | JavaScript errors not caught by any try-catch |
| **Unhandled promise rejections** | Async errors that bubble to the global handler |
| **Framework error boundaries** | React, Vue, Angular component-level crashes |
| **Network errors** | Failed API calls and HTTP 4xx/5xx responses |
| **Custom errors** | Business logic violations you explicitly capture |
| **Performance anomalies** | Core Web Vitals regressions, slow transactions |

## Production RUM and Failed Requests

User-facing regressions often show up first as slow interactions or a burst of failed API calls rather than a top-level crash. Capture both:

```typescript

function reportWebVital(name: string, value: number) {
  monitoring.captureMessage(`web-vital:${name}`, 'info', {
    tags: { source: 'rum' },
    extra: { value },
  })
}

onLCP((metric) => reportWebVital('LCP', metric.value))
onCLS((metric) => reportWebVital('CLS', metric.value))
onINP((metric) => reportWebVital('INP', metric.value))

async function monitoredFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init)
  if (!response.ok) {
    monitoring.captureMessage('frontend-network-failure', 'warning', {
      tags: { status: String(response.status) },
      extra: { url: String(input) },
    })
  }
  return response
}
```

## Alternative: Global Error Handlers

For applications that do not use a monitoring SDK, at minimum capture global errors:

```typescript
// Unhandled exceptions
window.addEventListener('error', (event) => {
  sendToMonitoring({
    type: 'exception',
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    stack: event.error?.stack,
  })
})

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  sendToMonitoring({
    type: 'unhandledRejection',
    reason: String(event.reason),
    stack: event.reason instanceof Error ? event.reason.stack : undefined,
  })
})
```

## Alert Configuration

Configure alerts that page the right people without creating noise:

| Rule | Threshold | Channel |
|---|---|---|
| New error (never seen before) | Immediately | Slack #engineering |
| Error rate spike | +200% vs previous hour | PagerDuty (on-call) |
| Critical unhandled exception | Any occurrence in prod | Slack + email |
| Issue regression (fixed → reoccurring) | Immediately | Slack + assignee |
| LCP/INP regression | Sustained breach vs baseline | Performance alert channel |
| Failed request spike | Above normal baseline per endpoint | On-call or API owners |

Initialising the SDK in development produces noise and can exhaust your event quota. Always guard with `process.env.NODE_ENV === 'production'` or use separate DSNs per environment so staging errors do not page the on-call engineer.

## Standards

- Use these references as the standard for how the test or monitoring strategy should behave in the shipped workflow.
- Check the implementation against Sentry: Getting started with JavaScript before treating the rule as satisfied.
- Check the implementation against web.dev: Monitor and analyze the app before treating the rule as satisfied.

## Verification

1. In a staging environment, trigger a deliberate `throw new Error('Test monitoring')` and confirm the event appears in your monitoring dashboard within 30 seconds.
2. Check that the event includes the correct `release` tag, `environment`, and user context.
3. Confirm a CI deployment hook uploads source maps so stack traces show original TypeScript line numbers, not minified output.
4. Verify that at least one alert rule exists for new production errors and is routed to the on-call channel.
5. Force a failed API response and confirm the monitoring system records the request failure with route and status.
6. Confirm production RUM captures LCP, CLS, or INP and that alerting is based on regression thresholds, not just raw logs.