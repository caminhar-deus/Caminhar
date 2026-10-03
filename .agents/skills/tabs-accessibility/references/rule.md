# Make tabs keyboard navigable

> Tab components implement the ARIA tabs pattern with proper roles, states, and keyboard navigation.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 25 min

---
Accessible tabs require proper ARIA roles and keyboard navigation to support all users.

## Code Example

```html
<div class="tabs">
  <div role="tablist" aria-label="Product information">
    <button
      role="tab"
      id="tab-1"
      aria-selected="true"
      aria-controls="panel-1"
      tabindex="0"
    >
      Description
    </button>
    <button
      role="tab"
      id="tab-2"
      aria-selected="false"
      aria-controls="panel-2"
      tabindex="-1"
    >
      Specifications
    </button>
    <button
      role="tab"
      id="tab-3"
      aria-selected="false"
      aria-controls="panel-3"
      tabindex="-1"
    >
      Reviews
    </button>
  </div>

  <div
    role="tabpanel"
    id="panel-1"
    aria-labelledby="tab-1"
    tabindex="0"
  >
    <p>Product description content...</p>
  </div>

  <div
    role="tabpanel"
    id="panel-2"
    aria-labelledby="tab-2"
    tabindex="0"
    hidden
  >
    <p>Technical specifications...</p>
  </div>

  <div
    role="tabpanel"
    id="panel-3"
    aria-labelledby="tab-3"
    tabindex="0"
    hidden
  >
    <p>Customer reviews...</p>
  </div>
</div>
```

## Why It Matters

Incorrectly implemented tabs trap keyboard users or leave screen reader users unable to understand the relationship between tabs and their content.

## ARIA Tabs Pattern

| Element | Role | Key Attributes |
|---------|------|----------------|
| Container | `tablist` | `aria-label` or `aria-labelledby` |
| Tab button | `tab` | `aria-selected`, `aria-controls`, `tabindex` |
| Content | `tabpanel` | `aria-labelledby`, `tabindex="0"` |

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus into/out of tablist |
| `Arrow Left/Right` | Move between tabs |
| `Home` | Move to first tab |
| `End` | Move to last tab |
| `Enter/Space` | Activate focused tab (manual activation) |

## React Tabs Component

```tsx

interface Tab {
  id: string
  label: string
  content: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  label: string
  defaultTab?: number
  manual?: boolean // Manual or automatic activation
}

  tabs,
  label,
  defaultTab = 0,
  manual = false
}: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultTab)
  const [focusIndex, setFocusIndex] = useState(defaultTab)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const baseId = useId()

  const getTabId = (index: number) => `${baseId}-tab-${index}`
  const getPanelId = (index: number) => `${baseId}-panel-${index}`

  const activateTab = (index: number) => {
    setActiveIndex(index)
    setFocusIndex(index)
  }

  const focusTab = (index: number) => {
    setFocusIndex(index)
    tabRefs.current[index]?.focus()

    // Automatic activation: activate on focus
    if (!manual) {
      setActiveIndex(index)
    }
  }

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    let nextIndex: number | null = null

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        nextIndex = index > 0 ? index - 1 : tabs.length - 1
        break

      case 'ArrowRight':
        e.preventDefault()
        nextIndex = index < tabs.length - 1 ? index + 1 : 0
        break

      case 'Home':
        e.preventDefault()
        nextIndex = 0
        break

      case 'End':
        e.preventDefault()
        nextIndex = tabs.length - 1
        break

      case 'Enter':
      case ' ':
        if (manual) {
          e.preventDefault()
          activateTab(index)
        }
        break
    }

    if (nextIndex !== null) {
      focusTab(nextIndex)
    }
  }

  return (
    <div className="tabs">
      <div
        role="tablist"
        aria-label={label}
        className="tabs__list"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[index] = el }}
            role="tab"
            id={getTabId(index)}
            aria-selected={activeIndex === index}
            aria-controls={getPanelId(index)}
            tabIndex={focusIndex === index ? 0 : -1}
            onClick={() => activateTab(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`tabs__tab ${activeIndex === index ? 'tabs__tab--active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={getPanelId(index)}
          aria-labelledby={getTabId(index)}
          tabIndex={0}
          hidden={activeIndex !== index}
          className="tabs__panel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  )
}
```

## Usage

```tsx

    },
    {
      id: 'security',
      label: 'Security',
      content: 
    },
    {
      id: 'notifications',
      label: 'Notifications',
      content: 
    }
  ]}
/>
```

## Vertical Tabs

```tsx
interface VerticalTabsProps extends TabsProps {
  orientation?: 'horizontal' | 'vertical'
}

  tabs,
  label,
  defaultTab = 0,
  orientation = 'vertical'
}: VerticalTabsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultTab)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const baseId = useId()

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    // Vertical tabs use Up/Down instead of Left/Right
    const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
    const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'

    let nextIndex: number | null = null

    if (e.key === prevKey) {
      e.preventDefault()
      nextIndex = index > 0 ? index - 1 : tabs.length - 1
    } else if (e.key === nextKey) {
      e.preventDefault()
      nextIndex = index < tabs.length - 1 ? index + 1 : 0
    }

    if (nextIndex !== null) {
      setActiveIndex(nextIndex)
      tabRefs.current[nextIndex]?.focus()
    }
  }

  return (
    <div className={`tabs tabs--${orientation}`}>
      <div
        role="tablist"
        aria-label={label}
        aria-orientation={orientation}
        className="tabs__list"
      >
        {/* ... same as horizontal */}
      </div>
      {/* ... panels */}
    </div>
  )
}
```

## With Icons

```tsx
interface TabWithIcon {
  id: string
  label: string
  icon: React.ReactNode
  content: React.ReactNode
}

function TabButton({ tab, isActive, ...props }: {
  tab: TabWithIcon
  isActive: boolean
}) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={`tabs__tab ${isActive ? 'tabs__tab--active' : ''}`}
      {...props}
    >
      <span className="tabs__icon" aria-hidden="true">
        {tab.icon}
      </span>
      <span className="tabs__label">{tab.label}</span>
    </button>
  )
}
```

## Styling

```css
.tabs__list {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #ddd;
}

.tabs__tab {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #666;
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.tabs__tab:hover {
  color: #333;
}

.tabs__tab:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: -2px;
}

.tabs__tab--active {
  color: #0066cc;
  border-bottom-color: #0066cc;
  font-weight: 600;
}

.tabs__panel {
  padding: 1.5rem 0;
}

.tabs__panel:focus {
  outline: none;
}

.tabs__panel:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* Vertical tabs */
.tabs--vertical {
  display: flex;
  gap: 2rem;
}

.tabs--vertical .tabs__list {
  flex-direction: column;
  border-bottom: none;
  border-right: 1px solid #ddd;
}

.tabs--vertical .tabs__tab {
  border-bottom: none;
  border-right: 2px solid transparent;
  text-align: left;
}

.tabs--vertical .tabs__tab--active {
  border-right-color: #0066cc;
}
```

## Automatic vs Manual Activation

```tsx
// Automatic: Tab activates on focus (default, better UX)

// Manual: Tab activates on Enter/Space (use for destructive operations)

```

## Verification

1. Tab into tablist (focus on active tab)
2. Use Arrow keys to navigate between tabs
3. Verify only active tab is in tab order
4. Press Tab to move to panel content
5. Test Home/End keys
6. Verify screen reader announces tab roles and states
7. Check panel is associated with tab via aria-labelledby

Only the active tab should have `tabindex="0"`. All other tabs should have `tabindex="-1"`. This is called "roving tabindex" and ensures efficient keyboard navigation.