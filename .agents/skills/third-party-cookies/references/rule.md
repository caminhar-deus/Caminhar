# Avoid third-party cookies

> Third-party cookies set by external domains track users across sites without their knowledge. Modern browsers are phasing them out, and regulations like GDPR and CCPA require consent before setting them.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
A cookie is "third-party" when it is set by a domain different from the page the user is currently viewing. A social media share button, an ad pixel, or an analytics script loaded from an external domain can all set third-party cookies.
## Code Example

```
1. User visits news.example.com — page loads tracker.ad.com/pixel.gif
2. tracker.ad.com sets cookie: user_id=xyz789 for domain tracker.ad.com
3. User visits shop.example.com — page also loads tracker.ad.com/pixel.gif
4. Browser sends the same cookie to tracker.ad.com
5. tracker.ad.com links both visits to the same user profile
```

This works across any site that includes tracker.ad.com — building behavioral profiles without users knowing.

## Why It Matters

Third-party cookies enable advertising networks to build detailed behavioral profiles of users across every site they visit — without users being aware. Regulatory penalties for non-compliance with GDPR reach up to 4% of global annual turnover.

## Identifying Third-Party Cookies

#

## Browser DevTools

1. Open DevTools → **Application** tab → **Cookies** in sidebar
2. Compare cookie domains against the current page origin
3. Cookies from different domains are third-party

### Network Tab Filter

```
Filter: third-party
```

In Chrome DevTools Network tab, the "Third-party requests" checkbox shows all cross-origin resource requests.

### curl Audit

```bash
# Check for Set-Cookie headers from a page's resources
curl -sI https://tracker.example.com/pixel.gif | grep -i set-cookie
```

## Common Sources of Third-Party Cookies

| Technology | Cookie Purpose | Consent Required |
|-----------|---------------|-----------------|
| Google Analytics (GA4 Universal) | Cross-site tracking | Yes (non-essential) |
| Facebook Pixel | Conversion tracking | Yes |
| Google Ads | Remarketing | Yes |
| Hotjar / FullStory | Session recording | Yes |
| Intercom / Zendesk chat | Support widget | May be essential |
| YouTube embeds | Tracking | Yes — use `youtube-nocookie.com` instead |

## Browser Blocking Status

| Browser | Status |
|---------|--------|
| Safari (ITP) | Third-party cookies blocked by default since 2017 |
| Firefox | Enhanced Tracking Protection blocks most third-party cookies |
| Chrome | Transitioning to Privacy Sandbox; phased removal ongoing |
| Edge | Tracking Prevention blocks third-party trackers |

## Alternatives to Third-Party Tracking

### Privacy-Preserving Analytics

Replace Google Analytics with a first-party solution:

```html
<!-- Plausible Analytics — no cookies, no cross-site tracking -->
<script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>

<!-- Fathom Analytics — GDPR compliant, no cookies -->
<script src="https://cdn.usefathom.com/script.js" data-site="ABCDEFGH" defer></script>
```

### YouTube Embeds Without Tracking Cookies

```html
❌ Sets third-party tracking cookies
<iframe src="https://www.youtube.com/embed/VIDEO_ID"></iframe>

✅ Privacy-enhanced mode — no tracking cookies until play
<iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID"></iframe>
```

### SameSite Cookie Attribute

For your own cookies, prevent them from being sent in cross-site contexts:

```http
Set-Cookie: session=abc123; SameSite=Lax; Secure; HttpOnly
# or stricter:
Set-Cookie: session=abc123; SameSite=Strict; Secure; HttpOnly
```

| SameSite Value | Sent on cross-site requests |
|----------------|---------------------------|
| `Strict` | Never |
| `Lax` | Only top-level navigations (GET) |
| `None` | Always (requires `Secure`) — opt-in for third-party use |

## Consent Requirements

Under GDPR (EU) and similar regulations, non-essential cookies require **prior, informed, freely given consent**:

- Consent must be obtained **before** the cookie is set
- Users must be able to withdraw consent as easily as they gave it
- Pre-ticked boxes or consent buried in T&Cs are not valid
- Refusing consent must not prevent access to core functionality

A cookie consent banner that shows a notice but loads tracking scripts before the user accepts is not compliant with GDPR. Third-party scripts must not execute until consent is granted.

## Standards

- Use these references as the standard for the legal or product-facing privacy behavior that users actually experience.
- Check the implementation against MDN: Third-party cookies before treating the rule as satisfied.
- Check the implementation against web.dev: Preparing for the end of third-party cookies before treating the rule as satisfied.

## Verification

### Automated Checks

- Test the affected flow in a production-like environment, not just local development.
- Document any intentional exceptions explicitly.

### Manual Checks

- Inspect the final HTTP response or browser behavior to confirm the control is actually enforced.
- Verify third-party integrations or embeds still work after the restriction is applied.