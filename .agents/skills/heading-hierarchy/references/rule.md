# Use logical heading hierarchy

> Headings follow a sequential structure (h1 to h6) that reflects the content hierarchy without skipping levels.

**Priority:** critical · **Difficulty:** beginner · **Time:** 15 min

---
Headings create a document outline that screen readers use for navigation—proper hierarchy is essential.

## Code Example

```html
<!-- ✅ Good: Logical hierarchy -->
<h1>Web Accessibility Guide</h1>

<h2>Getting Started</h2>
<p>Introduction content...</p>

<h3>Prerequisites</h3>
<p>What you need to know...</p>

<h3>Tools</h3>
<p>Recommended tools...</p>

<h2>Core Principles</h2>
<p>Main principles content...</p>

<h3>Perceivable</h3>
<p>Content about perceivability...</p>
```

## Why It Matters

Screen reader users navigate by headings like a table of contents—skipping levels or poor hierarchy makes content impossible to understand and navigate.

## Common Mistakes

```html
<!-- ❌ Bad: Multiple h1 elements -->
<h1>Company Name</h1>
<h1>Product Page</h1>

<!-- ❌ Bad: Skipping heading levels -->
<h1>Main Title</h1>
<h3>This should be h2</h3>

<!-- ❌ Bad: Using headings for styling -->
<h4>I just want this text to be smaller</h4>

<!-- ❌ Bad: Non-descriptive headings -->
<h2>Section 1</h2>
<h2>Click Here</h2>
```

## Framework Examples

### React Component

```tsx
interface SectionProps {
  title: string
  level?: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
}

function Section({ title, level = 2, children }: SectionProps) {
  const Heading = `h${level}` as keyof JSX.IntrinsicElements

  return (
    <section aria-labelledby={`heading-${title.toLowerCase().replace(/\s/g, '-')}`}>
      
        {title}
      
      {children}
    </section>
  )
}
```

### Next.js Page Structure

```tsx

  return (
    <article>
      <h1>{post.title}</h1>

      <h2>Introduction</h2>
      <p>{post.intro}</p>

      {post.sections.map((section, index) => (
        <section key={index}>
          <h2>{section.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: section.content }} />

          {section.subsections?.map((sub, subIndex) => (
            <div key={subIndex}>
              <h3>{sub.title}</h3>
              <p>{sub.content}</p>
            </div>
          ))}
        </section>
      ))}
    </article>
  )
}
```

## Visual Styling Without Headings

```css
/* Style text without semantic heading */
.section-label {
  font-size: 1.25rem;
  font-weight: bold;
  color: #333;
}
```

```html
<!-- Use CSS class, not heading level for styling -->
<p class="section-label">This is styled text, not a heading</p>
```

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Standards

- Align the implementation with W3C WAI: WCAG Overview and verify the rendered experience, not only the source code.
- Align the implementation with MDN: Accessibility and verify the rendered experience, not only the source code.

## Verification

### Automated Checks

- Use browser DevTools to list all headings (HeadingsMap extension)

### Manual Checks

- Verify outline shows logical structure without skipped levels
- Check there's exactly one h1
- Screen reader: navigate headings with H key to verify order