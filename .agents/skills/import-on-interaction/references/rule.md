# Load non-critical code on user interaction

> Defer JavaScript modules, widgets, and third-party code until the user signals intent through a click, focus, hover, or similar interaction.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Import-on-interaction delays code loading until the user does something that proves the feature is relevant. It is especially useful for features that are expensive but optional on the initial view.
## Code Examples

#

## Plain JavaScript Dynamic Import

```javascript
// ❌ Bad: Heavy code is loaded for every visitor

document.querySelector('#configure').addEventListener('click', () => {
  openProductConfigurator()
})

// ✅ Good: Load only when the user asks for it
document.querySelector('#configure').addEventListener('click', async () => {
  showConfiguratorSkeleton()

  const { openProductConfigurator } = await import('./product-configurator.js')
  openProductConfigurator()
})
```

### Load a Third-Party Widget After Intent

```javascript
const chatButton = document.querySelector('#open-chat')

chatButton.addEventListener('click', async () => {
  chatButton.disabled = true
  chatButton.textContent = 'Loading chat...'

  const { bootChat } = await import('./chat-loader.js')
  await bootChat()
})
```

### React Example

```tsx

  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)

    const { exportReport } = await import('./export-report')
    await exportReport()

    setLoading(false)
  }

  return (
    <button onClick={handleExport} disabled={loading}>
      {loading ? 'Preparing export...' : 'Export report'}
    </button>
  )
}
```

## Why It Matters

- **Smaller initial bundles**: Users do not download feature code they may never use.
- **Less main-thread work**: Deferring parse and execution work reduces competition with critical rendering and input handling.
- **Better prioritisation**: The browser can focus on content, LCP resources, and essential app logic before optional features.
- **Cleaner third-party strategy**: Widgets like chat, reviews, maps, and rich editors often belong behind explicit intent instead of first paint.

## When to Use It

Use import-on-interaction for:

- Chat widgets
- Rich text editors
- Map embeds
- Export and print flows
- Advanced filters, configurators, and comparison tools

Avoid it for:

- Navigation needed on the first screen
- The primary purchase or sign-in action
- Above-the-fold media or content needed for LCP
- Code required before the first user interaction can succeed

## Verification

Use [Chrome DevTools Coverage](https://developer.chrome.com/docs/devtools/coverage/) or a waterfall trace to confirm the deferred module is actually absent from the initial path, not just moved to a different eager bundle.

1. Confirm the deferred module is absent from the initial route bundle or first-load network waterfall.
2. Trigger the interaction and verify the import request starts immediately and the UI shows a loading state within roughly `100ms`.
3. Re-test the same flow and confirm repeat interactions reuse the cached chunk without another full download.
4. Measure the route before and after the change and confirm the initial JavaScript cost or main-thread work decreases.
5. Verify the interaction still feels responsive on a throttled mobile profile and does not create new long tasks above `50ms` before the deferred feature starts loading.