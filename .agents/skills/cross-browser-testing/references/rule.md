# Test across all major browsers

> Website works correctly across major browsers (Chrome, Firefox, Safari, Edge).

**Priority:** high · **Difficulty:** intermediate · **Time:** 60 min

---
Cross-browser testing ensures your website works correctly for all users regardless of their browser choice.
## Code Example

```typescript
// playwright.config.ts

  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})
```

## Why It Matters

Users access your site from different browsers, each with unique rendering engines. Without cross-browser testing, a significant portion of users may experience broken layouts, missing features, or complete failures.

## Browser Market Share (Target Browsers)

| Browser | Engine | Priority | Notes |
|---------|--------|----------|-------|
| Chrome | Blink | Critical | ~65% market share |
| Safari | WebKit | Critical | Default on iOS/macOS |
| Firefox | Gecko | High | Privacy-focused users |
| Edge | Blink | High | Windows default |
| Samsung Internet | Blink | Medium | Popular on Samsung devices |

## Cross-Browser Test Example

```typescript
// e2e/cross-browser.spec.ts

test.describe('Cross-browser compatibility', () => {
  test('homepage renders correctly', async ({ page, browserName }) => {
    await page.goto('/')

    // Check main elements render
    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('footer')).toBeVisible()

    // Check no layout shifts (CLS)
    const clsValue = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let cls = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value
            }
          }
        }).observe({ type: 'layout-shift', buffered: true })

        setTimeout(() => resolve(cls), 2000)
      })
    })

    expect(clsValue).toBeLessThan(0.1)

    // Screenshot for visual comparison
    await expect(page).toHaveScreenshot(`homepage-${browserName}.png`)
  })

  test('forms work correctly', async ({ page }) => {
    await page.goto('/contact')

    // Fill form
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="message"]', 'Test message')

    // Check validation works
    await page.click('button[type="submit"]')
    await expect(page.locator('[role="alert"]')).not.toBeVisible()
  })

  test('CSS features degrade gracefully', async ({ page, browserName }) => {
    await page.goto('/')

    // Check CSS Grid layout
    const grid = page.locator('.grid-container')
    const boundingBox = await grid.boundingBox()

    expect(boundingBox?.width).toBeGreaterThan(0)
    expect(boundingBox?.height).toBeGreaterThan(0)

    // Check no overflow issues
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth
    })
    expect(overflow).toBe(false)
  })

  test('JavaScript features work', async ({ page }) => {
    await page.goto('/')

    // Test interactive elements
    const menuButton = page.locator('[aria-label="Open menu"]')
    if (await menuButton.isVisible()) {
      await menuButton.click()
      await expect(page.locator('[role="menu"]')).toBeVisible()
    }

    // Test dynamic content loading
    const lazyContent = page.locator('[data-lazy]')
    if (await lazyContent.count() > 0) {
      await lazyContent.first().scrollIntoViewIfNeeded()
      await expect(lazyContent.first()).toBeVisible()
    }
  })
})
```

## Visual Regression Testing

```typescript
// e2e/visual.spec.ts

test.describe('Visual regression', () => {
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1280, height: 720, name: 'desktop' },
    { width: 1920, height: 1080, name: 'wide' },
  ]

  for (const viewport of viewports) {
    test(`homepage at ${viewport.name}`, async ({ page, browserName }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      })

      await page.goto('/')
      await page.waitForLoadState('networkidle')

      await expect(page).toHaveScreenshot(
        `homepage-${browserName}-${viewport.name}.png`,
        { maxDiffPixels: 100 }
      )
    })
  }
})
```

## CI/CD Integration

```yaml
# .github/workflows/cross-browser-tests.yml
name: Cross-Browser Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps

      - name: Build
        run: pnpm build

      - name: Run Playwright tests
        run: pnpm exec playwright test

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## BrowserStack Integration

```typescript
// browserstack.config.ts

  use: {
    connectOptions: {
      wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(
        JSON.stringify({
          browser: 'chrome',
          os: 'Windows',
          os_version: '11',
          'browserstack.username': process.env.BROWSERSTACK_USERNAME,
          'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
        })
      )}`,
    },
  },
})
```

## Feature Detection

```typescript
// utils/feature-detection.ts

  // CSS features
  cssGrid: CSS.supports('display', 'grid'),
  cssSubgrid: CSS.supports('grid-template-columns', 'subgrid'),
  containerQueries: CSS.supports('container-type', 'inline-size'),
  hasSelector: CSS.supports('selector(:has(*))'),

  // JavaScript features
  intersectionObserver: 'IntersectionObserver' in window,
  resizeObserver: 'ResizeObserver' in window,
  webComponents: 'customElements' in window,

  // API features
  serviceWorker: 'serviceWorker' in navigator,
  webShare: 'share' in navigator,
  clipboard: 'clipboard' in navigator,
}

// Use in components
function FeatureBasedComponent() {
  if (!features.intersectionObserver) {
    // Fallback for older browsers
    return 
  }

  return 
}
```

## CSS Feature Queries

```css
/* Progressive enhancement with @supports */
.card {
  /* Fallback for all browsers */
  display: flex;
  flex-direction: column;
}

@supports (display: grid) {
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
  }
}

@supports (container-type: inline-size) {
  .card-container {
    container-type: inline-size;
  }

  @container (min-width: 400px) {
    .card {
      flex-direction: row;
    }
  }
}

/* Safari-specific fixes */
@supports (-webkit-touch-callout: none) {
  .sticky-element {
    position: -webkit-sticky;
    position: sticky;
  }
}
```

## Common Browser Issues

| Issue | Browsers | Solution |
|-------|----------|----------|
| Flexbox gap | Safari < 14.1 | Use margins as fallback |
| CSS Grid subgrid | Firefox only | Use nested grids |
| :has() selector | Safari only (old) | JavaScript fallback |
| Smooth scroll | Safari | `scroll-behavior` polyfill |
| Date input | Safari | Use date picker library |
| Form validation UI | All | Custom validation UI |

## Polyfill Strategy

```typescript
// polyfills.ts (load conditionally)

  const polyfills: Promise<void>[] = []

  if (!('IntersectionObserver' in window)) {
    polyfills.push(import('intersection-observer'))
  }

  if (!('ResizeObserver' in window)) {
    polyfills.push(
      import('@juggle/resize-observer').then((module) => {
        window.ResizeObserver = module.ResizeObserver
      })
    )
  }

  if (!Element.prototype.scrollIntoView) {
    polyfills.push(import('scroll-into-view-if-needed'))
  }

  await Promise.all(polyfills)
}
```

## Browser Testing Checklist

1. **Layout** - No broken layouts or overflow issues
2. **Typography** - Fonts render correctly
3. **Forms** - Inputs, validation, submission work
4. **Navigation** - Links, routing, history work
5. **Media** - Images, videos, audio play correctly
6. **Animations** - CSS/JS animations perform well
7. **Touch** - Mobile gestures work (Safari iOS)
8. **Printing** - Print stylesheets render correctly

## Testing Tools

| Tool | Purpose | Cost |
|------|---------|------|
| Playwright | Automated testing | Free |
| BrowserStack | Real device testing | Paid |
| LambdaTest | Cross-browser testing | Paid |
| Sauce Labs | CI integration | Paid |
| caniuse.com | Feature support check | Free |

Safari on iOS cannot be emulated perfectly. Use real iOS devices or BrowserStack for accurate Safari testing, especially for touch interactions and PWA features.

## Support Notes

- Tooling, browser-automation behavior, and CI environments can vary across platforms, so verify the intended workflow in the environments the team actually ships and tests against.
- Document any fallback when a browser-specific testing capability is unavailable in part of the supported matrix.

## Verification

### Automated Checks

- Test one primary path and one edge case affected by the change.
- Use browser or CI tooling where applicable to verify the fix.

### Manual Checks

- Confirm the rule in the final rendered output or runtime behavior.
- Re-check shared abstractions so the fix is applied consistently.