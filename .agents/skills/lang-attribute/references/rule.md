# Set the page lang attribute

> The <html> element must have a lang attribute with a valid BCP 47 language code so screen readers, translation tools, and search engines know the primary language of the page.

**Priority:** high · **Difficulty:** beginner · **Time:** 5 min

---
The `lang` attribute on the `<html>` element identifies the primary language of a web page. It is used by screen readers, browsers, search engines, and translation services to process content correctly.
## Code Example

```html
<!-- ✅ Correct: English page -->
<!DOCTYPE html>
<html lang="en">

<!-- ✅ Correct: American English -->
<!DOCTYPE html>
<html lang="en-US">

<!-- ✅ Correct: French -->
<!DOCTYPE html>
<html lang="fr">

<!-- ✅ Correct: Arabic (right-to-left) -->
<!DOCTYPE html>
<html lang="ar" dir="rtl">

<!-- ❌ Incorrect: missing lang attribute -->
<html>

<!-- ❌ Incorrect: full language name (not a BCP 47 code) -->
<html lang="english">

<!-- ❌ Incorrect: empty lang attribute -->
<html lang="">
```

## Why It Matters

- **Screen Readers**: VoiceOver and NVDA use `lang` to select the speech synthesis engine — wrong language means incomprehensible pronunciation.
- **Browser Translation**: Chrome's auto-translate uses `lang` to detect the source language and offer translation.
- **CSS Hyphenation**: `hyphens: auto` in CSS relies on the `lang` attribute to apply correct hyphenation rules.
- **Spell Checking**: Browser spell check and tools like Grammarly use `lang` to select the dictionary.
- **Search Engines**: Google uses `lang` to target content to the correct regional audience in search results.

## Language Changes Within a Page

When a page contains content in multiple languages, mark each language change with `lang` on the containing element:

```html
<html lang="en">
<body>
  <p>The French say <span lang="fr">bonjour</span> as a greeting.</p>

  <!-- Block-level language change -->
  <blockquote lang="de">
    <p>Ich denke, also bin ich. — René Descartes</p>
  </blockquote>
</body>
</html>
```

## Common BCP 47 Language Codes

| Language | Code |
|---|---|
| English | `en` |
| English (US) | `en-US` |
| English (UK) | `en-GB` |
| French | `fr` |
| Spanish | `es` |
| German | `de` |
| Japanese | `ja` |
| Korean | `ko` |
| Simplified Chinese | `zh-Hans` |
| Traditional Chinese | `zh-Hant` |
| Arabic | `ar` |
| Portuguese (Brazil) | `pt-BR` |
| Hindi | `hi` |

## Framework Examples

```tsx

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

```tsx
const rtlLocales = new Set(['ar', 'fa', 'he', 'ur'])

  locale,
  children,
}: {
  locale: string
  children: React.ReactNode
}) {
  return (
    <html lang={locale} dir={rtlLocales.has(locale) ? 'rtl' : 'ltr'}>
      <body>{children}</body>
    </html>
  )
}
```

## Best Practices

- Set the language on the root `<html>` element even when the whole site uses one locale.
- Prefer region or script subtags such as `en-GB` or `zh-Hant` when they materially affect pronunciation, spelling, or font selection.
- Add nested `lang` attributes only where the language actually changes.
- Validate the final rendered HTML rather than assuming framework metadata APIs emitted the correct root attribute.

## Standards

- Use WCAG 2.1 SC 3.1.1: Language of Page as the standard for the final rendered HTML and browser-facing behavior.
- Use WCAG 2.1 SC 3.1.2: Language of Parts as the standard for the final rendered HTML and browser-facing behavior.
- Use HTML Living Standard: The lang attribute as the standard for the final rendered HTML and browser-facing behavior.

## Verification

### Automated Checks

- Inspect the final rendered HTML in the browser or page source to confirm the rule is satisfied.
- Validate the affected markup with browser tooling or an HTML validator where appropriate.
- Test one representative route or template that uses the pattern.
- Re-check shared components that emit the same markup so the fix is consistent.

### Manual Checks

- Verify the rendered browser behavior manually on representative routes and supported browsers so the user-facing outcome matches the rule.