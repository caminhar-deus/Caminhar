# Meet PWA installability criteria

> The web app satisfies the browser's minimum PWA installability requirements: a valid web app manifest, a registered service worker, HTTPS, and maskable icons.

**Priority:** low · **Difficulty:** intermediate · **Time:** 30 min

---
A Progressive Web App (PWA) becomes installable when the browser detects it meets a minimum set of criteria. Once installable, the browser shows an in-page install prompt (or address-bar button), and the user can add the app to their home screen or taskbar.

## Code Example

```json
// public/manifest.json
{
  "name": "Acme Dashboard",
  "short_name": "Acme",
  "description": "Track your metrics at a glance.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "any",
  "lang": "en",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Dashboard on desktop"
    },
    {
      "src": "/screenshots/mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Dashboard on mobile"
    }
  ]
}
```

## Why It Matters

Installable PWAs appear in the browser's address bar install prompt and in app stores, giving users a native-app experience without an app store listing. Studies consistently show that installed PWAs have higher engagement and retention than browser-only equivalents — users who install spend 3× more time in the app on average.

## Minimum Installability Requirements

| Requirement | What is needed |
|---|---|
| **HTTPS** | Site must be served over a secure origin (or `localhost` for dev) |
| **Web App Manifest** | A valid `manifest.json` linked from `<head>` |
| **Service Worker** | A registered SW with a `fetch` handler |
| **Icons** | At least a 192×192 and a 512×512 PNG icon |

Chromium-based browsers also require the manifest to have `name` (or `short_name`), `start_url`, `display`, and at least one valid icon before showing the install prompt.

## Linking the Manifest

```html
<!-- index.html or layout.tsx -->
<head>
  <!-- Manifest -->
  <link rel="manifest" href="/manifest.json" />

  <!-- iOS meta tags (Safari does not read the manifest for these) -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Acme" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

  <!-- Theme colour -->
  <meta name="theme-color" content="#3b82f6" />
</head>
```

## Display Modes

| Mode | Behaviour |
|---|---|
| `standalone` | App opens in its own window without browser UI — most app-like |
| `minimal-ui` | Like standalone but with minimal browser navigation controls |
| `fullscreen` | No browser UI; suitable for games and immersive experiences |
| `browser` | Opens in a regular browser tab (not considered "installed") |

## Maskable Icons

Android applies a platform shape (circle, squircle, etc.) to home-screen icons. Without a maskable icon the platform simply scales down the regular icon, which often produces awkward whitespace. A maskable icon fills the entire canvas; Android clips it to the shape.

The **safe zone** is a circle with radius = 40 % of the icon's smallest dimension. Keep the main logo or graphic within this zone so it is never clipped.

```
512×512 icon — safe zone = circle of radius 204 px centred at (256, 256)
```

Use [Maskable.app](https://maskable.app/editor) to preview how your icon looks under each Android shape.

## Next.js Manifest

```typescript
// app/manifest.ts  (Next.js 13+ App Router)

  return {
    name: 'Acme Dashboard',
    short_name: 'Acme',
    description: 'Track your metrics at a glance.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
```

## Prompting the Install

The browser fires the `beforeinstallprompt` event when the app is installable. Capture and show it at the right time rather than immediately:

```typescript
let deferredPrompt: BeforeInstallPromptEvent | null = null

window.addEventListener('beforeinstallprompt', (event) => {
  // Prevent the automatic mini-infobar on mobile
  event.preventDefault()
  deferredPrompt = event as BeforeInstallPromptEvent
  showInstallButton()
})

async function triggerInstallPrompt() {
  if (!deferredPrompt) return

  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  console.info('Install prompt outcome:', outcome)  // 'accepted' | 'dismissed'
  deferredPrompt = null
  hideInstallButton()
}

window.addEventListener('appinstalled', () => {
  console.info('PWA installed')
  hideInstallButton()
})
```

Safari on iOS does not support the `beforeinstallprompt` event. Users must manually tap the Share button → "Add to Home Screen". Consider showing a subtle instructional tooltip for iOS users. Detect iOS with `navigator.userAgent` or the `standalone` media feature.

## Support Notes

- Installability prompts and app-install UX vary by browser and platform, so verify the supported install flow on the target browsers instead of assuming one Chromium path covers all users.
- Document the graceful fallback when a browser supports the manifest but not the full install prompt or standalone experience.

## Verification

### Automated Checks

- Open DevTools → **Application** → **Manifest** and confirm all required fields are green with no warnings.
- Run a **Lighthouse** PWA audit and check that "Installable" criteria all pass.
- Use [PWABuilder](https://docs.pwabuilder.com/#/home/getting-started) to get a detailed installability report and generate store-ready packages.

### Manual Checks

- On an Android device or Chrome, look for the install button in the address bar after visiting the site.