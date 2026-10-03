# Avoid inline JavaScript

> Inline JavaScript is avoided. JavaScript is kept in external files for caching and maintainability.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
Avoid mixing JavaScript code with HTML markup by using external [`<script>` files](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script), [`addEventListener()`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener), and data attributes so behavior stays separate from markup and compatible with a strict [Content Security Policy](/Users/thedaviddias/Projects/frontendchecklist.io/packages/content/rules/en/security/csp.mdx).
## Code Examples

#

## Problems with Inline JavaScript
```html
<!-- ❌ Bad: Inline JavaScript mixed with HTML -->
<button onclick="alert('Hello World!')">Click me</button>

<div onmouseover="this.style.background='red'" onmouseout="this.style.background='white'">
  Hover me
</div>

<script>
  // Inline script block
  function doSomething() {
    document.getElementById('myButton').addEventListener('click', function() {
      alert('Button clicked!')
    })
  }
  doSomething()
</script>

<a href="javascript:void(0)" onclick="toggleMenu()">Menu</a>

<input type="text" onchange="validateInput(this.value)">
```

### Issues This Creates
```html
<!-- Problems with inline JavaScript: -->

<!-- 1. No caching - JavaScript downloaded with every page -->
<!-- 2. Maintenance nightmare - code scattered throughout HTML -->
<!-- 3. Security vulnerabilities - CSP violations, XSS risks -->
<!-- 4. No minification - code not optimized for production -->
<!-- 5. Hard to test - JavaScript mixed with markup -->
<!-- 6. Performance impact - blocks HTML parsing -->
<!-- 7. No reusability - same code repeated across pages -->
<!-- 8. Debugging difficulties - no source maps, line numbers -->
```

## Why It Matters

Inline JavaScript breaks browser caching, violates Content Security Policy (CSP), and creates unmaintainable spaghetti code mixing markup with behavior.

## Correct External JavaScript Approach

### Proper HTML Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Clean JavaScript Implementation</title>

  <!-- External JavaScript files -->
  <script src="js/utils.js" defer></script>
  <script src="js/components.js" defer></script>
  <script src="js/main.js" defer></script>
</head>
<body>
  <!-- Clean HTML with semantic classes and data attributes -->
  <button class="btn btn-primary" data-action="greet">
    Click me
  </button>

  <div class="hover-element" data-hover-color="red">
    Hover me
  </div>

  <button class="menu-toggle" data-target="#main-menu">
    Menu
  </button>

  <input type="text" class="validate-input" data-validation="required">

  <!-- No inline JavaScript anywhere -->
</body>
</html>
```

### External JavaScript Files
```javascript
// js/main.js
document.addEventListener('DOMContentLoaded', function() {
  // Initialize all components
  initializeButtons()
  initializeHoverElements()
  initializeMenuToggles()
  initializeInputValidation()
})

function initializeButtons() {
  const buttons = document.querySelectorAll('[data-action="greet"]')
  buttons.forEach(button => {
    button.addEventListener('click', function() {
      showGreeting('Hello World!')
    })
  })
}

function initializeHoverElements() {
  const hoverElements = document.querySelectorAll('.hover-element')
  hoverElements.forEach(element => {
    const hoverColor = element.dataset.hoverColor || 'red'
    const originalColor = getComputedStyle(element).backgroundColor

    element.addEventListener('mouseenter', function() {
      this.style.backgroundColor = hoverColor
    })

    element.addEventListener('mouseleave', function() {
      this.style.backgroundColor = originalColor
    })
  })
}

function initializeMenuToggles() {
  const menuToggles = document.querySelectorAll('.menu-toggle')
  menuToggles.forEach(toggle => {
    toggle.addEventListener('click', function(e) {
      e.preventDefault()
      const target = document.querySelector(this.dataset.target)
      if (target) {
        target.classList.toggle('active')
      }
    })
  })
}

function initializeInputValidation() {
  const inputs = document.querySelectorAll('.validate-input')
  inputs.forEach(input => {
    input.addEventListener('change', function() {
      validateInput(this)
    })
  })
}

// Utility functions
function showGreeting(message) {
  // Better than alert() - create a proper notification
  const notification = document.createElement('div')
  notification.className = 'notification'
  notification.textContent = message
  document.body.appendChild(notification)

  // Remove after 3 seconds
  setTimeout(() => {
    notification.remove()
  }, 3000)
}

function validateInput(input) {
  const validation = input.dataset.validation
  const value = input.value.trim()

  if (validation === 'required' && !value) {
    showValidationError(input, 'This field is required')
    return false
  }

  clearValidationError(input)
  return true
}

function showValidationError(input, message) {
  input.classList.add('error')

  let errorElement = input.nextElementSibling
  if (!errorElement || !errorElement.classList.contains('error-message')) {
    errorElement = document.createElement('div')
    errorElement.className = 'error-message'
    input.parentNode.insertBefore(errorElement, input.nextSibling)
  }

  errorElement.textContent = message
}

function clearValidationError(input) {
  input.classList.remove('error')

  const errorElement = input.nextElementSibling
  if (errorElement && errorElement.classList.contains('error-message')) {
    errorElement.remove()
  }
}
```

## Modern JavaScript Patterns

### Event Delegation
```javascript
// js/event-delegation.js
class EventManager {
  constructor() {
    this.initialize()
  }

  initialize() {
    // Use event delegation for better performance
    document.addEventListener('click', this.handleClick.bind(this))
    document.addEventListener('change', this.handleChange.bind(this))
    document.addEventListener('submit', this.handleSubmit.bind(this))
  }

  handleClick(event) {
    const { target } = event

    // Handle different click actions based on data attributes
    if (target.dataset.action) {
      this.executeAction(target.dataset.action, target, event)
    }

    // Handle toggle actions
    if (target.classList.contains('toggle-button')) {
      this.handleToggle(target, event)
    }

    // Handle modal triggers
    if (target.dataset.modal) {
      this.openModal(target.dataset.modal, event)
    }
  }

  handleChange(event) {
    const { target } = event

    // Handle form validation
    if (target.classList.contains('validate-on-change')) {
      this.validateField(target)
    }

    // Handle dependent fields
    if (target.dataset.affects) {
      this.updateDependentFields(target)
    }
  }

  handleSubmit(event) {
    const { target } = event

    if (target.classList.contains('ajax-form')) {
      event.preventDefault()
      this.submitFormAjax(target)
    }
  }

  executeAction(action, element, event) {
    const actions = {
      'show-notification': () => this.showNotification(element.dataset.message),
      'copy-to-clipboard': () => this.copyToClipboard(element.dataset.text),
      'scroll-to': () => this.scrollToElement(element.dataset.target),
      'toggle-theme': () => this.toggleTheme(),
      'share': () => this.shareContent(element.dataset.url, element.dataset.title)
    }

    if (actions[action]) {
      actions[action]()
    }
  }

  showNotification(message) {
    const notification = document.createElement('div')
    notification.className = 'notification fade-in'
    notification.innerHTML = `
      <span class="notification-message">${message}</span>
      <button class="notification-close">&times;</button>
    `

    document.body.appendChild(notification)

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.classList.add('fade-out')
      setTimeout(() => notification.remove(), 300)
    }, 5000)

    // Handle close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.classList.add('fade-out')
      setTimeout(() => notification.remove(), 300)
    })
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
      this.showNotification('Copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy text:', error)
      this.showNotification('Failed to copy text')
    }
  }

  scrollToElement(selector) {
    const element = document.querySelector(selector)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  toggleTheme() {
    document.body.classList.toggle('dark-theme')
    localStorage.setItem('theme',
      document.body.classList.contains('dark-theme') ? 'dark' : 'light'
    )
  }

  async shareContent(url, title) {
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch (error) {
        console.log('Share cancelled or failed:', error)
      }
    } else {
      // Fallback to copying URL
      this.copyToClipboard(url)
    }
  }
}

// Initialize event manager
new EventManager()
```

### Component-Based Architecture
```javascript
// js/components/button.js
class Button {
  constructor(element) {
    this.element = element
    this.initialize()
  }

  initialize() {
    this.bindEvents()
    this.setState(this.element.dataset.state || 'default')
  }

  bindEvents() {
    this.element.addEventListener('click', this.handleClick.bind(this))
    this.element.addEventListener('mouseenter', this.handleMouseEnter.bind(this))
    this.element.addEventListener('mouseleave', this.handleMouseLeave.bind(this))
  }

  handleClick(event) {
    if (this.element.disabled) {
      event.preventDefault()
      return
    }

    const action = this.element.dataset.action
    if (action) {
      this.executeAction(action)
    }

    // Emit custom event
    this.element.dispatchEvent(new CustomEvent('button:click', {
      detail: { action, element: this.element }
    }))
  }

  handleMouseEnter() {
    this.element.classList.add('hover')
  }

  handleMouseLeave() {
    this.element.classList.remove('hover')
  }

  executeAction(action) {
    switch (action) {
      case 'submit':
        this.submitForm()
        break
      case 'reset':
        this.resetForm()
        break
      case 'toggle':
        this.toggleState()
        break
      default:
        console.warn(`Unknown button action: ${action}`)
    }
  }

  submitForm() {
    const form = this.element.closest('form')
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true }))
    }
  }

  resetForm() {
    const form = this.element.closest('form')
    if (form) {
      form.reset()
    }
  }

  toggleState() {
    const currentState = this.element.dataset.state
    const newState = currentState === 'active' ? 'inactive' : 'active'
    this.setState(newState)
  }

  setState(state) {
    this.element.dataset.state = state
    this.element.classList.remove('default', 'active', 'inactive', 'loading', 'disabled')
    this.element.classList.add(state)
  }

  setLoading(loading = true) {
    if (loading) {
      this.setState('loading')
      this.element.disabled = true
    } else {
      this.setState('default')
      this.element.disabled = false
    }
  }
}

// Auto-initialize all buttons
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('button[data-component="button"]')
  buttons.forEach(button => new Button(button))
})
```

## Framework-Specific Implementations

### React - Proper Event Handling
```jsx
// ❌ Bad: Inline event handlers
function BadComponent() {
  return (
    <div>
      <button onClick={() => alert('Hello!')}>
        Click me
      </button>

      <input
        onChange={(e) => {
          if (e.target.value.length < 3) {
            alert('Too short!')
          }
        }}
      />

      <div
        onMouseEnter={() => document.body.style.background = 'red'}
        onMouseLeave={() => document.body.style.background = 'white'}
      >
        Hover area
      </div>
    </div>
  )
}

// ✅ Good: Proper event handling

function GoodComponent() {
  const [inputValue, setInputValue] = useState('')
  const [notification, setNotification] = useState('')
  const timeoutRef = useRef()

  const handleButtonClick = useCallback(() => {
    setNotification('Hello!')

    // Clear notification after 3 seconds
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setNotification('')
    }, 3000)
  }, [])

  const handleInputChange = useCallback((event) => {
    const value = event.target.value
    setInputValue(value)

    if (value.length < 3 && value.length > 0) {
      setNotification('Input too short!')
    } else {
      setNotification('')
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    document.body.classList.add('highlight-mode')
  }, [])

  const handleMouseLeave = useCallback(() => {
    document.body.classList.remove('highlight-mode')
  }, [])

  return (
    <div className="component">
      <button
        className="btn btn-primary"
        onClick={handleButtonClick}
        type="button"
      >
        Click me
      </button>

      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        className={inputValue.length < 3 && inputValue.length > 0 ? 'error' : ''}
      />

      <div
        className="hover-area"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        Hover area
      </div>

      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}
    </div>
  )
}

```

### Vue.js - Template and Script Separation
```vue
<!-- ❌ Bad: Inline JavaScript in template -->
<template>
  <div>
    <button @click="alert('Hello!')">Click me</button>

    <input @change="if ($event.target.value.length < 3) alert('Too short!')">

    <div @mouseenter="$el.style.background = 'red'">Hover me</div>
  </div>
</template>

<!-- ✅ Good: Proper method separation -->
<template>
  <div class="component">
    <button
      class="btn btn-primary"
      @click="handleButtonClick"
      type="button"
    >
      Click me
    </button>

    <input
      v-model="inputValue"
      @input="handleInputChange"
      :class="{ error: isInputTooShort }"
      type="text"
    />

    <div
      class="hover-area"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      Hover area
    </div>

    <div v-if="notification" class="notification">
      {{ notification }}
    </div>
  </div>
</template>

<script>

  name: 'GoodComponent',

  data() {
    return {
      inputValue: '',
      notification: '',
      notificationTimeout: null
    }
  },

  computed: {
    isInputTooShort() {
      return this.inputValue.length < 3 && this.inputValue.length > 0
    }
  },

  methods: {
    handleButtonClick() {
      this.showNotification('Hello!')
    },

    handleInputChange() {
      if (this.isInputTooShort) {
        this.showNotification('Input too short!')
      } else {
        this.clearNotification()
      }
    },

    handleMouseEnter() {
      document.body.classList.add('highlight-mode')
    },

    handleMouseLeave() {
      document.body.classList.remove('highlight-mode')
    },

    showNotification(message) {
      this.notification = message

      clearTimeout(this.notificationTimeout)
      this.notificationTimeout = setTimeout(() => {
        this.clearNotification()
      }, 3000)
    },

    clearNotification() {
      this.notification = ''
      if (this.notificationTimeout) {
        clearTimeout(this.notificationTimeout)
        this.notificationTimeout = null
      }
    }
  },

  beforeUnmount() {
    // Cleanup timeouts
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout)
    }
  }
}
</script>

<style scoped>
.component {
  padding: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.error {
  border-color: #dc3545;
}

.notification {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 4px;
  color: #155724;
}

.hover-area {
  padding: 2rem;
  border: 2px dashed #ccc;
  text-align: center;
  margin-top: 1rem;
}
</style>
```

### Angular - Component Architecture
```typescript
// ❌ Bad: Inline event handling
@Component({
  template: `
    <button (click)="alert('Hello!')">Click me</button>
    <input (change)="$event.target.value.length < 3 ? alert('Too short!') : null">
  `
})

// ✅ Good: Proper component structure

@Component({
  selector: 'app-good-component',
  template: `
    <div class="component">
      <button
        class="btn btn-primary"
        (click)="handleButtonClick()"
        type="button"
      >
        Click me
      </button>

      <input
        [(ngModel)]="inputValue"
        (input)="handleInputChange()"
        [class.error]="isInputTooShort"
        type="text"
      />

      <div
        class="hover-area"
        (mouseenter)="handleMouseEnter()"
        (mouseleave)="handleMouseLeave()"
      >
        Hover area
      </div>

      <div *ngIf="notification" class="notification">
        {{ notification }}
      </div>
    </div>
  `,
  styleUrls: ['./good-component.component.css']
})

  inputValue = ''
  notification = ''
  private notificationTimeout?: number

  get isInputTooShort(): boolean {
    return this.inputValue.length < 3 && this.inputValue.length > 0
  }

  handleButtonClick(): void {
    this.showNotification('Hello!')
  }

  handleInputChange(): void {
    if (this.isInputTooShort) {
      this.showNotification('Input too short!')
    } else {
      this.clearNotification()
    }
  }

  handleMouseEnter(): void {
    document.body.classList.add('highlight-mode')
  }

  handleMouseLeave(): void {
    document.body.classList.remove('highlight-mode')
  }

  private showNotification(message: string): void {
    this.notification = message

    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout)
    }

    this.notificationTimeout = window.setTimeout(() => {
      this.clearNotification()
    }, 3000)
  }

  private clearNotification(): void {
    this.notification = ''
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout)
      this.notificationTimeout = undefined
    }
  }

  ngOnDestroy(): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout)
    }
  }
}
```

## Content Security Policy (CSP) Compliance

### CSP Configuration
```html
<!-- Strict CSP that prevents inline JavaScript -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-eval';
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
">
```

### CSP-Compliant JavaScript
```javascript
// js/csp-compliant.js
// No eval(), no Function(), no inline event handlers

class CSPCompliantApp {
  constructor() {
    this.initialize()
  }

  initialize() {
    // Use proper event listeners instead of inline handlers
    this.bindEvents()
    this.loadConfiguration()
  }

  bindEvents() {
    // Event delegation for dynamically added elements
    document.addEventListener('click', this.handleGlobalClick.bind(this))
    document.addEventListener('DOMContentLoaded', this.handleDOMReady.bind(this))
  }

  handleGlobalClick(event) {
    const action = event.target.dataset.action
    if (action && this.actions[action]) {
      this.actions[action](event.target, event)
    }
  }

  // Define actions as methods instead of eval() or Function()
  actions = {
    showAlert: (element) => {
      this.showAlert(element.dataset.message || 'Default message')
    },

    toggleClass: (element) => {
      const className = element.dataset.toggleClass
      const target = element.dataset.target
        ? document.querySelector(element.dataset.target)
        : element

      if (target && className) {
        target.classList.toggle(className)
      }
    },

    submitForm: (element) => {
      const form = element.closest('form')
      if (form) {
        this.handleFormSubmission(form)
      }
    }
  }

  showAlert(message) {
    // Use proper DOM manipulation instead of alert()
    const alertDiv = document.createElement('div')
    alertDiv.className = 'alert'
    alertDiv.textContent = message

    document.body.appendChild(alertDiv)

    setTimeout(() => {
      alertDiv.remove()
    }, 3000)
  }

  async loadConfiguration() {
    // Load configuration from external source instead of inline
    try {
      const response = await fetch('/api/config')
      const config = await response.json()
      this.applyConfiguration(config)
    } catch (error) {
      console.error('Failed to load configuration:', error)
      this.applyDefaultConfiguration()
    }
  }

  applyConfiguration(config) {
    // Apply configuration without using eval()
    if (config.theme) {
      document.body.className = `theme-${config.theme}`
    }

    if (config.features) {
      config.features.forEach(feature => {
        document.body.classList.add(`feature-${feature}`)
      })
    }
  }

  applyDefaultConfiguration() {
    this.applyConfiguration({
      theme: 'default',
      features: ['basic']
    })
  }
}

// Initialize application
new CSPCompliantApp()
```

## Performance Optimization

### Lazy Loading JavaScript
```javascript
// js/lazy-loader.js
class LazyJavaScriptLoader {
  constructor() {
    this.loadedModules = new Set()
    this.observers = new Map()
  }

  // Load JavaScript modules on demand
  async loadModule(moduleName, condition = () => true) {
    if (this.loadedModules.has(moduleName) || !condition()) {
      return
    }

    try {
      const module = await import(`./modules/${moduleName}.js`)
      this.loadedModules.add(moduleName)

      if (module.initialize) {
        module.initialize()
      }

      return module
    } catch (error) {
      console.error(`Failed to load module ${moduleName}:`, error)
    }
  }

  // Load modules when elements come into view
  observeElement(element, moduleName) {
    if (!('IntersectionObserver' in window)) {
      // Fallback: load immediately
      this.loadModule(moduleName)
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadModule(moduleName)
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.1 })

    observer.observe(element)
    this.observers.set(element, observer)
  }

  // Load modules based on user interaction
  loadOnInteraction(selector, moduleName, eventType = 'click') {
    const elements = document.querySelectorAll(selector)

    elements.forEach(element => {
      const handler = () => {
        this.loadModule(moduleName)
        element.removeEventListener(eventType, handler)
      }

      element.addEventListener(eventType, handler, { once: true })
    })
  }

  // Load modules based on media queries
  loadOnMediaQuery(query, moduleName) {
    const mediaQuery = window.matchMedia(query)

    const handler = (mq) => {
      if (mq.matches) {
        this.loadModule(moduleName)
      }
    }

    handler(mediaQuery) // Check initial state
    mediaQuery.addEventListener('change', handler)
  }
}

// Usage
const lazyLoader = new LazyJavaScriptLoader()

// Load chart library when chart container is visible
document.addEventListener('DOMContentLoaded', () => {
  const chartContainer = document.querySelector('.chart-container')
  if (chartContainer) {
    lazyLoader.observeElement(chartContainer, 'charts')
  }

  // Load modal functionality on first modal trigger click
  lazyLoader.loadOnInteraction('[data-modal]', 'modals')

  // Load mobile navigation on mobile devices
  lazyLoader.loadOnMediaQuery('(max-width: 768px)', 'mobile-nav')
})
```

## Best Practices

Build around external scripts, [`data-*` attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/data-%2A), and event listeners so the HTML stays semantic even when the JavaScript needs to evolve independently.

1. **External Files**: Always use external JavaScript files instead of inline scripts
2. **Event Delegation**: Use event delegation for better performance and maintainability
3. **CSP Compliance**: Ensure code works with strict Content Security Policies
4. **Separation of Concerns**: Keep HTML, CSS, and JavaScript separate
5. **Performance**: Implement lazy loading for non-critical JavaScript
6. **Accessibility**: Use proper event handling for keyboard and screen reader support
7. **Error Handling**: Implement proper error handling and fallbacks
8. **Modern Patterns**: Use modern JavaScript patterns and APIs
9. **Testing**: Write testable code by separating logic from DOM manipulation
10. **Documentation**: Document complex interactions and component behaviors

## Migration Strategy

### Converting Inline to External JavaScript
```javascript
// scripts/inline-to-external-converter.js
const fs = require('fs')
const cheerio = require('cheerio')

class InlineToExternalConverter {
  constructor() {
    this.extractedScripts = []
    this.inlineHandlers = []
    this.scriptCounter = 0
  }

  convertFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    const $ = cheerio.load(content)

    // Extract inline scripts
    $('script:not([src])').each((index, script) => {
      const scriptContent = $(script).html()
      if (scriptContent.trim()) {
        const scriptName = `extracted-script-${this.scriptCounter++}.js`
        this.extractedScripts.push({
          name: scriptName,
          content: scriptContent
        })

        // Replace with external script reference
        $(script).attr('src', `js/${scriptName}`)
        $(script).html('')
      }
    })

    // Extract inline event handlers
    $('*').each((index, element) => {
      const $element = $(element)
      const attributes = element.attribs || {}

      Object.keys(attributes).forEach(attr => {
        if (attr.startsWith('on') && attributes[attr].includes('(')) {
          const eventType = attr.substring(2) // Remove 'on' prefix
          const handlerCode = attributes[attr]
          const elementId = $element.attr('id') || `element-${index}`

          // Add ID if not present
          if (!$element.attr('id')) {
            $element.attr('id', elementId)
          }

          // Remove inline handler
          $element.removeAttr(attr)

          // Store handler for external script
          this.inlineHandlers.push({
            elementId,
            eventType,
            handlerCode
          })
        }
      })
    })

    // Write updated HTML
    fs.writeFileSync(filePath, $.html())

    return {
      extractedScripts: this.extractedScripts,
      inlineHandlers: this.inlineHandlers
    }
  }

  generateExternalScripts(outputDir) {
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Write extracted scripts
    this.extractedScripts.forEach(script => {
      fs.writeFileSync(
        `${outputDir}/${script.name}`,
        script.content
      )
    })

    // Generate handlers script
    if (this.inlineHandlers.length > 0) {
      const handlersScript = this.generateHandlersScript()
      fs.writeFileSync(
        `${outputDir}/event-handlers.js`,
        handlersScript
      )
    }
  }

  generateHandlersScript() {
    let script = '// Auto-generated event handlers\n\n'
    script += 'document.addEventListener("DOMContentLoaded", function() {\n'

    this.inlineHandlers.forEach(handler => {
      script += `  const element${handler.elementId.replace(/[^a-zA-Z0-9]/g, '')} = document.getElementById('${handler.elementId}');\n`
      script += `  if (element${handler.elementId.replace(/[^a-zA-Z0-9]/g, '')}) {\n`
      script += `    element${handler.elementId.replace(/[^a-zA-Z0-9]/g, '')}.addEventListener('${handler.eventType}', function(event) {\n`
      script += `      ${handler.handlerCode}\n`
      script += `    });\n`
      script += `  }\n\n`
    })

    script += '});\n'
    return script
  }
}

// Usage
const converter = new InlineToExternalConverter()
const result = converter.convertFile('index.html')
converter.generateExternalScripts('./js')

console.log(`Extracted ${result.extractedScripts.length} inline scripts`)
console.log(`Converted ${result.inlineHandlers.length} inline event handlers`)
```

Remember that separating JavaScript from HTML is not just about code organization—it's about creating maintainable, secure, and performant web applications that can scale effectively.

## Verification

1. Verify the behavior in the browser after the code change, not only in static analysis.
2. Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
3. Test the primary user flow and one edge case triggered by the changed script path.
4. Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.