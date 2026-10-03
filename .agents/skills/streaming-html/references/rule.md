# Stream HTML to the browser before the full response is ready

> Use HTTP chunked transfer encoding and React renderToPipeableStream (or ReadableStream) to begin delivering HTML to the browser as soon as the first bytes are available, reducing Time to First Byte and First Contentful Paint.

**Priority:** medium · **Difficulty:** advanced · **Time:** 45 min

---
HTML streaming relies on HTTP chunked transfer encoding (`Transfer-Encoding: chunked`), which allows a server to send a response in multiple pieces without knowing the total content length upfront. The browser begins parsing each chunk as it arrives, discovering and fetching subresources (CSS, fonts, scripts, images) long before the last chunk is sent.
## Code Examples

With traditional buffered SSR:

```
0ms    Server starts executing
800ms  All database queries complete
800ms  HTML generation begins
820ms  HTML generation completes
820ms  TTFB — first byte arrives in browser
850ms  CSS parsed
900ms  FCP
```

With streaming:

```
0ms    Server starts executing
10ms   TTFB — shell HTML flushed immediately (head, above-fold skeleton)
10ms   Browser fetches CSS, discovers LCP image
300ms  Slow data query completes; component HTML streamed
380ms  FCP — above-fold content painted
```

The gain is that the browser starts work 790 ms earlier in this example.

## Why It Matters

Traditional SSR waits for all data fetches to complete before sending a single byte of HTML, which means the browser cannot parse, discover subresources, or render anything until the slowest data query finishes. Streaming decouples the delivery of above-fold content from slow database queries and third-party API calls, dramatically improving perceived performance and LCP.

## React renderToPipeableStream

`renderToPipeableStream` is React's streaming SSR API. It accepts a React tree and renders it to a Node.js writable stream in chunks. The key option is `onShellReady` — called when the application shell (everything outside `` boundaries) is ready to send:

```typescript
// server/render.ts (custom Express / Node.js setup)

  let didError = false;

  const { pipe, abort } = renderToPipeableStream(
    ,
    {
      // bootstrapScripts is optional — use for client hydration
      bootstrapScripts: ['/static/js/main.js'],

      onShellReady() {
        // The shell is the minimal HTML that does not depend on Suspense
        // boundaries — flush it immediately for a low TTFB
        res.statusCode = didError ? 500 : 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        // chunked transfer is automatic when the length is unknown
        pipe(res);
      },

      onShellError(error) {
        // Shell rendering failed — fall back to a basic error page
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>Something went wrong</h1>');
      },

      onError(error) {
        didError = true;
        console.error(error);
      },
    }
  );

  // Abort streaming after 10 seconds to avoid hanging connections
  setTimeout(abort, 10_000);
}
```

## Next.js App Router: Streaming by Default

The App Router streams automatically. Any `async` Server Component that wraps a data fetch is a natural Suspense boundary. Wrap slow components in explicit `` to control what is flushed first:

```tsx
// app/dashboard/page.tsx

  return (
    <main>
      {/*
        The page title and navigation are part of the shell —
        they render immediately without waiting for any data.
      */}
      <h1>Dashboard</h1>
      <nav>{/* ... */}</nav>

      {/*
        KPICards fetches summary stats. If it is slow, show a skeleton
        rather than blocking the page shell.
      */}
      }>
        
      

      {/*
        RecentOrders fetches a paginated list — isolated in its own boundary
        so it does not block KPICards.
      */}
      }>
        
      
    </main>
  );
}

// KPICards is a Server Component that fetches its own data
async function KPICards() {
  const stats = await fetchKPIStats(); // potentially slow
  return <ul>{stats.map((s) => )}</ul>;
}

async function RecentOrders() {
  const orders = await fetchRecentOrders(); // independent query
  return ;
}
```

Next.js will flush the HTML for `<h1>Dashboard</h1>` and the nav immediately, then stream in `KPICards` and `RecentOrders` as their data resolves — potentially out-of-order using React's slot mechanism.

Wrapping the entire page in a single Suspense boundary means nothing is flushed until all data is ready — identical to buffered SSR. Use granular boundaries around each independently fetched section so above-fold content is never blocked by below-fold data.

## Node.js ReadableStream (Non-React)

For non-React server environments, use the Web Streams API to stream HTML chunks:

```typescript
// Plain Node.js / Deno / Cloudflare Workers example

  getSlowData: () => Promise<string>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Flush the page shell immediately
      controller.enqueue(
        encoder.encode(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My App</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header><nav><!-- navigation --></nav></header>
  <main id="content">
    <div class="loading-skeleton" aria-busy="true" aria-label="Loading content...">
    </div>
`)
      );

      // Fetch slow data while the browser is already parsing the shell
      const data = await getSlowData();

      // Stream the content section once data is ready
      controller.enqueue(
        encoder.encode(`
    <script>
      // Replace skeleton with real content
      document.getElementById('content').innerHTML = ${JSON.stringify(data)};
    </script>
  </main>
</body>
</html>`)
      );

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Disable any response buffering by proxies
      'X-Accel-Buffering': 'no',
    },
  });
}
```

## Flushing Resource Hints Early

One of the most valuable streaming patterns is to include `<link rel="preload">` hints in the first chunk, even before the full page is determined:

```typescript
// First chunk always includes critical resource hints
const shellChunk = `<!DOCTYPE html>
<html>
<head>
  <!-- Preload the LCP image — browser starts fetching immediately -->
  <link rel="preload" as="image" href="/hero.webp" fetchpriority="high">
  <!-- Preload critical fonts -->
  <link rel="preload" as="font" type="font/woff2" href="/fonts/inter.woff2" crossorigin>
  <link rel="stylesheet" href="/critical.css">
</head>
<body>
  <div id="app">
`;
```

Nginx, Cloudflare, and other proxies often buffer responses before forwarding them downstream, which nullifies streaming. Set `X-Accel-Buffering: no` (Nginx) and ensure your CDN is configured for streaming pass-through on HTML responses.

## Measuring the Impact

Use WebPageTest's waterfall view to verify that HTML chunks arrive before the server finishes rendering:

1. The first green bar (Time to First Byte) should be under 200 ms
2. The CSS and LCP image requests should start while the HTML bar is still active
3. The "Layout" event in DevTools Performance should occur before the response completes

## Verification

Use [WebPageTest](https://www.webpagetest.org/) or an equivalent waterfall trace to confirm the shell HTML actually arrives before the slow data completes, because streaming only helps when the browser receives and starts parsing that first chunk early.

### Automated Checks

- Open DevTools Network panel and click the page request — the Response tab should show HTML arriving in multiple chunks (the response will not be "complete" for several hundred milliseconds while later chunks arrive).
- Run Lighthouse and confirm TTFB is under 600 ms (green) and FCP is under 1.8 s.
- Test with a simulated 3G connection in DevTools — the skeleton UI should appear quickly even if data takes 3–5 seconds.

### Manual Checks

- In Next.js, add `console.log('rendering KPICards')` inside an async Server Component wrapped in Suspense — confirm in the server log that the page load event fires before this log appears.