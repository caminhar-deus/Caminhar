# Check for broken links

> All links are tested and none are broken. Links redirect to intended destinations.

**Priority:** medium · **Difficulty:** beginner · **Time:** 15 min

---
Broken links hurt user experience, damage SEO rankings, and reduce site credibility. Regular link checking ensures all links function properly and direct users to intended destinations.

## Code Example

#

## Browser Extensions
```html
<!-- Links to test manually -->
<nav>
  <a href="/about">About Us</a> <!-- Internal link -->
  <a href="https://example.com">External Site</a> <!-- External link -->
  <a href="mailto:contact@example.com">Contact</a> <!-- Email link -->
  <a href="tel:+1234567890">Call Us</a> <!-- Phone link -->
  <a href="/docs/guide.pdf">PDF Guide</a> <!-- File link -->
  <a href="#section1">Jump to Section</a> <!-- Anchor link -->
</nav>

<!-- Common problematic patterns -->
<a href="http://old-domain.com">Might redirect</a>
<a href="/old-page">Might be moved</a>
<a href="https://external-site.com/old-path">External might change</a>
```

## Why It Matters

Broken links frustrate users, hurt SEO rankings (Google penalizes 404s), and damage credibility—especially for documentation and e-commerce sites.

## Automated Link Checking Tools

### Command Line Tools

#### linkchecker
```bash
# Install linkchecker
pip install linkchecker

# Check single page
linkchecker https://example.com

# Check entire site
linkchecker --recursive https://example.com

# Check with output file
linkchecker --output=csv --file-output=csv/results.csv https://example.com

# Check specific file patterns
linkchecker --ignore-url=".*\.(jpg|jpeg|png|gif)$" https://example.com

# Advanced options
linkchecker \
  --recursive \
  --threads=10 \
  --timeout=30 \
  --user-agent="LinkChecker Bot" \
  --output=html \
  --file-output=html/report.html \
  https://example.com
```

#### lychee (Fast Rust-based checker)
```bash
# Install lychee
cargo install lychee

# Check single file
lychee README.md

# Check website
lychee https://example.com

# Check with configuration
lychee --config lychee.toml https://example.com

# Check multiple formats
lychee "**/*.md" "**/*.html" --verbose
```

#### Lychee Configuration (lychee.toml)
```toml
# Maximum number of concurrent requests
max_concurrency = 8

# Request timeout in seconds
timeout = 30

# Accept invalid certificates
accept_invalid_certs = false

# Check links in code blocks
include_verbatim = true

# Exclude patterns
exclude = [
    "https://linkedin.com/.*",
    "https://twitter.com/.*",
    "mailto:.*",
    "tel:.*"
]

# Custom user agent
user_agent = "lychee/0.13.0"

# Follow redirects
follow_redirects = true

# Maximum redirect count
max_redirects = 5

# Headers to send with requests
[headers]
"Accept" = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
"Accept-Language" = "en-US,en;q=0.5"
```

### Node.js Solutions

#### broken-link-checker
```bash
# Install broken-link-checker
npm install -g broken-link-checker

# Check single page
blc https://example.com

# Check entire site recursively
blc https://example.com --recursive --ordered

# With detailed output
blc https://example.com --recursive --verbose

# Filter by status codes
blc https://example.com --filter-level=3 --recursive
```

#### Custom Node.js Link Checker
```javascript
// link-checker.js
const axios = require('axios')
const cheerio = require('cheerio')
const fs = require('fs').promises
const path = require('path')
const { URL } = require('url')

class LinkChecker {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl
    this.timeout = options.timeout || 10000
    this.maxConcurrent = options.maxConcurrent || 10
    this.userAgent = options.userAgent || 'LinkChecker/1.0'
    this.excludePatterns = options.excludePatterns || []
    this.results = []
    this.checked = new Set()
    this.queue = []
    this.running = 0
  }

  async checkUrl(url, sourceUrl = null) {
    if (this.checked.has(url) || this.shouldExclude(url)) {
      return
    }

    this.checked.add(url)

    try {
      const response = await axios.head(url, {
        timeout: this.timeout,
        headers: { 'User-Agent': this.userAgent },
        validateStatus: status => status < 500 // Accept redirects
      })

      this.results.push({
        url,
        sourceUrl,
        status: response.status,
        statusText: response.statusText,
        redirectUrl: response.request.res.responseUrl !== url ? response.request.res.responseUrl : null,
        ok: response.status < 400
      })

    } catch (error) {
      this.results.push({
        url,
        sourceUrl,
        status: error.response?.status || 0,
        statusText: error.message,
        redirectUrl: null,
        ok: false,
        error: error.message
      })
    }
  }

  async checkPage(pageUrl) {
    try {
      const response = await axios.get(pageUrl, {
        timeout: this.timeout,
        headers: { 'User-Agent': this.userAgent }
      })

      const $ = cheerio.load(response.data)
      const links = []

      // Extract all links
      $('a[href]').each((i, element) => {
        const href = $(element).attr('href')
        if (href) {
          try {
            const absoluteUrl = new URL(href, pageUrl).toString()
            links.push({
              url: absoluteUrl,
              text: $(element).text().trim(),
              sourceUrl: pageUrl
            })
          } catch (error) {
            // Invalid URL
            this.results.push({
              url: href,
              sourceUrl: pageUrl,
              status: 0,
              statusText: 'Invalid URL',
              ok: false,
              error: error.message
            })
          }
        }
      })

      // Check all links with concurrency control
      const checkPromises = links.map(link =>
        this.limitConcurrency(() => this.checkUrl(link.url, link.sourceUrl))
      )

      await Promise.all(checkPromises)

      return links

    } catch (error) {
      console.error(`Error checking page ${pageUrl}:`, error.message)
      return []
    }
  }

  async limitConcurrency(task) {
    while (this.running >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.running++
    try {
      return await task()
    } finally {
      this.running--
    }
  }

  shouldExclude(url) {
    return this.excludePatterns.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(url)
      }
      return url.includes(pattern)
    })
  }

  generateReport() {
    const broken = this.results.filter(result => !result.ok)
    const redirects = this.results.filter(result => result.redirectUrl)

    return {
      total: this.results.length,
      broken: broken.length,
      redirects: redirects.length,
      details: {
        broken,
        redirects,
        all: this.results
      }
    }
  }

  async saveReport(filename = 'link-check-report.json') {
    const report = this.generateReport()
    await fs.writeFile(filename, JSON.stringify(report, null, 2))
    console.log(`Report saved to ${filename}`)
    return report
  }
}

// Usage
async function checkSite(siteUrl) {
  const checker = new LinkChecker({
    baseUrl: siteUrl,
    timeout: 15000,
    maxConcurrent: 8,
    excludePatterns: [
      /mailto:/,
      /tel:/,
      /javascript:/,
      /linkedin\.com/,
      /twitter\.com/,
      /facebook\.com/
    ]
  })

  console.log(`Checking links on ${siteUrl}...`)
  await checker.checkPage(siteUrl)

  const report = await checker.saveReport()

  console.log(`\n=== Link Check Results ===`)
  console.log(`Total links checked: ${report.total}`)
  console.log(`Broken links: ${report.broken}`)
  console.log(`Redirects: ${report.redirects}`)

  if (report.broken > 0) {
    console.log(`\nBroken links:`)
    report.details.broken.forEach(link => {
      console.log(`❌ ${link.url} (${link.status}) - Found on: ${link.sourceUrl}`)
    })
  }

  if (report.redirects > 0) {
    console.log(`\nRedirects:`)
    report.details.redirects.forEach(link => {
      console.log(`↗️  ${link.url} → ${link.redirectUrl}`)
    })
  }
}

// Run checker
if (require.main === module) {
  const siteUrl = process.argv[2] || 'https://example.com'
  checkSite(siteUrl).catch(console.error)
}

module.exports = LinkChecker
```

## Build Tool Integration

### Webpack Plugin
```javascript
// webpack-link-checker-plugin.js
const axios = require('axios')
const cheerio = require('cheerio')

class LinkCheckerPlugin {
  constructor(options = {}) {
    this.options = {
      failOnError: false,
      timeout: 10000,
      excludePatterns: [],
      ...options
    }
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync('LinkCheckerPlugin', async (compilation, callback) => {
      try {
        const htmlFiles = Object.keys(compilation.assets)
          .filter(name => name.endsWith('.html'))

        const results = []

        for (const filename of htmlFiles) {
          const source = compilation.assets[filename].source()
          const links = this.extractLinks(source)
          const checkResults = await this.checkLinks(links, filename)
          results.push(...checkResults)
        }

        const broken = results.filter(r => !r.ok)

        if (broken.length > 0) {
          const message = `Found ${broken.length} broken links:\n${broken.map(b => `  - ${b.url} (${b.status})`).join('\n')}`

          if (this.options.failOnError) {
            callback(new Error(message))
            return
          } else {
            console.warn('⚠️ ' + message)
          }
        }

        callback()
      } catch (error) {
        callback(error)
      }
    })
  }

  extractLinks(html) {
    const $ = cheerio.load(html)
    const links = []

    $('a[href]').each((i, element) => {
      const href = $(element).attr('href')
      if (href && !href.startsWith('#') && !this.shouldExclude(href)) {
        links.push(href)
      }
    })

    return [...new Set(links)] // Remove duplicates
  }

  async checkLinks(links, sourceFile) {
    const results = []

    for (const link of links) {
      try {
        const response = await axios.head(link, {
          timeout: this.options.timeout,
          validateStatus: status => status < 500
        })

        results.push({
          url: link,
          sourceFile,
          status: response.status,
          ok: response.status < 400
        })
      } catch (error) {
        results.push({
          url: link,
          sourceFile,
          status: error.response?.status || 0,
          ok: false,
          error: error.message
        })
      }
    }

    return results
  }

  shouldExclude(url) {
    return this.options.excludePatterns.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(url)
      }
      return url.includes(pattern)
    })
  }
}

// webpack.config.js
module.exports = {
  plugins: [
    new LinkCheckerPlugin({
      failOnError: process.env.NODE_ENV === 'production',
      excludePatterns: [/mailto:/, /tel:/, /javascript:/]
    })
  ]
}
```

### Vite Plugin
```javascript
// vite-link-checker.js

  const {
    include = ['**/*.html'],
    exclude = [],
    failOnError = false,
    timeout = 10000
  } = options

  return {
    name: 'link-checker',

    async closeBundle() {
      console.log('🔍 Checking links...')

      const files = await glob(include, {
        cwd: resolve('dist'),
        ignore: exclude
      })

      let totalBroken = 0

      for (const file of files) {
        const filePath = resolve('dist', file)
        const content = readFileSync(filePath, 'utf8')
        const $ = cheerio.load(content)

        const links = []
        $('a[href]').each((i, el) => {
          const href = $(el).attr('href')
          if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
            links.push(href)
          }
        })

        const broken = []
        for (const link of [...new Set(links)]) {
          try {
            await axios.head(link, { timeout })
          } catch (error) {
            broken.push({ link, error: error.message })
          }
        }

        if (broken.length > 0) {
          console.error(`❌ Broken links in ${file}:`)
          broken.forEach(({ link, error }) => {
            console.error(`  - ${link}: ${error}`)
          })
          totalBroken += broken.length
        }
      }

      if (totalBroken === 0) {
        console.log('✅ All links are working!')
      } else if (failOnError) {
        throw new Error(`Found ${totalBroken} broken links`)
      }
    }
  }
}

// vite.config.js

  plugins: [
    linkChecker({
      failOnError: process.env.NODE_ENV === 'production'
    })
  ]
})
```

## CI/CD Integration

### GitHub Actions
```yaml
# .github/workflows/link-check.yml
name: Link Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    # Run weekly to catch external link changes
    - cron: '0 0 * * 0'

jobs:
  linkchecker:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies and build
      run: |
        npm ci
        npm run build

    - name: Check internal links
      uses: ruzickap/action-my-broken-link-checker@v2
      with:
        url: https://your-site.com
        pages_path: ./dist
        cmd_params: '--buffer-size=8192 --max-connections=10 --color=always --skip-tls-verification --exclude=(linkedin|twitter|facebook)'

    - name: Lychee Link Checker
      uses: lycheeverse/lychee-action@v1.8.0
      with:
        args: --verbose --no-progress './dist/**/*.html'
        format: markdown
        output: lychee-report.md

    - name: Comment PR with results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs')

          if (fs.existsSync('lychee-report.md')) {
            const report = fs.readFileSync('lychee-report.md', 'utf8')

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Link Check Results\n\n${report}`
            })
          }
```

### GitLab CI
```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - link-check

build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

link-check:
  stage: link-check
  image: node:18-alpine
  dependencies:
    - build
  before_script:
    - npm install -g broken-link-checker lychee
  script:
    - echo "Checking internal links..."
    - blc http://localhost:8000 --recursive --ordered || echo "Some internal links broken"
    - echo "Checking external links..."
    - lychee "dist/**/*.html" --verbose
  artifacts:
    reports:
      junit: link-check-report.xml
    when: always
  allow_failure: true

# Alternative with Docker
link-check-docker:
  stage: link-check
  image: lycheeverse/lychee:latest
  dependencies:
    - build
  script:
    - lychee --format json --output results.json "dist/**/*.html"
  artifacts:
    reports:
      junit: results.json
    when: always
```

## Framework-Specific Link Checking

### Next.js Link Validation
```javascript
// next.config.js
const LinkChecker = require('./lib/link-checker')

module.exports = {
  webpack: (config, { dev, isServer }) => {
    if (!dev && isServer) {
      config.plugins.push(
        new LinkChecker({
          failOnError: process.env.NODE_ENV === 'production'
        })
      )
    }
    return config
  },

  async headers() {
    return [
      {
        source: '/api/check-links',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache'
          }
        ]
      }
    ]
  }
}

// pages/api/check-links.js

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { url } = req.body
    const results = await checkSiteLinks(url)

    res.status(200).json({
      total: results.length,
      broken: results.filter(r => !r.ok).length,
      results
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// components/LinkHealthMonitor.js

  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const checkLinks = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/check-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: siteUrl })
      })
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Link check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="link-monitor">
      <button onClick={checkLinks} disabled={loading}>
        {loading ? 'Checking...' : 'Check Links'}
      </button>

      {results && (
        <div className="results">
          <p>Total: {results.total}, Broken: {results.broken}</p>
          {results.broken > 0 && (
            <ul>
              {results.results
                .filter(r => !r.ok)
                .map((result, i) => (
                  <li key={i} className="broken-link">
                    {result.url} - {result.error}
                  </li>
                ))
              }
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
```

### Gatsby Link Validation
```javascript
// gatsby-node.js
const axios = require('axios')
const cheerio = require('cheerio')

exports.onPostBuild = async ({ graphql }) => {
  const result = await graphql(`
    query {
      allSitePage {
        nodes {
          path
        }
      }
    }
  `)

  const pages = result.data.allSitePage.nodes
  let brokenLinks = []

  for (const page of pages) {
    const pagePath = `./public${page.path}/index.html`

    try {
      const fs = require('fs')
      const content = fs.readFileSync(pagePath, 'utf8')
      const $ = cheerio.load(content)

      const links = []
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href')
        if (href && href.startsWith('http')) {
          links.push(href)
        }
      })

      for (const link of [...new Set(links)]) {
        try {
          await axios.head(link, { timeout: 10000 })
        } catch (error) {
          brokenLinks.push({
            page: page.path,
            link,
            error: error.message
          })
        }
      }
    } catch (error) {
      console.error(`Error checking ${page.path}:`, error.message)
    }
  }

  if (brokenLinks.length > 0) {
    console.error('❌ Broken links found:')
    brokenLinks.forEach(({ page, link, error }) => {
      console.error(`  ${page}: ${link} - ${error}`)
    })

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Found ${brokenLinks.length} broken links`)
    }
  } else {
    console.log('✅ All external links are working!')
  }
}
```

## Monitoring and Alerts

### Continuous Link Monitoring
```javascript
// link-monitor-service.js
const cron = require('node-cron')
const nodemailer = require('nodemailer')
const LinkChecker = require('./link-checker')

class LinkMonitorService {
  constructor(options) {
    this.sites = options.sites || []
    this.emailConfig = options.email
    this.schedule = options.schedule || '0 0 * * *' // Daily at midnight
    this.transporter = nodemailer.createTransporter(this.emailConfig)
  }

  start() {
    console.log('Starting link monitor service...')

    cron.schedule(this.schedule, async () => {
      console.log('Running scheduled link check...')
      await this.checkAllSites()
    })

    // Run initial check
    this.checkAllSites()
  }

  async checkAllSites() {
    const results = []

    for (const site of this.sites) {
      try {
        const checker = new LinkChecker({ baseUrl: site.url })
        await checker.checkPage(site.url)
        const report = checker.generateReport()

        results.push({
          site: site.name,
          url: site.url,
          ...report
        })

        if (report.broken > 0) {
          await this.sendAlert(site, report)
        }

      } catch (error) {
        console.error(`Error checking ${site.name}:`, error.message)
      }
    }

    await this.saveResults(results)
  }

  async sendAlert(site, report) {
    const brokenLinks = report.details.broken
      .map(link => `- ${link.url} (${link.status})`)
      .join('\n')

    const mailOptions = {
      from: this.emailConfig.from,
      to: site.alerts || this.emailConfig.defaultTo,
      subject: `Broken links detected on ${site.name}`,
      text: `
Found ${report.broken} broken links on ${site.name}:

${brokenLinks}

Please check and fix these links.

---
Automated Link Monitor
      `
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log(`Alert sent for ${site.name}`)
    } catch (error) {
      console.error(`Failed to send alert for ${site.name}:`, error.message)
    }
  }

  async saveResults(results) {
    const fs = require('fs').promises
    const timestamp = new Date().toISOString()
    const filename = `link-check-${timestamp.split('T')[0]}.json`

    await fs.writeFile(`reports/${filename}`, JSON.stringify({
      timestamp,
      results
    }, null, 2))
  }
}

// config/link-monitor.js
module.exports = {
  sites: [
    {
      name: 'Production Site',
      url: 'https://example.com',
      alerts: 'admin@example.com'
    },
    {
      name: 'Staging Site',
      url: 'https://staging.example.com',
      alerts: 'dev@example.com'
    }
  ],
  schedule: '0 */6 * * *', // Every 6 hours
  email: {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    from: 'monitor@example.com',
    defaultTo: 'admin@example.com'
  }
}

// Start service
const LinkMonitorService = require('./link-monitor-service')
const config = require('./config/link-monitor')

const monitor = new LinkMonitorService(config)
monitor.start()
```

## Best Practices

1. **Regular Checks**: Schedule automated link checking weekly or monthly
2. **Comprehensive Coverage**: Check all link types (internal, external, files, anchors)
3. **Performance Balance**: Use appropriate concurrency limits to avoid overwhelming servers
4. **Error Handling**: Gracefully handle timeouts and server errors
5. **Reporting**: Generate detailed reports for analysis and tracking
6. **Prioritization**: Focus on critical pages and external links first
7. **Continuous Monitoring**: Set up alerts for broken links in production
8. **Documentation**: Document link checking processes and exclusion rules

## Common Link Issues

### Redirect Chains
```javascript
// Detect and report redirect chains
async function checkRedirectChain(url, maxRedirects = 5) {
  const chain = []
  let currentUrl = url

  for (let i = 0; i < maxRedirects; i++) {
    try {
      const response = await axios.get(currentUrl, {
        maxRedirects: 0,
        validateStatus: status => status < 400
      })

      chain.push({
        url: currentUrl,
        status: response.status,
        final: true
      })

      break // No redirect

    } catch (error) {
      if (error.response && [301, 302, 307, 308].includes(error.response.status)) {
        chain.push({
          url: currentUrl,
          status: error.response.status,
          final: false
        })

        currentUrl = error.response.headers.location
      } else {
        throw error
      }
    }
  }

  return {
    chain,
    redirectCount: chain.length - 1,
    excessive: chain.length > 3
  }
}
```

### Temporal Link Issues
```javascript
// Check links at different times to catch intermittent issues
async function temporalLinkCheck(url, attempts = 3, delay = 5000) {
  const results = []

  for (let i = 0; i < attempts; i++) {
    try {
      const start = Date.now()
      const response = await axios.head(url, { timeout: 10000 })
      const duration = Date.now() - start

      results.push({
        attempt: i + 1,
        status: response.status,
        duration,
        success: true
      })

    } catch (error) {
      results.push({
        attempt: i + 1,
        status: error.response?.status || 0,
        error: error.message,
        success: false
      })
    }

    if (i < attempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return {
    url,
    results,
    successRate: results.filter(r => r.success).length / attempts,
    averageDuration: results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.success).length || 0
  }
}
```

## Verification

### Automated Checks

- Inspect the final rendered HTML in the browser or page source to confirm the rule is satisfied.
- Validate the affected markup with browser tooling or an HTML validator where appropriate.
- Test one representative route or template that uses the pattern.
- Re-check shared components that emit the same markup so the fix is consistent.

### Manual Checks

- Verify the rendered browser behavior manually on representative routes and supported browsers so the user-facing outcome matches the rule.