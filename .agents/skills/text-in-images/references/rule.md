# Avoid images of text

> Real text is used instead of images containing text, except for logos or when specific visual presentation is essential.

**Priority:** low · **Difficulty:** beginner · **Time:** 15 min

---
Real text is more accessible than images containing text—use HTML and CSS whenever possible.

## Code Examples

```html
<!-- ❌ Bad: Text as image -->
<img src="welcome-banner.png" alt="Welcome to our site">

<!-- ✅ Good: Real text with styling -->
<h1 class="fancy-heading">Welcome to our site</h1>
```

```css
/* Style to match design requirements */
.fancy-heading {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 5vw, 4rem);
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

## Why It Matters

Text in images can't be resized by users with low vision, translated automatically, read by screen readers without alt text, or reflowed when zoomed—real text is always more accessible.

## Problems with Text Images

| Issue | Impact |
|-------|--------|
| Can't resize | Low vision users can't enlarge |
| Can't reflow | Text gets cut off at zoom |
| Can't translate | Auto-translate tools fail |
| Can't customize | Users can't change fonts/colors |
| Can't search | Ctrl+F doesn't find text |
| Slower to load | Images larger than text |

## Styled Text Effects

```css
/* Text shadow for depth */
.hero-title {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

/* Gradient text */
.gradient-text {
  background: linear-gradient(90deg, #ff6b6b, #4ecdc4);
  -webkit-background-clip: text;
  color: transparent;
}

/* Outlined text */
.outline-text {
  -webkit-text-stroke: 2px #333;
  color: transparent;
}

/* Fancy decorative text */
.decorative {
  font-family: 'Great Vibes', cursive;
  font-size: 3rem;
  color: #c9a227;
}
```

## When Text Images Are Acceptable

```html
<!-- ✅ OK: Logo with company name -->
<img src="logo.png" alt="Acme Corporation">

<!-- ✅ OK: Decorative calligraphy that's purely visual -->
<img src="ornamental-text.png" alt="" role="presentation">

<!-- ✅ OK: Screenshot showing text (for documentation) -->
<figure>
  <img src="error-screenshot.png" alt="Error message showing 'File not found'">
  <figcaption>The error message appears when the file is missing.</figcaption>
</figure>
```

## SVG for Scalable Text

```html
<!-- SVG text scales perfectly -->
<svg viewBox="0 0 200 50" aria-labelledby="svg-title">
  <title id="svg-title">Special Offer</title>
  <text x="10" y="35" class="svg-text">Special Offer</text>
</svg>
```

```css
.svg-text {
  font-family: 'Impact', sans-serif;
  font-size: 24px;
  fill: #e74c3c;
  stroke: #c0392b;
  stroke-width: 1px;
}
```

## React Component with Styled Text

```tsx
interface StyledHeadingProps {
  children: React.ReactNode
  variant?: 'gradient' | 'shadow' | 'outline'
  as?: 'h1' | 'h2' | 'h3'
}

function StyledHeading({
  children,
  variant = 'gradient',
  as: Component = 'h1'
}: StyledHeadingProps) {
  return (
    
      {children}
    
  )
}

// Usage - real text with fancy styling

  Welcome to Our Store

```

## If You Must Use Text Images

```html
<!-- Provide complete alt text -->
<img
  src="sale-banner.png"
  alt="Summer Sale: 50% off all items. Use code SUMMER50. Ends August 31st."
>

<!-- For complex text layouts -->
<div role="img" aria-label="Menu: Appetizers $8-12, Entrees $18-25, Desserts $6-9">
  <img src="menu-design.png" alt="">
</div>
```

## Checking for Text in Images

```javascript
// Flag images that might contain text
document.querySelectorAll('img').forEach(img => {
  const filename = img.src.toLowerCase()
  const textIndicators = ['banner', 'header', 'title', 'text', 'quote', 'testimonial']

  if (textIndicators.some(term => filename.includes(term))) {
    console.warn('Possible text image:', img.src)
    console.log('Alt text:', img.alt || 'MISSING')
  }
})
```

## Exceptions

- Logos, purely decorative text treatments, and screenshots used as documentation can be valid exceptions when their accessible alternative is still provided appropriately.
- An image or media rule should not force redundant alt text, captions, or transcripts when another nearby mechanism already provides the equivalent information clearly.
- If the media asset fails more than one rule, prioritize the issue that most directly blocks understanding for assistive technology users.

## Verification

### Automated Checks

- Run an automated accessibility audit or validator and confirm the issue is visible in the rendered output.

### Manual Checks

- Zoom page to 200%—does text remain readable?
- Try to select text—if you can't, it's an image
- Use browser translate—does all text translate?
- Use screen reader—are text images properly described?
- Check with high contrast mode—does text adapt?