# Ensure all IDs are unique

> All ID attributes are unique within the document. No duplicate IDs exist on the page.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
ID attributes must be unique within an HTML document to ensure proper functionality of forms, accessibility features, and JavaScript interactions.

## Code Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Unique IDs Example</title>
</head>
<body>
    <header id="main-header">
        <h1>Site Title</h1>
    </header>

    <nav id="main-navigation">
        <ul>
            <li><a href="#section-1">Section 1</a></li>
            <li><a href="#section-2">Section 2</a></li>
        </ul>
    </nav>

    <main>
        <section id="section-1">
            <h2>First Section</h2>
        </section>

        <section id="section-2">
            <h2>Second Section</h2>
        </section>
    </main>
</body>
</html>
```

## Why It Matters

Duplicate IDs break form accessibility (labels don't connect), ARIA relationships fail, and JavaScript getElementById returns wrong elements—causing silent bugs.

## Form Labels and IDs

```html
<form>
    <div>
        <label for="first-name">First Name</label>
        <input type="text" id="first-name" name="firstName" required>
    </div>

    <div>
        <label for="last-name">Last Name</label>
        <input type="text" id="last-name" name="lastName" required>
    </div>

    <div>
        <label for="email-address">Email</label>
        <input type="email" id="email-address" name="email" required>
    </div>

    <div>
        <label for="message-text">Message</label>
        <textarea id="message-text" name="message" rows="4"></textarea>
    </div>
</form>
```

## ARIA and Accessibility IDs

```html
<section aria-labelledby="products-heading">
    <h2 id="products-heading">Our Products</h2>

    <div role="tablist" aria-labelledby="products-heading">
        <button role="tab"
                aria-controls="electronics-panel"
                aria-selected="true"
                id="electronics-tab">
            Electronics
        </button>

        <button role="tab"
                aria-controls="clothing-panel"
                aria-selected="false"
                id="clothing-tab">
            Clothing
        </button>
    </div>

    <div role="tabpanel"
         aria-labelledby="electronics-tab"
         id="electronics-panel">
        <p>Electronics content...</p>
    </div>

    <div role="tabpanel"
         aria-labelledby="clothing-tab"
         id="clothing-panel"
         hidden>
        <p>Clothing content...</p>
    </div>
</section>

<!-- Modal with proper ID relationships -->
<button aria-controls="user-menu" aria-expanded="false" id="user-menu-button">
    User Menu
</button>

<ul id="user-menu" role="menu" aria-labelledby="user-menu-button" hidden>
    <li role="menuitem"><a href="/profile">Profile</a></li>
    <li role="menuitem"><a href="/settings">Settings</a></li>
    <li role="menuitem"><a href="/logout">Logout</a></li>
</ul>
```

## Framework Examples

#

## Next.js with Unique IDs
```jsx

function ContactForm() {
  // Generate unique IDs for this component instance
  const formId = useId()
  const nameId = `${formId}-name`
  const emailId = `${formId}-email`
  const messageId = `${formId}-message`

  return (
    <form id={formId}>
      <div>
        <label htmlFor={nameId}>Name</label>
        <input type="text" id={nameId} name="name" />
      </div>

      <div>
        <label htmlFor={emailId}>Email</label>
        <input type="email" id={emailId} name="email" />
      </div>

      <div>
        <label htmlFor={messageId}>Message</label>
        <textarea id={messageId} name="message" />
      </div>
    </form>
  )
}

// Multiple instances won't have ID conflicts

  return (
    <div>
       {/* IDs: :r1:-name, :r1:-email, :r1:-message */}
       {/* IDs: :r2:-name, :r2:-email, :r2:-message */}
    </div>
  )
}
```

### React with Custom Hook for IDs
```jsx

// Custom hook for generating unique IDs
function useUniqueId(prefix = 'id') {
  const idRef = useRef()

  if (!idRef.current) {
    idRef.current = `${prefix}-${Math.random().toString(36).substr(2, 9)}`
  }

  return idRef.current
}

function FormField({ label, type = 'text', name, ...props }) {
  const fieldId = useUniqueId(`field-${name}`)

  return (
    <div className="form-field">
      <label htmlFor={fieldId}>{label}</label>
      <input type={type} id={fieldId} name={name} {...props} />
    </div>
  )
}

// Usage ensures unique IDs
function UserForm() {
  return (
    <form>
      
      
      
    </form>
  )
}
```

### Vue.js with Unique ID Generation
```vue
<template>
  <form>
    <div v-for="field in formFields" :key="field.name">
      <label :for="getFieldId(field.name)">{{ field.label }}</label>
      <input
        :type="field.type"
        :id="getFieldId(field.name)"
        :name="field.name"
        v-model="formData[field.name]"
      />
    </div>
  </form>
</template>

<script>

  data() {
    return {
      componentId: `form-${Math.random().toString(36).substr(2, 9)}`,
      formFields: [
        { name: 'firstName', label: 'First Name', type: 'text' },
        { name: 'lastName', label: 'Last Name', type: 'text' },
        { name: 'email', label: 'Email', type: 'email' }
      ],
      formData: {}
    }
  },
  methods: {
    getFieldId(fieldName) {
      return `${this.componentId}-${fieldName}`
    }
  }
}
</script>
```

### Vue.js Composition API
```vue
<template>
  <div>
    <h2 :id="headingId">Product Reviews</h2>
    <div role="tablist" :aria-labelledby="headingId">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :id="getTabId(tab.id)"
        :aria-controls="getPanelId(tab.id)"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-for="tab in tabs"
      :key="tab.id"
      :id="getPanelId(tab.id)"
      :aria-labelledby="getTabId(tab.id)"
      :hidden="activeTab !== tab.id"
    >
      {{ tab.content }}
    </div>
  </div>
</template>

<script setup>

const componentId = `reviews-${Math.random().toString(36).substr(2, 9)}`
const headingId = `${componentId}-heading`
const activeTab = ref('recent')

const tabs = [
  { id: 'recent', label: 'Recent Reviews', content: 'Recent reviews content...' },
  { id: 'helpful', label: 'Most Helpful', content: 'Helpful reviews content...' },
  { id: 'critical', label: 'Critical Reviews', content: 'Critical reviews content...' }
]

const getTabId = (tabId) => `${componentId}-tab-${tabId}`
const getPanelId = (tabId) => `${componentId}-panel-${tabId}`
</script>
```

## JavaScript and ID Management

### Dynamic Content with Unique IDs
```javascript
class ComponentManager {
  constructor() {
    this.componentCounter = 0
  }

  generateUniqueId(prefix = 'component') {
    return `${prefix}-${++this.componentCounter}-${Date.now()}`
  }

  createFormField(label, type = 'text', name) {
    const fieldId = this.generateUniqueId('field')

    const container = document.createElement('div')
    container.className = 'form-field'

    const labelEl = document.createElement('label')
    labelEl.htmlFor = fieldId
    labelEl.textContent = label

    const input = document.createElement('input')
    input.type = type
    input.id = fieldId
    input.name = name

    container.appendChild(labelEl)
    container.appendChild(input)

    return { container, input, label: labelEl }
  }

  createModal(title, content) {
    const modalId = this.generateUniqueId('modal')
    const headingId = this.generateUniqueId('modal-heading')
    const closeButtonId = this.generateUniqueId('modal-close')

    const modal = document.createElement('div')
    modal.id = modalId
    modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-labelledby', headingId)
    modal.setAttribute('aria-modal', 'true')

    modal.innerHTML = `
      <div class="modal-content">
        <header>
          <h2 id="${headingId}">${title}</h2>
          <button id="${closeButtonId}" aria-label="Close modal">&times;</button>
        </header>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `

    // Add close functionality
    modal.querySelector(`#${closeButtonId}`).addEventListener('click', () => {
      modal.remove()
    })

    return modal
  }
}

// Usage
const manager = new ComponentManager()

// Create multiple forms without ID conflicts
const userForm = manager.createFormField('Username', 'text', 'username')
const emailForm = manager.createFormField('Email', 'email', 'email')

document.body.appendChild(userForm.container)
document.body.appendChild(emailForm.container)
```

### ID Validation and Management
```javascript
class IDManager {
  constructor() {
    this.usedIds = new Set()
  }

  isIdUnique(id) {
    return !this.usedIds.has(id) && !document.getElementById(id)
  }

  registerID(id) {
    if (!this.isIdUnique(id)) {
      throw new Error(`ID "${id}" is already in use`)
    }
    this.usedIds.add(id)
    return id
  }

  generateUniqueId(prefix = 'auto') {
    let counter = 1
    let id = `${prefix}-${counter}`

    while (!this.isIdUnique(id)) {
      counter++
      id = `${prefix}-${counter}`
    }

    this.registerID(id)
    return id
  }

  removeID(id) {
    this.usedIds.delete(id)
  }

  validatePage() {
    const elements = document.querySelectorAll('[id]')
    const foundIds = new Set()
    const duplicates = []

    elements.forEach(element => {
      const id = element.id
      if (foundIds.has(id)) {
        duplicates.push(id)
      } else {
        foundIds.add(id)
      }
    })

    return {
      valid: duplicates.length === 0,
      duplicates,
      totalElements: elements.length,
      uniqueIds: foundIds.size
    }
  }
}

// Usage
const idManager = new IDManager()

// Safe ID generation
const uniqueId = idManager.generateUniqueId('my-component')
const element = document.createElement('div')
element.id = uniqueId

// Validate page
const validation = idManager.validatePage()
if (!validation.valid) {
  console.error('Duplicate IDs found:', validation.duplicates)
}
```

## CSS and ID Selectors

```css
/* Specific styling with IDs */
#main-header {
  background-color: #333;
  color: white;
  padding: 1rem;
}

#main-navigation ul {
  list-style: none;
  display: flex;
  gap: 1rem;
}

/* Form styling */
#contact-form {
  max-width: 600px;
  margin: 0 auto;
}

#contact-form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

#contact-form input,
#contact-form textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

/* State-specific styling */
#user-menu[aria-expanded="true"] {
  display: block;
}

#user-menu[aria-expanded="false"] {
  display: none;
}
```

## Common Issues and Solutions

### ❌ Duplicate IDs
```html
<!-- Bad: Same ID used multiple times -->
<div id="content">First content</div>
<div id="content">Second content</div>
<script>
  // This will only select the first element
  const content = document.getElementById('content')
</script>
```

### ✅ Unique IDs with Descriptive Names
```html
<!-- Good: Unique, descriptive IDs -->
<div id="main-content">Main page content</div>
<div id="sidebar-content">Sidebar content</div>
<script>
  const mainContent = document.getElementById('main-content')
  const sidebarContent = document.getElementById('sidebar-content')
</script>
```

### ❌ Generic or Unclear IDs
```html
<!-- Bad: Not descriptive -->
<div id="div1">...</div>
<div id="box">...</div>
<input id="input1">
```

### ✅ Semantic and Clear IDs
```html
<!-- Good: Clear purpose -->
<div id="product-gallery">...</div>
<div id="shopping-cart-summary">...</div>
<input id="search-query" type="search">
```

## Tools and Validation

### HTML Validators
```html
<!-- Use W3C Markup Validator to check for duplicate IDs -->
<!-- https://validator.w3.org/ -->
```

### Browser DevTools
```javascript
// Check for duplicate IDs in console
function findDuplicateIds() {
  const ids = {}
  const duplicates = []

  document.querySelectorAll('[id]').forEach(element => {
    const id = element.id
    if (ids[id]) {
      if (ids[id] === 1) {
        duplicates.push(id)
      }
      ids[id]++
    } else {
      ids[id] = 1
    }
  })

  return duplicates
}

console.log('Duplicate IDs:', findDuplicateIds())
```

### Automated Testing
```javascript
// Jest test for unique IDs
describe('Page HTML validation', () => {
  test('all IDs should be unique', () => {
    const elements = document.querySelectorAll('[id]')
    const ids = Array.from(elements).map(el => el.id)
    const uniqueIds = [...new Set(ids)]

    expect(ids.length).toBe(uniqueIds.length)
  })
})
```

## Best Practices

1. **Use descriptive names**: `user-profile-form` instead of `form1`
2. **Follow naming conventions**: kebab-case for HTML, camelCase for JavaScript
3. **Namespace related elements**: `modal-login`, `modal-login-title`, `modal-login-close`
4. **Validate during development**: Use linters and validators to catch duplicates
5. **Document ID usage**: Comment complex ID relationships in code

## Verification

### Automated Checks

- Inspect the final rendered HTML in the browser or page source to confirm the rule is satisfied.
- Validate the affected markup with browser tooling or an HTML validator where appropriate.
- Test one representative route or template that uses the pattern.
- Re-check shared components that emit the same markup so the fix is consistent.

### Manual Checks

- Verify the rendered browser behavior manually on representative routes and supported browsers so the user-facing outcome matches the rule.