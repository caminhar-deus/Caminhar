# Minimize cumulative layout shift

> Page maintains visual stability with a CLS score below 0.1, preventing unexpected content shifts during load.

**Priority:** high · **Difficulty:** intermediate · **Time:** 20 min

---
Cumulative Layout Shift measures unexpected movement of page content.

## Code Examples

```html
<!-- Always specify width and height -->
<img
  src="hero.jpg"
  alt="Hero image"
  width="1200"
  height="600"
  loading="lazy"
>

<!-- Or use aspect-ratio CSS -->
<img
  src="hero.jpg"
  alt="Hero image"
  style="aspect-ratio: 16/9; width: 100%; height: auto;"
>
```

```tsx
// React/Next.js with automatic dimensions

function Hero() {
  return (
    
  )
}
```

## Why It Matters

Layout shifts cause accidental clicks, reading disruption, and user frustration—a good CLS score ensures content stays where users expect it.

## CLS Score Thresholds

| Score | Rating | User Experience |
|-------|--------|-----------------|
| 0–0.1 | Good | Stable, no unexpected shifts |
| 0.1–0.25 | Needs improvement | Noticeable shifts |
| > 0.25 | Poor | Significant layout instability |

## Common Causes of Layout Shift

| Cause | Impact | Solution |
|-------|--------|----------|
| Images without dimensions | High | Always set width/height |
| Ads and embeds | High | Reserve container space |
| Web fonts loading | Medium | Use font-display: swap |
| Dynamic content injection | Medium | Use placeholders |
| Animations | Low | Use transform/opacity |

## Reserve Space for Dynamic Content

```tsx
// Reserve space for ads
function AdBanner() {
  return (
    <div
      style={{
        minHeight: '250px',
        width: '300px',
        backgroundColor: '#f0f0f0',
      }}
    >
      {/* Ad loads here without causing shift */}
    </div>
  )
}

// Skeleton loading for content
function ArticleCard({ isLoading, article }) {
  if (isLoading) {
    return (
      <div className="article-card">
        <div className="skeleton" style={{ height: '200px' }} />
        <div className="skeleton" style={{ height: '24px', width: '80%' }} />
        <div className="skeleton" style={{ height: '16px', width: '60%' }} />
      </div>
    )
  }

  return (
    <div className="article-card">
      <img src={article.image} alt={article.title} width={300} height={200} />
      <h2>{article.title}</h2>
      <p>{article.excerpt}</p>
    </div>
  )
}
```

## Font Loading Strategy

```css
/* Use font-display to prevent FOIT/FOUT shifts */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap; /* Show fallback immediately, swap when loaded */
  size-adjust: 100%; /* Match fallback font metrics */
  ascent-override: 90%;
  descent-override: 20%;
}

/* Use similar fallback font */
body {
  font-family: 'CustomFont', Arial, sans-serif;
}
```

```tsx
// Next.js font optimization

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  // Prevents layout shift from font loading
})

  return (
    <html className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

## Animations Without Layout Shift

```css
/* Bad: Animating layout properties */
.bad-animation {
  animation: slide-bad 0.3s ease-out;
}

@keyframes slide-bad {
  from { margin-left: -100px; } /* Causes layout shift */
  to { margin-left: 0; }
}

/* Good: Using transform */
.good-animation {
  animation: slide-good 0.3s ease-out;
}

@keyframes slide-good {
  from { transform: translateX(-100px); } /* No layout shift */
  to { transform: translateX(0); }
}
```

## Avoid Content Injection Above Fold

```tsx
// Bad: Inserting banner above content
function Page() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // This causes layout shift when banner appears
    setTimeout(() => setShowBanner(true), 1000)
  }, [])

  return (
    <div>
      {showBanner && } {/* Pushes content down */}
      
    </div>
  )
}

// Good: Reserve space for banner
function Page() {
  const [showBanner, setShowBanner] = useState(false)

  return (
    <div>
      <div style={{ minHeight: '60px' }}>
        {showBanner && }
      </div>
      
    </div>
  )
}
```

## Measuring CLS

```javascript
// Using web-vitals library

onCLS(metric => {
  console.log('CLS:', metric.value)

  // Report to analytics
  if (metric.value > 0.1) {
    console.warn('CLS exceeds threshold', metric.entries)
  }
})

// Debug which elements caused shifts
new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    if (entry.hadRecentInput) continue // Ignore user-triggered shifts

    console.log('Layout shift:', {
      value: entry.value,
      sources: entry.sources?.map(s => ({
        node: s.node,
        currentRect: s.currentRect,
        previousRect: s.previousRect
      }))
    })
  }
}).observe({ type: 'layout-shift', buffered: true })
```

## Verification

### Automated Checks

- Run Lighthouse—check CLS score in Performance
- Use Chrome DevTools Performance panel
- Check PageSpeed Insights for field data

### Manual Checks

- Test on slow connections (reveals timing-based shifts)
- Monitor with Real User Monitoring