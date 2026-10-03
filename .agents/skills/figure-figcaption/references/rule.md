# Use <figure> and <figcaption> for image captions

> Images with visible captions are wrapped in <figure> with a <figcaption> child, creating a semantic association between image and caption.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
The `<figure>` element wraps self-contained content, and `<figcaption>` provides its visible caption. Together they create a semantic relationship between an image and its description.

## Code Example

```html
<!-- ❌ Bad: Caption is visually adjacent but semantically unrelated to the image -->
<img src="waterfall.jpg" alt="Waterfall in Costa Rica">
<p>Nauyaca Waterfalls, Dominical, Costa Rica, 2023</p>

<!-- ✅ Good: Semantic association via figure/figcaption -->
<figure>
  <img
    src="waterfall.jpg"
    alt="Nauyaca Waterfalls, a wide two-tier waterfall surrounded by rainforest"
  >
  <figcaption>Nauyaca Waterfalls, Dominical, Costa Rica — March 2023</figcaption>
</figure>
```

## Why It Matters

Using a `<p>` tag as a caption is invisible to assistive technology as an image description. The `<figure>`/`<figcaption>` pattern creates a machine-readable relationship between an image and its caption, which screen readers surface to users. It also communicates to search engines that the caption describes the image, supporting image SEO.

## alt vs figcaption

`alt` and `figcaption` serve distinct purposes:

| | `alt` | `figcaption` |
|---|---|---|
| **Purpose** | Text alternative when image cannot be viewed | Visible caption describing or crediting the image |
| **Audience** | Screen reader users, image-disabled browsers | All users |
| **Content** | Conveys the image's meaning or function | Context, attribution, or additional information |
| **Visible** | No | Yes |

```html
<!-- ✅ alt and figcaption contain different information -->
<figure>
  <img
    src="chart.png"
    alt="Line chart showing website traffic doubled between January and June 2024"
  >
  <figcaption>
    Figure 1: Monthly unique visitors, January–June 2024. Source: Google Analytics.
  </figcaption>
</figure>
```

## figcaption Placement

`<figcaption>` must be the first or last child of `<figure>`.

```html
<!-- ✅ figcaption after the image (most common) -->
<figure>
  <img src="portrait.jpg" alt="Portrait of Ada Lovelace">
  <figcaption>Ada Lovelace, the world's first computer programmer</figcaption>
</figure>

<!-- ✅ figcaption before the image (e.g., for numbered figure labels) -->
<figure>
  <figcaption>Figure 2: System architecture overview</figcaption>
  <img src="architecture.png" alt="Diagram showing three-tier architecture with database, API, and frontend layers">
</figure>

<!-- ❌ Bad: figcaption as a middle child -->
<figure>
  <img src="portrait.jpg" alt="Portrait">
  <figcaption>Caption text</figcaption>
  <cite>Source: Wikipedia</cite>  <!-- cite should be inside figcaption, not a sibling -->
</figure>
```

## Complex Images with Long Descriptions

For charts or diagrams, `<figcaption>` can contain the full description that supplements a short `alt`.

```html
<figure>
  <img
    src="org-chart.png"
    alt="Company organisational chart"
    aria-labelledby="org-caption"
  >
  <figcaption id="org-caption">
    <strong>Organisational structure as of Q1 2024:</strong>
    The CEO oversees three departments. Engineering (12 staff) led by the CTO
    handles product development. Marketing (8 staff) led by the CMO handles
    growth. Operations (5 staff) led by the COO handles logistics.
  </figcaption>
</figure>
```

## When NOT to Use figure/figcaption

Not every image needs `<figure>`. Use it only when an image has a visible caption.

```html
<!-- ✅ Hero image with no caption — plain <img> is correct -->
<img
  src="hero.jpg"
  alt="Team members collaborating in a modern office"
  width="1200"
  height="600"
>

<!-- ✅ Decorative icon — no figure needed -->
<img src="checkmark.svg" alt="" aria-hidden="true">
```

## Styling

```css
/* Default browser styles vary—reset for consistency */
figure {
  margin: 0;
}

figure img {
  display: block;
  width: 100%;
  height: auto;
}

figcaption {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.5rem;
  font-style: italic;
}
```

## Standards

- Use these references as the standard for the final image format, delivery, accessibility, and rendering behavior.
- Check the implementation against MDN: Responsive images before treating the rule as satisfied.
- Check the implementation against web.dev: Image performance before treating the rule as satisfied.

## Verification

### Automated Checks

- Run the W3C HTML validator — it catches `<figcaption>` outside `<figure>` or as a non-first/last child
- Use axe DevTools — it flags images missing text alternatives, which may indicate missing figcaption structure

### Manual Checks

- Enable VoiceOver (macOS) and navigate with `W` to jump between images — a properly structured figure announces the figcaption as additional context