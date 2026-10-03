# Match lang and xml:lang attributes

> The lang and xml:lang attributes on the html element must have identical values to avoid conflicting language signals across HTML and XML parsers.

**Priority:** medium · **Difficulty:** beginner · **Time:** 5 min

---
When using both `lang` and `xml:lang` on the same element, they must have the exact same value. The [HTML Living Standard](https://html.spec.whatwg.org/multipage/dom.html#attr-lang) and [W3C language declaration guidance](https://www.w3.org/International/questions/qa-html-language-declarations) both treat mismatches as contradictory language signals to parsers and user agents.
## Code Example

```html
<!-- ✅ Correct HTML5 document: only lang needed -->
<!DOCTYPE html>
<html lang="en">

<!-- ✅ Correct polyglot/XHTML document: both present and identical -->
<html lang="fr" xml:lang="fr">

<!-- ❌ Incorrect: values differ -->
<html lang="en" xml:lang="fr">

<!-- ❌ Incorrect: dialect mismatch — en vs en-US -->
<html lang="en" xml:lang="en-US">

<!-- ❌ Incorrect: invalid language tag -->
<html lang="english">
```

## Why It Matters

- **Parser Compatibility**: HTML parsers use `lang`; XML parsers use `xml:lang`. Polyglot documents must satisfy both.
- **Screen Readers**: Conflicting attributes can cause the wrong speech synthesis language profile to be selected.
- **Translation Tools**: Browser auto-translate features rely on `lang` to detect the source language.
- **WCAG Compliance**: [SC 3.1.1 Language of Page](https://www.w3.org/TR/WCAG21/#language-of-page) requires the page language to be programmatically determinable, and [BCP 47](https://www.rfc-editor.org/info/rfc5646/) defines the language tags that make that possible.

## When to Use Each Attribute

| Document Type | `lang` | `xml:lang` |
|---|---|---|
| Standard HTML5 (`text/html`) | Required | Not needed |
| XHTML (`application/xhtml+xml`) | Recommended | Required |
| Polyglot HTML (valid as both) | Required | Required (same value) |

## Best Practices

- For new HTML5 projects, use only `lang` on `<html>` and omit `xml:lang`.
- If you add `xml:lang` for compatibility reasons, always keep it in sync with `lang`.
- Use subtags consistently — if one attribute has `en-GB`, the other must also have `en-GB`, not just `en`.

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Standards

- Align the implementation with WCAG 2.1 SC 3.1.1: Language of Page and verify the rendered experience, not only the source code.
- Align the implementation with HTML Living Standard: The lang and xml:lang attributes and verify the rendered experience, not only the source code.
- Align the implementation with W3C: Declaring language in HTML and verify the rendered experience, not only the source code.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.