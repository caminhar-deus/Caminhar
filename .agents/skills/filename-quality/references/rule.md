# Use descriptive image filenames

> Image filenames are descriptive and human-readable, using lowercase letters, hyphens as separators, and meaningful words that reflect the image content.

**Priority:** low · **Difficulty:** beginner · **Time:** 10 min

---
Image filenames are a low-effort SEO signal that Google uses alongside alt text and page content to understand image relevance.
## Code Example

```
❌ Bad filenames:
  IMG_4532.jpg          — camera default, meaningless
  image1.jpg            — generic, no context
  photo.png             — generic, no context
  Screenshot 2024.png   — spaces cause URL encoding (%20)
  hero_image_final.jpg  — underscores, and "final" is noise
  HeroImage.jpg         — mixed case

✅ Good filenames:
  homepage-hero-team-meeting.jpg
  product-red-leather-wallet-front.jpg
  blog-post-css-grid-layout-example.png
  logo.svg              — short is fine when context is clear
  author-jane-doe-headshot.jpg
```

## Why It Matters

Google explicitly recommends descriptive filenames in its Image SEO best practices. A file named red-leather-wallet.jpg gives search engines context about the image content, improving discoverability in image search. Generic filenames waste this SEO signal. Descriptive names also help developers maintain large asset libraries without opening every file to identify its content.

## Naming Rules

1. **Lowercase only** — avoids case-sensitivity issues on Linux servers and URL encoding problems
2. **Hyphens as separators** — hyphens are treated as word separators by Google; underscores are not
3. **Descriptive and specific** — include subject, colour, and context where useful
4. **Concise** — 3–5 meaningful words; omit filler like "final", "v2", "new"
5. **No spaces** — spaces become `%20` in URLs and cause issues in some tools

## When to Rename vs When Not To

```
✅ Always rename:
  - Camera defaults (IMG_*, DSC_*, DCIM_*)
  - Generic names (image.jpg, photo.jpg, pic.png)
  - Names with spaces or special characters

⚠️  Use judgment:
  - Auto-generated asset names from CMS systems (may break references)
  - Hashed filenames used for cache-busting (e.g., hero.a3b4c5.jpg)
    → These are fine; the original source file should still have a good name

✅ Leave unchanged:
  - Hashed build output filenames
  - Filenames controlled by a third-party CDN
```

## Batch Renaming Script

```bash
#!/bin/bash
# Rename images in a directory: lowercase, replace spaces/underscores with hyphens
# Usage: ./rename-images.sh ./public/images

DIR="${1:-.}"

find "$DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" \) | while read -r file; do
  dir=$(dirname "$file")
  base=$(basename "$file")

  # Lowercase, replace spaces and underscores with hyphens, remove consecutive hyphens
  newbase=$(echo "$base" | tr '[:upper:]' '[:lower:]' | tr ' _' '-' | sed 's/--*/-/g')

  if [ "$base" != "$newbase" ]; then
    echo "Renaming: $base → $newbase"
    mv "$file" "$dir/$newbase"
  fi
done
```

## Updating References After Rename

When renaming images, update all references in HTML, CSS, and JavaScript.

```bash
# Find all references to a renamed file across the project
grep -r "old-filename.jpg" ./src ./public --include="*.{html,css,js,ts,tsx,jsx,vue}"

# Then replace (macOS/Linux with sed)
find ./src ./public -type f \( -name "*.html" -o -name "*.css" -o -name "*.tsx" \) \
  -exec sed -i '' 's/old-filename\.jpg/new-descriptive-name\.jpg/g' {} +
```

## CMS and Dynamic Image Names

For user-uploaded images in a CMS, implement server-side sanitisation at upload time.

```typescript
// Sanitise uploaded filenames on the server
function sanitiseFilename(original: string): string {
  const ext = original.split('.').pop()?.toLowerCase() ?? ''
  const name = original
    .replace(/\.[^/.]+$/, '')   // remove extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')     // trim leading/trailing hyphens

  return `${name}.${ext}`
}

// Examples:
sanitiseFilename('My Photo (1).JPG')     // → 'my-photo-1.jpg'
sanitiseFilename('IMG_4532.jpg')         // → 'img-4532.jpg' (still generic—prompt users for better names)
sanitiseFilename('product shot FINAL.png') // → 'product-shot-final.png'
```

For user-uploaded product images in e-commerce, consider appending a product slug or ID to the filename automatically: `${product-slug}-${uuid}.jpg`. This keeps filenames meaningful and unique without requiring users to rename files manually.

## Standards

- Use these references as the standard for the final image format, delivery, accessibility, and rendering behavior.
- Check the implementation against MDN: Responsive images before treating the rule as satisfied.
- Check the implementation against web.dev: Image performance before treating the rule as satisfied.

## Verification

### Automated Checks

- Verify transfer size, intrinsic size, and loading strategy in DevTools.

### Manual Checks

- Inspect rendered markup and network requests to confirm the correct image variant is served.
- Re-check LCP or CLS if the changed image is above the fold.
- Compare visual output on mobile and retina displays before shipping.