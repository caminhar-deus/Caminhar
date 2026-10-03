# Blocked Tracking Links

> Links and resources pointing to known tracking or advertising domains may be blocked by adblockers, breaking navigation and functionality for a significant portion of users.

**Priority:** low · **Difficulty:** intermediate · **Time:** 15 min

---
Adblocker filter lists such as [EasyList](https://easylist.to/) and [uBlock Origin's static filters](https://github.com/gorhill/uBlock/wiki/Static-filter-syntax) work at two levels: element hiding (CSS) and network blocking (URLs). Domain-level blocking prevents the browser from loading any resource from a blocked domain, including scripts, images, fonts, and navigation targets.
## Code Example

Filter rules like these block all network requests to matching domains:

```
||googletagmanager.com^
||hotjar.com^
||facebook.net^
||doubleclick.net^
||analytics.google.com^
```

When an adblocker matches a request to a blocked domain, the browser receives no response — the request silently fails.

## Why It Matters

When a navigation link's URL matches a tracking domain pattern, the adblocker may block the request entirely — the user clicks the link and nothing happens, breaking core site functionality.

## Commonly Blocked Domains

| Domain | Service | Blocked By |
|--------|---------|-----------|
| `googletagmanager.com` | Google Tag Manager | Many filters |
| `google-analytics.com` | Google Analytics (UA) | Many filters |
| `analytics.google.com` | GA4 | Some filters |
| `hotjar.com` | Hotjar session recording | EasyPrivacy |
| `doubleclick.net` | Google Ads | EasyList |
| `facebook.net` | Facebook Pixel | EasyPrivacy |
| `connect.facebook.net` | Facebook SDK | EasyPrivacy |
| `heap.io` | Heap analytics | Some filters |
| `fullstory.com` | FullStory | Some filters |

## Impact on Navigation Links

Some marketing tools create tracking redirect URLs that route through blocked domains:

```html
❌ May be blocked — redirects through tracking.example.com
<a href="https://click.tracking.example.com/?url=https://dest.com&utm=abc">
  Click here
</a>

✅ Direct link with UTM parameters — not blocked
<a href="https://dest.com?utm_source=email&utm_campaign=spring">
  Click here
</a>
```

## Self-Hosting Scripts to Reduce Breakage

For truly first-party functionality, [self-hosting critical scripts and fonts](https://web.dev/articles/font-best-practices) on your own domain avoids the most common domain-level block rules while keeping essential flows reachable.

#

## Self-Hosting Google Tag Manager

Proxy GTM through your own domain:

```nginx
# Nginx proxy for GTM
location /gtm/ {
    proxy_pass https://www.googletagmanager.com/;
    proxy_set_header Host www.googletagmanager.com;
}
```

```html
<!-- Load GTM from your own domain -->
<script src="/gtm/gtm.js?id=GTM-XXXXXXX"></script>
```

### Server-Side Analytics

Move analytics collection entirely server-side to avoid all client-side blocking:

```typescript
// Log events server-side

  const { event, page } = await request.json()

  // Send to GA Measurement Protocol (server-to-server, not blocked)
  await fetch('https://www.google-analytics.com/mp/collect', {
    method: 'POST',
    body: JSON.stringify({
      client_id: getClientId(request),
      events: [{ name: event, params: { page } }],
    }),
  })
}
```

### Privacy-Preserving Analytics (Unblocked)

Replace client-side tracking with privacy-focused alternatives that most adblockers do not block:

- **Plausible Analytics** — first-party script, rarely blocked
- **Fathom Analytics** — custom domain option available
- **Umami** — self-hosted, served from your own domain

```html
<!-- Plausible — served from plausible.io but usually not blocked -->
<script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>

<!-- Or self-host for maximum reliability -->
<script defer data-domain="example.com" src="/js/plausible.js"></script>
```

Advertising pixels and retargeting scripts being blocked is the intended behavior of adblockers. Only work around blocking for first-party analytics (understanding your own site's performance) — not for surveillance advertising infrastructure.

## Exceptions

- Scanner output, leaked-secret detections, or stack traces should be confirmed as production-relevant before being escalated as blockers.
- Archived dependencies, sample values, or test fixtures can create false positives, but they should still be documented and bounded clearly.
- If multiple findings overlap, prioritize the issue that most directly enables compromise or data exposure.

## Verification

### Automated Checks

- Run an automated security check, scripted probe, or log-based validation against a representative live flow.

### Manual Checks

- Install uBlock Origin with default lists
- Open DevTools → Network tab
- Load your page
- Filter requests by "Blocked" status
- Check for failed requests to analytics, tag management, or tracking domains