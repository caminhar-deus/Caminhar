# Adblock Element Hiding

> Checks for HTML elements and CSS classes that would be hidden by common adblockers, causing layout breaks or missing functionality for users with ad blocking enabled.

**Priority:** low · **Difficulty:** intermediate · **Time:** 15 min

---
Adblockers use filter lists such as [EasyList](https://easylist.to/) and [uBlock Origin's static syntax](https://github.com/gorhill/uBlock/wiki/Static-filter-syntax) to identify and hide advertising elements. Those rules match against element IDs, class names, and URL patterns, so legitimate UI that uses ad-associated names can get caught as a false positive.

## Code Example

Filters use CSS selector syntax:

```
##.advertisement          # Hide elements with class "advertisement"
###ad-container           # Hide element with ID "ad-container"
##[id^="ad-"]             # Hide elements with ID starting with "ad-"
##[class*="banner"]       # Hide elements with "banner" in class name
```

Any element on your page matching these selectors is hidden (set to `display: none`).

## Why It Matters

If your cookie consent banner has class `.cookie-banner` or ID `#consent-popup`, adblockers may hide it. Because the [HTML `class` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class) is exactly what those selectors target, users may never see the consent notice, which creates both compliance risk and broken UX.

## Commonly Blocked Patterns

#

## Class Names (Avoid These)

```css
/* These will be hidden by most adblockers */
.ad
.ads
.ad-block
.ad-container
.advertisement
.advert
.advertising
.banner
.sponsor
.sponsored
.promotion
.promo
.cookie-banner
.cookie-notice
.gdpr-banner
.consent-banner
.tracking-notice
```

### IDs (Avoid These)

```html
<!-- These IDs are commonly blocked -->
<div id="ad"></div>
<div id="ads"></div>
<div id="advertisement"></div>
<div id="banner"></div>
<div id="cookie-banner"></div>
<div id="consent-popup"></div>
```

## Common False Positives

| Element | Blocked Name | Safe Rename |
|---------|-------------|-------------|
| Cookie consent | `.cookie-banner` | `.privacy-controls` |
| Cookie consent | `#consent-popup` | `#privacy-preferences` |
| Promotional section | `.promotion` | `.featured-offer` |
| News ticker | `.banner` | `.headline-ticker` |
| Announcement bar | `.ad-bar` | `.site-notice` |
| Sidebar | `#sidebar-ads` | `#sidebar-recommendations` |

## Cookie Consent Banner Risk

Cookie consent banners are a specific concern because adblockers block them aggressively — but GDPR requires users to see and interact with them:

```html
❌ Likely blocked by EasyPrivacy
<div class="cookie-banner" id="gdpr-notice">
  <p>We use cookies...</p>
</div>

✅ Less likely to be blocked
<div class="privacy-controls" id="privacy-preferences-dialog" role="dialog">
  <p>We use cookies...</p>
</div>
```

## Testing for Adblocker Impact

### Manual Testing

1. Install uBlock Origin in a test browser profile
2. Enable default filter lists (EasyList, EasyPrivacy, uBlock filters)
3. Load your pages and inspect for:
   - Missing content sections
   - Broken layout (empty spaces where elements were)
   - Cookie consent banner not visible
   - Navigation items hidden

### Browser DevTools

With uBlock Origin active, hidden elements show in DevTools with `display: none` applied by the extension's CSS injection.

### Automated Check

```javascript
// Check if a critical element was hidden by an adblocker
function isElementBlocked(selector) {
  const el = document.querySelector(selector)
  if (!el) return false // Element not in DOM

  const style = window.getComputedStyle(el)
  return style.display === 'none' || style.visibility === 'hidden'
}

// In your consent management initialization:
if (isElementBlocked('#privacy-preferences-dialog')) {
  // Adblocker may have hidden the consent dialog
  // Consider fallback approach
  console.warn('Consent dialog may be blocked by browser extension')
}
```

## Best Practices for Naming

- Use **semantic, content-describing names**: `.featured-article`, `.site-announcement`, `.newsletter-signup`
- Avoid words associated with advertising: `ad`, `ads`, `banner`, `sponsor`, `promo`, `tracking`
- Use **BEM or scoped naming** to reduce collisions with filter patterns

Actual advertisements and tracking pixels should use names that adblockers can identify — this is the intended behavior. Only rename elements that serve legitimate non-advertising purposes but are accidentally caught by filters.

## Exceptions

- A weaker form control is only acceptable when the business requirement and compensating controls are documented explicitly.
- If the flow is already transport-insecure, inaccessible, or externally embedded in a way that changes the threat model, fix that stronger issue first.
- False positives are common on demo, sandbox, or intentionally constrained flows, but they should still be bounded and clearly labeled.

## Standards

- Align the implementation with EasyList Filter Rules and verify the effective response or browser behavior, not only the configuration file.
- Align the implementation with uBlock Origin Filter Syntax and verify the effective response or browser behavior, not only the configuration file.
- Align the implementation with MDN: HTML class attribute and verify the effective response or browser behavior, not only the configuration file.

## Verification

### Automated Checks

- Test the affected flow in a production-like environment, not just local development.
- Document any intentional exceptions explicitly.

### Manual Checks

- Inspect the final HTTP response or browser behavior to confirm the control is actually enforced.
- Verify third-party integrations or embeds still work after the restriction is applied.