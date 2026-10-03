# Handle image loading errors gracefully

> Broken images are handled gracefully with fallback images or placeholder content.

**Priority:** low · **Difficulty:** beginner · **Time:** 15 min

---
Broken images should fail gracefully with fallback content instead of showing broken icons.

## Code Example

```html
<!-- ❌ Bad: No fallback for broken image -->
<img src="product.jpg" alt="Product">

<!-- ✅ Good: Fallback image on error -->
<img
  src="product.jpg"
  alt="Product"
  onerror="this.src='/images/placeholder.png'; this.onerror=null;"
>
```

## Why It Matters

Broken image icons look unprofessional and confuse users—graceful fallbacks maintain visual consistency and user trust when images fail to load.

## React Error Handling Component

```tsx
interface ImageWithFallbackProps {
  src: string
  fallback: string
  alt: string
  className?: string
}

function ImageWithFallback({
  src,
  fallback,
  alt,
  className
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (!hasError) {
      setImgSrc(fallback)
      setHasError(true)
    }
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={className}
    />
  )
}

// Usage

```

## Advanced Image Component with States

```tsx
type ImageState = 'loading' | 'loaded' | 'error'

interface SmartImageProps {
  src: string
  alt: string
  fallback?: string
  placeholder?: React.ReactNode
  className?: string
}

function SmartImage({
  src,
  alt,
  fallback = '/images/placeholder.png',
  placeholder,
  className
}: SmartImageProps) {
  const [state, setState] = useStateImage unavailable</span>
      </div>
    )
  }

  return (
    <div className={`image-wrapper ${className}`}>
      {state === 'loading' && (placeholder || <div className="skeleton" />)}
      <img
        src={currentSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        style={{ opacity: state === 'loaded' ? 1 : 0 }}
      />
    </div>
  )
}
```

## Next.js Image Error Handling

```tsx

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src)

  return (
     setImgSrc('/images/product-fallback.png')}
    />
  )
}
```

## CSS Fallback for Background Images

```css
/* Fallback background if image fails */
.hero {
  background-color: #f0f0f0; /* Fallback color */
  background-image: url('hero.jpg');
  background-size: cover;
}

/* Styled broken image fallback */
img {
  min-height: 100px;
  background-color: #f5f5f5;
}

img::before {
  content: '';
  display: block;
}

img::after {
  content: attr(alt);
  display: block;
  font-size: 14px;
  color: #666;
  text-align: center;
  padding: 20px;
}
```

## Avatar with Initials Fallback

```tsx
interface AvatarProps {
  src?: string
  name: string
  size?: number
}

function Avatar({ src, name, size = 48 }: AvatarProps) {
  const [showFallback, setShowFallback] = useState(!src)

  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (showFallback) {
    return (
      <div
        className="avatar-fallback"
        style={{ width: size, height: size }}
        aria-label={name}
      >
        {initials}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="avatar"
      onError={() => setShowFallback(true)}
    />
  )
}
```

## Error Logging

```typescript
function logImageError(src: string, error: Event) {
  // Log to monitoring service
  console.error('Image failed to load:', src)

  // Send to analytics
  if (window.analytics) {
    window.analytics.track('Image Load Error', {
      src,
      page: window.location.pathname
    })
  }
}

// Usage in component
<img
  src={src}
  alt={alt}
  onError={(e) => {
    logImageError(src, e)
    handleFallback()
  }}
/>
```

## Verification

1. Block images in DevTools (Network tab → Block request URL)
2. Test with invalid image URLs
3. Verify fallback appears correctly
4. Check that alt text is accessible when fallback shows
5. Test slow network—loading states should appear

Always check if fallback has already been applied before setting it. Without this check, a broken fallback image causes an infinite loop of error events.