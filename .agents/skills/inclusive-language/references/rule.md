# Use inclusive language

> Content uses inclusive, non-discriminatory language that welcomes all users regardless of ability, gender, race, or background.

**Priority:** medium · **Difficulty:** beginner · **Time:** 20 min

---
Inclusive language makes all users feel welcome and avoids reinforcing harmful stereotypes.

## Code Example

```typescript
// ❌ Ableist language in code
function sanityCheck(data: unknown): boolean { ... }
const dummyUser = { name: 'Test' }
// This is a crazy edge case

// ✅ Inclusive alternatives
function validateInput(data: unknown): boolean { ... }
const sampleUser = { name: 'Test' }
// This is an unusual edge case
```

## Why It Matters

Language shapes experience—ableist, gendered, or exclusionary terminology creates unwelcoming experiences and reinforces harmful stereotypes, even unintentionally.

## Ableist Language Alternatives

| Avoid | Use Instead |
|-------|-------------|
| crazy, insane | unexpected, surprising, intense |
| lame | uninteresting, ineffective |
| blind to, turn a blind eye | unaware of, ignore |
| deaf to | unresponsive to, ignore |
| dumb | silent, unable to speak |
| cripple, crippled | disable, impair, damage |
| sanity check | confidence check, validation |
| dummy (variable, data) | placeholder, sample, test |

## Gender-Neutral Language

```html
<!-- ❌ Gendered assumptions -->
<p>When a user logs in, he can access his dashboard.</p>
<label>Salutation: Mr. / Mrs. / Ms.</label>

<!-- ✅ Gender-neutral -->
<p>When users log in, they can access their dashboard.</p>
<label>Name (optional title)</label>
<!-- Or offer inclusive options: Mx., prefer not to say, custom -->
```

## Error Messages

```typescript
// ❌ Blaming, unhelpful error messages
const errors = {
  invalidEmail: "You entered an invalid email",
  wrongPassword: "Wrong password. Try again.",
  formFailed: "You made errors in the form"
}

// ✅ Helpful, non-blaming messages
const errors = {
  invalidEmail: "Please enter a valid email address (example: name@domain.com)",
  wrongPassword: "The password doesn't match our records. Need to reset it?",
  formFailed: "Some fields need attention. See highlighted areas below."
}
```

## Avoiding Cultural Bias

```typescript
// ❌ Culture-specific idioms
const messages = {
  success: "Home run! You did it!",
  error: "Back to square one",
  loading: "Keep your fingers crossed"
}

// ✅ Universal language
const messages = {
  success: "Complete! Your changes are saved.",
  error: "Let's try a different approach",
  loading: "Processing your request"
}
```

## Form Design

```tsx
// ❌ Binary gender, required field
<select name="gender" required>
  <option value="male">Male</option>
  <option value="female">Female</option>
</select>

// ✅ Inclusive options, optional field
<select name="gender" aria-describedby="gender-note">
  <option value="">Prefer not to say</option>
  <option value="female">Female</option>
  <option value="male">Male</option>
  <option value="non-binary">Non-binary</option>
  <option value="other">Other</option>
</select>
<p id="gender-note" className="helper-text">
  Optional. Used for personalization only.
</p>
```

## Name Fields

```tsx
// ❌ Assumes Western naming conventions
<input name="firstName" required />
<input name="lastName" required />

// ✅ Flexible name handling
<input
  name="fullName"
  required
  aria-describedby="name-help"
/>
<p id="name-help">Enter your name as you'd like to be addressed</p>

// Or if separate fields needed:
<input name="givenName" placeholder="Given name(s)" />
<input name="familyName" placeholder="Family name" />
```

## Placeholder Text and Examples

```html
<!-- ❌ Culturally specific examples -->
<input placeholder="John Smith">
<input type="tel" placeholder="(555) 123-4567">

<!-- ✅ Generic or varied examples -->
<input placeholder="Your name">
<input type="tel" placeholder="+1 555 123 4567" aria-describedby="phone-format">
<p id="phone-format">Include country code for international numbers</p>
```

## Content Review Checklist

```markdown
## Language Review Checklist

### Ableist Language
- [ ] No "crazy," "insane," "lame," "dumb"
- [ ] No "blind to," "deaf to," "turn a blind eye"
- [ ] No "sanity check," "dummy data"

### Gender
- [ ] Uses "they/them" for unknown individuals
- [ ] Avoids "he/she" constructions
- [ ] Gender fields are optional or inclusive

### Tone
- [ ] Error messages guide, don't blame
- [ ] Instructions are encouraging, not condescending
- [ ] Avoids idioms that don't translate

### Names & Identity
- [ ] Name fields accommodate global naming conventions
- [ ] Titles/salutations are optional
- [ ] Examples use diverse names
```

## Exceptions

- Some exact legal, product, or brand wording cannot be simplified freely, but the surrounding content should still reduce ambiguity and cognitive load where possible.
- A content rule should be judged on the final user-facing wording, not just on individual banned phrases taken out of context.
- If a page has both structural accessibility failures and content clarity issues, fix the failure that prevents users from reaching or perceiving the content first.

## Standards

- Align the implementation with W3C WAI: WCAG Overview and verify the rendered experience, not only the source code.
- Align the implementation with MDN: Accessibility and verify the rendered experience, not only the source code.

## Verification

### Automated Checks

- Use automated tools to flag common issues

### Manual Checks

- Read all user-facing text with fresh eyes
- Check error messages for blame language
- Review form fields for assumptions about identity
- Test with users from diverse backgrounds