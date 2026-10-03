# Show loading indicators

> Loading indicators provide feedback during asynchronous operations to keep users informed of progress.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
Loading indicators keep users informed during asynchronous operations.

## Code Examples

```tsx
function Spinner({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="animate-spin"
      role="status"
      aria-label="Loading"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        opacity="0.25"
      />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
```

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
```

## Why It Matters

Loading indicators reassure users that something is happening—without feedback, users may think the page is broken or click repeatedly, degrading experience and causing duplicate actions.

## Types of Loading Indicators

| Type | Best For | Duration |
|------|----------|----------|
| Skeleton | Content loading | 1-5 seconds |
| Spinner | Button actions | 0.5-3 seconds |
| Progress bar | File uploads, long processes | 5+ seconds |
| Shimmer | Cards, lists | 1-3 seconds |

## Skeleton Loading

```tsx
function SkeletonCard() {
  return (
    <div className="card" aria-busy="true" aria-label="Loading content">
      <div className="skeleton skeleton-image" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
    </div>
  )
}

function CardList({ isLoading, items }) {
  if (isLoading) {
    return (
      <div role="feed" aria-busy="true">
        {[1, 2, 3].map(i => )}
      </div>
    )
  }

  return (
    <div role="feed" aria-busy="false">
      {items.map(item => )}
    </div>
  )
}
```

```css
.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-image {
  height: 200px;
  width: 100%;
}

.skeleton-title {
  height: 24px;
  width: 80%;
  margin-top: 12px;
}

.skeleton-text {
  height: 16px;
  width: 100%;
  margin-top: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

## Button Loading State

```tsx
interface ButtonProps {
  children: React.ReactNode
  loading?: boolean
  onClick?: () => void
}

function Button({ children, loading, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className={`button ${loading ? 'button-loading' : ''}`}
    >
      {loading && }
      <span className={loading ? 'sr-only' : ''}>{children}</span>
      {loading && <span aria-live="polite">Processing...</span>}
    </button>
  )
}
```

```css
.button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
}

.button-loading {
  cursor: wait;
  opacity: 0.8;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

## Progress Bar

```tsx
interface ProgressProps {
  value: number // 0-100
  label: string
}

function ProgressBar({ value, label }: ProgressProps) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="progress-text">{value}% complete</span>
    </div>
  )
}
```

## React Suspense with Loading

```tsx

function ProductPage({ id }: { id: string }) {
  return (
    <div>
      }>
        
      

      }>
        
      
    </div>
  )
}

// Loading state automatically shown while data fetches
async function ProductDetails({ id }: { id: string }) {
  const product = await getProduct(id)
  return <div>{product.name}</div>
}
```

## Full Page Loading

```tsx
function PageLoader() {
  return (
    <div
      className="page-loader"
      role="alert"
      aria-busy="true"
      aria-label="Page loading"
    >
      
      <p aria-live="polite">Loading page...</p>
    </div>
  )
}
```

## Accessibility Requirements

```tsx
// Always include ARIA attributes for screen readers
function AccessibleLoader({ isLoading, children }) {
  return (
    <div
      aria-busy={isLoading}
      aria-live="polite"
    >
      {isLoading ? (
        <div role="status">
          
          <span className="sr-only">Loading content, please wait</span>
        </div>
      ) : (
        children
      )}
    </div>
  )
}
```

## Avoid Content Jumps

```tsx
// Reserve space to prevent layout shift
function ContentWithLoader({ isLoading, content }) {
  return (
    <div style={{ minHeight: '200px' }}>
      {isLoading ?  : }
    </div>
  )
}
```

## Verification

### Automated Checks

- Test with slow network (3G throttling)

### Manual Checks

- Verify loading indicators appear immediately on action
- Check ARIA attributes with screen reader
- Verify no layout shift when content loads
- Check focus management after loading completes