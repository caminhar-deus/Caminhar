# Use Intl APIs for currency, number, and date formatting

> Format monetary values, numbers, and dates using the browser's built-in Intl.NumberFormat and Intl.DateTimeFormat APIs instead of manual string manipulation.

**Priority:** medium · **Difficulty:** beginner · **Time:** 20 min

---
The `Intl` namespace provides a family of locale-aware formatting constructors built into every modern browser and Node.js. They handle the enormous variation in how different locales represent numbers, currencies, dates, and percentages — no third-party library required.
## Code Example

The `Intl.NumberFormat` constructor accepts a `style: 'currency'` option along with a `currency` code. The formatter handles symbol placement, decimal digits, and thousands grouping automatically for each locale:

```typescript
// formatCurrency.ts

/**
 * Format a numeric amount as a locale-aware currency string.
 * @param amount   - The numeric value (e.g. 1234.5)
 * @param currency - ISO 4217 currency code (e.g. 'USD', 'EUR', 'JPY')
 * @param locale   - BCP 47 language tag (e.g. 'en-US', 'de-DE', 'ja-JP')
 */

  amount: number,
  currency: string,
  locale: string
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    // Optional: control how many fraction digits to display
    // JPY has no minor units, so maximumFractionDigits defaults to 0
  }).format(amount);
}

// Output comparison for the same value across locales
const amount = 1234.5;

formatCurrency(amount, 'USD', 'en-US'); // "$1,234.50"
formatCurrency(amount, 'EUR', 'de-DE'); // "1.234,50 €"
formatCurrency(amount, 'JPY', 'ja-JP'); // "¥1,235"
formatCurrency(amount, 'GBP', 'en-GB'); // "£1,234.50"
formatCurrency(amount, 'CHF', 'fr-CH'); // "CHF 1'234.50"
```

## Why It Matters

Number and currency formatting rules differ significantly across locales — a value formatted as "$1,234.56" in the US is written "1.234,56 $" in Germany and "¥1,235" in Japan. Hardcoded formatting causes incorrect display for international users and is expensive to maintain manually as you add locales.

## Reusing Formatter Instances

Creating a new `Intl.NumberFormat` instance on every render is wasteful. Cache the instance per locale and currency combination:

```typescript
const formatterCache = new Map<string, Intl.NumberFormat>();

  currency: string,
  locale: string
): Intl.NumberFormat {
  const key = `${locale}-${currency}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.NumberFormat(locale, { style: 'currency', currency })
    );
  }
  return formatterCache.get(key)!;
}

// Usage in a React component

function PriceDisplay({ amount, currency }: { amount: number; currency: string }) {
  const locale = useLocale();
  const formatted = getCurrencyFormatter(currency, locale).format(amount);
  return <span>{formatted}</span>;
}
```

## General Number Formatting

Use `Intl.NumberFormat` for any numeric value — percentages, large counts, units:

```typescript
// Percentage
new Intl.NumberFormat('en-US', { style: 'percent' }).format(0.742); // "74%"
new Intl.NumberFormat('de-DE', { style: 'percent' }).format(0.742); // "74 %"

// Compact notation for large numbers
new Intl.NumberFormat('en-US', { notation: 'compact' }).format(1_500_000); // "1.5M"
new Intl.NumberFormat('ja-JP', { notation: 'compact' }).format(1_500_000); // "150万"

// Unit formatting (metres, kilograms, etc.)
new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'kilometer',
  unitDisplay: 'long',
}).format(42); // "42 kilometers"
```

## Date and Time Formatting

`Intl.DateTimeFormat` handles locale-specific date and time patterns:

```typescript
const date = new Date('2025-03-11T14:30:00Z');

// Short date
new Intl.DateTimeFormat('en-US').format(date); // "3/11/2025"
new Intl.DateTimeFormat('de-DE').format(date); // "11.3.2025"
new Intl.DateTimeFormat('ja-JP').format(date); // "2025/3/11"

// Long date with time
new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'long',
  timeStyle: 'short',
}).format(date); // "11 March 2025 at 14:30"

// Relative time ("3 days ago")
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
rtf.format(-3, 'day'); // "3 days ago"
rtf.format(1, 'day');  // "tomorrow"
```

## Locale-Aware Sorting and Fallback Locales

Formatting is only part of localization. Sorting and searching should respect locale collation rules, and your app should fall back gracefully when the exact locale is unavailable:

```typescript
const requestedLocales = ['fr-CA', 'fr', 'en']
const resolvedLocale =
  Intl.NumberFormat.supportedLocalesOf(requestedLocales)[0] ?? 'en'

const collator = new Intl.Collator(resolvedLocale, {
  sensitivity: 'base',
  numeric: true,
})

const products = ['eclair', 'Éclair', 'eclair 2', 'eclair 10']
products.sort(collator.compare)
```

Relying on `Intl.NumberFormat()` without a locale argument uses the runtime's default locale, which will be the server locale during SSR and the user's browser locale on the client — causing a hydration mismatch in Next.js and similar frameworks. Always pass the locale string explicitly.

## Anti-Patterns to Avoid

```typescript
// ❌ Hardcoded symbol and separator — breaks for non-US locales
const price = `$${(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

// ❌ Using toLocaleString() without an explicit locale
const price = amount.toLocaleString(); // different on server vs client

// ✅ Explicit locale from user preferences or URL segment
const price = new Intl.NumberFormat(userLocale, {
  style: 'currency',
  currency: userCurrency,
}).format(amount);
```

## Standards

- Use these references as the standard for the rendered internationalization behavior, not just the source strings or config.
- Check the implementation against MDN: Intl.NumberFormat before treating the rule as satisfied.
- Check the implementation against MDN: Intl.DateTimeFormat before treating the rule as satisfied.

## Verification

1. Search the codebase for `toFixed`, regex-based comma insertion, and hardcoded `$`, `€`, or `£` symbols — replace with `Intl.NumberFormat`.
2. Render price components in a Storybook story with `locale='de-DE'` and `locale='ja-JP'` to confirm formatting changes correctly.
3. Check that no `Intl.NumberFormat()` or `Intl.DateTimeFormat()` call is missing an explicit locale argument to prevent SSR/client hydration mismatches.
4. Verify that formatter instances are cached per locale to avoid performance regressions in list views with many formatted values.
5. Search for `.sort()` on localized strings and confirm locale-aware ordering uses `Intl.Collator` with a defined fallback locale chain.