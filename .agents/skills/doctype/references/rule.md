# Use the HTML5 doctype

> The HTML5 doctype declaration must appear as the first line of every HTML document to trigger standards mode rendering in all browsers.

**Priority:** critical · **Difficulty:** beginner · **Time:** 5 min

---
The HTML5 doctype declaration must be the very first line of every HTML document. It switches browsers into standards-compliant rendering mode.
## Code Examples

```html
<!-- ✅ Correct: HTML5 doctype as the first line -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page Title</title>
</head>
<body>
  <!-- content -->
</body>
</html>
```

```html
<!-- ❌ Incorrect: missing doctype -->
<html lang="en">
<head>
  <title>Page Title</title>
</head>

<!-- ❌ Incorrect: old XHTML 1.0 doctype -->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<!-- ❌ Incorrect: HTML 4.01 Strict doctype -->
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"
  "http://www.w3.org/TR/html4/strict.dtd">
```

## Why It Matters

- **Box Model**: In Quirks Mode, `width` and `height` include padding and border (like the old IE box model), breaking CSS layouts.
- **CSS Features**: Many modern CSS properties behave differently or are ignored in Quirks Mode.
- **JavaScript APIs**: Some DOM APIs behave differently in Quirks Mode.
- **Validation**: HTML5 documents without the doctype fail W3C validation.

## Rendering Modes

| Mode | Triggered by | Behavior |
|---|---|---|
| Standards Mode | `<!DOCTYPE html>` present | CSS/HTML behaves per W3C specifications |
| Almost Standards Mode | Some HTML4 doctypes | Minor table rendering quirks |
| Quirks Mode | Missing or unrecognized doctype | Emulates IE5/Netscape 4 behavior |

## Framework Notes

Most modern frameworks handle the doctype automatically:

- **Next.js**: Included automatically in the rendered HTML output
- **Vite / Vue CLI**: Present in `index.html` template
- **Create React App**: Present in `public/index.html`
- **Astro**: Included automatically
- **Ruby on Rails**: Present in `application.html.erb`

Always verify in the **rendered HTML source** (browser: View Source), not just the template file, as SSR configurations can sometimes omit or move elements.

## Standards

- Use HTML Living Standard: The DOCTYPE as the standard for the final rendered HTML and browser-facing behavior.
- Use MDN: DOCTYPE as the standard for the final rendered HTML and browser-facing behavior.
- Use MDN: Quirks Mode and Standards Mode as the standard for the final rendered HTML and browser-facing behavior.

## Verification

### Automated Checks

- Inspect the final rendered HTML in the browser or page source to confirm the rule is satisfied.
- Validate the affected markup with browser tooling or an HTML validator where appropriate.
- Test one representative route or template that uses the pattern.
- Re-check shared components that emit the same markup so the fix is consistent.

### Manual Checks

- Verify the rendered browser behavior manually on representative routes and supported browsers so the user-facing outcome matches the rule.