# Meet minimum color contrast ratios

> Text and background colors must have sufficient contrast to be readable by users with low vision or color blindness.

**Priority:** high · **Difficulty:** intermediate · **Time:** 15 min

---
Text must have sufficient contrast against its background to ensure it is readable by as many people as possible, including those with low vision or color vision deficiencies.

## Code Example

```css
/* ✅ Good: Dark text on white — 21:1 ratio */
.body-text {
  color: #000000;
  background-color: #ffffff;
}

/* ✅ Good: #595959 on white meets 4.5:1 for normal text */
.secondary-text {
  color: #595959;
  background-color: #ffffff;
}

/* ✅ Good: #767676 on white meets 3:1 — only valid for large text (≥ 24px or ≥ 18.67px bold) */
.large-heading {
  font-size: 1.5rem; /* 24px at 16px base */
  font-weight: bold;
  color: #767676;
  background-color: #ffffff;
}

/* ❌ Fail: #cccccc on white is approximately 1.6:1 */
.placeholder-text {
  color: #cccccc;
  background-color: #ffffff;
}
```

## Why It Matters

The thresholds in [WCAG 1.4.3 Contrast (Minimum)](https://www.w3.org/TR/WCAG21/#contrast-minimum) and [WCAG 1.4.11 Non-text Contrast](https://www.w3.org/TR/WCAG21/#non-text-contrast) are not aesthetic preferences; they are readability requirements for text and UI states people need to perceive.

- **Low Vision**: Users with moderately low vision (20/80 after correction) may not perceive text below 4.5:1 without assistive magnification.
- **Color Blindness**: Red-green color blindness affects ~8% of males — color alone cannot distinguish elements; contrast is the universal signal.
- **Aging Vision**: Contrast sensitivity decreases with age; older users benefit from higher contrast even without a clinical diagnosis.
- **Environmental Factors**: Bright sunlight washes out screens — higher contrast helps in outdoor use.
- **Compliance**: WCAG 2.1 Level AA (SC 1.4.3) is the baseline for most legal accessibility regulations (ADA, EN 301 549, AODA).

## Contrast Ratio Requirements

| Content Type | WCAG AA Minimum | WCAG AAA Enhanced |
|---|---|---|
| Normal text (< 18pt / < 14pt bold) | **4.5:1** | 7:1 |
| Large text (≥ 18pt or ≥ 14pt bold) | **3:1** | 4.5:1 |
| UI components (icons, inputs, buttons) | **3:1** | — |
| Decorative / inactive / logotypes | Exempt | Exempt |

## Best Practices

- Check contrast in all interactive states: `:hover`, `:focus`, `:active`, `:visited`, and `disabled`.
- Disabled elements are technically exempt, but overly light disabled states still hurt usability.
- Use browser DevTools (Chrome/Firefox Accessibility panel) for quick checks during development.
- Do not rely solely on automated tools — manual checks with real content and backgrounds are needed.

## Tools & Validation

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser (TPGi)](https://www.tpgi.com/color-contrast-checker/)
- [WhoCanUse](https://whocanuse.com/) — simulates how different users perceive your colors

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