# Test on real mobile devices and viewports

> Verify your application on real mobile devices and browser DevTools device emulation to catch touch interaction issues, viewport bugs, and mobile-specific rendering problems.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Mobile testing catches an entire class of issues that are invisible on desktop browsers.

## Code Examples

```javascript
// playwright.config.js

  projects: [
    // Desktop
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },

    // Mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro 11'] },
    }
  ]
})
```

```javascript
// tests/mobile/navigation.spec.js

test.use({ ...devices['iPhone 14'] })

test('mobile navigation opens and closes', async ({ page }) => {
  await page.goto('/')

  // Mobile menu should be closed initially
  await expect(page.locator('[data-mobile-menu]')).not.toBeVisible()

  // Open mobile menu
  await page.locator('[data-hamburger]').tap() // Use tap, not click
  await expect(page.locator('[data-mobile-menu]')).toBeVisible()

  // Close with X button
  await page.locator('[data-menu-close]').tap()
  await expect(page.locator('[data-mobile-menu]')).not.toBeVisible()
})

test('checkout form works on mobile keyboard', async ({ page }) => {
  await page.goto('/checkout')

  // Test that virtual keyboard doesn't cover the active input
  const emailInput = page.locator('#email')
  await emailInput.tap()

  // Scroll the page to verify the input is in view when keyboard opens
  await expect(emailInput).toBeInViewport()
})
```

## Why It Matters

More than 55% of global web traffic comes from mobile devices. Mobile browsers have different rendering engines, different font rendering, limited memory, real touch events that differ from mouse events, and system UI (notch, home indicator, keyboard) that intrudes on your layout. Issues like sticky hover states, touch target sizes, and keyboard layout shifts only appear on real devices.

## Mobile-Specific Issues to Test

```
Layout and viewport:
✓ No horizontal scroll on any viewport width
✓ Content doesn't overflow on 375px viewport
✓ Notch/safe-area-inset doesn't hide content
✓ Virtual keyboard doesn't cover active inputs

Touch interactions:
✓ Tap targets are at least 44x44px
✓ No hover-dependent functionality (hover doesn't persist on touch)
✓ Swipe gestures work on carousels and drawers
✓ Pinch-to-zoom works (unless disabled intentionally)

Forms:
✓ Correct keyboard type appears for each input (numeric, email, etc.)
✓ Autocomplete suggestions appear
✓ Form doesn't jump when keyboard opens/closes

Performance:
✓ App is usable on throttled 3G
✓ No excessive memory usage during scroll
✓ Animations run at 60fps
```

## Chrome DevTools Quick Checks

```javascript
// Test responsive breakpoints programmatically
const viewports = [
  { width: 375, height: 667, name: 'iPhone SE' },
  { width: 390, height: 844, name: 'iPhone 14' },
  { width: 430, height: 932, name: 'iPhone 14 Plus' },
  { width: 768, height: 1024, name: 'iPad Mini' },
  { width: 1024, height: 1366, name: 'iPad Pro' }
]

for (const viewport of viewports) {
  test(`layout correct on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')

    // Check no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
}
```

## Real Device Testing Priority

1. **iOS Safari** (unique rendering engine, unique bugs)
2. **Android Chrome** (most common Android browser)
3. **Chrome DevTools emulation** (fast, covers layout basics)
4. **Samsung Internet** (if your audience uses Samsung devices)

## Verification

### Automated Checks

- Run the relevant test or CI step locally and confirm it fails when the rule is violated.

### Manual Checks

- Ensure the automation blocks regressions instead of only printing warnings.
- Cover at least one representative high-risk flow, component, or route.
- Keep thresholds or assertions in version control so changes remain reviewable.