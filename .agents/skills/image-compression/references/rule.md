# Compress images without quality loss

> All images are compressed without significant quality loss to reduce file sizes.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
Image compression reduces file sizes significantly with minimal visual quality loss.

## Code Example

```bash
# ImageMagick - JPEG compression
convert input.jpg -quality 80 output.jpg

# Sharp CLI - WebP conversion with quality
npx sharp-cli input.jpg -o output.webp --quality 80

# pngquant - lossy PNG compression
pngquant --quality=65-80 input.png

# svgo - SVG optimization
npx svgo input.svg -o output.svg
```

## Why It Matters

Uncompressed images are often 5-10x larger than needed—proper compression dramatically reduces page weight and load times with minimal visual impact.

## Quality Guidelines

| Image Type | Format | Recommended Quality |
|------------|--------|---------------------|
| Photos | JPEG/WebP | 70-85% |
| Product images | JPEG/WebP | 80-90% |
| Screenshots | PNG/WebP | Lossless or 90%+ |
| Icons/logos | SVG/PNG | Lossless |
| Thumbnails | JPEG/WebP | 60-75% |

## Sharp (Node.js) Automation

```javascript
const sharp = require('sharp')

async function compressImage(inputPath, outputPath, options = {}) {
  const { quality = 80, format = 'webp' } = options

  await sharp(inputPath)
    [format]({ quality })
    .toFile(outputPath)
}

// Batch processing
async function compressDirectory(inputDir, outputDir) {
  const files = fs.readdirSync(inputDir)

  for (const file of files) {
    if (/\.(jpg|jpeg|png)$/i.test(file)) {
      await compressImage(
        path.join(inputDir, file),
        path.join(outputDir, file.replace(/\.[^.]+$/, '.webp'))
      )
    }
  }
}
```

## Webpack Configuration

```javascript
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin')

module.exports = {
  optimization: {
    minimizer: [
      new ImageMinimizerPlugin({
        minimizer: {
          implementation: ImageMinimizerPlugin.sharpMinify,
          options: {
            encodeOptions: {
              jpeg: { quality: 80 },
              webp: { quality: 80 },
              png: { quality: 80 },
              avif: { quality: 60 }
            }
          }
        }
      })
    ]
  }
}
```

## Vite Configuration

```javascript
// vite.config.js

  plugins: [
    viteImagemin({
      gifsicle: { optimizationLevel: 3 },
      optipng: { optimizationLevel: 5 },
      mozjpeg: { quality: 80 },
      webp: { quality: 80 },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false }
        ]
      }
    })
  ]
}
```

## React Build Script

```javascript
// scripts/optimize-images.js
const sharp = require('sharp')
const glob = require('glob')
const path = require('path')

const INPUT_DIR = 'public/images'
const OUTPUT_DIR = 'public/images/optimized'

async function optimizeImages() {
  const files = glob.sync(`${INPUT_DIR}/**/*.{jpg,jpeg,png}`)

  for (const file of files) {
    const relativePath = path.relative(INPUT_DIR, file)
    const outputPath = path.join(OUTPUT_DIR, relativePath)

    // Create WebP version
    await sharp(file)
      .webp({ quality: 80 })
      .toFile(outputPath.replace(/\.[^.]+$/, '.webp'))

    // Create optimized original format
    await sharp(file)
      .jpeg({ quality: 80, progressive: true })
      .toFile(outputPath)

    console.log(`Optimized: ${relativePath}`)
  }
}

optimizeImages()
```

## Online Tools Comparison

| Tool | Best For | Compression Type |
|------|----------|-----------------|
| TinyPNG | PNG/JPEG | Lossy |
| Squoosh | All formats | Lossy/lossless |
| ImageOptim | Mac batch | Lossless |
| SVGOMG | SVG | Lossless |
| Compressor.io | Quick online | Lossy |

## Measuring Compression Results

```javascript
// Compare file sizes
const fs = require('fs')

function getCompressionStats(originalPath, compressedPath) {
  const originalSize = fs.statSync(originalPath).size
  const compressedSize = fs.statSync(compressedPath).size
  const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1)

  return {
    original: `${(originalSize / 1024).toFixed(1)} KB`,
    compressed: `${(compressedSize / 1024).toFixed(1)} KB`,
    savings: `${savings}%`
  }
}
```

## GitHub Actions Automation

```yaml
# .github/workflows/optimize-images.yml
name: Optimize Images

on:
  push:
    paths:
      - 'public/images/**'

jobs:
  optimize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: calibreapp/image-actions@main
        with:
          githubToken: ${{ secrets.GITHUB_TOKEN }}
          jpegQuality: '80'
          pngQuality: '80'
          webpQuality: '80'
```

## Standards

- Use these references as the standard for the final image format, delivery, accessibility, and rendering behavior.
- Check the implementation against MDN: Responsive images before treating the rule as satisfied.
- Check the implementation against web.dev: Image performance before treating the rule as satisfied.

## Verification

### Automated Checks

- Check file sizes in DevTools Network tab
- Run Lighthouse—check "Efficiently encode images" audit
- Test on different screen sizes and densities

### Manual Checks

- Compare original and compressed images side-by-side
- Verify compression doesn't create visible artifacts