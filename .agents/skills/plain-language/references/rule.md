# Write in plain language

> Content uses clear, simple language that is easy to understand for users with cognitive disabilities and non-native speakers.

**Priority:** medium · **Difficulty:** beginner · **Time:** 20 min

---
Plain language makes your content accessible to the widest possible audience.

## Code Examples

```text
❌ Complex:
"Users are required to utilize the authentication mechanism
to facilitate access to the aforementioned functionality."

✅ Plain:
"Sign in to use this feature."
```

```text
❌ Passive and wordy:
"The form should be completed by the user before
submission can be processed."

✅ Active and direct:
"Complete the form, then click Submit."
```

```text
❌ Jargon-heavy:
"Leverage the API endpoints to programmatically
interface with our platform's functionality."

✅ Plain:
"Use our API to connect your app to our service."
```

## Why It Matters

Plain language helps users with cognitive disabilities, learning differences, attention disorders, non-native speakers, and anyone reading quickly or under stress.

## Writing Guidelines

| Avoid | Use Instead |
|-------|-------------|
| Long sentences (30+ words) | Short sentences (15-20 words) |
| Passive voice | Active voice |
| Jargon and acronyms | Common words, spell out acronyms |
| Abstract concepts | Concrete examples |
| Double negatives | Positive statements |

## Technical Content

```tsx
// ❌ Complex error message
const errorMessage = `
  Authentication credentials have failed verification
  against the identity provider. Please rectify the
  supplied parameters and reattempt the operation.
`

// ✅ Plain error message
const errorMessage = `
  Your password is incorrect. Please try again
  or click "Forgot password" to reset it.
`
```

## Structure for Clarity

```tsx
// ❌ Wall of text
<p>
  To complete your purchase you need to add items to your cart
  then proceed to checkout where you'll enter your shipping
  information and payment details before confirming your order
  and receiving a confirmation email with tracking information.
</p>

// ✅ Scannable steps
<ol>
  <li>Add items to your cart</li>
  <li>Click Checkout</li>
  <li>Enter your shipping address</li>
  <li>Add payment details</li>
  <li>Confirm your order</li>
</ol>
<p>We'll email you a confirmation with tracking info.</p>
```

## Defining Technical Terms

```tsx
function HelpText({ term, definition }: { term: string; definition: string }) {
  return (
    <span className="term-with-definition">
      {term}
      <span className="definition" role="definition">
        ({definition})
      </span>
    </span>
  )
}

// Usage
<p>
  Your data is protected with .
</p>
```

## Readability Testing Tools

```typescript
// Simple readability check: sentence length
function checkSentenceLength(text: string): string[] {
  const sentences = text.split(/[.!?]+/)
  const warnings: string[] = []

  sentences.forEach((sentence, index) => {
    const wordCount = sentence.trim().split(/\s+/).length
    if (wordCount > 25) {
      warnings.push(`Sentence ${index + 1} has ${wordCount} words. Consider splitting.`)
    }
  })

  return warnings
}
```

## Checklist for Plain Language

```markdown
## Content Review Checklist

### Sentences
- [ ] Average sentence length under 20 words
- [ ] One idea per sentence
- [ ] Active voice (subject-verb-object)

### Words
- [ ] Common words over jargon
- [ ] Acronyms spelled out on first use
- [ ] Technical terms defined

### Structure
- [ ] Short paragraphs (2-4 sentences)
- [ ] Headings describe content clearly
- [ ] Lists for 3+ items
- [ ] Most important info first

### Instructions
- [ ] Action verbs at start ("Click", "Enter", "Select")
- [ ] Step-by-step format for processes
- [ ] Expected outcomes stated
```

## UI Copy Examples

```tsx
const uiCopy = {
  // ❌ Complex
  save: "Persist modifications to server",
  // ✅ Plain
  save: "Save changes",

  // ❌ Complex
  logout: "Terminate authenticated session",
  // ✅ Plain
  logout: "Sign out",

  // ❌ Complex
  error: "An unexpected exception has occurred",
  // ✅ Plain
  error: "Something went wrong. Please try again.",

  // ❌ Complex
  empty: "No applicable records were retrieved",
  // ✅ Plain
  empty: "No results found"
}
```

## Exceptions

- Some exact legal, product, or brand wording cannot be simplified freely, but the surrounding content should still reduce ambiguity and cognitive load where possible.
- A content rule should be judged on the final user-facing wording, not just on individual banned phrases taken out of context.
- If a page has both structural accessibility failures and content clarity issues, fix the failure that prevents users from reaching or perceiving the content first.

## Verification

### Automated Checks

- Use readability tools (Hemingway Editor, readable.com)

### Manual Checks

- Target 8th grade reading level for general content
- Read content aloud—if it sounds awkward, simplify
- Test with users who have different language backgrounds
- Check that instructions are actionable and clear