# Set text direction for RTL languages

> The dir attribute is used for languages that read right-to-left (RTL) or mixed content.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 15 min

---
The `dir` attribute specifies the text direction for content, essential for proper display of right-to-left languages and mixed-direction text.

## Code Example

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>موقع باللغة العربية</title>
</head>
<body>
    <h1>مرحبا بكم في موقعنا</h1>
    <p>هذا نص باللغة العربية يُقرأ من اليمين إلى اليسار</p>
</body>
</html>
```

## Why It Matters

Without proper dir attributes, RTL text displays incorrectly, UI elements appear backwards, and screen readers announce content in the wrong order.

## Direction Values

#

## RTL (Right-to-Left)
```html
<!-- Arabic content -->
<html lang="ar" dir="rtl">
<body>
    <h1>العنوان الرئيسي</h1>
    <p>محتوى النص العربي</p>
</body>
</html>

<!-- Hebrew content -->
<html lang="he" dir="rtl">
<body>
    <h1>כותרת ראשית</h1>
    <p>תוכן טקסט בעברית</p>
</body>
</html>
```

### LTR (Left-to-Right)
```html
<!-- English content (default) -->
<html lang="en" dir="ltr">
<body>
    <h1>Main Heading</h1>
    <p>English text content</p>
</body>
</html>

<!-- Explicit LTR for clarity -->
<html lang="en">
<body>
    <div dir="ltr">
        <p>This text is explicitly left-to-right</p>
    </div>
</body>
</html>
```

### Auto Direction
```html
<!-- Automatic direction detection -->
<html lang="en">
<body>
    <div dir="auto">
        <p>مرحبا Hello שלום</p> <!-- Mixed languages -->
    </div>

    <p dir="auto">
        The first strongly directional character determines direction
    </p>
</body>
</html>
```

## Mixed Content Examples

### Bilingual Website
```html
<html lang="en" dir="ltr">
<head>
    <title>Bilingual Website</title>
    <style>
        .rtl-section {
            text-align: right;
            direction: rtl;
        }
        .ltr-section {
            text-align: left;
            direction: ltr;
        }
    </style>
</head>
<body>
    <header dir="ltr">
        <h1>English/Arabic Website</h1>
        <nav>
            <a href="/en">English</a>
            <a href="/ar">العربية</a>
        </nav>
    </header>

    <main>
        <section class="ltr-section" dir="ltr">
            <h2>English Section</h2>
            <p>This content is in English, reading left to right.</p>
        </section>

        <section class="rtl-section" dir="rtl" lang="ar">
            <h2>القسم العربي</h2>
            <p>هذا المحتوى باللغة العربية، يُقرأ من اليمين إلى اليسار.</p>
        </section>
    </main>
</body>
</html>
```

### Form with Mixed Directions
```html
<form>
    <div dir="ltr">
        <label for="email">Email:</label>
        <input type="email" id="email" name="email">
    </div>

    <div dir="rtl" lang="ar">
        <label for="arabic-name">الاسم:</label>
        <input type="text" id="arabic-name" name="arabicName">
    </div>

    <div dir="auto">
        <label for="comment">Comment (any language):</label>
        <textarea id="comment" name="comment"
                  placeholder="Type in any language..."></textarea>
    </div>
</form>
```

## Framework Examples

### Next.js with RTL Support
```jsx
// pages/_document.js

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx)

    // Determine direction from locale or user preference
    const { locale } = ctx
    const rtlLocales = ['ar', 'he', 'fa', 'ur']
    const dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr'

    return { ...initialProps, dir }
  }

  render() {
    const { dir } = this.props

    return (
      
        
          {dir === 'rtl' && (
            <link rel="stylesheet" href="/styles/rtl.css" />
          )}
        
        <body>
          
          
        </body>
      
    )
  }
}

```

### React with Direction Context
```jsx

const DirectionContext = createContext('ltr')

  const rtlLocales = ['ar', 'he', 'fa', 'ur', 'yi']
  const direction = rtlLocales.includes(locale) ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.setAttribute('dir', direction)
    document.body.className = direction === 'rtl' ? 'rtl' : 'ltr'
  }, [direction])

  return (
    
      {children}
    </DirectionContext.Provider>
  )
}

// Usage in components
function UserProfile({ user }) {
  const direction = useDirection()

  return (
    <div className={`profile ${direction}`}>
      <h2 dir="auto">{user.name}</h2>
      <p dir="auto">{user.bio}</p>

      <div dir="ltr" className="contact-info">
        <span>Email: {user.email}</span>
        <span>Phone: {user.phone}</span>
      </div>
    </div>
  )
}
```

### Vue.js with Direction Directive
```vue
<template>
  <div :dir="pageDirection" class="app">
    <header dir="ltr" class="header">
      <h1>{{ siteName }}</h1>
      
    </header>

    <main>
      <article v-for="post in posts" :key="post.id" :dir="post.direction">
        <h2>{{ post.title }}</h2>
        <p v-html="post.content"></p>
        <time dir="ltr">{{ formatDate(post.createdAt) }}</time>
      </article>
    </main>
  </div>
</template>

<script>

  data() {
    return {
      currentLanguage: 'en',
      siteName: 'My Multilingual Site',
      posts: [
        {
          id: 1,
          title: 'English Post',
          content: 'This is English content',
          direction: 'ltr',
          language: 'en'
        },
        {
          id: 2,
          title: 'منشور عربي',
          content: 'هذا محتوى عربي',
          direction: 'rtl',
          language: 'ar'
        }
      ]
    }
  },

  computed: {
    pageDirection() {
      const rtlLanguages = ['ar', 'he', 'fa', 'ur']
      return rtlLanguages.includes(this.currentLanguage) ? 'rtl' : 'ltr'
    }
  },

  methods: {
    handleLanguageChange(newLanguage) {
      this.currentLanguage = newLanguage
      document.documentElement.setAttribute('dir', this.pageDirection)
    },

    formatDate(date) {
      return new Intl.DateTimeFormat(this.currentLanguage).format(new Date(date))
    }
  }
}
</script>

<style scoped>
.app[dir="rtl"] {
  text-align: right;
}

.app[dir="ltr"] {
  text-align: left;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* RTL-specific styles */
.app[dir="rtl"] .header {
  flex-direction: row-reverse;
}
</style>
```

## CSS Integration

### Direction-aware Styling
```css
/* Base styles */
.container {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* LTR specific styles */
[dir="ltr"] .sidebar {
  float: left;
  margin-right: 2rem;
  margin-left: 0;
}

[dir="ltr"] .breadcrumb::before {
  content: ">";
  margin: 0 0.5rem;
}

/* RTL specific styles */
[dir="rtl"] .sidebar {
  float: right;
  margin-left: 2rem;
  margin-right: 0;
}

[dir="rtl"] .breadcrumb::before {
  content: "<";
  margin: 0 0.5rem;
}

/* Auto-direction aware */
[dir] .text-content {
  text-align: start; /* Aligns to reading direction */
}

/* Logical properties (preferred modern approach) */
.card {
  padding-inline-start: 1rem;
  padding-inline-end: 2rem;
  margin-inline: auto;
  border-inline-start: 3px solid blue;
}
```

### Flexbox and Grid with Direction
```css
/* Flexbox that respects direction */
.navigation {
  display: flex;
  gap: 1rem;
}

[dir="rtl"] .navigation {
  flex-direction: row-reverse;
}

/* CSS Grid with logical properties */
.layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 2rem;
}

[dir="rtl"] .layout {
  grid-template-columns: 1fr 250px;
}

/* Modern logical properties approach */
.modern-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 2rem;
  direction: inherit; /* Inherits from parent */
}
```

## Implementation Notes

Use logical properties and bidi isolation so RTL support reaches layout, icons, and mixed-language inline content.

```css
.nav-link {
  margin-inline-start: 1rem;
  padding-inline-end: 0.75rem;
  text-align: start;
}

[dir='rtl'] .icon-directional {
  transform: scaleX(-1);
}
```

```html
<p dir="rtl">
  مرحبا من <bdi>Front-End Checklist</bdi>
</p>
```

## Accessibility Benefits

### Screen Reader Support
```html
<!-- Proper direction helps screen readers -->
<article dir="rtl" lang="ar">
  <h1>العنوان الرئيسي</h1>
  <p>النص العربي يُقرأ بشكل صحيح من قبل قارئ الشاشة</p>

  <!-- Mixed content with explicit directions -->
  <p dir="auto">
    المستخدم: <span dir="ltr">john@example.com</span>
  </p>
</article>
```

### Keyboard Navigation
```html
<!-- Tab order respects text direction -->
<form dir="rtl">
  <div>
    <label for="name">الاسم:</label>
    <input type="text" id="name" tabindex="1">
  </div>

  <div>
    <label for="email">البريد الإلكتروني:</label>
    <input type="email" id="email" tabindex="2" dir="ltr">
  </div>

  <button type="submit" tabindex="3">إرسال</button>
</form>
```

## JavaScript Direction Detection

### Automatic Direction Detection
```javascript
function detectTextDirection(text) {
  // RTL characters regex
  const rtlChars = /[\u0590-\u083F]|[\u08A0-\u08FF]|[\uFB1D-\uFDFF]|[\uFE70-\uFEFF]/

  // Find first strongly directional character
  for (let char of text) {
    if (rtlChars.test(char)) {
      return 'rtl'
    } else if (/[A-Za-z]/.test(char)) {
      return 'ltr'
    }
  }

  return 'auto'
}

// Apply direction to dynamic content
function setContentDirection(element, text) {
  const direction = detectTextDirection(text)
  element.setAttribute('dir', direction)
  element.textContent = text
}

// Usage
const userComment = document.getElementById('user-comment')
setContentDirection(userComment, 'مرحبا بكم في موقعنا')
```

### Language and Direction Switching
```javascript
class LanguageDirectionManager {
  constructor() {
    this.rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi']
    this.currentLanguage = 'en'
  }

  setLanguage(languageCode) {
    this.currentLanguage = languageCode
    const direction = this.getDirection(languageCode)

    // Update document direction
    document.documentElement.setAttribute('dir', direction)
    document.documentElement.setAttribute('lang', languageCode)

    // Update body class for styling
    document.body.className = direction

    // Trigger custom event
    window.dispatchEvent(new CustomEvent('languagechange', {
      detail: { language: languageCode, direction }
    }))
  }

  getDirection(languageCode) {
    return this.rtlLanguages.includes(languageCode) ? 'rtl' : 'ltr'
  }

  getCurrentDirection() {
    return this.getDirection(this.currentLanguage)
  }
}

// Usage
const langManager = new LanguageDirectionManager()

document.getElementById('lang-switcher').addEventListener('change', (e) => {
  langManager.setLanguage(e.target.value)
})
```

## Common RTL Languages

| Language | Code | Direction |
|----------|------|-----------|
| Arabic | `ar` | RTL |
| Hebrew | `he` | RTL |
| Persian/Farsi | `fa` | RTL |
| Urdu | `ur` | RTL |
| Yiddish | `yi` | RTL |
| English | `en` | LTR |
| Chinese | `zh` | LTR |
| Japanese | `ja` | LTR |

## Best Practices

1. **Set at Document Level**: Use `dir` on `<html>` for page-wide direction
2. **Override When Needed**: Use `dir` on specific elements for mixed content
3. **Use with `lang`**: Always combine with appropriate language attributes
4. **CSS Logical Properties**: Use modern CSS logical properties when possible
5. **Test with Real Content**: Test with actual RTL text, not placeholder text
6. **Consider Typography**: RTL languages may need different fonts and spacing
7. **Keyboard Navigation**: Ensure tab order makes sense in RTL layouts
8. **Icon Direction**: Some icons need to be flipped in RTL contexts

## Support Notes

- Directionality and bidi behavior can vary by browser, OS text engine, and assistive technology, so validate the rendered UI in the supported browser matrix.
- Use a fallback note when mixed-direction content or framework rendering changes the effective direction behavior.

## Verification

### Browser Testing
```javascript
// Test direction support
function testDirectionSupport() {
  const testElement = document.createElement('div')
  testElement.setAttribute('dir', 'rtl')
  testElement.textContent = 'مرحبا'
  document.body.appendChild(testElement)

  const computedStyle = getComputedStyle(testElement)
  const isSupported = computedStyle.direction === 'rtl'

  document.body.removeChild(testElement)
  return isSupported
}

// Browser compatibility check
if (testDirectionSupport()) {
  console.log('✅ DIR attribute is supported')
} else {
  console.warn('⚠️ DIR attribute may not be fully supported')
}
```

### Accessibility Testing
```javascript
// Check if direction matches content language
function validateDirections() {
  const elementsWithDir = document.querySelectorAll('[dir]')
  const issues = []

  elementsWithDir.forEach(element => {
    const dir = element.getAttribute('dir')
    const lang = element.getAttribute('lang') ||
                 element.closest('[lang]')?.getAttribute('lang')

    if (lang && dir !== 'auto') {
      const expectedDir = isRTLLanguage(lang) ? 'rtl' : 'ltr'
      if (dir !== expectedDir) {
        issues.push({
          element,
          expected: expectedDir,
          actual: dir,
          language: lang
        })
      }
    }
  })

  return issues
}
```