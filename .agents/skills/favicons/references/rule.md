# Implement favicons for all devices

> All necessary favicon formats are implemented for browsers, devices, and PWA support.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
Proper favicon implementation ensures consistent brand representation across browsers, devices, and platforms with optimized formats and sizes for different use cases.
## Code Examples

#

## Complete Favicon Set
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Complete Favicon Implementation</title>

  <!-- Modern browsers - SVG favicon (scalable) -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">

  <!-- Fallback PNG favicon for browsers without SVG support -->
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">

  <!-- Legacy ICO fallback (placed in root directory) -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico">

  <!-- Apple Touch Icons -->
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png">
  <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png">
  <link rel="apple-touch-icon" sizes="76x76" href="/apple-touch-icon-76x76.png">

  <!-- Android Chrome Icons -->
  <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">

  <!-- Web App Manifest -->
  <link rel="manifest" href="/site.webmanifest">

  <!-- Microsoft Tiles -->
  <meta name="msapplication-TileColor" content="#2d89ef">
  <meta name="msapplication-TileImage" content="/mstile-144x144.png">
  <meta name="msapplication-config" content="/browserconfig.xml">

  <!-- Theme colors -->
  <meta name="theme-color" content="#ffffff">
  <meta name="msapplication-navbutton-color" content="#ffffff">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
</head>
<body>
  <!-- Page content -->
</body>
</html>
```

### Minimal Modern Implementation
```html
<!-- Minimal setup for modern browsers -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
```

## Why It Matters

Missing or low-quality favicons make sites look unprofessional in browser tabs, bookmarks, and home screens—damaging brand recognition and user trust.

## SVG Favicon (Recommended)
```svg
<!-- favicon.svg - Modern scalable favicon -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- Dark mode support -->
  <style>
    @media (prefers-color-scheme: dark) {
      .logo-bg { fill: #ffffff; }
      .logo-text { fill: #000000; }
    }
    @media (prefers-color-scheme: light) {
      .logo-bg { fill: #000000; }
      .logo-text { fill: #ffffff; }
    }
  </style>

  <!-- Logo design -->
  <rect class="logo-bg" width="32" height="32" rx="6"/>
  <text class="logo-text" x="16" y="20" font-family="Arial, sans-serif"
        font-size="18" font-weight="bold" text-anchor="middle">M</text>
</svg>
```

### Animated SVG Favicon
```svg
<!-- animated-favicon.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    .spinner {
      animation: spin 2s linear infinite;
      transform-origin: 16px 16px;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  </style>

  <circle cx="16" cy="16" r="14" fill="none" stroke="#4F46E5" stroke-width="4"/>
  <circle class="spinner" cx="16" cy="4" r="3" fill="#4F46E5"/>
</svg>
```

## Dynamic Favicon Implementation

### JavaScript Favicon Controller
```javascript
// favicon-controller.js
class FaviconController {
  constructor() {
    this.defaultFavicon = '/favicon.svg'
    this.favicons = {
      default: '/favicon.svg',
      notification: '/favicon-notification.svg',
      error: '/favicon-error.svg',
      success: '/favicon-success.svg',
      loading: '/favicon-loading.svg'
    }
    this.currentState = 'default'
  }

  setFavicon(state = 'default') {
    if (this.currentState === state) return

    const faviconUrl = this.favicons[state] || this.favicons.default
    this.updateFaviconLink(faviconUrl)
    this.currentState = state
  }

  updateFaviconLink(href) {
    // Remove existing favicon links
    const existingFavicons = document.querySelectorAll('link[rel*="icon"]')
    existingFavicons.forEach(link => {
      if (link.getAttribute('rel').includes('icon') &&
          !link.getAttribute('rel').includes('apple')) {
        link.remove()
      }
    })

    // Add new favicon
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    link.href = href
    document.head.appendChild(link)
  }

  showNotification() {
    this.setFavicon('notification')
  }

  showError() {
    this.setFavicon('error')
  }

  showSuccess() {
    this.setFavicon('success')

    // Reset to default after 3 seconds
    setTimeout(() => {
      this.setFavicon('default')
    }, 3000)
  }

  showLoading() {
    this.setFavicon('loading')
  }

  reset() {
    this.setFavicon('default')
  }

  // Badge functionality for notification count
  generateBadgeFavicon(count, baseIcon = this.favicons.default) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const size = 32

      canvas.width = size
      canvas.height = size

      // Load base icon
      const img = new Image()
      img.onload = () => {
        // Draw base icon
        ctx.drawImage(img, 0, 0, size, size)

        if (count > 0) {
          // Draw notification badge
          const badgeSize = size * 0.6
          const badgeX = size - badgeSize
          const badgeY = 0

          // Badge background
          ctx.fillStyle = '#ff4444'
          ctx.beginPath()
          ctx.arc(badgeX + badgeSize/2, badgeY + badgeSize/2, badgeSize/2, 0, 2 * Math.PI)
          ctx.fill()

          // Badge text
          ctx.fillStyle = 'white'
          ctx.font = `${badgeSize * 0.6}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'

          const text = count > 99 ? '99+' : count.toString()
          ctx.fillText(text, badgeX + badgeSize/2, badgeY + badgeSize/2)
        }

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/png')
        resolve(dataUrl)
      }

      img.src = baseIcon
    })
  }

  async showBadge(count) {
    const badgedFavicon = await this.generateBadgeFavicon(count)
    this.updateFaviconLink(badgedFavicon)
  }
}

// Usage examples
const faviconController = new FaviconController()

// Show loading state
faviconController.showLoading()

// Show success after operation
setTimeout(() => {
  faviconController.showSuccess()
}, 2000)

// Show notification badge
faviconController.showBadge(5)

// Reset to default
faviconController.reset()
```

### React Favicon Hook
```jsx
// hooks/useFavicon.js

  const prevHref = useRef(href)

  useEffect(() => {
    if (prevHref.current === href) return

    const updateFavicon = () => {
      // Remove existing favicon
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]:not([rel*="apple"])')
      existingFavicons.forEach(link => link.remove())

      // Add new favicon
      const link = document.createElement('link')
      link.rel = 'icon'
      link.type = type
      link.href = href
      document.head.appendChild(link)

      prevHref.current = href
    }

    updateFavicon()
  }, [href, type])
}

// components/FaviconProvider.jsx

const FaviconContext = createContext()

const faviconStates = {
  default: '/favicon.svg',
  loading: '/favicon-loading.svg',
  error: '/favicon-error.svg',
  success: '/favicon-success.svg',
  notification: '/favicon-notification.svg'
}

  const [currentState, setCurrentState] = useState('default')
  const [notificationCount, setNotificationCount] = useState(0)

  useFavicon(faviconStates[currentState])

  const setFaviconState = useCallback((state) => {
    if (faviconStates[state]) {
      setCurrentState(state)
    }
  }, [])

  const showNotification = useCallback((count = 1) => {
    setNotificationCount(count)
    setCurrentState('notification')
  }, [])

  const clearNotification = useCallback(() => {
    setNotificationCount(0)
    setCurrentState('default')
  }, [])

  const value = {
    setFaviconState,
    showNotification,
    clearNotification,
    currentState,
    notificationCount
  }

  return (
    
      {children}
    </FaviconContext.Provider>
  )
}

  const context = useContext(FaviconContext)
  if (!context) {
    throw new Error('useFaviconContext must be used within FaviconProvider')
  }
  return context
}

// Usage in components
function NotificationButton() {
  const { showNotification, clearNotification, notificationCount } = useFaviconContext()

  return (
    <div>
      <button onClick={() => showNotification(notificationCount + 1)}>
        Add Notification ({notificationCount})
      </button>
      <button onClick={clearNotification}>
        Clear Notifications
      </button>
    </div>
  )
}
```

## Configuration Files

### Web App Manifest (manifest.json)
```json
{
  "name": "My Progressive Web App",
  "short_name": "MyPWA",
  "description": "A progressive web application",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ],
  "categories": ["productivity", "utilities"],
  "lang": "en-US",
  "dir": "ltr"
}
```

### Browser Config (browserconfig.xml)
```xml
<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square70x70logo src="/mstile-70x70.png"/>
            <square150x150logo src="/mstile-150x150.png"/>
            <square310x310logo src="/mstile-310x310.png"/>
            <wide310x150logo src="/mstile-310x150.png"/>
            #2d89ef
        </tile>
    </msapplication>
</browserconfig>
```

## Framework Integration

### Next.js Favicon Setup
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, immutable, max-age=31536000'
          }
        ]
      }
    ]
  }
}

// pages/_document.js

  return (
    
      
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      
      <body>
        
        
      </body>
    
  )
}

// components/Head.js - Reusable head component

  title = 'My App',
  description = 'My awesome app',
  favicon = '/favicon.svg'
}) {
  return (
    
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="icon" type="image/svg+xml" href={favicon} />
    
  )
}
```

### Gatsby Favicon Plugin
```javascript
// gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `My Gatsby Site`,
        short_name: `MyGatsby`,
        start_url: `/`,
        background_color: `#ffffff`,
        theme_color: `#000000`,
        display: `minimal-ui`,
        icon: `src/images/icon.png`, // This generates all favicon sizes
      },
    },

    // Alternative manual setup
    {
      resolve: `gatsby-plugin-favicon`,
      options: {
        logo: "./src/images/favicon.png",

        // WebApp Manifest
        appName: 'My Gatsby Site',
        appDescription: 'My awesome Gatsby site',
        developerName: null,
        developerURL: null,
        dir: 'auto',
        lang: 'en-US',
        background: '#fff',
        theme_color: '#000',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        version: '1.0',

        icons: {
          android: true,
          appleIcon: true,
          appleStartup: true,
          coast: false,
          favicons: true,
          firefox: true,
          yandex: false,
          windows: false
        }
      }
    }
  ]
}
```

### Vue.js with Vite
```javascript
// vite.config.js

  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'My Vue App',
        short_name: 'MyVue',
        description: 'My awesome Vue app',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
```

## Automated Favicon Generation

### Build Script for Favicon Generation
```javascript
// scripts/generate-favicons.js
const sharp = require('sharp')
const fs = require('fs').promises
const path = require('path')

class FaviconGenerator {
  constructor(sourceImage, outputDir = './public') {
    this.sourceImage = sourceImage
    this.outputDir = outputDir
    this.sizes = {
      'favicon-16x16.png': 16,
      'favicon-32x32.png': 32,
      'apple-touch-icon.png': 180,
      'apple-touch-icon-152x152.png': 152,
      'apple-touch-icon-120x120.png': 120,
      'apple-touch-icon-76x76.png': 76,
      'android-chrome-192x192.png': 192,
      'android-chrome-512x512.png': 512,
      'mstile-70x70.png': 70,
      'mstile-144x144.png': 144,
      'mstile-150x150.png': 150,
      'mstile-310x310.png': 310
    }
  }

  async generateAll() {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true })

      // Generate PNG favicons
      for (const [filename, size] of Object.entries(this.sizes)) {
        await this.generatePng(filename, size)
      }

      // Generate ICO file
      await this.generateIco()

      // Generate manifest and browserconfig
      await this.generateManifest()
      await this.generateBrowserConfig()

      console.log('✅ All favicons generated successfully')

    } catch (error) {
      console.error('❌ Favicon generation failed:', error)
      throw error
    }
  }

  async generatePng(filename, size) {
    const outputPath = path.join(this.outputDir, filename)

    await sharp(this.sourceImage)
      .resize(size, size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'cover',
        position: 'center'
      })
      .png({
        quality: 90,
        compressionLevel: 9
      })
      .toFile(outputPath)

    console.log(`Generated: ${filename} (${size}x${size})`)
  }

  async generateIco() {
    // Generate multiple sizes for ICO
    const icoSizes = [16, 32, 48]
    const icoBuffers = []

    for (const size of icoSizes) {
      const buffer = await sharp(this.sourceImage)
        .resize(size, size)
        .png()
        .toBuffer()

      icoBuffers.push(buffer)
    }

    // Use a library like 'to-ico' for proper ICO generation
    const toIco = require('to-ico')
    const icoBuffer = await toIco(icoBuffers)

    await fs.writeFile(path.join(this.outputDir, 'favicon.ico'), icoBuffer)
    console.log('Generated: favicon.ico')
  }

  async generateManifest() {
    const manifest = {
      name: "My Application",
      short_name: "MyApp",
      icons: [
        {
          src: "/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: "/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png"
        }
      ],
      theme_color: "#ffffff",
      background_color: "#ffffff",
      display: "standalone"
    }

    await fs.writeFile(
      path.join(this.outputDir, 'site.webmanifest'),
      JSON.stringify(manifest, null, 2)
    )

    console.log('Generated: site.webmanifest')
  }

  async generateBrowserConfig() {
    const browserconfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square70x70logo src="/mstile-70x70.png"/>
            <square150x150logo src="/mstile-150x150.png"/>
            <square310x310logo src="/mstile-310x310.png"/>
            #2d89ef
        </tile>
    </msapplication>
</browserconfig>`

    await fs.writeFile(
      path.join(this.outputDir, 'browserconfig.xml'),
      browserconfig
    )

    console.log('Generated: browserconfig.xml')
  }

  generateHtml() {
    return `<!-- Favicon HTML -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="msapplication-TileColor" content="#2d89ef">
<meta name="msapplication-config" content="/browserconfig.xml">
<meta name="theme-color" content="#ffffff">`
  }
}

// Usage
async function main() {
  if (process.argv.length < 3) {
    console.error('Usage: node generate-favicons.js <source-image>')
    process.exit(1)
  }

  const sourceImage = process.argv[2]
  const generator = new FaviconGenerator(sourceImage)

  await generator.generateAll()
  console.log('\n' + generator.generateHtml())
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = FaviconGenerator
```

### Package.json Scripts
```json
{
  "scripts": {
    "favicon:generate": "node scripts/generate-favicons.js src/images/logo.png",
    "favicon:optimize": "imagemin public/*.png --out-dir=public/",
    "favicon:validate": "node scripts/validate-favicons.js"
  },
  "devDependencies": {
    "sharp": "^0.32.0",
    "to-ico": "^2.1.6",
    "imagemin": "^8.0.1",
    "imagemin-pngquant": "^9.0.2"
  }
}
```

## Best Practices

1. **Use SVG**: Modern browsers support SVG favicons with dark mode support
2. **Provide Fallbacks**: Include PNG and ICO formats for older browsers
3. **Optimize Sizes**: Generate all required sizes for different platforms
4. **Proper Caching**: Set long cache headers for favicon files
5. **Test Across Devices**: Verify display on different browsers and devices
6. **Consistent Branding**: Ensure favicon matches your brand identity
7. **Performance**: Keep file sizes small, especially for mobile
8. **Progressive Enhancement**: Use modern features with graceful fallbacks
9. **Automation**: Automate generation and validation in build process
10. **Regular Updates**: Update favicons when branding changes

## Size Requirements

### Standard Sizes
- **16x16px**: Browser tabs, bookmarks
- **32x32px**: Desktop shortcuts, taskbar
- **48x48px**: Windows desktop shortcuts
- **180x180px**: Apple touch icon (iOS Safari)
- **192x192px**: Android Chrome home screen
- **512x512px**: Android Chrome splash screen

### Comprehensive Size List
```javascript
const faviconSizes = {
  // Standard web favicons
  16: 'favicon-16x16.png',
  32: 'favicon-32x32.png',
  48: 'favicon-48x48.png',

  // Apple Touch Icons
  57: 'apple-touch-icon-57x57.png',
  60: 'apple-touch-icon-60x60.png',
  72: 'apple-touch-icon-72x72.png',
  76: 'apple-touch-icon-76x76.png',
  114: 'apple-touch-icon-114x114.png',
  120: 'apple-touch-icon-120x120.png',
  144: 'apple-touch-icon-144x144.png',
  152: 'apple-touch-icon-152x152.png',
  180: 'apple-touch-icon-180x180.png',

  // Android Chrome
  192: 'android-chrome-192x192.png',
  512: 'android-chrome-512x512.png',

  // Microsoft Tiles
  70: 'mstile-70x70.png',
  144: 'mstile-144x144.png',
  150: 'mstile-150x150.png',
  310: 'mstile-310x310.png'
}
```

Remember: While comprehensive favicon sets provide the best coverage, a minimal modern implementation with SVG and PNG fallbacks is sufficient for most modern applications.

## Support Notes

- Favicon and icon behavior differs across platforms, pinned-tab contexts, and install surfaces, so verify the final browser and OS icon outputs rather than relying only on one file.
- Document any platform-specific icon fallbacks when the full manifest or maskable icon path is not available.

## Verification

### Automated Checks

- Validate the rendered HTML or linked assets with browser tooling, validators, or another automated check against representative live routes.

### Manual Checks

- Verify the rendered browser behavior manually on representative routes and supported browsers so the user-facing outcome matches the rule.