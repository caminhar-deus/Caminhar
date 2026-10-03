# Tel & Mailto Links

> Validates that phone numbers use the tel: scheme and email addresses use the mailto: scheme for one-click contact on mobile devices.

**Priority:** medium · **Difficulty:** beginner · **Time:** 10 min

---
The `tel:` and `mailto:` URI schemes are standard HTML link types that invoke native device capabilities such as the phone dialer and email client. [RFC 3966](https://www.rfc-editor.org/info/rfc3966/) defines the `tel:` syntax, and the same crawlable-link expectations in [invalid links](/en/rules/seo/invalid-links) still apply even when the goal is contact UX rather than page discovery.

## Code Examples

```html
<!-- ✅ Correct: E.164 format in href, human-readable in link text -->
<a href="tel:+442071234567">+44 (0)20 7123 4567</a>

<!-- ✅ US number -->
<a href="tel:+15551234567">(555) 123-4567</a>

<!-- ❌ Wrong: spaces in href value -->
<a href="tel:+1 555 123 4567">...</a>

<!-- ❌ Wrong: number not linked at all -->
<p>Call us: +1 (555) 123-4567</p>
```

#

## E.164 Format

E.164 is the international standard for phone numbers:

- Starts with `+`
- Followed by country code (1–3 digits)
- Followed by subscriber number (no spaces, dashes, or parentheses)
- Maximum 15 digits total

```
+12125551234    (US: +1, area 212, number 5551234)
+442071234567   (UK: +44, London 020, number 71234567)
+33123456789    (France: +33)
```

## Why It Matters

On mobile devices, `tel:` and `mailto:` links trigger the native phone dialer and email client with one tap; plain-text contact info forces copy-paste and measurably reduces contact conversion rates. [MDN's tel-link reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#linking_to_phone_numbers) is the practical implementation baseline here.

## mailto: Links

```html
<!-- ✅ Basic email link -->
<a href="mailto:hello@example.com">hello@example.com</a>

<!-- ✅ With subject and body pre-filled -->
<a href="mailto:support@example.com?subject=Help%20Request&body=Hello%2C%20I%20need%20help%20with...">
  Contact Support
</a>

<!-- ✅ Multiple recipients (separate with comma) -->
<a href="mailto:one@example.com,two@example.com">Email both contacts</a>

<!-- ❌ Wrong: email as plain text -->
<p>Email: support@example.com</p>
```

## Schema.org + Contact Links

When combined with [LocalBusiness schema](/en/rules/seo/local-business) or Person schema:

```html
<script type="application/ld+json">
{
  "@type": "LocalBusiness",
  "name": "Acme Plumbing",
  "telephone": "+15551234567",
  "email": "info@acmeplumbing.com"
}
</script>

<!-- Ensure the visible page links match schema data -->
<a href="tel:+15551234567">(555) 123-4567</a>
<a href="mailto:info@acmeplumbing.com">info@acmeplumbing.com</a>
```

## Accessibility Note

For screen readers, the link text should be the human-readable number, not the E.164 format:

```html
<!-- ✅ Screen reader reads: "plus one five five five one two three four five six seven" -->
<a href="tel:+15551234567" aria-label="Call us at 1 555 123 4567">
  +1 (555) 123-4567
</a>
```

## Exceptions

- Necessary utility or compliance pages can be intentionally brief and should not be judged by the same editorial-depth expectations as ranking-focused content.
- AI-assisted drafting is not a failure by itself; flag unsupported claims, missing editorial review, or low-originality output instead.
- When a page has both trust-signal issues and crawl/index problems, make the page eligible to rank first and then improve the content quality signals.

## Standards

- Use these references as the standard for the final search-facing HTML, metadata, and crawl behavior.
- Check the implementation against IETF RFC 3966: The tel URI for Telephone Numbers before treating the rule as satisfied.
- Check the implementation against MDN: tel URI scheme before treating the rule as satisfied.

## Verification

### Automated Checks

- Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
- Test the affected URL with Google Search Console or equivalent tooling where relevant.
- Re-crawl a representative page set after deployment.

### Manual Checks

- Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.