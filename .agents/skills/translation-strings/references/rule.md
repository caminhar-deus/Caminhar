# Write internationalisation-friendly translation strings

> Translation strings use message format patterns (ICU or similar) rather than string concatenation, and correctly handle pluralisation, gender, and variable interpolation.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 30 min

---
Internationalised strings are more than translated text — they are message templates that the i18n library fills with runtime values. [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/) and [`Intl.PluralRules`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules) exist because natural language grammar changes with count, gender, and word order.
## Code Example

```typescript
// ❌ Never do this — impossible to translate correctly
const message = t('found') + ' ' + count + ' ' + t('results')
const greeting = t('hello') + ', ' + user.name + '!'
const description = `${t('page')} ${currentPage} ${t('of')} ${totalPages}`
```

In French, German, Japanese, and Arabic the subject, verb, and object appear in different positions. Concatenation locks the word order to English and makes correct translation impossible.

## Why It Matters

Naive string concatenation produces untranslatable sentences because word order varies dramatically across languages. A pattern like "Found " + count + " results" cannot be translated correctly into languages where the number appears in a different position or where the noun form changes depending on the count. Bad i18n strings force translators to work around developer mistakes — or simply leave content untranslated.

## Named Placeholders

```typescript
// ✅ Named placeholders let translators reorder words freely
const message = t('search.resultsFound', { count, query })
const greeting = t('user.greeting', { name: user.name })
const description = t('pagination.description', { currentPage, totalPages })
```

```json
// en.json
{
  "search": {
    "resultsFound": "Found {{count}} results for \"{{query}}\""
  },
  "user": {
    "greeting": "Hello, {{name}}!"
  },
  "pagination": {
    "description": "Page {{currentPage}} of {{totalPages}}"
  }
}
```

```json
// ar.json (Arabic — note reversed word order for numbers)
{
  "search": {
    "resultsFound": "تم العثور على {{count}} نتيجة لـ \"{{query}}\""
  },
  "user": {
    "greeting": "مرحباً، {{name}}!"
  },
  "pagination": {
    "description": "الصفحة {{currentPage}} من {{totalPages}}"
  }
}
```

## Pluralisation with ICU MessageFormat

English has two plural forms (one / other). Other languages have up to six (Arabic: zero, one, two, few, many, other). Never use a JavaScript conditional to pick a plural string:

```typescript
// ❌ Only works for English
const label = count === 1 ? t('item.singular') : t('item.plural')
```

#

## next-intl (ICU MessageFormat)

```typescript
// messages/en.json
{
  "cart": {
    "itemCount": "{count, plural, =0 {No items} one {# item} other {# items}}",
    "notifications": "{count, plural, one {You have # new notification} other {You have # new notifications}}"
  }
}

// messages/ar.json — Arabic needs 6 plural forms
{
  "cart": {
    "itemCount": "{count, plural, =0 {لا توجد عناصر} one {عنصر واحد} two {عنصران} few {# عناصر} many {# عنصرًا} other {# عنصر}}"
  }
}
```

```tsx
// CartCount.tsx

  const t = useTranslations('cart')

  return <span>{t('itemCount', { count })}</span>
}
```

### [react-i18next](https://react.i18next.com/) (i18next plurals)

```json
// en.json — i18next uses _one/_other suffixes
{
  "cart": {
    "itemCount_one": "{{count}} item",
    "itemCount_other": "{{count}} items"
  }
}
```

```tsx

  const { t } = useTranslation()
  return <span>{t('cart.itemCount', { count })}</span>
}
```

## Gender and Select Patterns

Some languages require different sentence forms based on grammatical gender. Use the `select` pattern instead of branching in code:

```json
// en.json
{
  "user": {
    "roleDescription": "{gender, select, male {He is a {role}} female {She is a {role}} other {They are a {role}}}"
  }
}
```

```tsx
// The i18n library handles the branch — not the component
t('user.roleDescription', { gender: user.gender, role: user.role })
```

## Handling HTML in Translations

Avoid embedding HTML tags in translation strings — they are impossible to sanitise correctly in all environments:

```typescript
// ❌ HTML in translation string — security risk and hard to maintain
{
  "terms": "By continuing, you agree to our <a href='/terms'>Terms</a>."
}

// ✅ Use Trans component (react-i18next) or rich text (next-intl)

function TermsNotice() {
  return (
    ,
      }}
    />
  )
}
```

```json
// en.json
{
  "terms": {
    "agreement": "By continuing, you agree to our <termsLink>Terms of Service</termsLink>."
  }
}
```

## Date, Number, and Currency Formatting

Never format dates, numbers, or currencies manually — use `Intl` APIs or the i18n library's formatting utilities:

```typescript
// ❌ Hardcoded format — wrong for most locales
const formatted = `${price} USD`
const date = `${month}/${day}/${year}`

// ✅ Locale-aware formatting
const formatter = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: 'USD',
})
const formatted = formatter.format(price)  // "$12.50" in en-US, "12,50 $US" in fr-FR

const dateFormatter = new Intl.DateTimeFormat(locale, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})
const date = dateFormatter.format(new Date())
```

## Translation Key Conventions

```typescript
// ✅ Scoped keys — easy to locate in codebase
'checkout.orderSummary.totalItems'
'dashboard.sidebar.navigationLabel'
'forms.validation.emailRequired'

// ❌ Generic keys — collisions, hard to maintain
'title'
'error'
'label'
```

## Extracting Strings for Translators

Use the i18n library's extraction CLI to generate translation files from source:

```bash
# react-i18next extraction
pnpm i18next-scanner --config i18next-scanner.config.js

# next-intl — strings are already in JSON; use a custom script or Phrase/Crowdin integration
```

Identifiers, enum values, API parameters, and log messages should never go through the i18n system. Only translate user-visible copy. Translating internal values introduces subtle bugs when translated strings are compared to hardcoded English values in business logic.

## Exceptions

- A framework default or browser behavior is not an exception by itself; only documented constraints with compensating controls should suppress the finding.
- When a JavaScript pattern looks unsafe but the data is fully constrained, validated, and never attacker-controlled, document that boundary explicitly instead of treating it as implicit.
- If a rule overlaps with a stronger exploit path or runtime failure, fix the issue that most directly enables compromise or user-visible breakage first.

## Verification

1. Search the codebase for patterns like `t('key') + ` or `` `${t('key')}` `` — all occurrences should be replaced with placeholder interpolation as described by [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/).
2. Verify that any string involving a count uses the plural form (e.g., `{count, plural, ...}`) rather than a JS conditional.
3. Run the project with a pseudo-locale (replace all characters with accented versions and add 30 % extra length) to catch layout overflow issues.
4. Check that all user-visible strings render correctly in a test RTL locale (Arabic or Hebrew) to confirm word order is flexible.