# Optimize third-party script loading

> Load third-party scripts asynchronously to prevent blocking the main thread and improve page performance.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Third-party scripts are often the most expensive JavaScript on the page and the least under your control. The right strategy is usually not "load it faster", but "load it later, conditionally, or not at all".
## Code Examples

#

## Never Block the Head with Optional Vendors

```html
<!-- Bad: parser-blocking third parties -->
<head>
  <script src="https://analytics.example.com/track.js"></script>
  <script src="https://chat.example.com/widget.js"></script>
  <script src="https://reviews.example.com/embed.js"></script>
</head>

<!-- Better: independent scripts do not block parsing -->
<head>
  <script src="https://analytics.example.com/track.js" async></script>
  <script src="https://reviews.example.com/embed.js" defer></script>
</head>
```

### Load Optional Vendors on Intent

```html
<button id="open-chat">Chat with support</button>

<script>
const chatButton = document.querySelector('#open-chat')

chatButton.addEventListener('click', async () => {
  chatButton.disabled = true
  chatButton.textContent = 'Loading chat...'

  const script = document.createElement('script')
  script.src = 'https://chat.example.com/widget.js'
  script.async = true
  document.head.appendChild(script)
}, { once: true })
</script>
```

### Use a Facade for Heavy Embeds

```html
<button class="video-facade" data-video-id="abc123">
  <img src="/thumbnails/abc123.jpg" alt="Play product demo">
  <span>Play video</span>
</button>

<script>
document.querySelector('.video-facade').addEventListener('click', async (event) => {
  const target = event.currentTarget
  const iframe = document.createElement('iframe')
  iframe.width = '560'
  iframe.height = '315'
  iframe.src = `https://www.youtube.com/embed/${target.dataset.videoId}?autoplay=1`
  iframe.title = 'Product demo'
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
  target.replaceWith(iframe)
}, { once: true })
</script>
```

### React Idle or Interaction Loading

```tsx

function useThirdPartyScript(src: string, loadOn: 'idle' | 'interaction') {
  useEffect(() => {
    const loadScript = () => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      document.head.appendChild(script)
    }

    if (loadOn === 'idle') {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadScript)
      } else {
        setTimeout(loadScript, 1500)
      }
      return
    }

    document.addEventListener('click', loadScript, { once: true })
    return () => document.removeEventListener('click', loadScript)
  }, [src, loadOn])
}
```

## Why It Matters

- **Network contention**: vendor scripts can crowd out CSS, fonts, and hero media during the most sensitive part of the load.
- **Main-thread blocking**: even `async` scripts still need parsing and execution time, which can hurt Total Blocking Time and INP.
- **Unclear business value**: many integrations run for every visitor even though only a fraction ever use them.
- **Compound cost**: a single embed may bring extra JavaScript, images, fonts, cookies, and follow-up network requests.

## Choose the Loading Strategy by Business Criticality

Use [PageSpeed Insights](https://pagespeed.web.dev/) or a trace to decide which vendors really belong in the initial route, because the right strategy depends on the measured cost of each script, not just on how important the integration feels.

| Vendor type | Recommended strategy | Why |
|-------------|----------------------|-----|
| Bot detection, consent, critical fraud checks | Load before or around interactivity only if the page truly cannot function without it | These may be required for legal or security reasons |
| Analytics and tag managers | `async`, `defer`, or framework `afterInteractive` | Important, but rarely worth blocking first paint |
| Chat, reviews, social embeds, maps, video players | Idle, visibility, or interaction-triggered loading | Most users do not need them on first paint |
| Ads and experimentation tools | Load after critical content, and only where business requirements justify the cost | These often carry large execution and network overhead |

## Framework Examples

### Next.js

```tsx

  return (
    <>
      

      
    </>
  )
}
```

## Common Mistakes

- **Treating every vendor as critical**: most third parties should not compete with LCP resources.
- **Using `async` as a complete fix**: download order may improve, but execution cost remains.
- **Loading chat, video, or review widgets for every visitor**: these are usually better behind idle, visibility, or interaction.
- **Skipping reserved space for deferred embeds**: lazy-loading without dimensions can cause CLS.
- **Ignoring removal**: sometimes the correct optimization is deleting or replacing the integration.

## Practical Budgets

- Keep blocking third-party scripts at `0` for normal content pages.
- Keep pre-interactive third parties to the small set that is legally or functionally required.
- Treat any single third-party script above roughly `100 KB` transferred or any long task above `50ms` as a candidate for deferment, facades, or removal.

## Verification

Re-check the page with [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/) or a third-party-code trace after every vendor change so you can confirm the route actually got lighter.

### Automated Checks

- Inspect the network waterfall and confirm optional third parties start after critical CSS, fonts, and LCP resources, not before them.
- Record a performance trace and verify third-party execution does not create long tasks above roughly `50ms` during the initial route load.
- Measure the page on a throttled mobile profile and confirm LCP, TBT, and INP improve or at least do not regress after the loading changes.

### Manual Checks

- Confirm interaction-triggered or idle-loaded vendors still work correctly when invoked and do not shift layout unexpectedly.