# Avoid redundant image alternative text

> Alternative text should not contain redundant words like 'image' or 'photo'.

**Priority:** low · **Difficulty:** beginner · **Time:** 5 min

---
Alt text should be concise and descriptive. The [WAI images tutorial](https://www.w3.org/WAI/tutorials/images/decision-tree/) and the [`<img>` element reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img) both assume assistive technology already knows it is dealing with an image, so adding words like "image" or "photo" just repeats information.
## Code Examples

### Incorrect Implementation
```html
<img src="dog.jpg" alt="A photo of a Golden Retriever playing in the park">

<!-- Redundant with caption -->
<p>A Golden Retriever playing in the park</p>
<img src="dog.jpg" alt="A Golden Retriever playing in the park">
```

### Correct Implementation
```html
<img src="dog.jpg" alt="Golden Retriever playing in the park">

<!-- Decorative image or described by caption -->
<p>A Golden Retriever playing in the park</p>
<img src="dog.jpg" alt="">
```

## Why It Matters

- **Verbosity**: Screen readers say "Graphic" or "Image" before reading the alt text. If your alt text is "Image of a dog", the user hears "Graphic, image of a dog".
- **Efficiency**: Users can consume content faster when it's not cluttered with unnecessary words.
- **Cognitive Clarity**: Focuses the user's attention on the *content* and *meaning* of the image rather than the fact that it is an image.

## Best Practices

✅ **Focus on Information**: Describe what the image conveys, not what it is.

✅ **Use Null Alt for Decorative Images**: If an image is purely for decoration or is already described by text, use `alt=""`.

❌ **Don't repeat the filename**: `alt="IMG_001.jpg"` is never helpful.

## Exceptions

- Logos, purely decorative text treatments, and screenshots used as documentation can be valid exceptions when their accessible alternative is still provided appropriately.
- An image or media rule should not force redundant alt text, captions, or transcripts when another nearby mechanism already provides the equivalent information clearly.
- If the media asset fails more than one rule, prioritize the issue that most directly blocks understanding for assistive technology users.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.