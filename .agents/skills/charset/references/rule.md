# Declare UTF-8 character encoding

> The charset (UTF-8) is declared correctly as the first element in the head.

**Priority:** critical · **Difficulty:** beginner · **Time:** 5 min

---
The UTF-8 character set must be declared early in the HTML head to ensure proper character rendering across all languages and symbols.

## Code Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Page Title</title>
</head>
<body>
    <!-- Content with international characters: Café, 北京, العربية -->
</body>
</html>
```

## Why It Matters

- **International Support**: Enables proper display of all Unicode characters
- **Security**: Prevents character encoding attacks
- **Early Declaration**: Must be within first 1024 bytes of document
- **Consistency**: Ensures same rendering across all browsers and platforms

## Framework Examples

  Front-End Checklist</title>
  </head>
</html>
```
  
  Vite App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```
  
  
```tsx
// app/layout.tsx

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```
```
// Next.js emits UTF-8 automatically in the document head.
// Verify the rendered HTML rather than adding a duplicate meta charset tag.
```
  
  
        <meta charSet="UTF-8" />
      
      <div>Your app content</div>
    </>
  )
}
```
  

## Best Practices

✅ **Position Early**: Place as first meta tag
```html
<head>
    <meta charset="UTF-8">
    <!-- Other meta tags follow -->
</head>
```

✅ **Use UTF-8**: Universal character support
```html
<meta charset="UTF-8">
```

❌ **Avoid Old Syntax**: Don't use verbose XHTML syntax
```html
<!-- Don't use this -->
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
```

## Tools & Validation

- [W3C Markup Validator](https://validator.w3.org/)
- [HTML5 Validator](https://html5.validator.nu/)
- Browser DevTools Network tab to check response headers

## Standards

- Use MDN: HTML as the standard for the final rendered HTML and browser-facing behavior.
- Use WHATWG HTML Living Standard as the standard for the final rendered HTML and browser-facing behavior.

## Verification

### Automated Checks

- Inspect the final rendered HTML in the browser or page source to confirm the rule is satisfied.
- Validate the affected markup with browser tooling or an HTML validator where appropriate.
- Test one representative route or template that uses the pattern.
- Re-check shared components that emit the same markup so the fix is consistent.

### Manual Checks

- Verify the rendered browser behavior manually on representative routes and supported browsers so the user-facing outcome matches the rule.