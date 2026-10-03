# Hide decorative elements from assistive technology

> Decorative images and visual elements are hidden from screen readers using aria-hidden or empty alt attributes.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
Decorative elements should be hidden from screen readers to reduce noise and clutter.

## Code Example

```html
<!-- ❌ Bad: Missing alt (screen reader guesses from filename) -->
<img src="decorative-border.png">
<!-- Screen reader: "decorative-border.png, image" -->

<!-- ❌ Bad: Meaningless alt text -->
<img src="border.png" alt="border">
<!-- Screen reader: "border, image" -->

<!-- ✅ Good: Empty alt for decorative images -->
<img src="decorative-border.png" alt="">
<!-- Screen reader: (skipped) -->

<!-- ✅ Better: Use CSS for decoration -->
<div class="decorative-border"></div>
```

## Why It Matters

Screen readers announce every image and icon—decorative elements clutter the experience with meaningless 'image, decorative border, image, bullet' announcements.

## Decorative vs Informative

| Decorative (Hide) | Informative (Describe) |
|-------------------|------------------------|
| Background patterns | Charts and diagrams |
| Decorative borders | Product photos |
| Bullet icons | Icons conveying meaning |
| Spacer images | Logos with meaning |

## Decorative SVGs and Icons

```html
<!-- ❌ Bad: SVG without hiding -->
<svg viewBox="0 0 24 24">
  <path d="..."/>
</svg>
<!-- Screen reader may announce SVG content -->

<!-- ✅ Good: Hidden decorative SVG -->
<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="..."/>
</svg>

<!-- ✅ Good: Icon next to text -->
<button>
  <svg aria-hidden="true"><!-- checkmark icon --></svg>
  Save changes
</button>
```

## Icon Fonts

```html
<!-- ❌ Bad: Icon font without hiding -->
<i class="fa fa-star"></i>
<!-- Screen reader may announce Unicode character -->

<!-- ✅ Good: Hidden icon font -->
<i class="fa fa-star" aria-hidden="true"></i>

<!-- ✅ Good: With visible label -->
<span>
  <i class="fa fa-star" aria-hidden="true"></i>
  Favorite
</span>
```

## Role Presentation

```html
<!-- Remove semantic meaning from element -->
<table role="presentation">
  <!-- Layout table, not data table -->
</table>

<!-- Decorative list bullets -->
<ul role="presentation">
  <li role="presentation">Item styled as bullet points only</li>
</ul>
```

## React Components

```tsx
// Decorative image component
function DecorativeImage({ src, className }: { src: string; className?: string }) {
  return <img src={src} alt="" className={className} role="presentation" />
}

// Decorative icon component
function DecorativeIcon({ icon }: { icon: React.ReactNode }) {
  return <span aria-hidden="true">{icon}</span>
}

// Icon with text (icon is decorative)
function IconText({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span>
      <span aria-hidden="true">{icon}</span>
      {children}
    </span>
  )
}
```

## CSS Background Images

```css
/* ✅ Best for purely decorative visuals */
.decorative-banner {
  background-image: url('pattern.svg');
  background-repeat: repeat;
}

.fancy-border::before {
  content: '';
  background-image: url('border-ornament.svg');
}
```

## Exceptions

- Logos, purely decorative text treatments, and screenshots used as documentation can be valid exceptions when their accessible alternative is still provided appropriately.
- An image or media rule should not force redundant alt text, captions, or transcripts when another nearby mechanism already provides the equivalent information clearly.
- If the media asset fails more than one rule, prioritize the issue that most directly blocks understanding for assistive technology users.

## Standards

- Align the implementation with WAI-ARIA 1.2 and verify the rendered experience, not only the source code.
- Align the implementation with MDN: ARIA and verify the rendered experience, not only the source code.

## Verification

### Automated Checks

- Check axe DevTools for images missing alt

### Manual Checks

- Use screen reader to navigate page
- Decorative elements should not be announced
- Verify meaningful content is still accessible