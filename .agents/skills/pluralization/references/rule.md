# Handle plural forms with Intl.PluralRules or ICU MessageFormat

> Select the correct grammatical plural category for every language using Intl.PluralRules or an ICU-aware i18n library instead of simple singular/plural branching.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 25 min

---
Every language follows rules about how nouns change form depending on the quantity being described. English uses two forms — one for exactly 1 (singular) and one for everything else (plural). Many other languages use three, four, or six distinct forms. The Unicode CLDR project catalogues these rules and assigns each language a set of named plural categories.

## Code Examples

`Intl.PluralRules` accepts a locale and returns the CLDR category for a given count. Use it to select the right pre-translated string:

```typescript
// pluralize.ts

/**
 * Return the CLDR plural category for a count in a given locale.
 * The returned key maps to one of the message variants in your
 * translation file (e.g. messages.items.one, messages.items.other).
 */

  count: number,
  locale: string
): Intl.LDMLPluralRule {
  return new Intl.PluralRules(locale).select(count);
}

// Usage example
const locale = 'ru'; // Russian
const messages = {
  items: {
    one:   '{count} элемент',
    few:   '{count} элемента',
    many:  '{count} элементов',
    other: '{count} элемента', // decimals
  },
};

function formatItemCount(count: number, locale: string): string {
  const category = getPluralCategory(count, locale);
  const template = messages.items[category] ?? messages.items.other;
  return template.replace('{count}', String(count));
}

formatItemCount(1,  'ru'); // "1 элемент"
formatItemCount(3,  'ru'); // "3 элемента"
formatItemCount(11, 'ru'); // "11 элементов"
formatItemCount(21, 'ru'); // "21 элемент"
```

Constructing a new `Intl.PluralRules` object on every call is expensive. Cache instances by locale in a `Map` to avoid allocating them repeatedly inside render loops or message formatting functions.

```typescript
// Cached version
const cache = new Map<string, Intl.PluralRules>();

function getPluralRules(locale: string): Intl.PluralRules {
  if (!cache.has(locale)) {
    cache.set(locale, new Intl.PluralRules(locale));
  }
  return cache.get(locale)!;
}
```

## Why It Matters

Pluralization rules vary dramatically across languages — what works as a simple singular/plural branch in English produces grammatically wrong output in Arabic, Russian, Polish, and dozens of other languages. Shipping incorrect plurals signals low translation quality and breaks trust with native speakers in target markets.

## CLDR Plural Categories

The CLDR defines six category names used by `Intl.PluralRules`: `zero`, `one`, `two`, `few`, `many`, and `other`. Every language uses a subset of these categories:

| Language | Categories used | Example counts |
|---|---|---|
| English | `one`, `other` | 1 → one; 0, 2–∞ → other |
| German | `one`, `other` | 1 → one; 0, 2–∞ → other |
| French | `one`, `other` | 0, 1 → one; 2–∞ → other |
| Russian | `one`, `few`, `many`, `other` | 1, 21, 31 → one; 2–4, 22–24 → few; 5–20, 25–30 → many; decimals → other |
| Polish | `one`, `few`, `many`, `other` | 1 → one; 2–4 (not 12–14) → few; 5–21... → many |
| Arabic | `zero`, `one`, `two`, `few`, `many`, `other` | All six categories, complex modulo rules |
| Japanese | `other` | Only one form for all counts |
| Czech | `one`, `few`, `many`, `other` | Animate vs. inanimate gender affects selection |

A binary `count === 1 ? singular : plural` check works only for English and a handful of similar languages. For Arabic, it produces the wrong grammatical form for five of the six possible counts.

## ICU MessageFormat with react-intl

[react-intl](https://formatjs.io/) uses ICU MessageFormat syntax, which handles plural selection declaratively inside the message string itself. Define all plural variants in the translation file and let the library pick the right one:

```json
// en.json
{
  "inbox.messageCount": "{count, plural, one {You have # message} other {You have # messages}}",
  "cart.itemCount": "{count, plural, =0 {Your cart is empty} one {# item in your cart} other {# items in your cart}}"
}
```

```json
// ar.json (Arabic — all 6 categories required)
{
  "inbox.messageCount": "{count, plural, zero {ليس لديك رسائل} one {لديك رسالة واحدة} two {لديك رسالتان} few {لديك # رسائل} many {لديك # رسالة} other {لديك # رسالة}}"
}
```

```tsx
// InboxCount.tsx

interface Props {
  count: number;
}

  const intl = useIntl();

  return (
    <p>
      {intl.formatMessage(
        { id: 'inbox.messageCount' },
        { count }
      )}
    </p>
  );
}
```

The `#` token inside the plural block is replaced with the formatted count. The library selects the block whose key matches the CLDR category for the current locale and count.

## Ordinal Plural Forms

`Intl.PluralRules` also handles ordinal numbers (1st, 2nd, 3rd) via the `type: 'ordinal'` option:

```typescript
const ordinal = new Intl.PluralRules('en-US', { type: 'ordinal' });

const suffixes: Record = {
  one:   'st',
  two:   'nd',
  few:   'rd',
  other: 'th',
  zero:  'th', // not used in English ordinals
  many:  'th', // not used in English ordinals
};

function formatOrdinal(n: number): string {
  const category = ordinal.select(n);
  return `${n}${suffixes[category]}`;
}

formatOrdinal(1);  // "1st"
formatOrdinal(2);  // "2nd"
formatOrdinal(3);  // "3rd"
formatOrdinal(4);  // "4th"
formatOrdinal(21); // "21st"
```

## Pluralization in i18next

i18next resolves plural keys by appending a suffix derived from `Intl.PluralRules`. Configure the `i18next` instance to use the built-in `intlPlurals` plugin and define suffixed keys in your translation JSON:

```typescript
// i18n.ts

i18next
  .use(initReactI18next)
  .init({
    lng: 'en',
    resources: {
      en: {
        translation: {
          // i18next v4+ uses _one / _other suffixes by default
          itemCount_one:   'You have {{count}} item',
          itemCount_other: 'You have {{count}} items',
        },
      },
      ar: {
        translation: {
          // Arabic needs all 6 suffixes: _zero _one _two _few _many _other
          itemCount_zero:  'ليس لديك عناصر',
          itemCount_one:   'لديك عنصر واحد',
          itemCount_two:   'لديك عنصران',
          itemCount_few:   'لديك {{count}} عناصر',
          itemCount_many:  'لديك {{count}} عنصرًا',
          itemCount_other: 'لديك {{count}} عنصر',
        },
      },
    },
  });
```

```tsx
// Usage in a component

function ItemCount({ count }: { count: number }) {
  const { t } = useTranslation();
  // i18next selects the correct _suffix key automatically
  return <span>{t('itemCount', { count })}</span>;
}
```

If a translation file omits a required plural key for its locale (e.g. Arabic is missing `_many`), most i18n libraries silently fall back to `_other`. The resulting output is grammatically wrong and the bug is invisible in English development environments. Validate plural key completeness as part of your CI translation checks.

## Anti-Patterns

```typescript
// ❌ Binary branch — wrong for Arabic, Russian, Polish, and many others
const label = count === 1 ? 'item' : 'items';

// ❌ String concatenation — untranslatable word order
const message = 'You have ' + count + ' new messages';

// ❌ Hardcoded English grammar suffix
const suffix = count === 1 ? '' : 's';
const label = `${count} message${suffix}`;

// ✅ Let Intl.PluralRules select the right pre-translated form
const category = new Intl.PluralRules(locale).select(count);
const label = translations[category].replace('{count}', String(count));

// ✅ Or use ICU syntax in your i18n library
// "{count, plural, one {# message} other {# messages}}"
```

## Standards

- Use these references as the standard for the rendered internationalization behavior, not just the source strings or config.
- Check the implementation against MDN: Intl.PluralRules before treating the rule as satisfied.
- Check the implementation against Unicode CLDR Plural Rules before treating the rule as satisfied.

## Verification

### Automated Checks

- Search the codebase for string concatenation patterns involving counts — any `count + " item"`, template literals with count variables, or ternary `count === 1 ?` checks that are not delegated to an i18n library.
- Add a CI lint step or custom ESLint rule that flags template literals and string concatenation involving variables named `count`, `total`, or `length` inside i18n-aware files.

### Manual Checks

- For each supported locale beyond English, open the translation file and confirm that all plural category keys required by that locale's CLDR rules are present.
- Render components that display counts in a Storybook story or test with `locale='ar'` (Arabic) and values of 0, 1, 2, 5, and 11 to exercise all six CLDR categories.