# Avoid sensory-only instructions

> Instructions do not rely solely on sensory characteristics like color, shape, size, location, or sound.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
Instructions must work for users who can't perceive specific sensory characteristics.

## Code Example

```html
<!-- ❌ Bad: Color only -->
<p>Required fields are marked in red.</p>
<label style="color: red;">Name</label>

<!-- ✅ Good: Color + text indicator -->
<p>Required fields are marked with an asterisk (*).</p>
<label>
  Name <span class="required" aria-hidden="true">*</span>
  <span class="sr-only">(required)</span>
</label>
```

## Why It Matters

Color-blind users can't see 'click the red button,' screen reader users can't perceive 'the menu on the right,' and deaf users miss audio cues—multi-modal instructions include everyone.

## Problem Examples

| Sensory-Only | Problem | Who's Affected |
|--------------|---------|----------------|
| "Click the red button" | Color-blind users can't identify | 8% of men |
| "See the sidebar on the right" | Screen readers don't convey position | Blind users |
| "Click the round icon" | Shape not described to AT | Screen reader users |
| "You'll hear a beep when done" | Deaf users miss the cue | Deaf/hard of hearing |
| "The large text at the top" | Size is relative | Low vision users at high zoom |

## Fixing Location-Only Instructions

```html
<!-- ❌ Bad: Location only -->
<p>Click the button on the right to submit.</p>

<!-- ✅ Good: Text label + location -->
<p>Click the "Submit" button (on the right) to continue.</p>

<!-- ✅ Better: Clear button text, no location needed -->
<button>Submit Form</button>
<p>Click "Submit Form" when ready.</p>
```

## Fixing Shape-Only Instructions

```html
<!-- ❌ Bad: Shape only -->
<p>Click the gear icon to access settings.</p>
<button>
  <svg><!-- gear shape --></svg>
</button>

<!-- ✅ Good: Shape + accessible label -->
<p>Click "Settings" (the gear icon) to customize.</p>
<button aria-label="Settings">
  <svg aria-hidden="true"><!-- gear shape --></svg>
</button>
```

## Fixing Sound-Only Cues

```tsx
// ❌ Bad: Sound only
function NotificationSound() {
  useEffect(() => {
    playSound('notification.mp3')
    // Deaf users miss this entirely
  }, [hasNewMessage])
}

// ✅ Good: Sound + visual indicator
function AccessibleNotification() {
  useEffect(() => {
    if (hasNewMessage) {
      playSound('notification.mp3')
      // Also show visual notification
      showToast('New message received')
      // And update page title for unfocused tabs
      document.title = '(1) New message - App'
    }
  }, [hasNewMessage])
}
```

## Error States: Multiple Cues

```tsx
function FormField({ error, label, ...props }: FormFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={props.id}>{label}</label>
      <input
        {...props}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
        className={error ? 'input-error' : ''}
      />
      {error && (
        <p id={`${props.id}-error`} className="error-message" role="alert">
          {/* Icon + text + color (3 cues) */}
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      )}
    </div>
  )
}
```

```css
/* Error styling uses multiple cues */
.input-error {
  border-color: #d32f2f; /* Red border */
  border-width: 2px; /* Thicker border */
  background-color: #ffebee; /* Light red background */
}

.error-message {
  color: #d32f2f;
  font-weight: bold; /* Additional visual weight */
}

/* Icon provides shape cue */
.error-message::before {
  content: "⚠️ ";
}
```

## Status Indicators

```tsx
// ❌ Bad: Color-only status
<span style={{ color: item.status === 'active' ? 'green' : 'red' }}>
  ●
</span>

// ✅ Good: Color + text + icon
<span className={`status status-${item.status}`}>
  <span aria-hidden="true">
    {item.status === 'active' ? '✓' : '✗'}
  </span>
  {item.status === 'active' ? 'Active' : 'Inactive'}
</span>
```

## Testing Checklist

```markdown
## Sensory Instructions Audit

### Color
- [ ] No "red/green" only references
- [ ] Required fields have text indicators
- [ ] Error states use icons and text, not just color
- [ ] Links distinguishable by more than color

### Location
- [ ] No "left/right/above/below" only references
- [ ] Elements have text labels
- [ ] Instructions reference element names

### Shape
- [ ] Icons have text labels or aria-label
- [ ] No "circle/square/triangle" only references
- [ ] Shape references include text alternative

### Sound
- [ ] All audio cues have visual alternatives
- [ ] Important sounds have captions or text
- [ ] No sound-only instructions
```

## Exceptions

- Some exact legal, product, or brand wording cannot be simplified freely, but the surrounding content should still reduce ambiguity and cognitive load where possible.
- A content rule should be judged on the final user-facing wording, not just on individual banned phrases taken out of context.
- If a page has both structural accessibility failures and content clarity issues, fix the failure that prevents users from reaching or perceiving the content first.

## Verification

### Automated Checks

- Use browser accessibility tooling, axe, Lighthouse, or equivalent automated checks against a representative rendered state.

### Manual Checks

- Read instructions without looking at the screen
- View page in grayscale (test color independence)
- Mute audio and verify all cues are still perceivable
- Use screen reader to navigate—instructions should make sense
- Ask: "Could a user who can't see/hear/distinguish colors follow this?"