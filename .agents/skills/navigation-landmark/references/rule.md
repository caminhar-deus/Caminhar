# Use navigation landmark regions

> Page navigation uses nav elements with proper ARIA labels to distinguish multiple navigation regions.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
Navigation landmarks help users understand page structure and quickly jump to different navigation sections.

## Code Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Title</title>
</head>
<body>
  <!-- Skip link (first element) -->
  <a href="#main-content" class="skip-link">
    Skip to main content
  </a>

  <header>
    <!-- Primary navigation -->
    <nav aria-label="Main">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/products">Products</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <!-- Breadcrumb navigation -->
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/products">Products</a></li>
      <li><a href="/products/widgets" aria-current="page">Widgets</a></li>
    </ol>
  </nav>

  <main id="main-content">
    <!-- Page content -->

    <!-- In-page navigation (table of contents) -->
    <nav aria-label="Table of contents">
      <h2>On this page</h2>
      <ul>
        <li><a href="#section-1">Section 1</a></li>
        <li><a href="#section-2">Section 2</a></li>
        <li><a href="#section-3">Section 3</a></li>
      </ul>
    </nav>

    <h1>Page Title</h1>
    <section id="section-1">...</section>
    <section id="section-2">...</section>
    <section id="section-3">...</section>
  </main>

  <aside>
    <!-- Sidebar navigation -->
    <nav aria-label="Related pages">
      <h2>Related</h2>
      <ul>
        <li><a href="/related-1">Related Page 1</a></li>
        <li><a href="/related-2">Related Page 2</a></li>
      </ul>
    </nav>
  </aside>

  <footer>
    <!-- Footer navigation -->
    <nav aria-label="Footer">
      <ul>
        <li><a href="/privacy">Privacy Policy</a></li>
        <li><a href="/terms">Terms of Service</a></li>
        <li><a href="/sitemap">Sitemap</a></li>
      </ul>
    </nav>
  </footer>
</body>
</html>
```

## Why It Matters

Navigation landmarks allow screen reader users to quickly jump to and identify different navigation areas—without them, users must tab through every link to find what they need.

## Navigation Landmark Types

| Region | Element | aria-label Example |
|--------|---------|-------------------|
| Main navigation | `<nav>` | "Main navigation" |
| Secondary navigation | `<nav>` | "Secondary navigation" |
| Footer navigation | `<nav>` | "Footer navigation" |
| Breadcrumb | `<nav>` | "Breadcrumb" |
| Pagination | `<nav>` | "Pagination" |
| Table of contents | `<nav>` | "Table of contents" |

## React Navigation Components

```tsx
interface NavLinkProps {
  href: string
  children: React.ReactNode
  isCurrent?: boolean
}

function NavLink({ href, children, isCurrent }: NavLinkProps) {
  return (
    <li>
      <a
        href={href}
        aria-current={isCurrent ? 'page' : undefined}
      >
        {children}
      </a>
    </li>
  )
}

interface MainNavProps {
  links: Array<{ href: string; label: string }>
  currentPath: string
}

  return (
    <nav aria-label="Main">
      <ul className="main-nav">
        {links.map(link => (
          
            {link.label}
          
        ))}
      </ul>
    </nav>
  )
}

interface BreadcrumbProps {
  items: Array<{ href: string; label: string }>
}

  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumb">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={item.href}>
              {isLast ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <>
                  <a href={item.href}>{item.label}</a>
                  <span aria-hidden="true"> / </span>
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

interface FooterNavProps {
  sections: Array<{
    title: string
    links: Array<{ href: string; label: string }>
  }>
}

  return (
    <nav aria-label="Footer">
      <div className="footer-nav">
        {sections.map(section => (
          <div key={section.title} className="footer-nav__section">
            <h3>{section.title}</h3>
            <ul>
              {section.links.map(link => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
```

## Skip Links

```tsx

  return (
    <div className="skip-links">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#main-nav" className="skip-link">
        Skip to navigation
      </a>
      <a href="#search" className="skip-link">
        Skip to search
      </a>
    </div>
  )
}
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: #000;
  color: #fff;
  z-index: 1000;
  transition: top 0.2s;
}

.skip-link:focus {
  top: 0;
}
```

## Next.js Layout Example

```tsx
// app/layout.tsx

  children
}: {
  children: React.ReactNode
}) {
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Products' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ]

  const footerSections = [
    {
      title: 'Company',
      links: [
        { href: '/about', label: 'About Us' },
        { href: '/careers', label: 'Careers' },
      ]
    },
    {
      title: 'Legal',
      links: [
        { href: '/privacy', label: 'Privacy Policy' },
        { href: '/terms', label: 'Terms of Service' },
      ]
    }
  ]

  return (
    <html lang="en">
      <body>
        

        <header>
          
        </header>

        <main id="main-content">
          {children}
        </main>

        <footer>
          
        </footer>
      </body>
    </html>
  )
}
```

## When to Use aria-labelledby vs aria-label

```html
<!-- aria-label: Short, simple label -->
<nav aria-label="Main">
  <!-- No visible heading -->
</nav>

<!-- aria-labelledby: Reference visible heading -->
<nav aria-labelledby="footer-nav-heading">
  <h2 id="footer-nav-heading">Quick Links</h2>
  <ul>...</ul>
</nav>
```

## Common Mistakes

```html
<!-- ❌ Multiple nav without labels -->
<nav>...</nav>
<nav>...</nav>

<!-- ✓ Labeled navigation regions -->
<nav aria-label="Main">...</nav>
<nav aria-label="Footer">...</nav>

<!-- ❌ Using div instead of nav -->
<div class="navigation">...</div>

<!-- ✓ Semantic nav element -->
<nav aria-label="Main">...</nav>

<!-- ❌ Nesting nav elements -->
<nav>
  <nav>...</nav>
</nav>

<!-- ✓ Separate nav regions -->
<nav aria-label="Primary">...</nav>
<nav aria-label="Secondary">...</nav>
```

## Verification

1. Use screen reader landmark navigation (NVDA: D key, VoiceOver: rotor)
2. Verify each nav region has unique label
3. Check skip link appears on focus
4. Verify aria-current on current page link
5. Test keyboard navigation through all links
6. Confirm nav count matches expected regions

Use nav elements only for major navigation blocks. Minor link groups (like social media icons) don't need to be navigation landmarks. Too many landmarks reduces their usefulness.