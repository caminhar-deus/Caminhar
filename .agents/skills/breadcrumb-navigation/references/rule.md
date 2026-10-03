# Implement accessible breadcrumb navigation

> Breadcrumb navigation is implemented with proper semantic markup and ARIA attributes for accessibility.

**Priority:** medium · **Difficulty:** beginner · **Time:** 15 min

---
Accessible breadcrumbs help users understand their location within the site hierarchy. The first breadcrumb does not have to be `Home`; include a homepage item only when it is part of the visible breadcrumb trail and site hierarchy.

## Code Example

```html
<nav aria-label="Breadcrumb" class="breadcrumb">
  <ol>
    <li>
      <a href="/products">Products</a>
    </li>
    <li>
      <a href="/products/electronics">Electronics</a>
    </li>
    <li>
      <a href="/products/electronics/laptops" aria-current="page">Laptops</a>
    </li>
  </ol>
</nav>
```

## Why It Matters

Proper breadcrumb markup helps screen reader users understand site hierarchy and their current location, while also improving SEO when structured data accurately mirrors the visible trail.

## Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Container | `<nav>` with `aria-label="Breadcrumb"` |
| List structure | Ordered list (`<ol>`) |
| Current page | `aria-current="page"` |
| Separators | CSS or `aria-hidden` text |
| Home item | Optional; include only when it is visible and meaningful |

## SEO Requirements

- Keep visible breadcrumbs and `BreadcrumbList` JSON-LD in the same order with the same labels.
- Do not emit `BreadcrumbList` schema for a homepage, landing page, or hub page with only one meaningful breadcrumb item.
- Use global navigation, the site logo, or a separate home control for homepage access when `Home` is not part of the breadcrumb trail.

## React Breadcrumb Component

```tsx

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      <ol className="breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={item.href} className="breadcrumb__item">
              {isLast ? (
                <span aria-current="page" className="breadcrumb__current">
                  {item.label}
                </span>
              ) : (
                <a href={item.href} className="breadcrumb__link">
                  {item.label}
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
```

## Usage

```tsx

```

## With Structured Data (JSON-LD)

```tsx
interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  baseUrl?: string
}

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `${baseUrl}${item.href}`,
    })),
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <ol className="breadcrumb__list">
          {items.map((item, index) => {
            const isLast = index === items.length - 1

            return (
              <li key={item.href} className="breadcrumb__item">
                {isLast ? (
                  <span aria-current="page">{item.label}</span>
                ) : (
                  <a href={item.href}>{item.label}</a>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Structured data for SEO; keep this aligned with the visible trail. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </>
  )
}
```

## Next.js Dynamic Breadcrumbs

```tsx
'use client'

interface PathConfig {
  [key: string]: string
}

const pathLabels: PathConfig = {
  products: 'Products',
  electronics: 'Electronics',
  laptops: 'Laptops',
  accessories: 'Accessories',
}

  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const items = segments.map((segment, index) => ({
    label: pathLabels[segment] || segment.replace(/-/g, ' '),
    href: '/' + segments.slice(0, index + 1).join('/'),
  }))

  // Add a Home item here only if the visible breadcrumb trail includes it.
  return 
}
```

## With Icons

```tsx
interface BreadcrumbProps {
  items: BreadcrumbItem[]
  leadingIcon?: React.ReactNode
  separator?: React.ReactNode
}

  items,
  leadingIcon,
  separator = '/'
}: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      <ol className="breadcrumb__list">
        {items.map((item, index) => {
          const isFirst = index === 0
          const isLast = index === items.length - 1

          return (
            <li key={item.href} className="breadcrumb__item">
              {index > 0 && (
                <span aria-hidden="true" className="breadcrumb__separator">
                  {separator}
                </span>
              )}

              {isLast ? (
                <span aria-current="page" className="breadcrumb__current">
                  {item.label}
                </span>
              ) : (
                <a href={item.href} className="breadcrumb__link">
                  {isFirst && leadingIcon && (
                    <span aria-hidden="true" className="breadcrumb__icon">
                      {leadingIcon}
                    </span>
                  )}
                  {isFirst && leadingIcon ? (
                    <span className="sr-only">{item.label}</span>
                  ) : (
                    item.label
                  )}
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
```

## Styling

```css
.breadcrumb__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.875rem;
}

.breadcrumb__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* CSS-based separators (alternative to inline) */
.breadcrumb__item:not(:first-child)::before {
  content: '/';
  color: #999;
}

.breadcrumb__link {
  color: #0066cc;
  text-decoration: none;
}

.breadcrumb__link:hover {
  text-decoration: underline;
}

.breadcrumb__link:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
  border-radius: 2px;
}

.breadcrumb__current {
  color: #666;
  font-weight: 500;
}

.breadcrumb__separator {
  color: #999;
}

.breadcrumb__icon {
  display: inline-flex;
  margin-right: 0.25rem;
}

/* Screen reader only */
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

/* Responsive: hide middle items on small screens */
@media (max-width: 640px) {
  .breadcrumb__list {
    flex-wrap: nowrap;
    overflow: hidden;
  }

  /* Show first, last, and ellipsis */
  .breadcrumb__item:not(:first-child):not(:last-child) {
    display: none;
  }

  .breadcrumb__item:first-child + .breadcrumb__item:not(:last-child)::before {
    content: '...';
  }
}
```

## Common Patterns

```html
<!-- Don't link the current page -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/products">Products</a></li>
    <li><span aria-current="page">Laptops</span></li>
  </ol>
</nav>

<!-- With separators hidden from screen readers -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/products">Products</a></li>
    <li aria-hidden="true">/</li>
    <li><span aria-current="page">Laptops</span></li>
  </ol>
</nav>
```

## Verification

1. Navigate with screen reader (announces "Breadcrumb navigation")
2. Verify ordered list structure
3. Confirm current page is announced
4. Check all links are keyboard focusable
5. Verify separators aren't announced
6. Verify any `BreadcrumbList` JSON-LD matches the visible breadcrumb items
7. Avoid one-item breadcrumb schema on flat, landing, or hub pages
8. Test structured data with Rich Results Test
9. Check responsive behavior on small screens

The current page in breadcrumbs should not be a link—it should be plain text with `aria-current="page"`. Linking to the current page creates confusion.