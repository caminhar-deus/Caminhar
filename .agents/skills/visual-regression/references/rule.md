# Use visual regression testing

> Capture screenshots of components and pages, then automatically compare them against approved baselines to detect unintended visual changes before they reach production.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 30 min

---
Visual regression testing screenshots your app and compares against approved baselines, failing when pixels change unexpectedly.

## Code Example

```javascript
// tests/visual/homepage.spec.js

test('homepage looks correct', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Full page screenshot
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixelRatio: 0.01 // Allow 1% pixel difference (anti-aliasing, etc.)
  })
})

test('button states', async ({ page }) => {
  await page.goto('/components/buttons')

  // Component-level screenshot
  const button = page.locator('.button--primary')
  await expect(button).toHaveScreenshot('button-default.png')

  await button.hover()
  await expect(button).toHaveScreenshot('button-hover.png')
})
```

## Why It Matters

Functional tests verify behavior but don't see your page. A CSS refactor might pass all unit and integration tests while completely breaking the layout — text overlapping images, buttons invisible, wrong colors. Visual regression testing acts as a safety net that reviews your actual rendered output, catching changes that no amount of JavaScript testing can detect.

## Updating Baselines

```bash
# First run creates baselines
npx playwright test --update-snapshots

# Subsequent runs compare against baselines
npx playwright test

# Update specific test's baseline
npx playwright test homepage.spec.js --update-snapshots
```

## Storybook + Chromatic

For component libraries, Storybook + Chromatic provides the most streamlined visual testing workflow:

```javascript
// Button.stories.js

  title: 'Components/Button',
  component: Button,
}

  args: { variant: 'primary', children: 'Click me' }
}

  args: { variant: 'primary', disabled: true, children: 'Disabled' }
}

  args: { variant: 'primary', loading: true, children: 'Loading' }
}
```

```yaml
# CI: .github/workflows/visual.yml
- name: Publish to Chromatic
  uses: chromaui/action@v1
  with:
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
    onlyChanged: true # Only test changed components
```

## Handling Dynamic Content

```javascript
test('dashboard with dynamic content', async ({ page }) => {
  await page.goto('/dashboard')

  // Mask dynamic values before screenshotting
  await page.addStyleTag({
    content: `
      .timestamp, .chart-data, .user-avatar { visibility: hidden; }
    `
  })

  await expect(page).toHaveScreenshot('dashboard-layout.png')
})
```

## CI Configuration

```yaml
# GitHub Actions
- name: Run visual tests
  run: npx playwright test tests/visual/
  env:
    CI: true

- name: Upload diff artifacts on failure
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: visual-diff
    path: test-results/
```

## Standards

- Use these references as the standard for how the test or monitoring strategy should behave in the shipped workflow.
- Check the implementation against Playwright Docs before treating the rule as satisfied.
- Check the implementation against Testing Library Guiding Principles before treating the rule as satisfied.

## Verification

### Automated Checks

- Run the relevant test or CI step locally and confirm it fails when the rule is violated.

### Manual Checks

- Ensure the automation blocks regressions instead of only printing warnings.
- Cover at least one representative high-risk flow, component, or route.
- Keep thresholds or assertions in version control so changes remain reviewable.