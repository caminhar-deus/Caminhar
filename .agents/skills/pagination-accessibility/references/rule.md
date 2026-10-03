# Make pagination accessible

> Pagination controls are accessible with proper ARIA labels, keyboard navigation, and current page indication.

**Priority:** medium · **Difficulty:** beginner · **Time:** 20 min

---
Accessible pagination helps users understand their current position and navigate through paged content.

## Code Example

```html
<nav aria-label="Pagination" class="pagination">
  <ul>
    <li>
      <a href="?page=1" aria-label="Go to previous page">
        Previous
      </a>
    </li>
    <li>
      <a href="?page=1" aria-label="Page 1">1</a>
    </li>
    <li>
      <a href="?page=2" aria-current="page" aria-label="Page 2, current page">2</a>
    </li>
    <li>
      <a href="?page=3" aria-label="Page 3">3</a>
    </li>
    <li>
      <span aria-hidden="true">...</span>
    </li>
    <li>
      <a href="?page=10" aria-label="Page 10">10</a>
    </li>
    <li>
      <a href="?page=3" aria-label="Go to next page">
        Next
      </a>
    </li>
  </ul>
</nav>
```

## Why It Matters

Without proper markup, screen reader users cannot understand which page they're on or navigate efficiently through paginated content.

## Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Container | `<nav>` with `aria-label="Pagination"` |
| Current page | `aria-current="page"` |
| Page labels | Descriptive text for screen readers |
| Keyboard access | All controls focusable |
| State changes | Announce via live regions |

## React Pagination Component

```tsx
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  siblingCount?: number
}

  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1
}: PaginationProps) {
  const [announcement, setAnnouncement] = useState('')

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const leftSibling = Math.max(currentPage - siblingCount, 1)
    const rightSibling = Math.min(currentPage + siblingCount, totalPages)

    // Always show first page
    if (leftSibling > 1) {
      pages.push(1)
      if (leftSibling > 2) pages.push('ellipsis')
    }

    // Show sibling pages
    for (let i = leftSibling; i <= rightSibling; i++) {
      pages.push(i)
    }

    // Always show last page
    if (rightSibling < totalPages) {
      if (rightSibling < totalPages - 1) pages.push('ellipsis')
      pages.push(totalPages)
    }

    return pages
  }

  const handlePageChange = (page: number) => {
    onPageChange(page)
    setAnnouncement(`Page ${page} of ${totalPages}`)
  }

  const pageNumbers = getPageNumbers()

  return (
    <>
      <nav aria-label="Pagination" className="pagination">
        <ul className="pagination__list">
          {/* Previous button */}
          <li>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Go to previous page"
              className="pagination__button"
            >
              ← Previous
            </button>
          </li>

          {/* Page numbers */}
          {pageNumbers.map((page, index) =>
            page === 'ellipsis' ? (
              <li key={`ellipsis-${index}`} aria-hidden="true">
                <span className="pagination__ellipsis">...</span>
              </li>
            ) : (
              <li key={page}>
                <button
                  type="button"
                  onClick={() => handlePageChange(page)}
                  aria-current={page === currentPage ? 'page' : undefined}
                  aria-label={
                    page === currentPage
                      ? `Page ${page}, current page`
                      : `Go to page ${page}`
                  }
                  className={`pagination__button ${
                    page === currentPage ? 'pagination__button--current' : ''
                  }`}
                >
                  {page}
                </button>
              </li>
            )
          )}

          {/* Next button */}
          <li>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Go to next page"
              className="pagination__button"
            >
              Next →
            </button>
          </li>
        </ul>
      </nav>

      {/* Live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </>
  )
}
```

## With Page Size Selector

```tsx
interface PaginationWithSizeProps extends PaginationProps {
  pageSize: number
  totalItems: number
  onPageSizeChange: (size: number) => void
}

  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange
}: PaginationWithSizeProps) {
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="pagination-container">
      {/* Page info */}
      <p className="pagination__info" aria-live="polite">
        Showing {startItem} to {endItem} of {totalItems} results
      </p>

      {/* Page size selector */}
      <div className="pagination__size">
        <label htmlFor="page-size">Items per page:</label>
        <select
          id="page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Pagination controls */}
      
    </div>
  )
}
```

## URL-Based Pagination (Next.js)

```tsx
'use client'

interface URLPaginationProps {
  totalPages: number
}

  const router = useRouter()
  const searchParams = useSearchParams()
  const currentPage = Number(searchParams.get('page')) || 1

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(page))
    router.push(`?${params.toString()}`)
  }

  return (
    
  )
}
```

## Styling

```css
.pagination__list {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.pagination__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  height: 2.5rem;
  padding: 0 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #333;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.pagination__button:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #999;
}

.pagination__button:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

.pagination__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination__button--current {
  background: #0066cc;
  border-color: #0066cc;
  color: #fff;
  font-weight: 600;
}

.pagination__button--current:hover {
  background: #0052a3;
}

.pagination__ellipsis {
  padding: 0 0.5rem;
  color: #999;
}

.pagination__info {
  font-size: 0.875rem;
  color: #666;
}

/* Responsive */
@media (max-width: 640px) {
  .pagination__list {
    flex-wrap: wrap;
    justify-content: center;
  }

  /* Hide page numbers, show only prev/next */
  .pagination__list li:not(:first-child):not(:last-child) {
    display: none;
  }
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

## Verification

1. Navigate with keyboard (Tab through all controls)
2. Verify current page is announced by screen reader
3. Check aria-labels are descriptive
4. Test disabled state on first/last page
5. Verify page change announcements
6. Check focus returns appropriately after page change
7. Test with screen reader navigation

When pagination changes content without a full page reload, use aria-live regions to announce the change. Users should know content has updated.