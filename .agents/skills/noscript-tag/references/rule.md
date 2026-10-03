# Provide noscript fallback content

> A noscript tag provides fallback content for users with JavaScript disabled.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
The `<noscript>` element provides fallback content for users who have JavaScript disabled or unavailable, ensuring accessibility and progressive enhancement.

## Code Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Progressive Enhancement Example</title>

    <!-- Critical CSS loaded normally -->
    <link rel="stylesheet" href="/css/critical.css">

    <!-- Non-critical CSS with noscript fallback -->
    <script>
        // Load CSS asynchronously
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/enhanced.css';
        document.head.appendChild(link);
    </script>
    <noscript>
        <link rel="stylesheet" href="/css/enhanced.css">
    </noscript>
</head>
<body>
    <nav>
        <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/contact">Contact</a></li>
        </ul>
    </nav>

    <!-- JavaScript-enhanced form with fallback -->
    <form action="/search" method="GET">
        <input type="search" name="q" placeholder="Search..." required>
        <button type="submit">Search</button>

        <noscript>
            <p><strong>Note:</strong> JavaScript is disabled.
               Search results will be displayed on a new page.</p>
        </noscript>
    </form>

    <!-- Enhanced content with fallback -->
    <div id="dynamic-content">
        <noscript>
            <p>This content requires JavaScript to display properly.
               Please enable JavaScript or visit our
               <a href="/sitemap">sitemap</a> for all content.</p>
        </noscript>
    </div>
</body>
</html>
```

## Why It Matters

Users with JavaScript disabled, blocked by corporate firewalls, or with failed script loads see blank pages without proper noscript fallbacks.

Progressive enhancement starts with working HTML, not with client JavaScript. The initial document should already contain the important copy, links, and form actions. JavaScript should enhance search suggestions, filters, infinite scroll, and validation rather than being the only path to content.

## Common Use Cases

#

## Prefer Feature Detection Over UA Sniffing

Browser or device sniffing is fragile and regularly misclassifies embedded browsers, compatibility modes, and future versions. Detect the capability you need instead:

```javascript
// ❌ Bad: user-agent sniffing
if (/iPhone|Android/.test(navigator.userAgent)) {
  enableTouchMenu()
}

// ✅ Good: feature detection
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  enableTouchMenu()
}

if ('IntersectionObserver' in window) {
  enableInfiniteScroll()
} else {
  showPaginationLinks()
}
```

## Avoid Hydration Mismatches

If the server renders one value and the client immediately replaces it with another, users can lose context and assistive technology can announce stale content. Keep server and client output aligned for critical content.

```tsx
// ❌ Bad: server and client render different primary content
function Greeting() {
  return <h1>{typeof window === 'undefined' ? 'Welcome' : window.location.pathname}</h1>
}

// ✅ Good: server renders stable content, JS enhances after mount
function Greeting({ path }: { path: string }) {
  return <h1>Viewing {path}</h1>
}
```

## Navigation Fallbacks
```html
<nav>
    <!-- Mobile menu button (JavaScript enhanced) -->
    <button id="mobile-menu-btn" class="mobile-menu-toggle" aria-expanded="false">
        Menu
    </button>

    <!-- Navigation menu -->
    <ul id="main-nav" class="nav-menu">
        <li><a href="/">Home</a></li>
        <li><a href="/products">Products</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
    </ul>

    <noscript>
        <style>
            .mobile-menu-toggle { display: none !important; }
            .nav-menu { display: block !important; }
        </style>
        <p><em>All navigation links are available above.</em></p>
    </noscript>
</nav>

<script>
    // Enhanced mobile menu functionality
    document.getElementById('mobile-menu-btn').addEventListener('click', function() {
        const nav = document.getElementById('main-nav');
        const expanded = this.getAttribute('aria-expanded') === 'true';

        this.setAttribute('aria-expanded', !expanded);
        nav.classList.toggle('open');
    });
</script>
```

### Form Enhancement with Fallbacks
```html
<form action="/contact" method="POST" id="contact-form">
    <div class="form-group">
        <label for="name">Name *</label>
        <input type="text" id="name" name="name" required>
    </div>

    <div class="form-group">
        <label for="email">Email *</label>
        <input type="email" id="email" name="email" required>
        <div id="email-error" class="error-message" aria-live="polite"></div>
    </div>

    <div class="form-group">
        <label for="message">Message *</label>
        <textarea id="message" name="message" required></textarea>
        <div id="char-count" class="char-counter">0/500 characters</div>
    </div>

    <button type="submit" id="submit-btn">Send Message</button>

    <div id="form-status" aria-live="polite"></div>

    <noscript>
        <div class="noscript-notice">
            <p><strong>JavaScript Disabled:</strong></p>
            <ul>
                <li>Form will submit normally but without real-time validation</li>
                <li>Character counting is not available</li>
                <li>You'll be redirected to a confirmation page after submission</li>
            </ul>
        </div>
    </noscript>
</form>

<script>
    // Enhanced form functionality
    const form = document.getElementById('contact-form');
    const messageField = document.getElementById('message');
    const charCount = document.getElementById('char-count');

    // Character counter
    messageField.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = `${count}/500 characters`;
        charCount.className = count > 500 ? 'char-counter over-limit' : 'char-counter';
    });

    // AJAX form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        // Enhanced submission logic here
    });
</script>
```

### Content Loading with Fallbacks
```html
<section id="product-gallery">
    <h2>Product Gallery</h2>

    <!-- Placeholder content for no-JS users -->
    <div class="static-gallery">
        <div class="product-grid">
            <div class="product-item">
                <img src="/images/product-1.jpg" alt="Product 1">
                <h3>Product 1</h3>
                <p>$29.99</p>
                <a href="/products/1" class="btn">View Details</a>
            </div>
            <div class="product-item">
                <img src="/images/product-2.jpg" alt="Product 2">
                <h3>Product 2</h3>
                <p>$39.99</p>
                <a href="/products/2" class="btn">View Details</a>
            </div>
        </div>

        <div class="pagination">
            <a href="/products?page=1">1</a>
            <a href="/products?page=2">2</a>
            <a href="/products?page=3">3</a>
        </div>
    </div>

    <noscript>
        <p>Showing all products. Enhanced filtering and
           infinite scroll require JavaScript.</p>
    </noscript>
</section>

<script>
    // Replace static gallery with enhanced version
    document.addEventListener('DOMContentLoaded', function() {
        const gallery = document.getElementById('product-gallery');
        // Initialize enhanced gallery with filtering, search, infinite scroll
        initEnhancedGallery(gallery);
    });
</script>
```

## Framework Examples

### Next.js with NoScript Support
```jsx
// components/EnhancedSearch.js

    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    const handleSearch = async (e) => {
        if (!isClient) return // Let form submit normally

        e.preventDefault()
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
            const data = await response.json()
            setResults(data.results)
        } catch (error) {
            console.error('Search failed:', error)
            // Fallback to regular form submission
            window.location.href = `${fallbackAction}?q=${encodeURIComponent(query)}`
        }
    }

    return (
        <div className="search-container">
            <form action={fallbackAction} method="GET" onSubmit={handleSearch}>
                <input
                    type="search"
                    name="q"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search products..."
                    required
                />
                <button type="submit">Search</button>
            </form>

            {!isClient && (
                <noscript>
                    <div className="noscript-notice">
                        <p>JavaScript is disabled. Search results will open in a new page.</p>
                    </div>
                </noscript>
            )}

            {isClient && results.length > 0 && (
                <div className="search-results">
                    {results.map(result => (
                        <div key={result.id} className="result-item">
                            <h3>{result.title}</h3>
                            <p>{result.description}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// pages/search.js (fallback page)

    return (
        <div>
            <h1>Search Results for "{query}"</h1>
            {results.map(result => (
                <div key={result.id} className="result-item">
                    <h3>{result.title}</h3>
                    <p>{result.description}</p>
                    <a href={result.url}>View Details</a>
                </div>
            ))}
        </div>
    )
}

    const searchQuery = query.q || ''
    const results = await searchProducts(searchQuery)

    return {
        props: {
            query: searchQuery,
            results
        }
    }
}
```

### React with Progressive Enhancement
```jsx

function ProgressiveContactForm() {
    const [isEnhanced, setIsEnhanced] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    })
    const [errors, setErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const formRef = useRef(null)

    useEffect(() => {
        // Enable enhanced features after component mounts
        setIsEnhanced(true)

        // Hide noscript content when JS is available
        const noscriptElements = document.querySelectorAll('noscript')
        noscriptElements.forEach(el => {
            el.style.display = 'none'
        })
    }, [])

    const validateField = (name, value) => {
        switch (name) {
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                    ? '' : 'Please enter a valid email'
            case 'name':
                return value.length >= 2
                    ? '' : 'Name must be at least 2 characters'
            case 'message':
                return value.length >= 10
                    ? '' : 'Message must be at least 10 characters'
            default:
                return ''
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))

        if (isEnhanced) {
            const error = validateField(name, value)
            setErrors(prev => ({ ...prev, [name]: error }))
        }
    }

    const handleSubmit = async (e) => {
        if (!isEnhanced) {
            // Let the form submit normally
            return
        }

        e.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                alert('Message sent successfully!')
                setFormData({ name: '', email: '', message: '' })
            } else {
                throw new Error('Submission failed')
            }
        } catch (error) {
            alert('Failed to send message. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form
            ref={formRef}
            action="/contact"
            method="POST"
            onSubmit={handleSubmit}
        >
            <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
                {isEnhanced && errors.name && (
                    <span className="error">{errors.name}</span>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />
                {isEnhanced && errors.email && (
                    <span className="error">{errors.email}</span>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                />
                {isEnhanced && errors.message && (
                    <span className="error">{errors.message}</span>
                )}
                {isEnhanced && (
                    <small>{formData.message.length}/500 characters</small>
                )}
            </div>

            <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>

            <noscript>
                <div className="noscript-notice">
                    <p><strong>JavaScript is disabled:</strong></p>
                    <ul>
                        <li>Form will submit to /contact endpoint</li>
                        <li>Real-time validation unavailable</li>
                        <li>You'll see a confirmation page after submission</li>
                    </ul>
                </div>
            </noscript>
        </form>
    )
}
```

### Vue.js with NoScript Handling
```vue
<template>
  <div class="enhanced-component">
    <!-- Enhanced content shown when JS is available -->
    <div v-if="isClientSide" class="js-enhanced">
      <h2>Enhanced Gallery</h2>
      <div class="filters">
        <button
          v-for="category in categories"
          :key="category"
          @click="filterByCategory(category)"
          :class="{ active: selectedCategory === category }"
        >
          {{ category }}
        </button>
      </div>

      <div class="image-grid">
        <div
          v-for="image in filteredImages"
          :key="image.id"
          class="image-item"
          @click="openLightbox(image)"
        >
          <img :src="image.thumbnail" :alt="image.alt">
          <p>{{ image.title }}</p>
        </div>
      </div>

      <div v-if="showLightbox" class="lightbox" @click="closeLightbox">
        <img :src="selectedImage.full" :alt="selectedImage.alt">
      </div>
    </div>

    <!-- Fallback content structure -->
    <div v-else class="no-js-fallback">
      <h2>Image Gallery</h2>
      <div class="static-grid">
        <div v-for="image in images" :key="image.id" class="static-item">
          <a :href="image.full" target="_blank">
            <img :src="image.thumbnail" :alt="image.alt">
            <p>{{ image.title }} ({{ image.category }})</p>
          </a>
        </div>
      </div>
    </div>

    <!-- NoScript element for pure HTML version -->
    <noscript>
      <div class="noscript-gallery">
        <h2>Image Gallery (JavaScript Disabled)</h2>
        <p>Click images to view full size in new window.</p>
        <div class="noscript-grid">
          <!-- Server-rendered static content would go here -->
        </div>
      </div>
    </noscript>
  </div>
</template>

<script>

  data() {
    return {
      isClientSide: false,
      images: [
        { id: 1, title: 'Sunset', category: 'Nature', thumbnail: '/thumb1.jpg', full: '/full1.jpg', alt: 'Beautiful sunset' },
        { id: 2, title: 'City', category: 'Urban', thumbnail: '/thumb2.jpg', full: '/full2.jpg', alt: 'City skyline' }
      ],
      categories: ['All', 'Nature', 'Urban', 'People'],
      selectedCategory: 'All',
      showLightbox: false,
      selectedImage: null
    }
  },

  computed: {
    filteredImages() {
      if (this.selectedCategory === 'All') {
        return this.images
      }
      return this.images.filter(img => img.category === this.selectedCategory)
    }
  },

  mounted() {
    // Enable client-side features
    this.isClientSide = true

    // Handle keyboard navigation
    document.addEventListener('keydown', this.handleKeydown)
  },

  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeydown)
  },

  methods: {
    filterByCategory(category) {
      this.selectedCategory = category
    },

    openLightbox(image) {
      this.selectedImage = image
      this.showLightbox = true
      document.body.style.overflow = 'hidden'
    },

    closeLightbox() {
      this.showLightbox = false
      this.selectedImage = null
      document.body.style.overflow = 'auto'
    },

    handleKeydown(e) {
      if (e.key === 'Escape' && this.showLightbox) {
        this.closeLightbox()
      }
    }
  }
}
</script>
```

## CSS for NoScript Styling

```css
/* Hide enhanced elements when JS is disabled */
.js-only {
    display: none;
}

/* Show enhanced elements when JS is available */
.js-enabled .js-only {
    display: block;
}

/* Style noscript notices */
noscript {
    display: block;
    background: #f0f0f0;
    border: 1px solid #ccc;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 4px;
}

.noscript-notice {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    color: #856404;
    padding: 1rem;
    border-radius: 4px;
    margin: 1rem 0;
}

/* Progressive enhancement styles */
.enhanced-form {
    position: relative;
}

.enhanced-form .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    display: none;
}

.enhanced-form.submitting .loading-overlay {
    display: flex;
}

/* Hide JS-dependent elements initially */
.char-counter,
.real-time-validation,
.auto-save-indicator {
    opacity: 0;
    transition: opacity 0.3s;
}

/* Show them when JS loads */
.js-loaded .char-counter,
.js-loaded .real-time-validation,
.js-loaded .auto-save-indicator {
    opacity: 1;
}
```

## Best Practices

1. **Provide Meaningful Fallbacks**: Don't just show "JavaScript is required"
2. **Maintain Functionality**: Core features should work without JavaScript
3. **Progressive Enhancement**: Start with working HTML, enhance with JS
4. **Clear Communication**: Explain what features require JavaScript
5. **Test Without JavaScript**: Regularly test your site with JS disabled
6. **Use Semantic HTML**: Rely on native HTML functionality as foundation
7. **Server-Side Processing**: Ensure forms and critical features work server-side
8. **Graceful Degradation**: Enhanced features should fail gracefully
9. **Use feature detection**: Branch on supported APIs, not user-agent strings
10. **Keep HTML authoritative**: Important content, links, and pagination must exist before hydration

## Testing NoScript Implementation

### Browser Testing
```javascript
// Programmatically disable JavaScript for testing
Object.defineProperty(window, 'navigator', {
  value: {
    ...window.navigator,
    javaEnabled: () => false
  }
});

// Simulate noscript environment
document.querySelectorAll('script').forEach(script => {
  script.remove();
});
```

### Automated Testing
```javascript
// Puppeteer test with JavaScript disabled
const puppeteer = require('puppeteer');

async function testNoScript() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Disable JavaScript
  await page.setJavaScriptEnabled(false);

  await page.goto('http://localhost:3000');

  // Test form submission
  await page.type('input[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');

  // Verify redirect to success page
  await page.waitForNavigation();
  const url = page.url();
  console.log('Redirected to:', url);

  await browser.close();
}
```

The `<noscript>` element is essential for creating truly accessible and robust web applications that work for all users, regardless of their JavaScript capabilities.

## Verification

### Automated Checks

- Test one primary path and one edge case affected by the change.
- Use browser or CI tooling where applicable to verify the fix.
- Re-check shared abstractions so the fix is applied consistently.

### Manual Checks

- Confirm the rule in the final rendered output or runtime behavior.
- Disable JavaScript and confirm the primary content, navigation, and pagination are still reachable from HTML alone.
- Compare server-rendered HTML with hydrated UI and confirm no critical headings, counts, or body copy change unexpectedly on mount.