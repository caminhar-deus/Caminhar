# Validate forms accessibly

> Forms provide clear validation feedback with accessible error messages and proper ARIA attributes.

**Priority:** high · **Difficulty:** intermediate · **Time:** 25 min

---
Accessible form validation ensures all users can understand and correct input errors.

## Code Example

```html
<form novalidate>
  <div class="form-field">
    <label for="email">Email address</label>
    <input
      type="email"
      id="email"
      name="email"
      aria-describedby="email-help email-error"
      aria-invalid="false"
      required
    />
    <span id="email-help" class="form-field__help">
      We'll never share your email
    </span>
    <span id="email-error" class="form-field__error" role="alert" hidden>
      Please enter a valid email address
    </span>
  </div>

  <button type="submit">Subscribe</button>
</form>
```

## Why It Matters

Inaccessible form validation leaves screen reader users unable to understand what went wrong and how to fix it, causing frustration and form abandonment.

## Validation Requirements

| Requirement | Implementation |
|-------------|----------------|
| Required state | `required` or `aria-required="true"` |
| Help text association | `aria-describedby` linking to helper text |
| Error association | `aria-describedby` linking to error |
| Invalid state | `aria-invalid="true"` on field |
| Error visibility | Don't use color alone |
| Focus management | Move focus to first error |
| Error summary | Optional but helpful |

## Grouped Controls

Radio buttons and related checkboxes need a shared semantic label so users hear the question before the options:

```html
<fieldset aria-describedby="contact-help">
  <legend>Preferred contact method</legend>

  <p id="contact-help">Choose the primary way we should contact you.</p>

  <label>
    <input type="radio" name="contact" value="email" required>
    Email
  </label>

  <label>
    <input type="radio" name="contact" value="phone">
    Phone
  </label>
</fieldset>
```

## React Form with Validation

```tsx

interface FormFieldProps {
  label: string
  name: string
  type?: string
  required?: boolean
  error?: string
  help?: string
  value: string
  onChange: (value: string) => void
}

  label,
  name,
  type = 'text',
  required = false,
  error,
  help,
  value,
  onChange
}: FormFieldProps) {
  const inputId = useId()
  const helpId = useId()
  const errorId = useId()

  const describedBy = [
    help ? helpId : null,
    error ? errorId : null,
  ].filter(Boolean).join(' ') || undefined

  return (
    <div className="form-field">
      <label htmlFor={inputId}>
        {label}
        {required && <span aria-hidden="true">*</span>}
      </label>

      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy}
        aria-invalid={!!error}
        aria-required={required}
        className={error ? 'form-field__input--error' : ''}
      />

      {help && (
        <span id={helpId} className="form-field__help">
          {help}
        </span>
      )}

      {error && (
        <span id={errorId} className="form-field__error" role="alert">
          <span className="form-field__error-icon" aria-hidden="true">⚠</span>
          {error}
        </span>
      )}
    </div>
  )
}
```

## Complete Form Example

```tsx
interface FormData {
  name: string
  email: string
  password: string
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
}

  const [formData, setFormData] = useState {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    return newErrors
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const newErrors = validate()
    setErrors(newErrors)
    setSubmitted(true)

    if (Object.keys(newErrors).length > 0) {
      // Focus first field with error
      const firstErrorField = formRef.current?.querySelector('[aria-invalid="true"]')
      ;(firstErrorField as HTMLElement)?.focus()
      return
    }

    // Submit form
    console.log('Form submitted:', formData)
  }

  const updateField = (field: keyof FormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {/* Error summary (optional but helpful) */}
      {submitted && Object.keys(errors).length > 0 && (
        <div role="alert" className="form-errors" aria-live="assertive">
          <h2>Please correct the following errors:</h2>
          <ul>
            {errors.name && <li><a href="#name">{errors.name}</a></li>}
            {errors.email && <li><a href="#email">{errors.email}</a></li>}
            {errors.password && <li><a href="#password">{errors.password}</a></li>}
          </ul>
        </div>
      )}

      

      

      

      <button type="submit">Create Account</button>
    </form>
  )
}
```

## Real-Time Validation

```tsx
function useValidation(value: string, validators: ((v: string) => string | null)[]) {
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const validate = () => {
    for (const validator of validators) {
      const result = validator(value)
      if (result) {
        setError(result)
        return false
      }
    }
    setError(null)
    return true
  }

  const onBlur = () => {
    setTouched(true)
    validate()
  }

  return {
    error: touched ? error : null,
    onBlur,
    validate,
    isValid: !error
  }
}

// Validators
const required = (message: string) => (value: string) =>
  value.trim() ? null : message

const minLength = (min: number, message: string) => (value: string) =>
  value.length >= min ? null : message

const email = (message: string) => (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : message

// Usage
function EmailInput() {
  const [email, setEmail] = useState('')
  const validation = useValidation(email, [
    required('Email is required'),
    email('Please enter a valid email')
  ])

  return (
     {
        setEmail(v)
        validation.validate()
      }}
      onBlur={validation.onBlur}
      error={validation.error}
    />
  )
}
```

## Styling

```css
.form-field {
  margin-bottom: 1.5rem;
}

.form-field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.form-field input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.form-field input:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.2);
}

.form-field__input--error {
  border-color: #dc3545;
}

.form-field__input--error:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.2);
}

.form-field__help {
  display: block;
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

.form-field__error {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #dc3545;
  margin-top: 0.25rem;
}

.form-field__error-icon {
  flex-shrink: 0;
}

/* Error summary */
.form-errors {
  padding: 1rem;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.form-errors h2 {
  font-size: 1rem;
  margin: 0 0 0.5rem;
}

.form-errors ul {
  margin: 0;
  padding-left: 1.25rem;
}

.form-errors a {
  color: #dc3545;
}
```

## Native HTML Validation

```html
<form>
  <label for="email">Email (required)</label>
  <input
    type="email"
    id="email"
    name="email"
    required
    pattern="[^@]+@[^@]+\.[^@]+"
    title="Please enter a valid email address"
  />

  <label for="password">Password (8+ characters)</label>
  <input
    type="password"
    id="password"
    name="password"
    required
    minlength="8"
  />

  <button type="submit">Submit</button>
</form>
```

## Verification

### Automated Checks

- Check focus moves to first invalid field
- Test keyboard-only form completion
- Check errors clear when user corrects input
- Check required fields expose `required` or `aria-required` in rendered markup
- Check each `aria-describedby` reference resolves to visible help or error text

### Manual Checks

- Submit form with empty required fields
- Verify error messages are announced by screen reader
- Verify aria-invalid is set correctly
- Verify error messages are visible without color alone
- Verify grouped controls announce the `<legend>` before the option label
- Verify help text is announced together with the field before and after an error appears