# Perform browser-based performance audits

> Conduct performance audits in a full browser environment to capture accurate runtime metrics and layout shifts.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
While static analysis can catch some performance issues, many critical metrics can only be measured during page execution in a real web browser.

## Code Examples

#

## Using Lighthouse CLI for Browser Audits
Lighthouse runs a full Chrome instance to audit your page.

```bash
# Install Lighthouse
npm install -g lighthouse

# Run an audit on a URL
lighthouse https://example.com --view --chrome-flags="--headless"
```

### Scripting Browser Audits with Puppeteer
You can automate browser-based checks using Puppeteer or Playwright.

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Throttling network and CPU
  const client = await page.target().createCDPSession();
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 100,
    downloadThroughput: 750 * 1024 / 8, // Fast 3G
    uploadThroughput: 250 * 1024 / 8,
  });

  await page.goto('https://example.com');
  const metrics = await page.metrics();
  console.log('Browser Metrics:', metrics);

  await browser.close();
})();
```

## Why It Matters

- **Accurate Metrics**: Core Web Vitals like Largest Contentful Paint (LCP) and Cumulative Layout Shift (CLS) require a rendering engine to be calculated.
- **JavaScript Execution**: Only a browser can measure the impact of JavaScript on main-thread blocking and interaction latency.
- **Real-World Simulation**: Browsers allow for throttling CPU and network speeds to simulate real-world user conditions.
- **Visual Feedback**: Browser-based tools provide screenshots and videos of the loading process, helping to identify "jank" and layout shifts.

## Best Practices

Use a real browser pass alongside [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/) so layout shifts, main-thread work, and interaction delays are measured in an environment that actually executes the page.

✅ **Automate in CI**: Run browser-based audits on every pull request to catch regressions early.
✅ **Throttling**: Always test with network and CPU throttling to see how your site performs for users on slower devices.
✅ **Use Multiple Regions**: Audit from different geographic locations to understand the impact of latency.
✅ **Mobile-First**: Prioritize audits using mobile device emulation.

❌ **Don't Rely Solely on Dev Machines**: Your high-end developer laptop doesn't reflect the experience of a user on a budget smartphone.
❌ **Avoid Unthrottled Tests**: Testing on a gigabit connection will hide most performance bottlenecks.

## Tools & Validation

- [Lighthouse](https://developers.google.com/web/tools/lighthouse): The industry standard for browser-based auditing.
- [WebPageTest](https://www.webpagetest.org/): Provides deep waterfall analysis and multi-location testing.
- [PageSpeed Insights](https://pagespeed.web.dev/): Combines lab data from Lighthouse with real-world field data.
- [Playwright](https://playwright.dev/): Modern browser automation for custom performance scripts.

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