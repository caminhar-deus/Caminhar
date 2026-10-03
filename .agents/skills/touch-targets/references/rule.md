# Provide sufficient touch target size

> Interactive elements must have large enough touch targets so users with motor impairments can activate them accurately on touchscreen devices.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
Touch targets are the portions of the screen that respond to user input. [WCAG 2.2 Target Size (Minimum)](https://www.w3.org/TR/WCAG22/#target-size-minimum), the older [WCAG 2.5.5 target size guidance](https://www.w3.org/TR/WCAG21/#target-size), and platform guidance from Apple and Google all converge on the same idea: interactive areas must be physically generous enough to hit reliably.
## Code Example

```css
/* ✅ Good: padding ensures sufficient touch target */
.button {
  padding: 12px 16px;
  min-height: 44px;
  min-width: 44px;
}

/* ✅ Good: icon-only button with padding expanding hit area */
.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;  /* Visual icon size */
  height: 20px;
  padding: 12px; /* Expands touch area to 44×44px total */
  background: transparent;
  border: none;
  cursor: pointer;
}

/* ✅ Good: invisible pseudo-element extends hit area */
.small-icon-link {
  position: relative;
}
.small-icon-link::before {
  content: '';
  position: absolute;
  inset: -12px; /* Extends hit area 12px in all directions */
}

/* ❌ Fail: icon button with no touch area expansion */
.close-icon {
  width: 16px;
  height: 16px;
  /* 16px is too small — fails both 24px and 44px thresholds */
}
```

## Why It Matters

This is a motor-access requirement, not just a mobile polish issue. Small icon buttons and tightly packed actions routinely fail users who cannot make a precise tap.

- **Motor Impairments**: Tremors, spasticity, and limited dexterity make precise tapping difficult or impossible on small targets.
- **One-Handed Use**: Users holding a device with one hand often tap with a thumb, which has lower precision than a fingertip.
- **Stylus Users**: Despite higher precision, users with styluses often have motor impairments that reduce accuracy.
- **All Users**: Larger targets reduce accidental activations for everyone, especially in motion or low-light conditions.

## Size Requirements

| Standard | Minimum Size | Level |
|---|---|---|
| WCAG 2.2 SC 2.5.8 | 24×24 CSS px (or 24px spacing offset) | AA (new in WCAG 2.2) |
| WCAG 2.1 SC 2.5.5 | 44×44 CSS px | AAA |
| Apple HIG | 44×44 pt | Platform guideline |
| Google Material Design | 48×48 dp | Platform guideline |

Aim for 44×44px as a practical target — it satisfies AAA and both platform guidelines.

## Card and list item links

This pattern still needs to satisfy [WCAG 2.5.8 Target Size (Minimum)](https://www.w3.org/TR/WCAG22/#target-size-minimum), so the stretched clickable area should be intentional rather than visually implied.

For card-style or row-style UI where the whole block should be clickable (e.g. a checklist card, resource card, or audit row), use a **stretched link** so the link's accessible name is the card title and the entire area is the touch target:

- Container: `position: relative` with the card/row styles.
- Title link: the `<a>` or `` as a sibling. The link should wrap the title and stretch from there. See project doc `docs/card-links.md` for reference components.

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