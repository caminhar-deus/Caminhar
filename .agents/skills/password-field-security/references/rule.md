# Secure password input fields

> Password fields implement security best practices including proper autocomplete, show/hide toggle, and strength indicators.

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
Secure password fields balance security with usability while supporting password managers and accessibility.

## Code Examples

```html
<!-- Login form -->
<form method="POST" action="/login">
  <div>
    <label for="email">Email</label>
    <input
      type="email"
      id="email"
      name="email"
      autocomplete="email"
      required
    />
  </div>

  <div>
    <label for="password">Password</label>
    <input
      type="password"
      id="password"
      name="password"
      autocomplete="current-password"
      required
      minlength="8"
    />
  </div>

  <button type="submit">Sign In</button>
</form>
```

```html
<!-- Registration form -->
<form method="POST" action="/register">
  <div>
    <label for="email">Email</label>
    <input
      type="email"
      id="email"
      name="email"
      autocomplete="email"
      required
    />
  </div>

  <div>
    <label for="new-password">Create Password</label>
    <input
      type="password"
      id="new-password"
      name="password"
      autocomplete="new-password"
      required
      minlength="12"
      aria-describedby="password-requirements"
    />
    <p id="password-requirements">
      At least 12 characters with uppercase, lowercase, and numbers.
    </p>
  </div>

  <button type="submit">Create Account</button>
</form>
```

## Why It Matters

Properly implemented password fields improve security by working with password managers, helping users create strong passwords, and providing accessible controls for all users.

## Autocomplete Attributes

| Scenario | Attribute | Purpose |
|----------|-----------|---------|
| Login form | `autocomplete="current-password"` | Fill existing password |
| Registration | `autocomplete="new-password"` | Suggest strong password |
| Username | `autocomplete="username"` | Associate with password |
| Email login | `autocomplete="email"` | For email-based auth |

## React Password Field with Toggle

```tsx

interface PasswordFieldProps {
  label: string
  name: string
  autocomplete: 'current-password' | 'new-password'
  value: string
  onChange: (value: string) => void
  error?: string
  minLength?: number
}

  label,
  name,
  autocomplete,
  value,
  onChange,
  error,
  minLength = 8,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const inputId = useId()
  const errorId = useId()

  return (
    <div className="password-field">
      <label htmlFor={inputId} className="password-label">
        {label}
      </label>

      <div className="password-input-wrapper">
        <input
          type={showPassword ? 'text' : 'password'}
          id={inputId}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autocomplete}
          minLength={minLength}
          required
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : undefined}
          className="password-input"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          className="password-toggle"
        >
          {showPassword ? (
            
          ) : (
            
          )}
        </button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="password-error">
          {error}
        </p>
      )}
    </div>
  )
}

function EyeIcon(props: React.SVGProps
      <path
        fill="currentColor"
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      />
    </svg>
  )
}

function EyeOffIcon(props: React.SVGProps
      <path
        fill="currentColor"
        d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
      />
    </svg>
  )
}
```

## Password Strength Indicator

```tsx
interface PasswordStrengthProps {
  password: string
}

interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  requirements: {
    met: boolean
    text: string
  }[]
}

function calculateStrength(password: string): StrengthResult {
  const requirements = [
    {
      met: password.length >= 12,
      text: 'At least 12 characters',
    },
    {
      met: /[a-z]/.test(password),
      text: 'One lowercase letter',
    },
    {
      met: /[A-Z]/.test(password),
      text: 'One uppercase letter',
    },
    {
      met: /[0-9]/.test(password),
      text: 'One number',
    },
    {
      met: /[^a-zA-Z0-9]/.test(password),
      text: 'One special character',
    },
  ]

  const metCount = requirements.filter((r) => r.met).length

  const scoreMap: Record<number, { score: StrengthResult['score']; label: string }> = {
    0: { score: 0, label: 'Very weak' },
    1: { score: 1, label: 'Weak' },
    2: { score: 1, label: 'Weak' },
    3: { score: 2, label: 'Fair' },
    4: { score: 3, label: 'Good' },
    5: { score: 4, label: 'Strong' },
  }

  return {
    ...scoreMap[metCount],
    requirements,
  }
}

  const strength = calculateStrength(password)

  if (!password) return null

  return (
    <div className="password-strength" aria-live="polite">
      <div className="strength-bar">
        <div
          className={`strength-fill strength-${strength.score}`}
          style={{ width: `${(strength.score + 1) * 20}%` }}
        />
      </div>

      <span className="strength-label">{strength.label}</span>

      <ul className="strength-requirements">
        {strength.requirements.map((req, index) => (
          <li key={index} className={req.met ? 'met' : 'unmet'}>
            <span aria-hidden="true">{req.met ? '✓' : '○'}</span>
            <span className={req.met ? 'sr-only' : undefined}>
              {req.met ? 'Complete: ' : 'Incomplete: '}
            </span>
            {req.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## Complete Registration Form

```tsx
'use client'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState 0) {
      setErrors(newErrors)
      return
    }

    // Submit form
    // await register({ email, password })
  }

  return (
    <form onSubmit={handleSubmit} className="registration-form">
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <div className="form-group">
        
        
      </div>

      <div className="form-group">
        
      </div>

      <button type="submit" className="submit-button">
        Create Account
      </button>
    </form>
  )
}
```

## Styling

```css
.password-field {
  margin-bottom: 1rem;
}

.password-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input {
  width: 100%;
  padding: 0.75rem 3rem 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.password-input:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.2);
}

.password-input[aria-invalid='true'] {
  border-color: #dc2626;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  padding: 0.25rem;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
}

.password-toggle:hover {
  color: #333;
}

.password-toggle:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
  border-radius: 2px;
}

.password-error {
  margin-top: 0.5rem;
  color: #dc2626;
  font-size: 0.875rem;
}

/* Strength indicator */
.password-strength {
  margin-top: 0.75rem;
}

.strength-bar {
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s, background-color 0.3s;
}

.strength-0 { background: #dc2626; }
.strength-1 { background: #f97316; }
.strength-2 { background: #eab308; }
.strength-3 { background: #84cc16; }
.strength-4 { background: #22c55e; }

.strength-label {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #666;
}

.strength-requirements {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
}

.strength-requirements li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.strength-requirements .met {
  color: #22c55e;
}

.strength-requirements .unmet {
  color: #666;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

## Security Best Practices

| Practice | Implementation |
|----------|---------------|
| Never log passwords | Exclude from logging, monitoring |
| Hash passwords | Use bcrypt, Argon2, or scrypt |
| Enforce minimum length | At least 12 characters |
| Check against breaches | Use Have I Been Pwned API |
| Rate limit attempts | Prevent brute force attacks |
| Use HTTPS | Encrypt in transit |

## Breach Check Integration

```typescript
// Check password against known breaches (k-anonymity safe)
async function checkPasswordBreach(password: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()

  const prefix = hashHex.slice(0, 5)
  const suffix = hashHex.slice(5)

  // Only send first 5 chars (k-anonymity)
  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`)
  const text = await response.text()

  // Check if suffix is in response
  return text.includes(suffix)
}
```

## Exceptions

- A weaker form control is only acceptable when the business requirement and compensating controls are documented explicitly.
- If the flow is already transport-insecure, inaccessible, or externally embedded in a way that changes the threat model, fix that stronger issue first.
- False positives are common on demo, sandbox, or intentionally constrained flows, but they should still be bounded and clearly labeled.

## Verification

### Automated Checks

- Test show/hide toggle with keyboard (Enter and Space)
- Test form submission with validation errors
- Test in 1Password, LastPass, Bitwarden

### Manual Checks

- Verify autocomplete attributes work with password managers
- Check screen reader announces toggle state
- Verify strength indicator updates in real-time
- Check focus management on error state