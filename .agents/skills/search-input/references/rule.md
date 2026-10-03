# Make search inputs accessible

> Search functionality is accessible with proper input type, label, role, and autocomplete suggestions.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 20 min

---
Accessible search helps all users find content quickly and efficiently.

## Code Example

```html
<form role="search" action="/search" method="GET">
  <label for="site-search" class="sr-only">Search</label>
  <input
    type="search"
    id="site-search"
    name="q"
    placeholder="Search..."
    aria-label="Search site content"
    autocomplete="off"
  />
  <button type="submit" aria-label="Submit search">
    <span aria-hidden="true">🔍</span>
    <span class="sr-only">Search</span>
  </button>
</form>
```

## Why It Matters

Search is a primary navigation method—inaccessible search functionality prevents users from finding content efficiently regardless of their abilities.

## Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Form role | `role="search"` on form element |
| Input type | `type="search"` |
| Label | Visible label or `aria-label` |
| Autocomplete | Keyboard navigable suggestions |
| Results announcement | Live region for result count |

## React Search Component

```tsx

interface SearchProps {
  onSearch: (query: string) => void
  placeholder?: string
  label?: string
}

  onSearch,
  placeholder = 'Search...',
  label = 'Search'
}: SearchProps) {
  const [query, setQuery] = useState('')
  const inputId = useId()
  const inputRef = useRef
        {label}
      </label>

      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          type="search"
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="search-input"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="search-clear"
          >
            ×
          </button>
        )}

        <button type="submit" aria-label="Submit search" className="search-submit">
          
        </button>
      </div>
    </form>
  )
}

function SearchIcon(props: React.SVGProps
      <path
        fill="currentColor"
        d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 001.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 00-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 005.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      />
    </svg>
  )
}
```

## With Autocomplete Suggestions

```tsx
interface Suggestion {
  id: string
  text: string
}

interface SearchWithAutocompleteProps {
  onSearch: (query: string) => void
  getSuggestions: (query: string) => Promise(null)
  const inputId = useId()
  const listboxId = useId()

  // Fetch suggestions on query change
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length >= 2) {
        const results = await getSuggestions(query)
        setSuggestions(results)
        setIsOpen(results.length > 0)
        setActiveIndex(-1)
        setAnnouncement(
          results.length > 0
            ? `${results.length} suggestions available`
            : 'No suggestions'
        )
      } else {
        setSuggestions([])
        setIsOpen(false)
      }
    }

    const debounce = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(debounce)
  }, [query, getSuggestions])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (isOpen) {
          setActiveIndex(prev =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          )
        } else if (suggestions.length > 0) {
          setIsOpen(true)
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (isOpen) {
          setActiveIndex(prev =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          )
        }
        break

      case 'Enter':
        if (activeIndex >= 0 && isOpen) {
          e.preventDefault()
          selectSuggestion(suggestions[activeIndex])
        }
        break

      case 'Escape':
        setIsOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  const selectSuggestion = (suggestion: Suggestion) => {
    setQuery(suggestion.text)
    setIsOpen(false)
    setActiveIndex(-1)
    onSearch(suggestion.text)
  }

  return (
    <div className="search-autocomplete">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          onSearch(query)
          setIsOpen(false)
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Search
        </label>

        <input
          ref={inputRef}
          type="search"
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Search..."
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          autoComplete="off"
          className="search-input"
        />

        <button type="submit" aria-label="Search" className="search-submit">
          🔍
        </button>
      </form>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="search-suggestions"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => selectSuggestion(suggestion)}
              className={`search-suggestion ${
                index === activeIndex ? 'search-suggestion--active' : ''
              }`}
            >
              {suggestion.text}
            </li>
          ))}
        </ul>
      )}

      {/* Live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}
```

## Search Results with Count

```tsx
interface SearchResultsProps {
  query: string
  results: any[]
  isLoading: boolean
}

  return (
    <div className="search-results">
      {/* Status announcement */}
      <div role="status" aria-live="polite" className="search-status">
        {isLoading ? (
          'Searching...'
        ) : (
          `${results.length} results for "${query}"`
        )}
      </div>

      {/* Results list */}
      {results.length > 0 && (
        <ul role="list" className="results-list">
          {results.map(result => (
            <li key={result.id}>
              <a href={result.url}>{result.title}</a>
              <p>{result.excerpt}</p>
            </li>
          ))}
        </ul>
      )}

      {/* No results */}
      {!isLoading && results.length === 0 && query && (
        <p>No results found for "{query}". Try different keywords.</p>
      )}
    </div>
  )
}
```

## Styling

```css
.search-form {
  display: flex;
  align-items: center;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.search-input:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.2);
}

.search-clear {
  position: absolute;
  right: 3rem;
  padding: 0.25rem;
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #999;
  cursor: pointer;
}

.search-submit {
  padding: 0.75rem;
  background: #0066cc;
  color: #fff;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}

.search-submit:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* Autocomplete dropdown */
.search-autocomplete {
  position: relative;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  z-index: 100;
}

.search-suggestion {
  padding: 0.75rem 1rem;
  cursor: pointer;
}

.search-suggestion:hover,
.search-suggestion--active {
  background: #f5f5f5;
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

1. Tab to search input and submit with Enter
2. Test autocomplete with keyboard (Arrow keys, Enter, Escape)
3. Verify screen reader announces suggestion count
4. Check results count is announced
5. Verify clear button is keyboard accessible
6. Test with screen reader (announces role="search")
7. Check focus management after form submission

Don't rely solely on placeholder text as a label—it disappears when typing. Use a visible label or `aria-label` in addition to placeholder.