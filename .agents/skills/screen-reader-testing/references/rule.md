# Test with screen readers

> Pages must be tested with actual screen reader software (NVDA, JAWS, VoiceOver, TalkBack) to verify announcements, focus order, and widget behavior beyond what automated tools can detect.

**Priority:** high · **Difficulty:** intermediate · **Time:** 60 min

---
Automated accessibility testing catches structural issues in the accessibility tree, but cannot verify whether a page is actually usable by someone relying on a screen reader. [WebAIM's testing guide](https://webaim.org/articles/screenreader_testing/), the [NVDA user guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html), and the [VoiceOver guide](https://support.apple.com/guide/voiceover/welcome/mac) all assume real assistive tech is part of the review, not an optional extra.
## Code Example

```md
Screen reader test checklist:
- Open the page in a screen reader such as NVDA, VoiceOver, or JAWS
- Navigate the primary flow using headings, landmarks, and form controls
- Confirm names, roles, states, and announcements are understandable
```

## Why It Matters

The [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) is useful for expected widget behavior, but only a real screen reader session can tell you whether that implementation is actually announced and navigable in context.

- **Automation Gap**: Tools like axe-core find structural violations but cannot test whether the actual user experience is meaningful.
- **Cognitive Load**: Even technically valid ARIA implementations can produce confusing announcement sequences — only human testing reveals this.
- **Interaction Modes**: Screen readers switch between browse mode and application mode; widgets that work visually may fail in application mode.
- **Real User Validation**: Testing with an actual or simulated screen reader user provides actionable evidence of actual barriers.

## Screen Reader / Browser Pairings

| Screen Reader | Best Browser | Platform | Market Share (est.) |
|---|---|---|---|
| JAWS | Chrome, Edge | Windows | ~40% |
| NVDA | Chrome, Firefox | Windows | ~41% |
| VoiceOver | Safari | macOS, iOS | ~10% desktop, ~70% mobile iOS |
| TalkBack | Chrome | Android | Most Android users |
| Narrator | Edge | Windows | Small but growing |

Test with at least NVDA + Chrome and VoiceOver + Safari to cover the two largest populations.

## Core Testing Checklist

### Navigation
- [ ] All content reachable by Tab key alone
- [ ] Heading structure makes sense when navigating by headings (H key in NVDA/JAWS)
- [ ] Landmarks are present and labeled (`<main>`, `<nav>`, `<header>`)
- [ ] Skip link works and moves focus to main content

### Interactive Elements
- [ ] Every button, link, and form field announced with name + role + state
- [ ] Custom widgets (tabs, menus, trees, dialogs) follow arrow-key navigation patterns
- [ ] Toggle buttons announce their current state (aria-pressed, aria-expanded)

### Forms
- [ ] Each input announced with its label when focused
- [ ] Required fields announced as required (aria-required="true")
- [ ] Inline validation errors associated with their field (aria-describedby)
- [ ] Form submission errors cause focus to move to error summary

### Dynamic Content
- [ ] Loading states announced without disrupting reading flow
- [ ] Success/error messages announced (aria-live regions)
- [ ] Modal dialogs trap focus and return it on close
- [ ] Infinite scroll or lazy-loaded content is reachable

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Standards

- Align the implementation with WebAIM: Using Screen Readers for Testing and verify the rendered experience, not only the source code.
- Align the implementation with NVDA User Guide and verify the rendered experience, not only the source code.
- Align the implementation with Apple: VoiceOver User Guide (macOS) and verify the rendered experience, not only the source code.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.