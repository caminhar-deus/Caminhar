# Implement Google Consent Mode v2

> Adjust Google Tag behavior based on user consent to comply with privacy regulations and maintain data insights.

**Priority:** high · **Difficulty:** intermediate · **Time:** 10 min

---
Google Consent Mode v2 is a mechanism that allows you to communicate your users' cookie or app identifier consent status to Google. Tags will adjust their behavior and respect users' choices.

## Code Examples

#

## Setting Default Consent (gtag.js)
This should be placed as high as possible in the `<head>`, before any GTM or gtag.js scripts.

```html
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}

  // Default all to denied
  gtag('consent', 'default', {
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'analytics_storage': 'denied',
    'wait_for_update': 500
  });
</script>
```

### Updating Consent after User Action
When a user accepts cookies via your CMP (Consent Management Platform):

```javascript
function onConsentAccepted() {
  gtag('consent', 'update', {
    'ad_storage': 'granted',
    'ad_user_data': 'granted',
    'ad_personalization': 'granted',
    'analytics_storage': 'granted'
  });
}
```

## Why It Matters

- **Regulatory Compliance**: Required for businesses operating in the European Economic Area (EEA) to comply with the Digital Markets Act (DMA).
- **Data Modeling**: When users don't consent, Consent Mode uses conversion modeling to fill in the gaps, providing a more complete view of performance.
- **Privacy First**: Respects user choices by ensuring that advertising and analytics cookies are only used when explicit consent is granted.
- **Functional Continuity**: Allows basic measurement to continue even without personal data collection.

## Best Practices

Validate the implementation with [Google Tag Assistant](https://tagassistant.google.com/) so you can confirm the consent state actually changes the requests sent after a user decision, not just the values stored in the page.

✅ **Use a Certified CMP**: Use a Consent Management Platform that is certified by Google to ensure correct implementation.
✅ **Default to Denied**: For users in the EEA, default consent states should be set to 'denied' until the user provides explicit consent.
✅ **Update Promptly**: Ensure the consent update is sent immediately after the user interacts with the consent banner.
✅ **Verify with Tag Assistant**: Use Google Tag Assistant to inspect pings and ensure the `gcd` and `gcs` parameters are correct.

❌ **Don't Hardcode 'Granted'**: Never set consent to 'granted' by default for users in regulated regions.
❌ **Don't Delay GTM Loading unnecessarily**: Use the `wait_for_update` parameter instead of delaying the entire GTM script load.

## Tools & Validation

- [Google Tag Assistant](https://tagassistant.google.com/): Debugging tool to verify consent signals.
- **Chrome DevTools**: Inspect network pings to `google-analytics.com` for the `gcs` and `gcd` parameters.
- [Tag Manager Debug Mode](https://support.google.com/tagmanager/answer/6107056): View consent state changes in real-time.

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