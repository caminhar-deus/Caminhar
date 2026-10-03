# Optimise images for faster loading

> All images are compressed and metadata-stripped before deployment, removing unnecessary bytes without visible quality loss.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Image optimisation compresses image data and strips unnecessary metadata before serving files to users. It is distinct from format selection (JPEG vs WebP) and responsive sizing—each reduces file size in different ways.

## Code Example

```javascript
// Sharp (Node.js) — recommended for server-side processing

await sharp('input.jpg')
  .jpeg({
    quality: 80,           // 80 is the sweet spot: minimal visible loss, 40-60% size reduction
    progressive: true,     // Progressive JPEG shows low-res preview while loading
    mozjpeg: true,         // Use mozjpeg encoder for better compression at same quality
  })
  .toFile('output.jpg')
  // Note: sharp strips metadata by default
```

## Why It Matters

Unoptimised images are the most prevalent cause of page bloat. A DSLR-quality JPEG with EXIF data can be 8MB; the same image optimised for web delivery is under 200KB with no visible quality difference. Lighthouse's 'Efficiently encode images' audit reports potential savings that, when fixed, directly improve LCP and reduce bandwidth costs.

## What Optimisation Removes

- **EXIF metadata** — GPS location, camera model, lens, timestamp embedded by cameras (can add 30-60KB per image)
- **IPTC/XMP metadata** — editorial information added by photo editing software
- **ICC colour profiles** — rarely needed for web delivery (a few KB each)
- **Redundant pixel data** — recompression at lower quality removes high-frequency data invisible to the eye
- **SVG editor artefacts** — Inkscape/Illustrator/Figma export adds comments, IDs, and inline styles that serve no purpose in production

## Optimising PNG

```bash
# pngquant: lossy compression, 40-80% size reduction with minimal visible change
pngquant --quality=65-80 --output output.png input.png

# oxipng: lossless compression, 10-20% reduction with zero quality loss
oxipng -o 6 input.png
```

```javascript
// Sharp PNG compression
await sharp('input.png')
  .png({
    compressionLevel: 9,  // 0-9, higher = smaller but slower
    effort: 10,           // 1-10, higher = slower but better compression
    palette: true,        // Enable palette quantisation for PNGs with few colours
    quality: 80,          // Quality when palette is true
  })
  .toFile('output.png')
```

## Optimising SVG

```bash
# SVGO: removes editor metadata, comments, redundant attributes
npx svgo input.svg -o output.svg

# Or process all SVGs in a directory
npx svgo --folder public/icons
```

```javascript
// SVGO configuration (svgo.config.js)
module.exports = {
  plugins: [
    'removeDoctype',
    'removeXMLProcInst',
    'removeComments',
    'removeMetadata',
    'removeEditorsNSData',
    'cleanupAttrs',
    'mergeStyles',
    'inlineStyles',
    'minifyStyles',
    'cleanupIds',
    'removeUselessDefs',
    'cleanupNumericValues',
    'convertColors',
    'removeUnknownsAndDefaults',
    'removeNonInheritableGroupAttrs',
    'removeUselessStrokeAndFill',
    'removeViewBox',         // Set to false if you need responsive SVGs
    'cleanupEnableBackground',
    'convertShapeToPath',
    'convertEllipseToCircle',
    'moveElemsAttrsToGroup',
    'moveGroupAttrsToElems',
    'collapseGroups',
    'convertPathData',
    'convertTransform',
    'removeEmptyAttrs',
    'removeEmptyContainers',
    'mergePaths',
    'removeUnusedNS',
    'sortDefsChildren',
    'removeTitle',
    'removeDesc',
  ],
}
```

## Build Pipeline Integration

```javascript
// vite.config.js — automatic optimisation at build time

  plugins: [
    viteImageOptimizer({
      jpg: { quality: 80, progressive: true },
      jpeg: { quality: 80, progressive: true },
      png: { quality: 80, compressionLevel: 9 },
      webp: { quality: 80, effort: 6 },
      avif: { quality: 60, effort: 6 },
      svg: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeDimensions', active: true },
        ],
      },
    })
  ]
})
```

## Automated CI Check

```javascript
// scripts/check-image-optimisation.mjs
// Fail CI if any image could be reduced by more than 10KB

const images = globSync('public/**/*.{jpg,jpeg,png,gif}')
let failed = false

for (const imgPath of images) {
  try {
    // Use identify (ImageMagick) to check for metadata
    const result = execSync(`identify -verbose "${imgPath}" 2>&1 | grep -i "exif\\|iptc\\|comment"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    if (result.trim()) {
      console.warn(`⚠️  Metadata found in: ${imgPath}`)
      failed = true
    }
  } catch {
    // No metadata found — this is good
  }
}

if (failed) process.exit(1)
```

## Verification

### Automated Checks

- Run Lighthouse — "Efficiently encode images" shows potential savings per image
- Use Chrome DevTools → Network → filter by Img → check Transfer Size column for each image
- Run `exiftool -all= output.jpg` after processing to confirm metadata was stripped

### Manual Checks

- Open each image in Squoosh — compare the original vs compressed side-by-side