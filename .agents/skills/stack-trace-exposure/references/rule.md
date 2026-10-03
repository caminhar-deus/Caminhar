# Prevent stack trace exposure in production error responses

> Production error responses never include stack traces, internal file paths, framework internals, or other debugging detail that could aid an attacker (OWASP A09).

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
When something goes wrong on the server, the full error detail is essential for debugging, but the [OWASP Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html) is explicit that it belongs in server logs and monitoring systems, not in the response body seen by the user or an attacker.
## Code Example

A typical unhandled Express error exposes:

```json
{
  "error": "Error: ENOENT: no such file or directory, open '/app/config/secrets.yml'\n    at Object.openSync (node:fs:590:18)\n    at Object.readFileSync (node:fs:475:35)\n    at loadConfig (/app/src/lib/config.ts:23:18)\n    at Object.<anonymous> (/app/src/routes/settings.ts:41:22)",
  "stack": "Error: ENOENT: no such file or directory...",
  "code": "ENOENT",
  "path": "/app/config/secrets.yml"
}
```

This single response reveals:
- The server runs Node.js
- The app framework and file structure
- The path to a secrets configuration file
- The exact library versions (via frame line numbers)

## Why It Matters

Stack traces reveal file paths, function names, library versions, and sometimes database schema or configuration details. An attacker uses this information to identify the exact version of a framework or ORM, look up known CVEs for that version, and craft a targeted exploit. [OWASP A09](https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/) highlights how often organisations expose this information without realising it.

## The Correct Pattern

```typescript
// ✅ Only the correlation ID reaches the client
{
  "error": "An unexpected error occurred.",
  "requestId": "req_7f3a9b2c"
}

// ✅ Full details are logged server-side, searchable by requestId
// [ERROR] req_7f3a9b2c: Error: ENOENT: no such file or directory, open '/app/config/secrets.yml'
//     at loadConfig (/app/src/lib/config.ts:23:18)
```

## Centralised Error Handler: Express.js

```typescript
// middleware/error-handler.ts

  statusCode?: number
  code?: string
  isOperational?: boolean  // true = expected error (validation, 404); false = bug
}

  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = (req.headers['x-request-id'] as string) ?? randomUUID()
  const statusCode = error.statusCode ?? 500

  // Log full details server-side
  if (statusCode >= 500) {
    console.error({
      requestId,
      method: req.method,
      url: req.url,
      statusCode,
      message: error.message,
      stack: error.stack,
      code: error.code,
    })

    // Report to monitoring service
    Sentry.withScope((scope) => {
      scope.setTag('requestId', requestId)
      scope.setContext('request', { method: req.method, url: req.url })
      Sentry.captureException(error)
    })
  }

  // Return sanitised response — no stack trace, no internal details
  const isProduction = process.env.NODE_ENV === 'production'
  const clientMessage =
    isProduction || !error.isOperational
      ? getGenericMessage(statusCode)
      : error.message  // Operational errors (e.g., validation) can include a message

  res.status(statusCode).json({
    error: clientMessage,
    requestId,  // Allows support to correlate with server logs
  })
}

function getGenericMessage(statusCode: number): string {
  if (statusCode === 400) return 'Invalid request.'
  if (statusCode === 401) return 'Authentication required.'
  if (statusCode === 403) return 'You do not have permission to perform this action.'
  if (statusCode === 404) return 'The requested resource was not found.'
  if (statusCode === 429) return 'Too many requests. Please try again later.'
  return 'An unexpected error occurred. If the problem persists, contact support.'
}
```

```typescript
// app.ts

const app = express()

// ... routes ...

// Must be the last middleware registered
app.use(errorHandler)
```

## Next.js API Routes

```typescript
// lib/api-error.ts

  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

  return error instanceof ApiError
}
```

```typescript
// lib/with-error-handler.ts

type RouteHandler = (req: Request, ...args: unknown[]) => Promise {
    const requestId = randomUUID()

    try {
      return await handler(req, ...args)
    } catch (error) {
      const isProd = process.env.NODE_ENV === 'production'

      if (isApiError(error) && error.isOperational) {
        // Operational error — safe to return the message
        return NextResponse.json(
          { error: error.message, requestId },
          { status: error.statusCode }
        )
      }

      // Unexpected error — log and return generic message
      console.error({ requestId, error })
      Sentry.captureException(error, { tags: { requestId } })

      return NextResponse.json(
        {
          error: isProd
            ? 'An unexpected error occurred.'
            : (error instanceof Error ? error.message : String(error)),
          requestId,
        },
        { status: 500 }
      )
    }
  }
}
```

```typescript
// app/api/users/[id]/route.ts

  const { id } = await params
  const user = await getUser(id)

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  return NextResponse.json({ user })
})
```

## React Error Boundaries (Client Side)

The same principle applies on the frontend — never render raw error objects:

```tsx
// components/error-boundary.tsx
'use client'

interface State { hasError: boolean }

  state = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log server-side (or to monitoring) — never render to DOM
    console.error('Uncaught error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      // ✅ Generic user-facing message, no error details
      return (
        <div role="alert">
          <h2>Something went wrong.</h2>
          <p>Please refresh the page or contact support if the problem persists.</p>
        </div>
      )
    }
    return this.props.children
  }
}
```

## Framework-Level Configuration

Some frameworks expose errors by default in development:

```typescript
// Express — disable x-powered-by and error details in production
app.disable('x-powered-by')

if (process.env.NODE_ENV === 'production') {
  app.set('env', 'production')  // Suppresses stack traces in default error handler
}
```

```javascript
// next.config.js — generate source maps but don't serve them publicly
module.exports = {
  productionBrowserSourceMaps: false,  // Default; keep false unless you host maps privately
}
```

Stack traces in development error responses are extremely useful. The goal is to ensure the `NODE_ENV === 'production'` check is in place so verbose errors are stripped before the code reaches production. Use separate environment configurations and never deploy with `NODE_ENV=development`.

## Exceptions

- Scanner output, leaked-secret detections, or stack traces should be confirmed as production-relevant before being escalated as blockers.
- Archived dependencies, sample values, or test fixtures can create false positives, but they should still be documented and bounded clearly.
- If multiple findings overlap, prioritize the issue that most directly enables compromise or data exposure.

## Verification

1. Trigger a deliberate 500 error in production (or a production-like staging environment) and confirm the response body contains only a generic message and a correlation ID — no stack, no file paths.
2. Search the codebase for patterns like `res.json(error)`, `res.send(err.stack)`, and `JSON.stringify(error)` in route handlers, and confirm each is guarded in the way the [OWASP Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html) recommends.
3. Check that the server logs contain the full stack trace searchable by the correlation ID returned to the client.
4. Verify that the `X-Powered-By` header is absent from HTTP responses (it leaks the framework version).