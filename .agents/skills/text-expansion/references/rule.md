# Design UI components to accommodate text expansion from translation

> Ensure that layouts use flexible sizing so that translated text — which can be 30–50% longer than English — does not overflow, clip, or break the UI.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 30 min

---
Text expansion is the increase in string length that occurs during translation. English is typically the shortest form of most content; other languages require more characters to express the same idea. The W3C provides approximate expansion factors:

| String length (English) | Expected expansion |
|---|---|
| Up to 10 characters | 100–200% longer |
| 11–20 characters | 80–100% longer |
| 21–30 characters | 60–80% longer |
| Over 70 characters | 30% longer |

German and Dutch routinely exceed English by 30%; Finnish and Hungarian by 50%. Plan for at least 30% expansion in every text-bearing component.
## Code Example

The most common cause of text-expansion breakage is setting an explicit `width` or `inline-size` on a button or label:

```css
/* ❌ Breaks when "Submit" becomes "Abschicken" in German */
.button {
  width: 120px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
```

Truncating a button label with an ellipsis is almost always wrong — the user cannot know what action they are triggering.

## Why It Matters

Layouts designed only with English copy routinely break when translated: buttons overflow their containers, labels truncate, and navigation items wrap unexpectedly. Catching these issues early with pseudo-locale testing is far cheaper than fixing them after translations are delivered.

## Use min-inline-size for Flexible Growth

Logical properties (`inline-size`, `min-inline-size`, `block-size`) are preferred over physical properties (`width`, `height`) because they adapt automatically to writing direction (LTR/RTL):

```css
/* ✅ Button grows to accommodate longer translations */
.button {
  min-inline-size: 7.5rem; /* sets a sensible minimum, but allows growth */
  padding-inline: 1rem;
  padding-block: 0.5rem;
  white-space: normal; /* allow wrapping only if the design permits it */
}

/* ✅ Navigation item */
.nav-item {
  min-inline-size: max-content; /* never narrower than the content */
  padding-inline: 0.75rem;
}
```

## Flexible Container Patterns

```css
/* ✅ Card with flexible content area */
.card {
  display: grid;
  grid-template-rows: auto 1fr auto; /* header / body / footer */
  /* No fixed height — body expands with content */
}

/* ✅ Form label + input row */
.form-row {
  display: flex;
  flex-wrap: wrap; /* wraps label above input when label is very long */
  gap: 0.5rem;
  align-items: baseline;
}

.form-row label {
  flex: 0 1 auto; /* shrink allowed, grow allowed up to content width */
  min-inline-size: 6rem;
}

/* ✅ Badge / chip */
.badge {
  display: inline-flex;
  align-items: center;
  padding-inline: 0.5rem;
  /* No width — grows with text */
  border-radius: 9999px;
}
```

## CSS Logical Properties Reference

Using logical properties ensures your flexible layout also works correctly in RTL locales:

| Physical property | Logical equivalent |
|---|---|
| `width` | `inline-size` |
| `min-width` | `min-inline-size` |
| `max-width` | `max-inline-size` |
| `height` | `block-size` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `margin-left` | `margin-inline-start` |
| `text-align: left` | `text-align: start` |

## Pseudo-Locale Testing

A pseudo-locale inflates and decorates every source string to simulate translation expansion before real translations exist. This lets you catch layout breaks in CI or Storybook:

```typescript
// lib/pseudo-locale.ts

/**
 * Wraps each character in an accented equivalent and pads the string
 * to simulate ~40% expansion. Output is readable but visually distinct.
 */

  const charMap: Record<string, string> = {
    a: 'à', b: 'ƀ', c: 'ç', d: 'ď', e: 'è',
    f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'ì', j: 'ĵ',
    k: 'ķ', l: 'ĺ', m: 'ɱ', n: 'ñ', o: 'ò',
    p: 'þ', q: 'q', r: 'ŗ', s: 'š', t: 'ţ',
    u: 'ù', v: 'v', w: 'ŵ', x: 'x', y: 'ý', z: 'ž',
    A: 'À', B: 'Ɓ', C: 'Ç', D: 'Ď', E: 'È',
  };

  // Replace characters and pad with brackets to show boundaries
  const mapped = input
    .split('')
    .map((c) => charMap[c] ?? c)
    .join('');

  // Add ~40% padding with repeated characters
  const padding = '~'.repeat(Math.ceil(input.length * 0.4));
  return `[${mapped}${padding}]`;
}

// Usage in i18n provider during development

if (process.env.NEXT_PUBLIC_PSEUDO_LOCALE === 'true') {
  i18n.use({
    type: 'postProcessor',
    name: 'pseudoLocalize',
    process: (value: string) => pseudoLocalize(value),
  });
}
```

To enable during a test run:

```bash
NEXT_PUBLIC_PSEUDO_LOCALE=true pnpm dev
```

Running visual regression tests only with English strings gives a false sense of confidence. Add a pseudo-locale story or Playwright snapshot to your CI pipeline to catch expansion breakages automatically.

## Overflow as a Last Resort

If a design genuinely cannot accommodate expansion (e.g. a column in a data table), apply truncation with a tooltip so the full text remains accessible:

```tsx
// TruncatedCell.tsx
function TruncatedCell({ text }: { text: string }) {
  return (
    <td
      style={{
        maxInlineSize: '12rem',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      title={text} // full text accessible on hover / focus
      aria-label={text}
    >
      {text}
    </td>
  );
}
```

## Support Notes

- Internationalization behavior depends on browser locale APIs, layout engines, and text rendering, so verify the output in the supported browser matrix.
- Document any fallback when locale-sensitive formatting or layout behavior differs by browser or platform.

## Verification

### Automated Checks

- Run visual regression snapshots with the pseudo-locale enabled in CI.
- Manually test the longest-known translation (commonly German or Finnish) for critical UI strings like the primary CTA, navigation items, and form labels.
- Keep a pseudolocalized preview route or build flag available so expansion testing does not depend on translators delivering real strings first.

### Manual Checks

- Enable the pseudo-locale and review every page at 1280px — no button label, form label, or navigation item should overflow or clip.
- Search CSS for `width:` and `inline-size:` values on elements that render `t()` or translated strings — replace with `min-inline-size:`.