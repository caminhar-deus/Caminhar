# Use oklch() and oklab() for perceptually uniform colour palettes

> Colour values in the design system use oklch() or oklab() colour functions to produce perceptually uniform palettes where equal numeric steps produce equal perceived lightness changes.

**Priority:** low · **Difficulty:** intermediate · **Time:** 20 min

---
oklch stands for OK Lightness Chroma Hue. It is a CSS Color Level 4 colour space built on the Oklab perceptual model developed by Björn Ottosson. Unlike hsl (which uses the legacy sRGB gamut and is perceptually non-uniform), oklch maps closely to how humans actually perceive colour.

## Code Example

| Channel | Range | Description |
|---|---|---|
| L (Lightness) | 0–1 (0 = black, 1 = white) | Perceived brightness — uniform across hues |
| C (Chroma) | 0–0.4+ (0 = grey) | Colour saturation/vividness |
| H (Hue) | 0–360 degrees | Colour wheel angle |

```css
/* oklch(Lightness Chroma Hue) */
color: oklch(0.7 0.15 240);   /* A blue with 70% lightness, medium chroma */
color: oklch(0.5 0.2 30);     /* An orange with 50% lightness, vivid chroma */
color: oklch(0.9 0.0 0);      /* Near-white grey (zero chroma = achromatic) */
```

## Why It Matters

HSL and hex colours are defined in the sRGB colour space, which is not perceptually uniform — a 10 % lightness change looks dramatically different depending on the hue. This makes creating accessible, harmonious palettes by hand extremely difficult. oklch corrects this: adjusting the L channel produces the same perceived brightness change regardless of hue or chroma, making it far easier to build accessible colour ramps, dark-mode palettes, and consistent hover/active states.

## Building a Colour Ramp

With HSL, the same numeric lightness step looks different across hues (yellow at 80 % L looks brighter than blue at 80 % L). With oklch, the L channel is perceptually consistent:

```css
/* A complete primary colour ramp in oklch */
:root {
  /* Blue primary — consistent perceived lightness steps across all shades */
  --color-primary-50:  oklch(0.97 0.03 255);
  --color-primary-100: oklch(0.93 0.06 255);
  --color-primary-200: oklch(0.86 0.10 255);
  --color-primary-300: oklch(0.76 0.14 255);
  --color-primary-400: oklch(0.65 0.18 255);
  --color-primary-500: oklch(0.55 0.20 255);  /* Base */
  --color-primary-600: oklch(0.46 0.19 255);
  --color-primary-700: oklch(0.38 0.17 255);
  --color-primary-800: oklch(0.30 0.14 255);
  --color-primary-900: oklch(0.22 0.10 255);
  --color-primary-950: oklch(0.15 0.07 255);
}
```

Compare: if you used the same lightness steps in hsl, blue shades would look inconsistently different from green shades at the same step number.

## A Complete Design Token Palette

```css
:root {
  /* Neutral / grey scale */
  --color-neutral-50:  oklch(0.98 0.00 0);
  --color-neutral-100: oklch(0.95 0.01 285);
  --color-neutral-200: oklch(0.90 0.01 285);
  --color-neutral-300: oklch(0.82 0.02 285);
  --color-neutral-400: oklch(0.70 0.02 285);
  --color-neutral-500: oklch(0.57 0.03 285);
  --color-neutral-600: oklch(0.46 0.03 285);
  --color-neutral-700: oklch(0.37 0.03 285);
  --color-neutral-800: oklch(0.27 0.02 285);
  --color-neutral-900: oklch(0.18 0.02 285);
  --color-neutral-950: oklch(0.12 0.01 285);

  /* Semantic tokens (light mode) */
  --color-text:           var(--color-neutral-900);
  --color-text-muted:     var(--color-neutral-600);
  --color-bg:             var(--color-neutral-50);
  --color-bg-surface:     var(--color-neutral-100);
  --color-border:         var(--color-neutral-200);

  /* Brand */
  --color-brand:          oklch(0.55 0.20 255);
  --color-brand-hover:    oklch(0.46 0.19 255);
  --color-brand-active:   oklch(0.38 0.17 255);

  /* Semantic status */
  --color-success:        oklch(0.55 0.18 142);
  --color-warning:        oklch(0.72 0.20 85);
  --color-error:          oklch(0.55 0.22 25);
  --color-info:           oklch(0.58 0.17 240);
}

/* Dark mode — adjust only the lightness axis */
@media (prefers-color-scheme: dark) {
  :root {
    --color-text:         var(--color-neutral-50);
    --color-text-muted:   var(--color-neutral-400);
    --color-bg:           var(--color-neutral-950);
    --color-bg-surface:   var(--color-neutral-900);
    --color-border:       var(--color-neutral-800);
  }
}
```

## Wide-Gamut Colours (Display P3)

oklch can express colours outside the sRGB gamut — vivid colours that are only visible on modern P3 displays (iPhone, MacBook). Browsers automatically clamp out-of-gamut colours for older displays:

```css
:root {
  /* sRGB-safe base colour */
  --color-brand: oklch(0.55 0.20 255);
}

/* Progressively enhance with wider gamut on capable displays */
@media (color-gamut: p3) {
  :root {
    /* More vivid — exceeds sRGB but within P3 gamut */
    --color-brand: oklch(0.55 0.28 255);
  }
}
```

## Generating Palettes Programmatically

```typescript
// Generate a 10-step colour ramp from a base hue
function generateColorRamp(hue: number, chroma: number): Record<string, string> {
  const lightnessSteps = [0.97, 0.93, 0.86, 0.76, 0.65, 0.55, 0.46, 0.38, 0.30, 0.22]
  const names = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

  return Object.fromEntries(
    names.map((name, i) => [
      `--color-${name}`,
      `oklch(${lightnessSteps[i]} ${chroma} ${hue})`,
    ])
  )
}

// Inject as CSS custom properties
function injectColorTokens(tokens: Record<string, string>) {
  const css = `:root { ${Object.entries(tokens).map(([k, v]) => `${k}: ${v}`).join('; ')} }`
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}
```

## Accessibility: Contrast in oklch

The WCAG 2.1 contrast ratio formula uses relative luminance, which is derived from the sRGB colour. oklch L is not the same as WCAG luminance — you still need to verify contrast ratios with an accessibility checker. However, keeping the L channel at predictable values makes it much easier to build accessible pairs:

```css
/* Light text (L ~0.97) on dark background (L ~0.22) — high contrast */
.badge {
  background-color: oklch(0.22 0.14 255);
  color: oklch(0.97 0.01 255);
}
```

Use the [oklch.com](https://oklch.com/) picker to see the APCA or WCAG contrast ratio as you adjust colours.

## Tailwind CSS v4

Tailwind v4 uses oklch for its default palette. You can define custom colours directly in oklch:

```css
/* tailwind.css (v4) */
@theme {
  --color-brand-500: oklch(0.55 0.20 255);
  --color-brand-600: oklch(0.46 0.19 255);
}
```

oklch is supported in Chrome 111+, Firefox 113+, and Safari 15.4+. For projects that must support older browsers, provide an `hsl` fallback before the `oklch` declaration. PostCSS plugins like `postcss-oklab-function` can auto-generate sRGB fallbacks at build time.

## Verification

Use the [MDN `oklch()` reference](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch) or [oklch.com](https://oklch.com/) while checking ramps so you are evaluating perceptual spacing, not just whether the token syntax parses.

1. Open the DevTools **Styles** panel, click a colour swatch, and verify you can see "oklch" in the colour format toggle.
2. Visually inspect shade steps 300, 500, and 700 across two different hues — the perceived lightness should look comparable, not dramatically different.
3. Test colour contrast ratios for text/background pairs using a WCAG contrast checker to confirm they meet the required ratio (4.5:1 for normal text, 3:1 for large text).
4. Verify the palette renders correctly on an sRGB display — wide-gamut values outside sRGB should be gracefully clamped, not produce incorrect colours.