# Link a Web App Manifest for installability

> Include a Web App Manifest (manifest.json) linked from the HTML head to enable Progressive Web App features like home screen installation, standalone display, and splash screens.

**Priority:** medium · **Difficulty:** beginner · **Time:** 20 min

---
A Web App Manifest is a JSON file that provides metadata about your web application, enabling installation and controlling the launch experience.
## Code Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- Link the manifest -->
  <link rel="manifest" href="/manifest.json">

  <!-- Theme color for browser address bar -->
  <meta name="theme-color" content="#2563eb">

  <!-- Apple-specific (Safari doesn't use manifest for these) -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
</head>
```

## Why It Matters

A Web App Manifest is the minimum requirement for a site to be installable as a Progressive Web App. Installed PWAs launch in their own window, appear in app switchers, and can receive push notifications. Even for non-PWA sites, the manifest improves the experience when users bookmark to their home screen and provides metadata for browser share dialogs.

## Minimal manifest.json

```json
{
  "name": "My Application",
  "short_name": "MyApp",
  "description": "A brief description of what the app does.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

## Display Modes

```json
{
  "display": "standalone"
}
```

| Value | Behavior |
|-------|----------|
| `browser` | Opens in normal browser tab (default) |
| `minimal-ui` | Minimal browser controls (back button, address) |
| `standalone` | App-like window, no browser chrome |
| `fullscreen` | Full screen, no system UI |

## Rich Manifest Features

```json
{
  "name": "My App",
  "short_name": "MyApp",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "orientation": "any",
  "scope": "/",
  "categories": ["productivity", "utilities"],
  "lang": "en-US",
  "dir": "ltr",
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Dashboard view"
    }
  ],
  "shortcuts": [
    {
      "name": "New Document",
      "url": "/new",
      "icons": [{ "src": "/icons/new.png", "sizes": "96x96" }]
    }
  ]
}
```

## Icon Requirements

- **192x192**: Required — Android home screen icon
- **512x512**: Required — splash screen and high-DPI devices
- **Maskable icon**: Recommended — fills the Android adaptive icon shape
- **SVG**: Supported by some browsers for scalable quality

## Standards

- Use MDN: HTML as the standard for the final rendered HTML and browser-facing behavior.
- Use WHATWG HTML Living Standard as the standard for the final rendered HTML and browser-facing behavior.

## Support Notes

- Manifest features are interpreted differently by Safari, Chromium, and installed-app contexts, so verify the target install and launch surfaces explicitly.
- Document any platform-specific fallback when a browser ignores part of the manifest or still requires separate meta tags.

## Verification

### Automated Checks

- Inspect the final rendered HTML in the browser or page source to confirm the rule is satisfied.
- Validate the affected markup with browser tooling or an HTML validator where appropriate.
- Test one representative route or template that uses the pattern.
- Re-check shared components that emit the same markup so the fix is consistent.

### Manual Checks

- Verify the rendered browser behavior manually on representative routes and supported browsers so the user-facing outcome matches the rule.