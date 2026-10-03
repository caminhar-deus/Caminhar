# Optimize web font formats

> Web fonts use modern formats (WOFF2, WOFF) with proper fallbacks and loading strategies.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
Modern web font formats (WOFF2, WOFF) provide better compression and performance compared to legacy formats, with universal browser support and optimized loading strategies.

## Code Examples

### Format Comparison
```css
/* Font format hierarchy (best to fallback) */
@font-face {
  font-family: 'MyFont';
  src: url('fonts/myfont.woff2') format('woff2'),    /* Best: ~30% smaller than WOFF */
       url('fonts/myfont.woff') format('woff'),      /* Good: Universal support */
       url('fonts/myfont.ttf') format('truetype');   /* Fallback: Larger file size */

  font-display: swap; /* Improve loading performance */
  font-weight: 400;
  font-style: normal;
}

/* ❌ Avoid legacy formats */
@font-face {
  font-family: 'LegacyFont';
  src: url('fonts/font.eot'), /* Internet Explorer only */
       url('fonts/font.svg') format('svg'); /* iOS Safari 4.1- */
}
```

### File Size Comparison
```bash
# Typical font file sizes:
# Original TTF: 180KB
# WOFF: 120KB (33% reduction)
# WOFF2: 95KB (47% reduction from TTF, 21% from WOFF)
```

## Why It Matters

Modern font formats reduce file sizes by 30-50%—directly improving page load speed and Core Web Vitals scores.

## Optimal Font Loading Implementation

### Basic Font Face Declaration
```css
/* fonts.css */
@font-face {
  font-family: 'Inter';
  src: url('./fonts/Inter-Regular.woff2') format('woff2'),
       url('./fonts/Inter-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('./fonts/Inter-Medium.woff2') format('woff2'),
       url('./fonts/Inter-Medium.woff') format('woff');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('./fonts/Inter-Bold.woff2') format('woff2'),
       url('./fonts/Inter-Bold.woff') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

/* Usage */
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-weight: 400;
}

h1, h2, h3 {
  font-weight: 700;
}

.medium-text {
  font-weight: 500;
}
```

### Variable Fonts
```css
/* Variable font - single file for all weights */
@font-face {
  font-family: 'InterVariable';
  src: url('./fonts/Inter-Variable.woff2') format('woff2');
  font-weight: 100 900; /* Weight range */
  font-style: normal;
  font-display: swap;
}

/* Usage with continuous weight values */
.light { font-weight: 300; }
.regular { font-weight: 400; }
.medium { font-weight: 500; }
.semibold { font-weight: 600; }
.bold { font-weight: 700; }
.extrabold { font-weight: 800; }

/* Animate font weight */
.interactive-text {
  font-weight: 400;
  transition: font-weight 0.3s ease;
}

.interactive-text:hover {
  font-weight: 600;
}
```

### Font Display Strategies
```css
/* Different font-display values */

/* Option 1: swap (recommended for most cases) */
@font-face {
  font-family: 'MyFont';
  src: url('font.woff2') format('woff2');
  font-display: swap; /* Show fallback immediately, swap when loaded */
}

/* Option 2: optional (for non-critical fonts) */
@font-face {
  font-family: 'DecorationFont';
  src: url('decoration.woff2') format('woff2');
  font-display: optional; /* Only use if loads within 100ms */
}

/* Option 3: fallback (balanced approach) */
@font-face {
  font-family: 'BalancedFont';
  src: url('font.woff2') format('woff2');
  font-display: fallback; /* 100ms invisible period, 3s swap period */
}

/* Option 4: block (traditional behavior) */
@font-face {
  font-family: 'CriticalFont';
  src: url('font.woff2') format('woff2');
  font-display: block; /* 3s invisible period, then swap */
}
```

## Font Loading Optimization

### Preloading Critical Fonts
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Font Optimization</title>

  <!-- Preload critical fonts -->
  <link rel="preload" href="/fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/Inter-Bold.woff2" as="font" type="font/woff2" crossorigin>

  <!-- Preconnect to external font services -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- Load fonts CSS -->
  <link rel="stylesheet" href="/css/fonts.css">
</head>
<body>
  <h1>Optimized Font Loading</h1>
  <p>Body text with optimized font delivery</p>
</body>
</html>
```

### CSS Font Loading API
```javascript
// font-loader.js - Progressive font enhancement
class FontLoader {
  constructor() {
    this.fonts = new Map()
    this.loadedFonts = new Set()
  }

  async loadFont(family, url, weight = '400', style = 'normal') {
    if (this.loadedFonts.has(`${family}-${weight}-${style}`)) {
      return Promise.resolve()
    }

    const fontFace = new FontFace(family, `url(${url})`, {
      weight,
      style,
      display: 'swap'
    })

    try {
      const loadedFont = await fontFace.load()
      document.fonts.add(loadedFont)
      this.loadedFonts.add(`${family}-${weight}-${style}`)

      // Add loaded class for CSS hooks
      document.documentElement.classList.add(`${family.toLowerCase()}-loaded`)

      return loadedFont
    } catch (error) {
      console.warn(`Failed to load font ${family}:`, error)
      throw error
    }
  }

  async loadFontFamily(family, variants) {
    const loadPromises = variants.map(variant =>
      this.loadFont(family, variant.url, variant.weight, variant.style)
    )

    try {
      await Promise.all(loadPromises)
      document.documentElement.classList.add(`${family.toLowerCase()}-family-loaded`)
    } catch (error) {
      console.warn(`Some fonts in ${family} family failed to load`)
    }
  }

  // Load fonts with timeout
  async loadWithTimeout(family, url, timeout = 3000) {
    return Promise.race([
      this.loadFont(family, url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Font load timeout')), timeout)
      )
    ])
  }
}

// Usage
const fontLoader = new FontLoader()

// Load individual font
fontLoader.loadFont('Inter', '/fonts/Inter-Regular.woff2')
  .then(() => console.log('Inter Regular loaded'))
  .catch(() => console.log('Inter Regular failed to load'))

// Load font family
fontLoader.loadFontFamily('Inter', [
  { url: '/fonts/Inter-Regular.woff2', weight: '400' },
  { url: '/fonts/Inter-Medium.woff2', weight: '500' },
  { url: '/fonts/Inter-Bold.woff2', weight: '700' }
])

// Progressive enhancement with CSS
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await fontLoader.loadWithTimeout('Inter', '/fonts/Inter-Regular.woff2')
    // Font loaded, enhance typography
    document.body.style.fontFamily = 'Inter, system-ui, sans-serif'
  } catch (error) {
    // Use system fonts as fallback
    console.log('Using system fonts')
  }
})
```

### CSS Progressive Enhancement
```css
/* Default system fonts */
body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-weight: 400;
  line-height: 1.6;
}

/* Enhanced typography when custom fonts load */
.inter-loaded body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-feature-settings: 'kern' 1, 'liga' 1;
  font-variant-numeric: oldstyle-nums;
}

/* Prevent layout shift during font swap */
.inter-family-loaded h1,
.inter-family-loaded h2,
.inter-family-loaded h3 {
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* Loading states */
.font-loading {
  visibility: hidden;
}

.font-loaded {
  visibility: visible;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## Framework Integration

### React Font Loading
```jsx
// hooks/useFont.js

  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadFont = async () => {
      try {
        const fontFace = new FontFace(fontFamily, `url(${fontUrl})`, {
          weight: options.weight || '400',
          style: options.style || 'normal',
          display: options.display || 'swap'
        })

        await fontFace.load()
        document.fonts.add(fontFace)
        setIsLoaded(true)
      } catch (err) {
        setError(err)
        console.warn(`Failed to load font ${fontFamily}:`, err)
      }
    }

    // Check if font is already loaded
    if (document.fonts.check(`1em ${fontFamily}`)) {
      setIsLoaded(true)
    } else {
      loadFont()
    }
  }, [fontFamily, fontUrl, options])

  return { isLoaded, error }
}

// components/FontProvider.jsx

const FontContext = createContext({ fontsLoaded: false })

  const inter400 = useFont('Inter', '/fonts/Inter-Regular.woff2')
  const inter700 = useFont('Inter', '/fonts/Inter-Bold.woff2', { weight: '700' })

  const fontsLoaded = inter400.isLoaded && inter700.isLoaded

  return (
    
        {children}
      </div>
    </FontContext.Provider>
  )
}

// components/Typography.jsx

  const { fontsLoaded } = useFontContext()

  const styles = {
    body: {
      fontFamily: fontsLoaded
        ? 'Inter, system-ui, sans-serif'
        : 'system-ui, -apple-system, sans-serif',
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 1.6
    },
    heading: {
      fontFamily: fontsLoaded
        ? 'Inter, system-ui, sans-serif'
        : 'system-ui, -apple-system, sans-serif',
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em'
    }
  }

  return (
    <div style={styles[variant]} {...props}>
      {children}
    </div>
  )
}
```

### Next.js Font Optimization
```javascript
// next.config.js
module.exports = {
  optimizeFonts: true, // Enable built-in font optimization

  webpack(config) {
    // Optimize font loading
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/,
      use: {
        loader: 'url-loader',
        options: {
          limit: 8192,
          name: 'static/fonts/[name].[ext]',
          publicPath: '/_next/'
        }
      }
    })

    return config
  }
}

// pages/_app.js with Next.js 13+ Font API

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

  return (
    <div className={inter.variable}>
      
    </div>
  )
}

// Or with local fonts

const customFont = localFont({
  src: [
    {
      path: './fonts/MyFont-Regular.woff2',
      weight: '400',
      style: 'normal'
    },
    {
      path: './fonts/MyFont-Bold.woff2',
      weight: '700',
      style: 'normal'
    }
  ],
  variable: '--font-custom',
  display: 'swap'
})
```

### Vue.js Font Loading
```vue
<!-- FontLoader.vue -->
<template>
  <div :class="{ 'fonts-loaded': fontsLoaded }">
    <slot :fonts-loaded="fontsLoaded" />
  </div>
</template>

<script>

  name: 'FontLoader',

  data() {
    return {
      fontsLoaded: false,
      fonts: [
        { family: 'Inter', url: '/fonts/Inter-Regular.woff2', weight: '400' },
        { family: 'Inter', url: '/fonts/Inter-Bold.woff2', weight: '700' }
      ]
    }
  },

  async mounted() {
    await this.loadFonts()
  },

  methods: {
    async loadFonts() {
      try {
        const loadPromises = this.fonts.map(font => this.loadFont(font))
        await Promise.all(loadPromises)
        this.fontsLoaded = true
        this.$emit('fonts-loaded')
      } catch (error) {
        console.warn('Some fonts failed to load:', error)
      }
    },

    async loadFont({ family, url, weight = '400', style = 'normal' }) {
      const fontFace = new FontFace(family, `url(${url})`, { weight, style })
      const loadedFont = await fontFace.load()
      document.fonts.add(loadedFont)
      return loadedFont
    }
  }
}
</script>

<style scoped>
.fonts-loaded {
  font-family: 'Inter', system-ui, sans-serif;
  font-feature-settings: 'kern' 1, 'liga' 1;
}
</style>

<!-- Usage in App.vue -->
<template>
  
    <template #default="{ fontsLoaded }">
      <main :class="{ 'enhanced-typography': fontsLoaded }">
        <h1>My App</h1>
        <p>Content with optimized fonts</p>
      </main>
    </template>
  
</template>
```

## Font Conversion and Optimization

### Converting Font Formats
```bash
# Install fonttools for font conversion
pip install fonttools brotli

# Convert TTF to WOFF2
pyftsubset font.ttf --output-file=font.woff2 --flavor=woff2

# Convert TTF to WOFF
pyftsubset font.ttf --output-file=font.woff --flavor=woff

# Subset fonts (include only needed characters)
pyftsubset font.ttf \
  --output-file=font-subset.woff2 \
  --flavor=woff2 \
  --unicodes=U+0020-007F,U+00A0-00FF,U+2000-206F \
  --layout-features='kern,liga'

# Using fontforge (alternative tool)
fontforge -script convert-fonts.pe
```

### Font Subsetting Script
```python
# subset-fonts.py
from fontTools import subset

def subset_font(input_path, output_path, characters=None):
    """
    Subset a font file to include only specified characters
    """
    if characters is None:
        # Default to Latin characters
        characters = list(range(0x20, 0x7F)) + list(range(0xA0, 0xFF))

    options = subset.Options()
    options.flavor = 'woff2'
    options.with_zopfli = True  # Better compression

    font = subset.load_font(input_path, options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=characters)
    subsetter.subset(font)

    subset.save_font(font, output_path, options)

    # Get file sizes for comparison
    import os
    original_size = os.path.getsize(input_path)
    subset_size = os.path.getsize(output_path)
    reduction = ((original_size - subset_size) / original_size) * 100

    print(f"Original: {original_size} bytes")
    print(f"Subset: {subset_size} bytes")
    print(f"Reduction: {reduction:.1f}%")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python subset-fonts.py input.ttf output.woff2")
        sys.exit(1)

    subset_font(sys.argv[1], sys.argv[2])
```

### Automated Font Optimization
```javascript
// build-fonts.js
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

class FontOptimizer {
  constructor(inputDir, outputDir) {
    this.inputDir = inputDir
    this.outputDir = outputDir
    this.formats = ['woff2', 'woff']
  }

  async optimizeAllFonts() {
    const fontFiles = fs.readdirSync(this.inputDir)
      .filter(file => file.endsWith('.ttf') || file.endsWith('.otf'))

    for (const fontFile of fontFiles) {
      await this.optimizeFont(fontFile)
    }
  }

  async optimizeFont(fontFile) {
    const inputPath = path.join(this.inputDir, fontFile)
    const baseName = path.basename(fontFile, path.extname(fontFile))

    for (const format of this.formats) {
      const outputPath = path.join(this.outputDir, `${baseName}.${format}`)

      await this.convertFont(inputPath, outputPath, format)
      await this.subsetFont(outputPath)
    }
  }

  convertFont(inputPath, outputPath, format) {
    return new Promise((resolve, reject) => {
      const args = [
        inputPath,
        '--output-file=' + outputPath,
        '--flavor=' + format
      ]

      const process = spawn('pyftsubset', args)

      process.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Font conversion failed with code ${code}`))
        }
      })
    })
  }

  async subsetFont(fontPath) {
    // Subset to common Latin characters
    const unicodes = 'U+0020-007F,U+00A0-00FF'
    const tempPath = fontPath + '.temp'

    return new Promise((resolve, reject) => {
      const args = [
        fontPath,
        '--output-file=' + tempPath,
        '--unicodes=' + unicodes,
        '--layout-features=kern,liga'
      ]

      const process = spawn('pyftsubset', args)

      process.on('close', (code) => {
        if (code === 0) {
          fs.renameSync(tempPath, fontPath)
          resolve()
        } else {
          reject(new Error(`Font subsetting failed with code ${code}`))
        }
      })
    })
  }

  async generateCSS() {
    const fontFiles = fs.readdirSync(this.outputDir)
      .filter(file => file.endsWith('.woff2'))

    let css = '/* Auto-generated font declarations */\n\n'

    fontFiles.forEach(file => {
      const baseName = path.basename(file, '.woff2')
      const [family, weight] = this.parseFontName(baseName)

      css += `@font-face {\n`
      css += `  font-family: '${family}';\n`
      css += `  src: url('./fonts/${baseName}.woff2') format('woff2'),\n`
      css += `       url('./fonts/${baseName}.woff') format('woff');\n`
      css += `  font-weight: ${weight};\n`
      css += `  font-style: normal;\n`
      css += `  font-display: swap;\n`
      css += `}\n\n`
    })

    fs.writeFileSync(path.join(this.outputDir, 'fonts.css'), css)
    console.log('Generated fonts.css')
  }

  parseFontName(baseName) {
    // Simple parsing - customize based on your naming convention
    if (baseName.includes('Bold')) return [baseName.replace('-Bold', ''), '700']
    if (baseName.includes('Medium')) return [baseName.replace('-Medium', ''), '500']
    return [baseName.replace('-Regular', ''), '400']
  }
}

// Usage
const optimizer = new FontOptimizer('./src/fonts-src', './public/fonts')
optimizer.optimizeAllFonts()
  .then(() => optimizer.generateCSS())
  .then(() => console.log('Font optimization complete'))
  .catch(console.error)
```

## Performance Monitoring

### Font Loading Performance
```javascript
// font-performance.js
class FontPerformanceMonitor {
  constructor() {
    this.metrics = {}
    this.observer = null
  }

  startMonitoring() {
    // Monitor font loading with Performance Observer
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'measure' && entry.name.includes('font')) {
            this.metrics[entry.name] = {
              duration: entry.duration,
              startTime: entry.startTime
            }
          }
        })
      })

      this.observer.observe({ entryTypes: ['measure'] })
    }

    // Monitor font loading via Font Loading API
    if (document.fonts) {
      document.fonts.addEventListener('loadingstart', this.onFontLoadStart.bind(this))
      document.fonts.addEventListener('loadingdone', this.onFontLoadDone.bind(this))
      document.fonts.addEventListener('loadingerror', this.onFontLoadError.bind(this))
    }
  }

  onFontLoadStart(event) {
    performance.mark(`font-load-start-${event.fontface.family}`)
  }

  onFontLoadDone(event) {
    const fontFamily = event.fontface.family
    performance.mark(`font-load-end-${fontFamily}`)
    performance.measure(
      `font-load-${fontFamily}`,
      `font-load-start-${fontFamily}`,
      `font-load-end-${fontFamily}`
    )
  }

  onFontLoadError(event) {
    console.error('Font load error:', event.fontface.family, event.error)
  }

  getMetrics() {
    return {
      ...this.metrics,
      fontLoadingStatus: document.fonts?.status || 'unknown',
      loadedFonts: document.fonts?.size || 0
    }
  }

  generateReport() {
    const metrics = this.getMetrics()

    console.group('Font Performance Report')
    console.log('Loading Status:', metrics.fontLoadingStatus)
    console.log('Loaded Fonts:', metrics.loadedFonts)

    Object.entries(metrics).forEach(([name, data]) => {
      if (name.startsWith('font-load-') && typeof data === 'object') {
        console.log(`${name}: ${data.duration.toFixed(2)}ms`)
      }
    })

    console.groupEnd()
    return metrics
  }
}

// Usage
const fontMonitor = new FontPerformanceMonitor()
fontMonitor.startMonitoring()

// Generate report after fonts load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    fontMonitor.generateReport()
  }, 3000) // Wait for fonts to load
})
```

## Best Practices

1. **Use Modern Formats**: Prioritize WOFF2, then WOFF, with TTF as fallback
2. **Font Display**: Use `font-display: swap` for better perceived performance
3. **Preload Critical Fonts**: Preload fonts used above-the-fold
4. **Subset Fonts**: Remove unused characters to reduce file sizes
5. **Variable Fonts**: Consider variable fonts for multiple weights/styles
6. **System Font Fallbacks**: Provide good fallback fonts
7. **Progressive Enhancement**: Enhance typography after fonts load
8. **Performance Monitoring**: Track font loading performance
9. **Caching Strategy**: Implement proper caching headers for fonts
10. **Testing**: Test font loading across different network conditions

## Browser Support

- **WOFF2**: 96%+ browser support (all modern browsers)
- **WOFF**: 98%+ browser support (universal support)
- **TTF/OTF**: 99%+ browser support (fallback format)

Modern browsers all support WOFF2 and WOFF formats, making legacy formats like EOT and SVG unnecessary for new projects.

## Verification

### Automated Checks

- Confirm the computed styles match the intended fix in DevTools.
- If the rule affects motion, contrast, or layout stability, verify those user-facing outcomes directly.

### Manual Checks

- Inspect the rendered UI at the breakpoints and interaction states affected by the rule.
- Test at least one mobile and one desktop viewport before shipping.