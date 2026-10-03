# Analyze performance with WebPageTest

> Page performance is analyzed with WebPageTest to identify loading bottlenecks and optimization opportunities.

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
WebPageTest provides comprehensive performance analysis with real browser testing, network throttling, and detailed waterfall charts to identify optimization opportunities.

## Code Examples

#

## Online Testing
```bash
# Public WebPageTest (free)
# Visit: https://www.webpagetest.org/

# Test configuration options:
# - Test Location: Choose closest to your users
# - Browser: Chrome, Firefox, Safari, Edge
# - Connection: 3G, 4G, Cable, etc.
# - Number of Test Runs: 3-9 runs recommended
# - Repeat View: Test with primed cache
```

### Key Metrics to Monitor
```javascript
// Core Web Vitals from WebPageTest
const coreWebVitals = {
  // Largest Contentful Paint - Loading performance
  LCP: {
    good: '< 2.5s',
    needsImprovement: '2.5s - 4.0s',
    poor: '> 4.0s'
  },

  // First Input Delay - Interactivity
  FID: {
    good: '< 100ms',
    needsImprovement: '100ms - 300ms',
    poor: '> 300ms'
  },

  // Cumulative Layout Shift - Visual stability
  CLS: {
    good: '< 0.1',
    needsImprovement: '0.1 - 0.25',
    poor: '> 0.25'
  }
}

// Additional WebPageTest Metrics
const additionalMetrics = {
  TTFB: 'Time to First Byte - Server response time',
  FCP: 'First Contentful Paint - First content rendered',
  TTI: 'Time to Interactive - Page fully interactive',
  TBT: 'Total Blocking Time - Main thread blocking',
  SpeedIndex: 'Visual completeness over time',
  VisualComplete: 'Visually complete loading time'
}
```

## Why It Matters

WebPageTest reveals real-world performance issues that synthetic tools miss—like TTFB from actual locations, render-blocking patterns, and third-party script impact.

## WebPageTest API Integration

### API Testing Script
```javascript
// webpagetest-api.js
const WebPageTest = require('webpagetest')
const fs = require('fs').promises

class WebPageTestAnalyzer {
  constructor(apiKey, options = {}) {
    this.wpt = new WebPageTest('www.webpagetest.org', apiKey)
    this.options = {
      location: 'Dulles:Chrome',
      connectivity: '3G',
      runs: 3,
      firstViewOnly: false,
      video: true,
      lighthouse: true,
      ...options
    }
  }

  async runTest(url, customOptions = {}) {
    const testOptions = { ...this.options, ...customOptions }

    return new Promise((resolve, reject) => {
      this.wpt.runTest(url, testOptions, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }

  async waitForResults(testId) {
    return new Promise((resolve, reject) => {
      const checkResults = () => {
        this.wpt.getTestResults(testId, (err, data) => {
          if (err) {
            reject(err)
          } else if (data.statusCode === 200) {
            resolve(data)
          } else {
            // Test still running, check again
            setTimeout(checkResults, 10000) // Check every 10 seconds
          }
        })
      }

      checkResults()
    })
  }

  async analyzeResults(results) {
    const firstView = results.data.runs[1].firstView
    const repeatView = results.data.runs[1].repeatView

    return {
      url: results.data.url,
      testId: results.data.id,
      summary: results.data.summary,
      metrics: {
        firstView: {
          TTFB: firstView.TTFB,
          FCP: firstView.firstContentfulPaint,
          LCP: firstView.largestContentfulPaint,
          CLS: firstView.chromeUserTiming?.CumulativeLayoutShift,
          TBT: firstView.totalBlockingTime,
          TTI: firstView.TTI,
          SpeedIndex: firstView.SpeedIndex,
          loadTime: firstView.loadTime
        },
        repeatView: repeatView ? {
          TTFB: repeatView.TTFB,
          FCP: repeatView.firstContentfulPaint,
          LCP: repeatView.largestContentfulPaint,
          loadTime: repeatView.loadTime
        } : null
      },
      lighthouse: results.data.lighthouse,
      opportunities: this.extractOpportunities(results),
      waterfall: results.data.runs[1].firstView.requests
    }
  }

  extractOpportunities(results) {
    const opportunities = []
    const firstView = results.data.runs[1].firstView

    // Check for common optimization opportunities
    if (firstView.TTFB > 500) {
      opportunities.push({
        type: 'Server Response',
        issue: 'Slow Time to First Byte',
        value: `${firstView.TTFB}ms`,
        recommendation: 'Optimize server response time, consider CDN'
      })
    }

    if (firstView.requests.length > 100) {
      opportunities.push({
        type: 'HTTP Requests',
        issue: 'Too many HTTP requests',
        value: `${firstView.requests.length} requests`,
        recommendation: 'Bundle resources, use HTTP/2 push, eliminate unnecessary requests'
      })
    }

    // Check for uncompressed resources
    const uncompressed = firstView.requests.filter(req =>
      !req.headers?.response?.['content-encoding'] &&
      req.bytesIn > 1024 &&
      (req.contentType?.includes('text/') || req.contentType?.includes('application/'))
    )

    if (uncompressed.length > 0) {
      opportunities.push({
        type: 'Compression',
        issue: 'Uncompressed resources',
        value: `${uncompressed.length} resources`,
        recommendation: 'Enable gzip/brotli compression'
      })
    }

    return opportunities
  }

  async generateReport(analysis, filename = 'webpagetest-report.json') {
    const report = {
      timestamp: new Date().toISOString(),
      ...analysis,
      recommendations: this.generateRecommendations(analysis)
    }

    await fs.writeFile(filename, JSON.stringify(report, null, 2))
    return report
  }

  generateRecommendations(analysis) {
    const recommendations = []
    const metrics = analysis.metrics.firstView

    // LCP recommendations
    if (metrics.LCP > 2500) {
      recommendations.push({
        metric: 'LCP',
        priority: 'high',
        issue: 'Large Contentful Paint is slow',
        actions: [
          'Optimize largest element (image/text)',
          'Preload critical resources',
          'Eliminate render-blocking resources',
          'Use efficient image formats (WebP, AVIF)'
        ]
      })
    }

    // FCP recommendations
    if (metrics.FCP > 1800) {
      recommendations.push({
        metric: 'FCP',
        priority: 'high',
        issue: 'First Contentful Paint is slow',
        actions: [
          'Minimize critical resource chain',
          'Remove render-blocking CSS/JS',
          'Inline critical CSS',
          'Use resource hints (preload, prefetch)'
        ]
      })
    }

    // CLS recommendations
    if (metrics.CLS > 0.1) {
      recommendations.push({
        metric: 'CLS',
        priority: 'medium',
        issue: 'Cumulative Layout Shift is high',
        actions: [
          'Set explicit dimensions for images/videos',
          'Reserve space for ads and embeds',
          'Use font-display: swap carefully',
          'Avoid injecting content above existing content'
        ]
      })
    }

    return recommendations
  }
}

// Usage example
async function performanceAudit(url) {
  const analyzer = new WebPageTestAnalyzer(process.env.WPT_API_KEY)

  try {
    console.log(`Starting WebPageTest for ${url}...`)
    const testData = await analyzer.runTest(url, {
      location: 'Dulles:Chrome',
      connectivity: '3G',
      runs: 3
    })

    console.log(`Test started. ID: ${testData.data.testId}`)
    console.log(`View results: ${testData.data.userUrl}`)

    const results = await analyzer.waitForResults(testData.data.testId)
    const analysis = await analyzer.analyzeResults(results)
    const report = await analyzer.generateReport(analysis)

    console.log('\n=== Performance Analysis Results ===')
    console.log(`TTFB: ${analysis.metrics.firstView.TTFB}ms`)
    console.log(`FCP: ${analysis.metrics.firstView.FCP}ms`)
    console.log(`LCP: ${analysis.metrics.firstView.LCP}ms`)
    console.log(`CLS: ${analysis.metrics.firstView.CLS}`)
    console.log(`Speed Index: ${analysis.metrics.firstView.SpeedIndex}`)

    if (analysis.opportunities.length > 0) {
      console.log('\n=== Optimization Opportunities ===')
      analysis.opportunities.forEach(opp => {
        console.log(`${opp.type}: ${opp.issue} (${opp.value})`)
        console.log(`  → ${opp.recommendation}`)
      })
    }

    return report

  } catch (error) {
    console.error('Performance audit failed:', error)
    throw error
  }
}

// Command line usage
if (require.main === module) {
  const url = process.argv[2]
  if (!url) {
    console.error('Usage: node webpagetest-api.js <url>')
    process.exit(1)
  }

  performanceAudit(url).catch(console.error)
}

module.exports = WebPageTestAnalyzer
```

## Build Tool Integration

### Webpack Performance Budget Plugin
```javascript
// webpack-performance-budget-plugin.js
const WebPageTestAnalyzer = require('./webpagetest-analyzer')

class PerformanceBudgetPlugin {
  constructor(options = {}) {
    this.options = {
      url: options.url,
      apiKey: options.apiKey,
      budgets: {
        TTFB: 500,
        FCP: 1800,
        LCP: 2500,
        CLS: 0.1,
        SpeedIndex: 3000,
        ...options.budgets
      },
      failOnBudgetExceeded: options.failOnBudgetExceeded || false
    }
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync('PerformanceBudgetPlugin', async (compilation, callback) => {
      if (!this.options.url || !this.options.apiKey) {
        console.warn('WebPageTest URL or API key not configured, skipping performance test')
        callback()
        return
      }

      try {
        console.log('Running WebPageTest performance analysis...')

        const analyzer = new WebPageTestAnalyzer(this.options.apiKey)
        const testData = await analyzer.runTest(this.options.url)
        const results = await analyzer.waitForResults(testData.data.testId)
        const analysis = await analyzer.analyzeResults(results)

        const budgetResults = this.checkBudgets(analysis.metrics.firstView)
        const failed = budgetResults.filter(result => !result.passed)

        console.log('\n=== Performance Budget Results ===')
        budgetResults.forEach(result => {
          const status = result.passed ? '✅' : '❌'
          console.log(`${status} ${result.metric}: ${result.actual} (budget: ${result.budget})`)
        })

        if (failed.length > 0 && this.options.failOnBudgetExceeded) {
          callback(new Error(`${failed.length} performance budgets exceeded`))
        } else {
          callback()
        }

      } catch (error) {
        console.error('Performance budget check failed:', error.message)
        callback(this.options.failOnBudgetExceeded ? error : null)
      }
    })
  }

  checkBudgets(metrics) {
    return Object.entries(this.options.budgets).map(([metric, budget]) => {
      const actual = metrics[metric]
      const passed = actual <= budget

      return {
        metric,
        budget,
        actual,
        passed
      }
    })
  }
}

// webpack.config.js
module.exports = {
  plugins: [
    new PerformanceBudgetPlugin({
      url: 'https://your-deployed-site.com',
      apiKey: process.env.WPT_API_KEY,
      budgets: {
        TTFB: 300,
        FCP: 1500,
        LCP: 2000,
        SpeedIndex: 2500
      },
      failOnBudgetExceeded: process.env.NODE_ENV === 'production'
    })
  ]
}
```

### GitHub Actions Integration
```yaml
# .github/workflows/performance-testing.yml
name: Performance Testing

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    # Run performance tests daily
    - cron: '0 6 * * *'

jobs:
  webpagetest:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build project
      run: npm run build

    - name: Deploy to staging
      run: |
        # Deploy your built site to a staging URL
        echo "Deploying to staging..."
        # Your deployment commands here

    - name: Run WebPageTest
      env:
        WPT_API_KEY: ${{ secrets.WEBPAGETEST_API_KEY }}
      run: |
        npm install -g webpagetest
        node scripts/webpagetest-runner.js https://staging.your-site.com

    - name: Generate Performance Report
      uses: actions/github-script@v7
      if: github.event_name == 'pull_request'
      with:
        script: |
          const fs = require('fs')

          if (fs.existsSync('webpagetest-report.json')) {
            const report = JSON.parse(fs.readFileSync('webpagetest-report.json', 'utf8'))

            const metrics = report.metrics.firstView
            const comment = `## 🚀 WebPageTest Performance Results

            ### Core Web Vitals
            - **LCP**: ${metrics.LCP}ms ${metrics.LCP <= 2500 ? '✅' : '❌'}
            - **FCP**: ${metrics.FCP}ms ${metrics.FCP <= 1800 ? '✅' : '❌'}
            - **CLS**: ${metrics.CLS} ${metrics.CLS <= 0.1 ? '✅' : '❌'}

            ### Additional Metrics
            - **TTFB**: ${metrics.TTFB}ms
            - **Speed Index**: ${metrics.SpeedIndex}
            - **TTI**: ${metrics.TTI}ms

            ${report.opportunities.length > 0 ? `
            ### Optimization Opportunities
            ${report.opportunities.map(opp => `- **${opp.type}**: ${opp.issue}`).join('\n')}
            ` : ''}

            [View detailed results](${report.testUrl})`

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            })
          }

    - name: Upload Performance Artifacts
      uses: actions/upload-artifact@v3
      with:
        name: performance-report
        path: |
          webpagetest-report.json
          webpagetest-waterfall.png
        retention-days: 30

# Performance budget enforcement
  performance-budget:
    runs-on: ubuntu-latest
    needs: webpagetest

    steps:
    - name: Check Performance Budget
      env:
        LCP_BUDGET: 2500
        FCP_BUDGET: 1800
        CLS_BUDGET: 0.1
      run: |
        node scripts/check-performance-budget.js
```

## Advanced Analysis Techniques

### Waterfall Analysis
```javascript
// waterfall-analyzer.js
class WaterfallAnalyzer {
  constructor(waterfallData) {
    this.requests = waterfallData
  }

  analyzeRequestChains() {
    const chains = []
    const requestMap = new Map()

    // Build request dependency map
    this.requests.forEach(request => {
      requestMap.set(request.url, request)

      // Find requests that block others
      if (request.contentType?.includes('text/html')) {
        chains.push({
          type: 'HTML Document',
          url: request.url,
          startTime: request.load_start,
          endTime: request.load_end,
          blocksRendering: true
        })
      }

      if (request.contentType?.includes('text/css') && !request.async) {
        chains.push({
          type: 'Render-blocking CSS',
          url: request.url,
          startTime: request.load_start,
          endTime: request.load_end,
          blocksRendering: true
        })
      }
    })

    return chains.sort((a, b) => a.startTime - b.startTime)
  }

  identifyBottlenecks() {
    const bottlenecks = []

    // Find slow requests
    const slowRequests = this.requests
      .filter(req => req.load_end - req.load_start > 1000)
      .sort((a, b) => (b.load_end - b.load_start) - (a.load_end - a.load_start))

    slowRequests.forEach(request => {
      bottlenecks.push({
        type: 'Slow Request',
        url: request.url,
        duration: request.load_end - request.load_start,
        contentType: request.contentType,
        size: request.bytesIn
      })
    })

    // Find requests without caching
    const uncached = this.requests.filter(req =>
      !req.headers?.response?.['cache-control'] &&
      !req.headers?.response?.['expires'] &&
      req.bytesIn > 1024
    )

    uncached.forEach(request => {
      bottlenecks.push({
        type: 'Missing Cache Headers',
        url: request.url,
        size: request.bytesIn,
        recommendation: 'Add appropriate cache headers'
      })
    })

    return bottlenecks
  }

  analyzeResourceTiming() {
    const analysis = {
      totalRequests: this.requests.length,
      totalBytes: this.requests.reduce((sum, req) => sum + req.bytesIn, 0),
      resourceTypes: {},
      timingBreakdown: {
        dns: 0,
        connect: 0,
        ssl: 0,
        wait: 0,
        download: 0
      }
    }

    // Group by content type
    this.requests.forEach(request => {
      const type = request.contentType?.split('/')[0] || 'other'

      if (!analysis.resourceTypes[type]) {
        analysis.resourceTypes[type] = {
          count: 0,
          bytes: 0,
          avgDuration: 0
        }
      }

      analysis.resourceTypes[type].count++
      analysis.resourceTypes[type].bytes += request.bytesIn
      analysis.resourceTypes[type].avgDuration += request.load_end - request.load_start

      // Timing breakdown
      if (request.dns_start && request.dns_end) {
        analysis.timingBreakdown.dns += request.dns_end - request.dns_start
      }
      if (request.connect_start && request.connect_end) {
        analysis.timingBreakdown.connect += request.connect_end - request.connect_start
      }
    })

    // Calculate averages
    Object.values(analysis.resourceTypes).forEach(type => {
      type.avgDuration = type.avgDuration / type.count
    })

    return analysis
  }

  generateOptimizationPlan() {
    const chains = this.analyzeRequestChains()
    const bottlenecks = this.identifyBottlenecks()
    const resourceAnalysis = this.analyzeResourceTiming()

    const plan = []

    // Critical path optimization
    const renderBlockingResources = chains.filter(chain => chain.blocksRendering)
    if (renderBlockingResources.length > 3) {
      plan.push({
        priority: 'high',
        category: 'Critical Path',
        issue: `${renderBlockingResources.length} render-blocking resources`,
        actions: [
          'Inline critical CSS',
          'Defer non-critical JavaScript',
          'Use resource hints (preload, prefetch)',
          'Minimize critical resource chain'
        ]
      })
    }

    // Large resource optimization
    const largeResources = bottlenecks
      .filter(b => b.type === 'Slow Request' && b.size > 100000)

    if (largeResources.length > 0) {
      plan.push({
        priority: 'high',
        category: 'Resource Size',
        issue: `${largeResources.length} large resources detected`,
        actions: [
          'Compress images (WebP, AVIF)',
          'Minify CSS/JS',
          'Enable gzip/brotli compression',
          'Use lazy loading for non-critical resources'
        ]
      })
    }

    return plan
  }
}

// Usage
const analyzer = new WaterfallAnalyzer(waterfallData)
const optimizationPlan = analyzer.generateOptimizationPlan()
```

### Performance Regression Detection
```javascript
// performance-regression-detector.js
const fs = require('fs').promises

class PerformanceRegressionDetector {
  constructor(baselineFile = 'performance-baseline.json') {
    this.baselineFile = baselineFile
    this.thresholds = {
      TTFB: 0.2, // 20% regression threshold
      FCP: 0.15,
      LCP: 0.15,
      CLS: 0.1,
      SpeedIndex: 0.2
    }
  }

  async loadBaseline() {
    try {
      const baselineData = await fs.readFile(this.baselineFile, 'utf8')
      return JSON.parse(baselineData)
    } catch (error) {
      console.warn('No baseline found, creating new baseline')
      return null
    }
  }

  async saveBaseline(metrics) {
    const baseline = {
      timestamp: new Date().toISOString(),
      metrics,
      version: process.env.BUILD_VERSION || 'unknown'
    }

    await fs.writeFile(this.baselineFile, JSON.stringify(baseline, null, 2))
  }

  compareMetrics(baseline, current) {
    if (!baseline) return { isRegression: false, comparisons: [] }

    const comparisons = []
    let hasRegression = false

    Object.entries(this.thresholds).forEach(([metric, threshold]) => {
      const baselineValue = baseline.metrics[metric]
      const currentValue = current[metric]

      if (baselineValue && currentValue) {
        const change = (currentValue - baselineValue) / baselineValue
        const isRegression = change > threshold

        if (isRegression) hasRegression = true

        comparisons.push({
          metric,
          baseline: baselineValue,
          current: currentValue,
          change: Math.round(change * 100),
          isRegression,
          threshold: Math.round(threshold * 100)
        })
      }
    })

    return {
      isRegression: hasRegression,
      comparisons
    }
  }

  generateRegressionReport(comparison) {
    const regressions = comparison.comparisons.filter(c => c.isRegression)

    if (regressions.length === 0) {
      return {
        status: 'passed',
        message: 'No performance regressions detected',
        details: comparison.comparisons
      }
    }

    return {
      status: 'failed',
      message: `${regressions.length} performance regressions detected`,
      regressions: regressions.map(r => ({
        metric: r.metric,
        change: `+${r.change}%`,
        baseline: r.baseline,
        current: r.current,
        threshold: `${r.threshold}%`
      })),
      details: comparison.comparisons
    }
  }

  async checkForRegressions(currentMetrics) {
    const baseline = await this.loadBaseline()
    const comparison = this.compareMetrics(baseline, currentMetrics)
    const report = this.generateRegressionReport(comparison)

    if (report.status === 'passed' && !baseline) {
      // First run, save as baseline
      await this.saveBaseline(currentMetrics)
      report.message = 'Baseline established for future comparisons'
    }

    return report
  }
}

// Integration with WebPageTest
async function performanceRegressionCheck(url) {
  const analyzer = new WebPageTestAnalyzer(process.env.WPT_API_KEY)
  const detector = new PerformanceRegressionDetector()

  // Run WebPageTest
  const testData = await analyzer.runTest(url)
  const results = await analyzer.waitForResults(testData.data.testId)
  const analysis = await analyzer.analyzeResults(results)

  // Check for regressions
  const regressionReport = await detector.checkForRegressions(analysis.metrics.firstView)

  if (regressionReport.status === 'failed') {
    console.error('❌ Performance regression detected!')
    regressionReport.regressions.forEach(regression => {
      console.error(`  ${regression.metric}: ${regression.change} (threshold: ${regression.threshold})`)
    })

    if (process.env.CI) {
      process.exit(1) // Fail CI build
    }
  } else {
    console.log('✅ No performance regressions detected')
  }

  return regressionReport
}
```

## Continuous Performance Monitoring

### Performance Dashboard
```javascript
// performance-dashboard.js
const express = require('express')
const { WebPageTestAnalyzer } = require('./webpagetest-analyzer')

class PerformanceDashboard {
  constructor(options = {}) {
    this.app = express()
    this.port = options.port || 3000
    this.sites = options.sites || []
    this.analyzer = new WebPageTestAnalyzer(options.apiKey)
    this.results = new Map()

    this.setupRoutes()
    this.scheduleTests()
  }

  setupRoutes() {
    this.app.use(express.static('public'))
    this.app.use(express.json())

    this.app.get('/api/results', (req, res) => {
      const allResults = Array.from(this.results.entries()).map(([site, data]) => ({
        site,
        ...data
      }))
      res.json(allResults)
    })

    this.app.get('/api/results/:site', (req, res) => {
      const result = this.results.get(req.params.site)
      if (result) {
        res.json(result)
      } else {
        res.status(404).json({ error: 'Site not found' })
      }
    })

    this.app.post('/api/test/:site', async (req, res) => {
      try {
        const site = this.sites.find(s => s.name === req.params.site)
        if (!site) {
          return res.status(404).json({ error: 'Site not found' })
        }

        const result = await this.runSingleTest(site)
        res.json(result)
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })
  }

  async runSingleTest(site) {
    try {
      const testData = await this.analyzer.runTest(site.url, {
        location: site.location || 'Dulles:Chrome',
        connectivity: site.connectivity || '3G'
      })

      const results = await this.analyzer.waitForResults(testData.data.testId)
      const analysis = await this.analyzer.analyzeResults(results)

      const result = {
        ...analysis,
        timestamp: new Date().toISOString(),
        status: 'completed'
      }

      this.results.set(site.name, result)
      return result

    } catch (error) {
      const errorResult = {
        error: error.message,
        timestamp: new Date().toISOString(),
        status: 'failed'
      }

      this.results.set(site.name, errorResult)
      throw error
    }
  }

  scheduleTests() {
    const cron = require('node-cron')

    // Run tests every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('Running scheduled performance tests...')

      for (const site of this.sites) {
        try {
          await this.runSingleTest(site)
          console.log(`✅ Test completed for ${site.name}`)
        } catch (error) {
          console.error(`❌ Test failed for ${site.name}:`, error.message)
        }

        // Add delay between tests to avoid overwhelming WebPageTest
        await new Promise(resolve => setTimeout(resolve, 30000))
      }
    })
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Performance dashboard running on http://localhost:${this.port}`)
    })
  }
}

// Configuration
const dashboard = new PerformanceDashboard({
  apiKey: process.env.WPT_API_KEY,
  port: 3000,
  sites: [
    {
      name: 'production',
      url: 'https://example.com',
      location: 'Dulles:Chrome',
      connectivity: '3G'
    },
    {
      name: 'staging',
      url: 'https://staging.example.com',
      location: 'London:Chrome',
      connectivity: '4G'
    }
  ]
})

dashboard.start()
```

## Best Practices

1. **Regular Testing**: Schedule automated tests weekly or after major deployments
2. **Multiple Locations**: Test from different geographic locations relevant to your users
3. **Device Testing**: Include mobile and desktop testing scenarios
4. **Network Conditions**: Test various connection speeds (3G, 4G, WiFi)
5. **Multiple Runs**: Use 3-9 test runs for consistent results
6. **Performance Budgets**: Set and enforce performance budgets
7. **Regression Detection**: Compare results over time to catch regressions
8. **Actionable Reports**: Focus on metrics that drive user experience improvements

## Common WebPageTest Optimization Insights

### Critical Path Analysis
```javascript
// Identify critical rendering path issues
function analyzeCriticalPath(waterfallData) {
  const criticalResources = waterfallData.requests.filter(req =>
    req.contentType?.includes('text/html') ||
    (req.contentType?.includes('text/css') && !req.async) ||
    (req.contentType?.includes('javascript') && !req.async && !req.defer)
  )

  const criticalPathDuration = Math.max(...criticalResources.map(req => req.load_end))

  return {
    resources: criticalResources.length,
    duration: criticalPathDuration,
    recommendations: criticalResources.length > 4 ? [
      'Inline critical CSS',
      'Defer non-critical JavaScript',
      'Use resource hints',
      'Minimize render-blocking resources'
    ] : []
  }
}
```

### Image Optimization Insights
```javascript
// Analyze image optimization opportunities
function analyzeImageOptimization(waterfallData) {
  const images = waterfallData.requests.filter(req =>
    req.contentType?.startsWith('image/')
  )

  const opportunities = []
  let totalSavings = 0

  images.forEach(img => {
    // Check for unoptimized formats
    if (img.contentType === 'image/jpeg' || img.contentType === 'image/png') {
      if (img.bytesIn > 50000) { // Images larger than 50KB
        const estimatedSavings = img.bytesIn * 0.3 // Estimate 30% savings with WebP
        totalSavings += estimatedSavings

        opportunities.push({
          url: img.url,
          currentSize: img.bytesIn,
          estimatedSavings,
          recommendation: 'Convert to WebP/AVIF format'
        })
      }
    }

    // Check for missing dimensions (causes CLS)
    if (!img.headers?.response?.['content-length']) {
      opportunities.push({
        url: img.url,
        recommendation: 'Add explicit width/height attributes'
      })
    }
  })

  return {
    totalImages: images.length,
    totalSize: images.reduce((sum, img) => sum + img.bytesIn, 0),
    opportunities,
    estimatedSavings: totalSavings
  }
}
```

## Support Notes

- Performance-testing integrations can vary across browsers and agent types, so document which environment is the source of truth for this rule.
- Use a fallback note when a tool-specific feature is not available in every supported testing environment.

## Verification

### Automated Checks

- Inspect the final rendered HTML in the browser or page source to confirm the rule is satisfied.
- Validate the affected markup with browser tooling or an HTML validator where appropriate.
- Test one representative route or template that uses the pattern.
- Re-check shared components that emit the same markup so the fix is consistent.

### Manual Checks

- Verify the rendered browser behavior manually on representative routes and supported browsers so the user-facing outcome matches the rule.