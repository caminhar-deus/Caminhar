# Set the responsive viewport meta tag

> The viewport meta tag is declared correctly for responsive design.

**Priority:** critical · **Difficulty:** beginner · **Time:** 5 min

---
The viewport meta tag is essential for responsive web design, controlling how web pages are displayed on mobile devices.

## Code Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Responsive Page</title>
</head>
<body>
    <!-- Your responsive content -->
</body>
</html>
```

## Why It Matters

- **Mobile Experience**: Ensures proper rendering on mobile devices
- **Responsive Design**: Enables CSS media queries to work correctly
- **Touch Interface**: Optimizes touch target sizes and interactions
- **Performance**: Prevents unnecessary horizontal scrolling
- **SEO**: Google considers mobile-friendliness as a ranking factor

## Viewport Options

#

## Standard Responsive Design
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### Advanced Configuration
```html
<!-- Prevent zooming (use carefully - can harm accessibility) -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">

<!-- Allow limited zooming -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, minimum-scale=0.5">

<!-- Fixed width (rarely recommended) -->
<meta name="viewport" content="width=375">
```

## Framework Examples

### Next.js (App Router)
```jsx
// app/layout.js

  viewport: 'width=device-width, initial-scale=1.0'
}

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### Next.js (Pages Router)
```jsx
// pages/_document.js

  render() {
    return (
      
        
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        <body>
          
          
        </body>
      
    )
  }
}
```

### React (Helmet)
```jsx

function App() {
  return (
    <>
      
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      
      <div>Your responsive content</div>
    </>
  )
}
```

### Vue.js (Nuxt)
```javascript
// nuxt.config.js

  head: {
    meta: [
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }
    ]
  }
}
```

## Common Viewport Properties

| Property | Description | Example |
|----------|-------------|---------|
| `width` | Sets viewport width | `width=device-width` |
| `initial-scale` | Initial zoom level | `initial-scale=1.0` |
| `maximum-scale` | Maximum zoom level | `maximum-scale=3.0` |
| `minimum-scale` | Minimum zoom level | `minimum-scale=0.5` |
| `user-scalable` | Allow user zooming | `user-scalable=yes` |

## Best Practices

✅ **Use Standard Settings**: For most responsive sites
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

✅ **Allow Zooming**: Don't disable user-scalable unless absolutely necessary
```html
<!-- Good - allows accessibility zooming -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

❌ **Don't Disable Zooming**: Harms accessibility
```html
<!-- Bad - prevents users from zooming for accessibility -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
```

❌ **Don't Omit**: Missing viewport tag breaks mobile experience
```html
<!-- This will cause mobile display issues -->
<!-- No viewport meta tag -->
```

## CSS Integration

The viewport meta tag works with CSS media queries:

```css
/* Mobile-first responsive design */
.container {
  width: 100%;
  padding: 1rem;
}

@media (min-width: 768px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
}
```

## Accessibility Considerations

- **Don't disable zooming**: Users with visual impairments need zoom functionality
- **Test with screen readers**: Ensure responsive design works with assistive technology
- **Touch targets**: Ensure interactive elements are properly sized for touch

## Verification

- **Chrome DevTools**: Device simulation mode
- **Firefox DevTools**: Responsive design mode
- **Mobile-Friendly Test**: [Google's Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- **Real Device Testing**: Always test on actual devices