# Include a print stylesheet

> A print stylesheet is provided and correctly optimized for printed pages.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 30 min

---
A print stylesheet ensures web content is properly formatted when printed, removing digital-only elements and optimizing typography and layout for physical media.

## Code Examples

### HTML Link Tag
```html
<!-- Method 1: Separate print stylesheet -->
<link rel="stylesheet" href="print.css" media="print">

<!-- Method 2: All styles in one file -->
<link rel="stylesheet" href="styles.css">

<!-- Method 3: Combined with screen styles -->
<link rel="stylesheet" href="main.css" media="screen, print">
```

### CSS Media Query
```css
/* Method 1: Separate print styles */
@media print {
  /* Print-specific styles here */
}

/* Method 2: Import print styles */
@import url('print.css') print;

/* Method 3: Screen vs Print comparison */
@media screen {
  .print-only { display: none; }
}

@media print {
  .screen-only { display: none; }
  .print-only { display: block; }
}
```

## Why It Matters

Print stylesheets ensure content is readable when printed—removing digital clutter and optimizing for paper saves ink and improves accessibility.

## Complete Print Stylesheet

### Essential Print CSS
```css
/* print.css */
@media print {
  /* Reset and base styles */
  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html {
    font-size: 12pt;
    line-height: 1.4;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.4;
    color: #000;
    background: #fff;
  }

  /* Page setup */
  @page {
    margin: 2cm;
    size: A4;

    @top-left {
      content: "Company Name";
      font-size: 10pt;
      color: #666;
    }

    @top-right {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 10pt;
      color: #666;
    }

    @bottom-center {
      content: attr(title);
      font-size: 10pt;
      color: #666;
    }
  }

  /* Typography */
  h1, h2, h3, h4, h5, h6 {
    color: #000;
    page-break-after: avoid;
    break-after: avoid;
    font-weight: bold;
    margin-top: 0;
  }

  h1 { font-size: 18pt; margin-bottom: 12pt; }
  h2 { font-size: 16pt; margin-bottom: 10pt; }
  h3 { font-size: 14pt; margin-bottom: 8pt; }
  h4 { font-size: 12pt; margin-bottom: 6pt; }

  p {
    margin: 0 0 6pt 0;
    orphans: 3;
    widows: 3;
  }

  /* Lists */
  ul, ol {
    margin: 0 0 6pt 18pt;
    padding: 0;
  }

  li {
    margin-bottom: 3pt;
  }

  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 12pt;
    page-break-inside: avoid;
  }

  th, td {
    border: 1pt solid #000;
    padding: 4pt;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f0f0f0;
    font-weight: bold;
  }

  /* Images */
  img {
    max-width: 100%;
    height: auto;
    page-break-inside: avoid;
  }

  /* Links */
  a {
    color: #000;
    text-decoration: underline;
  }

  a[href]:after {
    content: " (" attr(href) ")";
    font-size: 10pt;
    color: #666;
  }

  a[href^="mailto:"]:after {
    content: " (" attr(href) ")";
  }

  a[href^="tel:"]:after {
    content: " (" attr(href) ")";
  }

  /* Hide digital-only elements */
  .no-print,
  .screen-only,
  nav,
  .navigation,
  .sidebar,
  .ads,
  .advertisement,
  .social-media,
  .share-buttons,
  .comments,
  .footer-links,
  .breadcrumbs,
  .pagination,
  .search-form,
  .filters,
  .toolbar,
  .modal,
  .popup,
  .tooltip,
  .dropdown,
  .carousel-controls,
  .video-controls,
  button[type="submit"],
  input[type="button"],
  input[type="submit"],
  .btn,
  .button {
    display: none !important;
  }

  /* Show print-only elements */
  .print-only {
    display: block !important;
  }

  /* Page breaks */
  .page-break-before {
    page-break-before: always;
    break-before: page;
  }

  .page-break-after {
    page-break-after: always;
    break-after: page;
  }

  .page-break-inside-avoid {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Article/content specific */
  article,
  .content,
  .main-content {
    width: 100%;
    margin: 0;
    padding: 0;
    float: none;
  }

  /* Footer adjustments */
  footer {
    border-top: 1pt solid #ccc;
    padding-top: 6pt;
    margin-top: 12pt;
    font-size: 10pt;
  }
}
```

## Framework-Specific Implementation

### React Print Component
```jsx
// components/PrintStyles.jsx

function PrintStyles() {
  useEffect(() => {
    // Inject print styles dynamically
    const printStyles = `
      @media print {
        .no-print { display: none !important; }
        .print-only { display: block !important; }

        body { font-size: 12pt; }
        h1 { font-size: 18pt; }
        h2 { font-size: 16pt; }

        @page {
          margin: 2cm;
          size: A4;
        }
      }
    `

    const styleSheet = document.createElement('style')
    styleSheet.type = 'text/css'
    styleSheet.innerText = printStyles
    styleSheet.media = 'print'
    document.head.appendChild(styleSheet)

    return () => {
      document.head.removeChild(styleSheet)
    }
  }, [])

  return null
}

// components/PrintWrapper.jsx
function PrintWrapper({ children, title }) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="print-wrapper">
      <div className="no-print print-controls">
        <button onClick={handlePrint} className="btn btn-print">
          🖨️ Print this page
        </button>
      </div>

      <div className="print-content">
        <header className="print-only print-header">
          <h1>{title}</h1>
          <p>Printed on: {new Date().toLocaleDateString()}</p>
        </header>

        {children}

        <footer className="print-only print-footer">
          <p>© 2025 Company Name. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}

// Usage
function ArticlePage() {
  return (
    
      

      <article>
        <h1>Article Title</h1>
        <p>Article content...</p>

        <div className="no-print social-sharing">
          <button>Share on Twitter</button>
          <button>Share on Facebook</button>
        </div>

        <div className="print-only">
          <p>Visit our website at: https://example.com</p>
        </div>
      </article>
    
  )
}
```

### Next.js Print Implementation
```jsx
// pages/_document.js

  return (
    
      
        <link rel="stylesheet" href="/css/print.css" media="print" />
      
      <body>
        
        
      </body>
    
  )
}

// components/PrintLayout.jsx

function PrintLayout({ children, pageTitle }) {
  const printDate = new Date().toLocaleDateString()

  return (
    <>
      
        <style jsx>{`
          @media print {
            .print-header {
              display: block;
              border-bottom: 1pt solid #000;
              margin-bottom: 12pt;
              padding-bottom: 6pt;
            }

            .print-date {
              font-size: 10pt;
              color: #666;
            }

            @page {
              @top-left {
                content: "${pageTitle}";
              }

              @top-right {
                content: "Page " counter(page);
              }
            }
          }

          @media screen {
            .print-header {
              display: none;
            }
          }
        `}</style>
      

      <div className="print-header">
        <h1>{pageTitle}</h1>
        <p className="print-date">Printed: {printDate}</p>
      </div>

      {children}
    </>
  )
}

// Usage in pages

  return (
    
      <article>
        <h1>{post.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />

        <div className="no-print">
          
          
        </div>
      </article>
    
  )
}
```

### Vue.js Print Directive
```vue
<!-- PrintableContent.vue -->
<template>
  <div class="printable-content">
    <div class="no-print print-controls">
      <button @click="printPage" class="btn-print">
        Print Page
      </button>
    </div>

    <div class="content" v-print-styles>
      <slot />
    </div>

    <div class="print-only print-footer">
      <p>Printed from: {{ currentUrl }}</p>
      <p>Date: {{ printDate }}</p>
    </div>
  </div>
</template>

<script>

  name: 'PrintableContent',

  computed: {
    currentUrl() {
      return window.location.href
    },

    printDate() {
      return new Date().toLocaleDateString()
    }
  },

  methods: {
    printPage() {
      window.print()
    }
  },

  directives: {
    printStyles: {
      inserted(el) {
        // Add print-specific classes
        el.classList.add('print-optimized')
      }
    }
  }
}
</script>

<style>
@media print {
  .print-optimized {
    font-family: 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.4;
  }

  .print-optimized h1 {
    font-size: 18pt;
    margin-bottom: 12pt;
  }

  .print-optimized p {
    margin-bottom: 6pt;
  }
}
</style>
```

## Advanced Print Features

### CSS Page Rules
```css
@media print {
  /* Different page layouts */
  @page :first {
    margin-top: 3cm;

    @top-left {
      content: "";
    }

    @top-center {
      content: "Document Title";
      font-size: 14pt;
      font-weight: bold;
    }
  }

  @page :left {
    margin-left: 3cm;
    margin-right: 2cm;

    @bottom-left {
      content: counter(page);
    }
  }

  @page :right {
    margin-left: 2cm;
    margin-right: 3cm;

    @bottom-right {
      content: counter(page);
    }
  }

  /* Named page layouts */
  @page chapter {
    margin: 3cm;

    @top-center {
      content: "Chapter " counter(chapter);
    }
  }

  @page appendix {
    margin: 2cm;

    @top-center {
      content: "Appendix";
    }
  }

  /* Apply named pages */
  .chapter {
    page: chapter;
    page-break-before: always;
  }

  .appendix {
    page: appendix;
    page-break-before: always;
  }
}
```

### Print-Specific JavaScript
```javascript
// print-handler.js
class PrintHandler {
  constructor() {
    this.beforePrintCallbacks = []
    this.afterPrintCallbacks = []
    this.setupEventListeners()
  }

  setupEventListeners() {
    window.addEventListener('beforeprint', () => {
      this.handleBeforePrint()
    })

    window.addEventListener('afterprint', () => {
      this.handleAfterPrint()
    })

    // For browsers that don't support beforeprint/afterprint
    if (window.matchMedia) {
      const mediaQueryList = window.matchMedia('print')
      mediaQueryList.addEventListener('change', (mql) => {
        if (mql.matches) {
          this.handleBeforePrint()
        } else {
          this.handleAfterPrint()
        }
      })
    }
  }

  handleBeforePrint() {
    // Execute before print callbacks
    this.beforePrintCallbacks.forEach(callback => callback())

    // Common before-print tasks
    this.expandCollapsedSections()
    this.showFullUrls()
    this.addPrintTimestamp()
  }

  handleAfterPrint() {
    // Execute after print callbacks
    this.afterPrintCallbacks.forEach(callback => callback())

    // Restore original state
    this.collapseExpandedSections()
    this.hideFullUrls()
    this.removePrintTimestamp()
  }

  expandCollapsedSections() {
    const collapsible = document.querySelectorAll('.collapsible[data-collapsed="true"]')
    collapsible.forEach(element => {
      element.setAttribute('data-print-expanded', 'true')
      element.setAttribute('data-collapsed', 'false')
    })
  }

  collapseExpandedSections() {
    const printExpanded = document.querySelectorAll('[data-print-expanded="true"]')
    printExpanded.forEach(element => {
      element.setAttribute('data-collapsed', 'true')
      element.removeAttribute('data-print-expanded')
    })
  }

  showFullUrls() {
    const links = document.querySelectorAll('a[href]')
    links.forEach(link => {
      if (!link.textContent.includes(link.href)) {
        const url = document.createElement('span')
        url.className = 'print-url'
        url.textContent = ` (${link.href})`
        link.appendChild(url)
      }
    })
  }

  hideFullUrls() {
    const printUrls = document.querySelectorAll('.print-url')
    printUrls.forEach(url => url.remove())
  }

  addPrintTimestamp() {
    const timestamp = document.createElement('div')
    timestamp.className = 'print-timestamp'
    timestamp.textContent = `Printed: ${new Date().toLocaleString()}`
    document.body.insertBefore(timestamp, document.body.firstChild)
  }

  removePrintTimestamp() {
    const timestamp = document.querySelector('.print-timestamp')
    if (timestamp) {
      timestamp.remove()
    }
  }

  onBeforePrint(callback) {
    this.beforePrintCallbacks.push(callback)
  }

  onAfterPrint(callback) {
    this.afterPrintCallbacks.push(callback)
  }

  print() {
    window.print()
  }
}

// Usage
const printHandler = new PrintHandler()

printHandler.onBeforePrint(() => {
  console.log('Preparing for print...')
  // Custom logic before printing
})

printHandler.onAfterPrint(() => {
  console.log('Print dialog closed')
  // Custom logic after printing
})
```

## Testing Print Styles

### Browser Testing
```javascript
// print-style-tester.js
class PrintStyleTester {
  async testPrintStyles(url) {
    // Create a hidden iframe for testing
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = url
    document.body.appendChild(iframe)

    return new Promise((resolve) => {
      iframe.onload = () => {
        const iframeDoc = iframe.contentDocument
        const printStyles = this.extractPrintStyles(iframeDoc)

        const results = {
          hasPrintStyles: printStyles.length > 0,
          printStylesheets: printStyles,
          hiddenElements: this.findHiddenElements(iframeDoc),
          pageBreaks: this.findPageBreaks(iframeDoc),
          typography: this.analyzeTypography(iframeDoc)
        }

        document.body.removeChild(iframe)
        resolve(results)
      }
    })
  }

  extractPrintStyles(doc) {
    const printStyles = []

    // Check for print media stylesheets
    const links = doc.querySelectorAll('link[rel="stylesheet"][media*="print"]')
    links.forEach(link => {
      printStyles.push({
        type: 'external',
        href: link.href,
        media: link.media
      })
    })

    // Check for @media print in style tags
    const styles = doc.querySelectorAll('style')
    styles.forEach(style => {
      if (style.textContent.includes('@media print')) {
        printStyles.push({
          type: 'inline',
          content: style.textContent
        })
      }
    })

    return printStyles
  }

  findHiddenElements(doc) {
    const hiddenSelectors = [
      '.no-print',
      '.screen-only',
      'nav',
      '.navigation',
      '.sidebar'
    ]

    const hiddenElements = []
    hiddenSelectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector)
      if (elements.length > 0) {
        hiddenElements.push({
          selector,
          count: elements.length
        })
      }
    })

    return hiddenElements
  }

  findPageBreaks(doc) {
    const pageBreakSelectors = [
      '.page-break-before',
      '.page-break-after',
      '.page-break-inside-avoid'
    ]

    const pageBreaks = []
    pageBreakSelectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector)
      if (elements.length > 0) {
        pageBreaks.push({
          selector,
          count: elements.length
        })
      }
    })

    return pageBreaks
  }

  analyzeTypography(doc) {
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const paragraphs = doc.querySelectorAll('p')

    return {
      headings: headings.length,
      paragraphs: paragraphs.length,
      hasSerif: this.checkFontFamily(doc, 'serif'),
      fontSize: this.checkFontSizes(doc)
    }
  }

  checkFontFamily(doc, family) {
    const body = doc.body
    const computedStyle = window.getComputedStyle(body)
    return computedStyle.fontFamily.includes(family)
  }

  checkFontSizes(doc) {
    const body = doc.body
    const computedStyle = window.getComputedStyle(body)
    return {
      body: computedStyle.fontSize,
      root: computedStyle.fontSize
    }
  }
}

// Usage
const tester = new PrintStyleTester()
tester.testPrintStyles('https://example.com').then(results => {
  console.log('Print Style Analysis:', results)
})
```

### Automated Testing with Puppeteer
```javascript
// print-test.js
const puppeteer = require('puppeteer')

async function testPrintStyles(url) {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.goto(url)

  // Generate PDF to test print styles
  const pdf = await page.pdf({
    format: 'A4',
    margin: {
      top: '2cm',
      bottom: '2cm',
      left: '2cm',
      right: '2cm'
    },
    printBackground: true
  })

  // Analyze print styles
  const printAnalysis = await page.evaluate(() => {
    const printStylesheets = Array.from(
      document.querySelectorAll('link[rel="stylesheet"][media*="print"]')
    ).map(link => ({
      href: link.href,
      media: link.media
    }))

    const printMediaQueries = Array.from(document.querySelectorAll('style'))
      .filter(style => style.textContent.includes('@media print'))
      .length

    const hiddenElements = document.querySelectorAll('.no-print, .screen-only').length
    const printOnlyElements = document.querySelectorAll('.print-only').length

    return {
      hasPrintStyles: printStylesheets.length > 0 || printMediaQueries > 0,
      printStylesheets,
      printMediaQueries,
      hiddenElements,
      printOnlyElements
    }
  })

  await browser.close()

  return {
    analysis: printAnalysis,
    pdfGenerated: pdf.length > 0
  }
}

// Usage
testPrintStyles('https://example.com').then(results => {
  console.log('Print Test Results:', results)
})
```

## Best Practices

1. **Always Provide**: Include print styles for all public-facing content
2. **Hide Unnecessary**: Remove navigation, ads, and interactive elements
3. **Optimize Typography**: Use serif fonts and appropriate sizes (12pt)
4. **Page Breaks**: Control where content breaks across pages
5. **URLs in Links**: Show full URLs for external links
6. **Test Regularly**: Verify print styles work across browsers
7. **Performance**: Keep print CSS lightweight and efficient
8. **Accessibility**: Ensure printed content remains accessible

## Common Print CSS Patterns

### Invoice/Receipt Layout
```css
@media print {
  .invoice {
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .invoice-header {
    border-bottom: 2pt solid #000;
    margin-bottom: 12pt;
    padding-bottom: 6pt;
  }

  .invoice-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12pt;
  }

  .invoice-table th,
  .invoice-table td {
    border: 1pt solid #000;
    padding: 6pt;
    text-align: left;
  }

  .invoice-total {
    font-weight: bold;
    font-size: 14pt;
    text-align: right;
    border-top: 2pt solid #000;
    padding-top: 6pt;
  }
}
```

### Article/Blog Post Layout
```css
@media print {
  .article {
    max-width: none;
    margin: 0;
  }

  .article-header {
    margin-bottom: 18pt;
    page-break-after: avoid;
  }

  .article-title {
    font-size: 20pt;
    font-weight: bold;
    margin-bottom: 6pt;
  }

  .article-meta {
    font-size: 10pt;
    color: #666;
    border-bottom: 1pt solid #ccc;
    padding-bottom: 6pt;
  }

  .article-content p {
    text-align: justify;
    margin-bottom: 8pt;
  }

  .article-content blockquote {
    border-left: 2pt solid #000;
    padding-left: 12pt;
    margin: 12pt 0;
    font-style: italic;
  }
}
```

## Verification

### Automated Checks

- Use browser or CI tooling where applicable to verify the fix.

### Manual Checks

- Confirm the rule in the final rendered output or runtime behavior.
- Test one primary path and one edge case affected by the change.
- Re-check shared abstractions so the fix is applied consistently.