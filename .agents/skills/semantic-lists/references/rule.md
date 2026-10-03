# Use semantic list elements

> Groups of related items use ul, ol, or dl elements so screen readers announce list context and item count.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
Semantic list elements tell screen readers the content structure, enabling efficient navigation.

## Code Example

```html
<!-- ❌ Bad: Styled divs with no semantics -->
<div class="feature-list">
  <div class="feature">Fast performance</div>
  <div class="feature">Easy setup</div>
  <div class="feature">24/7 support</div>
</div>

<!-- ✅ Good: Semantic unordered list -->
<ul class="feature-list">
  <li>Fast performance</li>
  <li>Easy setup</li>
  <li>24/7 support</li>
</ul>
```

## Why It Matters

Screen readers announce list structure and item count—'list with 5 items'—helping users understand content organization. Styled divs provide no context.

## List Types

| Element | Use For | Announcement |
|---------|---------|--------------|
| `<ul>` | Unordered items | "List with X items" |
| `<ol>` | Ordered sequences | "List with X items" + position |
| `&lt;dl&gt;` | Term-definition pairs | "Definition list" |

## Ordered Lists

```html
<!-- ❌ Bad: Manual numbering -->
<div class="steps">
  <div>1. Sign up for an account</div>
  <div>2. Complete your profile</div>
  <div>3. Start using the app</div>
</div>

<!-- ✅ Good: Semantic ordered list -->
<ol class="steps">
  <li>Sign up for an account</li>
  <li>Complete your profile</li>
  <li>Start using the app</li>
</ol>
```

## Definition Lists

```html
<!-- ✅ Good: Term-definition pairs -->
<dl class="glossary">
  &lt;dt&gt;API</dt>
  &lt;dd&gt;Application Programming Interface</dd>

  &lt;dt&gt;REST</dt>
  &lt;dd&gt;Representational State Transfer</dd>

  &lt;dt&gt;JSON</dt>
  &lt;dd&gt;JavaScript Object Notation</dd>
</dl>

<!-- FAQ using definition list -->
<dl class="faq">
  &lt;dt&gt;How do I reset my password?</dt>
  &lt;dd&gt;Click the "Forgot Password" link on the login page.</dd>

  &lt;dt&gt;What payment methods do you accept?</dt>
  &lt;dd&gt;We accept Visa, Mastercard, and PayPal.</dd>
</dl>
```

## Navigation Lists

```html
<!-- ✅ Good: Navigation as list -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>
```

## React Component

```tsx
interface ListProps {
  items: string[]
  ordered?: boolean
}

function List({ items, ordered = false }: ListProps) {
  const Tag = ordered ? 'ol' : 'ul'

  return (
    
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    
  )
}
```

## CSS Styling

```css
/* Remove default bullets while keeping semantics */
ul.clean-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* Custom bullets with accessibility preserved */
ul.custom-bullets li::before {
  content: "✓";
  margin-right: 0.5em;
  color: green;
}
```

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Verification

### Automated Checks

- Use browser accessibility tooling, axe, Lighthouse, or equivalent automated checks against a representative rendered state.

### Manual Checks

- Use screen reader to navigate lists
- Verify "list with X items" announcement
- Check item count matches visible items