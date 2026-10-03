---
name: html-resource-hints
description: "Use when reviewing templates, rendered HTML, or shared components related to Add resource hints (preload, prefetch, dns-prefetch). Validate the final browser-facing markup, not just the source framework abstraction."
metadata:
  category: html
  priority: high
  difficulty: intermediate
  estimatedTime: "20"
  source: frontendchecklist.io
  url: https://frontendchecklist.io/en/rules/html/html-resource-hints
---

# Add resource hints (preload, prefetch, dns-prefetch)

The browser's HTML parser discovers resources sequentially — a font referenced in a CSS file won't be fetched until the CSS is parsed. Resource hints break this dependency chain, allowing the browser to start fetching critical resources in parallel with parsing. A single preload directive for a critical font can eliminate a 100–300ms Flash of Invisible Text.

## Quick Reference

- preload forces immediate download of resources needed by the current page
- prefetch fetches resources likely needed for the next navigation (low priority)
- dns-prefetch resolves DNS for third-party origins in advance
- preconnect does DNS + TCP + TLS for origins you'll connect to soon

## Check

Look at this HTML file for late-discovered critical resources — fonts referenced in CSS, hero images, and key scripts. Identify where preload or preconnect hints would help.

## Fix

Add appropriate preload hints for critical fonts, images, and scripts. Add preconnect for third-party domains used early in the page.

## Explain

Explain each resource hint type (preload, prefetch, preconnect, dns-prefetch), when to use each, and the consequences of misusing them.

## Code Review

Review templates, server-rendered HTML, and shared components that output markup related to Add resource hints (preload, prefetch, dns-prefetch). Flag exact elements, attributes, and routes where the rendered HTML violates the rule.

---

For full implementation details, code examples, and framework-specific guidance,
see `references/rule.md`.

Rule page: https://frontendchecklist.io/en/rules/html/html-resource-hints
