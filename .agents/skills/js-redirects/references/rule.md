# Avoid JavaScript-based redirects

> Detects JavaScript resources that return 3XX redirects to reduce latency

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
JavaScript redirects (using `window.location`, `window.location.href`, or `window.location.replace`) are inefficient and add unnecessary latency to the user experience.

## Code Examples

#

## Avoid Client-Side Redirects
```javascript
// ❌ Bad: Redirecting via JavaScript
if (userIsLoggedIn) {
  window.location.href = '/dashboard';
}
```

### Use Server-Side Redirects
```javascript
// ✅ Good: Server-side redirect (Next.js Example)

  if (userIsLoggedIn) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }
}
```

### HTML Meta Redirects
```html
<!-- ⚠️ Avoid if possible, but better than JS -->
<meta http-equiv="refresh" content="0; url=https://example.com/">
```

## Why It Matters

Server-side redirects are the baseline because [web.dev's performance guidance](https://web.dev/learn/performance) and crawler behavior both reward fewer client-side hops before the final content is visible.

- **Browser Processing**: For a JS redirect, the browser must request the page, download the HTML, parse it, and then execute the script before initiating the redirect.
- **Latency**: This adds at least one full round-trip of latency compared to a server-side redirect, which happens immediately.
- **SEO/Crawler Impact**: While some modern search engines can follow JavaScript redirects, server-side 301 redirects are much more reliable for transferring SEO value (link equity).
- **User Perception**: Users may see a momentary "flash" of the original page before the redirect occurs, which is jarring.

## Best Practices

✅ **Server-Level Redirects**: Use your web server configuration (e.g., `.htaccess` for Apache, `nginx.conf` for Nginx) or edge configuration (Cloudflare, Vercel).
✅ **Handle at Edge**: For dynamic redirects based on user state, try to handle them using Edge Functions to minimize the round-trip distance.
✅ **Use 301/302 Status Codes**: Use the correct HTTP status codes to communicate to both browsers and crawlers whether the redirect is permanent or temporary.

## Tools & Validation

- Browser DevTools Network tab to check for 3xx responses.
- Use `curl -I "$ORIGIN"` or the live target URL to see the redirect headers.
- [Ahrefs Redirect Checker](https://ahrefs.com/redirect-checker)
- [HTTP Status Code Checker](https://httpstatus.io/)

## Standards

- Use web.dev: Learn Performance as the standard for measuring the final production behavior, not just local synthetic output.
- Use Chrome Developers: Lighthouse overview as the standard for measuring the final production behavior, not just local synthetic output.

## Verification

### Automated Checks

- Measure the affected page or flow in Lighthouse, PageSpeed Insights, or DevTools and confirm the targeted metric improves.
- Inspect the network waterfall or performance timeline to confirm the intended resource or execution change actually took effect.

### Manual Checks

- Verify the change on a throttled mobile profile, not just local desktop.
- If this rule maps to a budget or Web Vital, confirm the page now stays within that threshold.