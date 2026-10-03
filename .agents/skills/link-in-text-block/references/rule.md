# Make links in text blocks visually distinguishable

> Links within blocks of text must be distinguishable from surrounding non-link text by more than color alone.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Links embedded within paragraphs or text blocks must be identifiable without relying solely on color. [WCAG 1.4.1 Use of Color](https://www.w3.org/TR/WCAG21/#use-of-color), [Technique G183](https://www.w3.org/WAI/WCAG21/Techniques/general/G183), and [WebAIM's link guidance](https://webaim.org/techniques/hypertext/) all treat inline links as a distinct case because they sit inside surrounding prose.
## Code Examples

### Approach 1: Underline (Recommended)

The browser's default `text-decoration: underline` satisfies WCAG SC 1.4.1 on its own. It is universally understood and color-independent.

```css
/* ✅ Good: underline preserved — default browser behavior */
.article a {
  color: #0056b3;
  text-decoration: underline;
}
```

### Approach 2: No Underline + 3:1 Contrast + Non-color Hover Cue

If design requires removing underlines, all three conditions must be met simultaneously:

1. Link color vs. body text color: ≥ 3:1 contrast ratio
2. Link color vs. background: ≥ 4.5:1 contrast ratio (regular text requirement)
3. A non-color visual change on hover/focus (underline, bold, background)

```css
/* ✅ Acceptable: no underline — but must verify 3:1 link vs body text contrast */
.article a {
  color: #0066cc;  /* Must be ≥ 3:1 against surrounding #333333 body text */
  text-decoration: none;
}

/* ✅ Required: non-color change on hover and focus */
.article a:hover,
.article a:focus {
  text-decoration: underline; /* non-color cue added on interaction */
  outline: 2px solid #0066cc;
}

/* ❌ Fail: only color difference, no underline, no hover cue */
.article a {
  color: #cc0000; /* Might be visible to most, but not color-blind users */
  text-decoration: none;
}
```

## Why It Matters

This is not just a styling preference. [Failure F73](https://www.w3.org/WAI/WCAG21/Techniques/failures/F73) documents exactly what happens when links are only different by color and nothing else cues users that the text is interactive.

- **Color Blindness**: Users with protanopia or deuteranopia cannot distinguish red or green tints from surrounding text.
- **Low Vision**: Users relying on high-contrast modes may see a different color palette where link color matches body text.
- **Cognitive Load**: Underlines are a learned universal signal; removing them forces users to hover over text to discover links.
- **WCAG Level A**: SC 1.4.1 is a Level A requirement — the lowest threshold, meaning it applies to all publicly accessible content.

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.