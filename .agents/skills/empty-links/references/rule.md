# Fix empty and broken links

> All links contain accessible text content and do not lead to broken destinations.

**Priority:** medium · **Difficulty:** beginner · **Time:** 15 min

---
Every link must have an accessible name that describes its destination or purpose.

## Code Example

```html
<!-- ❌ Bad: Completely empty link -->
<a href="/home"></a>
<!-- Screen reader: "link" (no context) -->

<!-- ❌ Bad: Image link with no alt -->
<a href="/profile">
  <img src="avatar.jpg">
</a>
<!-- Screen reader: "link, image" (no context) -->

<!-- ❌ Bad: Icon link with no label -->
<a href="/settings">
  <svg>...</svg>
</a>
<!-- Screen reader: "link" (no context) -->
```

## Why It Matters

Screen readers announce empty links as just 'link' with no context—users have no idea where they lead or what they do, making navigation impossible.

## Fixing Empty Links

### Add Visible Text

```html
<!-- ✅ Good: Visible link text -->
<a href="/home">Go to homepage</a>

<!-- ✅ Good: Image with descriptive alt -->
<a href="/profile">
  <img src="avatar.jpg" alt="View your profile">
</a>
```

### Icon Links with aria-label

```html
<!-- ✅ Good: Icon link with aria-label -->
<a href="/settings" aria-label="Account settings">
  <svg aria-hidden="true">...</svg>
</a>

<!-- ✅ Good: Social media icons -->
<a href="https://twitter.com/company" aria-label="Follow us on Twitter">
  <svg aria-hidden="true"><!-- Twitter icon --></svg>
</a>
```

### Visually Hidden Text

```html
<!-- ✅ Good: Visually hidden but screen reader accessible -->
<a href="/cart">
  <svg aria-hidden="true"><!-- Cart icon --></svg>
  <span class="sr-only">Shopping cart (3 items)</span>
</a>
```

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## React Component

```tsx
interface IconLinkProps {
  href: string
  label: string
  icon: React.ReactNode
  isExternal?: boolean
}

function IconLink({ href, label, icon, isExternal }: IconLinkProps) {
  return (
    <a
      href={href}
      aria-label={label}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
    >
      <span aria-hidden="true">{icon}</span>
      {isExternal && <span className="sr-only">(opens in new tab)</span>}
    </a>
  )
}

// Usage
}
/>
```

## Finding Empty Links

```javascript
// Browser console check
document.querySelectorAll('a').forEach(link => {
  const text = link.textContent?.trim()
  const ariaLabel = link.getAttribute('aria-label')
  const imgAlt = link.querySelector('img')?.getAttribute('alt')

  if (!text && !ariaLabel && !imgAlt) {
    console.warn('Empty link found:', link)
  }
})
```

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Verification

### Automated Checks

- Use axe DevTools or Lighthouse to find empty links

### Manual Checks

- Navigate with screen reader—every link should announce its purpose
- Check that image links have alt text or aria-label
- Verify icon-only links have accessible names