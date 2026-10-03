# Use locale-neutral images and provide cultural overrides when needed

> Default to abstract, culture-neutral icons and illustrations, and supply locale-specific image variants only when visual content carries meaning that differs across regions.

**Priority:** low · **Difficulty:** beginner · **Time:** 20 min

---
Images, icons, and illustrations are often treated as universal communication, but many common visuals carry culture-specific meaning. A visual that is helpful and welcoming in one locale can be confusing, misleading, or offensive in another. The safest strategy is to choose abstract, geometry-based icons by default and add locale-specific overrides only where cultural meaning genuinely varies.
## Code Example

Before reaching for locale-specific overrides, ask whether the icon can be replaced with a more universal visual metaphor. Abstract icons based on geometric shapes, arrows, and universally understood symbols (envelopes, magnifying glasses, padlocks) rarely require cultural variants:

```tsx
// ✅ Neutral icons that work across locales
// A checkmark badge as status — avoid using standalone checkmarks for "correct"
// An arrow pointing right for "continue" — works in LTR layouts
// A padlock for security — universally understood
// An envelope for messages — culturally neutral

// ❌ Avoid as defaults
// 👍 Thumbs up — use a star, heart, or abstract "like" shape instead
// 🫵 Pointing finger — use an arrow or chevron
// 🦉 Owl — use an abstract lightbulb or graduation cap for "knowledge"
```

## Why It Matters

Images that feel natural in one culture can be confusing or offensive in another — a thumbs-up is a vulgar gesture in parts of the Middle East and West Africa, and a checkmark means "wrong" in Japan. Choosing neutral visuals by default and providing targeted overrides avoids unintentional offence and keeps the image management surface small.

## Common Cultural Pitfalls

The table below lists frequently used images and the cultural considerations they carry:

| Image / Symbol | Common meaning (Western) | Alternative interpretation |
|---|---|---|
| Thumbs up | Approval, "like" | Offensive gesture in parts of the Middle East, West Africa, Greece, and Iran |
| Checkmark (✓) | Correct, completed | "Wrong" or "no" in Japan and some East Asian contexts |
| Owl | Wisdom, knowledge | Bad omen or death in some South Asian and African cultures |
| White color | Clean, minimal | Mourning and death in China, South Korea, and Japan |
| Red color | Error, danger | Luck and prosperity in China; mourning in South Africa |
| Pointing index finger | Direction, emphasis | Rude gesture in many cultures; prefer open-palm or arrow |
| OK hand gesture | Fine, agreement | Offensive or vulgar in Brazil, Turkey, and parts of Europe |
| Flag icons for languages | Language selection | Conflates language with nationality; French is spoken in 29 countries |
| Person silhouette | Generic user | Default silhouette shape may imply a specific gender or skin tone |
| Clock direction | Time passing forward | Left-to-right reading of clock motion is not universal |

## Locale-Aware Image Component

When a visual must vary by locale, centralise the decision in a single component with a neutral fallback. This keeps all cultural decisions in one place and makes audits straightforward:

```tsx
// components/LocaleImage.tsx

interface LocaleImageProps {
  /** The logical name of the image asset (e.g. "approval-icon") */
  assetKey: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Map of assetKey → locale → image path.
 * Only locales that differ from the default need an entry.
 * All other locales fall through to the `default` key.
 */
const localeImageMap: Record<string, Record<string, string>> = {
  'approval-icon': {
    default:  '/images/icons/approval-star.svg',
    'ar':     '/images/icons/approval-check-circle.svg',
    'ar-SA':  '/images/icons/approval-check-circle.svg',
    'ja':     '/images/icons/approval-circle.svg',
    'ko':     '/images/icons/approval-circle.svg',
  },
  'success-badge': {
    default:  '/images/icons/success-check.svg',
    'ja':     '/images/icons/success-circle.svg',
    'zh-TW':  '/images/icons/success-circle.svg',
  },
  'welcome-illustration': {
    default:  '/images/illustrations/welcome-neutral.png',
    'sa':     '/images/illustrations/welcome-sa.png',
    'in':     '/images/illustrations/welcome-in.png',
  },
};

/**
 * Resolves the image path for a given locale using the following priority:
 * 1. Exact locale match     (e.g. "ar-SA")
 * 2. Language-only match    (e.g. "ar")
 * 3. Default fallback
 */
function resolveImagePath(assetKey: string, locale: string): string {
  const variants = localeImageMap[assetKey];
  if (!variants) {
    console.warn(`LocaleImage: unknown assetKey "${assetKey}"`);
    return `/images/icons/${assetKey}.svg`; // best-effort fallback
  }

  // Try exact locale match first
  if (variants[locale]) return variants[locale];

  // Try language tag only (e.g. "ar" from "ar-SA")
  const lang = locale.split('-')[0];
  if (variants[lang]) return variants[lang];

  return variants.default;
}

  assetKey,
  alt,
  width,
  height,
  className,
}: LocaleImageProps) {
  // Replace with your app's locale hook or context
  const locale =
    typeof document !== 'undefined'
      ? document.documentElement.lang || 'en'
      : 'en';

  const src = resolveImagePath(assetKey, locale);

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
```

Usage in a page or component:

```tsx
// ✅ Cultural override is invisible to the consumer

```

Mapping a national flag to a language conflates nationality with language. French is spoken in 29 countries; Spanish in 20. Use the language name written in the language itself (e.g. "Français", "Español", "日本語") or a neutral globe icon for language selectors. Flag icons are appropriate only when the user is selecting a country or region, not a language.

## Text in Images

Images that contain text are one of the most common i18n oversights. Text baked into a PNG or JPEG cannot be extracted for translation, cannot be resized for accessibility, and cannot adapt to RTL layouts:

```
❌ A promotional banner image with the text "Get 50% off today!" embedded
❌ A feature screenshot with English UI labels that are part of the image
❌ An infographic where all data labels are rasterised into the PNG

✅ An SVG with text in <text> elements — can be translated via i18n attribute injection
✅ An HTML/CSS overlay on top of an image — text is in the DOM and translatable
✅ A pure illustration with no words — works for every locale without modification
```

If SVG is used and text must appear inside it, externalise the strings:

```tsx
// ✅ SVG with translatable text via props
interface BadgeSvgProps {
  label: string; // translated by the caller
}

function BadgeSvg({ label }: BadgeSvgProps) {
  return (
    <svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="40" rx="8" fill="#3b82f6" />
      {/* Text is a prop — not hardcoded — so it can be translated */}
      <text
        x="50"
        y="25"
        textAnchor="middle"
        fill="white"
        fontSize="14"
        fontFamily="system-ui, sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}

// Caller controls the translated string

```

## Next.js / App Router Integration

When using Next.js with the App Router and a `[lang]` segment, the locale is available directly from params and can be forwarded to `LocaleImage`:

```tsx
// app/[lang]/feature/page.tsx

  params,
}: {
  params: { lang: string };
}) {
  return (
    <section>
      
    </section>
  );
}
```

Extend the `LocaleImage` component to accept an optional `locale` prop so that server components can pass it directly without reading `document.documentElement.lang`.

Maintaining locale-specific image variants adds asset management overhead. Audit the map on every release cycle and replace locale variants with neutral alternatives wherever a suitable one exists. The goal is to reduce the map over time, not grow it.

## Standards

- Use these references as the standard for the rendered internationalization behavior, not just the source strings or config.
- Check the implementation against W3C Internationalization: Cultural considerations before treating the rule as satisfied.
- Check the implementation against MDN: Internationalization before treating the rule as satisfied.

## Verification

1. Review every image and icon in the design system or component library against the cultural considerations table above — flag any hand gestures, colour-coded status indicators, or culturally loaded symbols.
2. Search the codebase for `<img` tags and `next/image` usages with hardcoded `src` paths that reference icons or illustrations — confirm each either uses `LocaleImage` or has been assessed as culturally neutral.
3. Inspect all SVG and image assets for embedded text by opening them in a text editor and searching for `<text`, visible string content, or rasterised label layers.
4. Test the language selector in the UI to confirm it displays language names in the language itself (e.g. "Deutsch", "中文") rather than flag icons or English-only labels.