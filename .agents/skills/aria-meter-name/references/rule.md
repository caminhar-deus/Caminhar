# Provide accessible names for meter elements

> Checks that meter elements have accessible names to provide context for measurements.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 10 min

---
The `&lt;meter&gt;` element represents a fractional value or a measurement within a known range. For this value to be meaningful to someone using a screen reader, the measurement must be named.

## Code Example

```html
<!-- ✅ Correct: Meter with accessible name via aria-labelledby -->
<label id="cpu-label">CPU Usage</label>
<meter id="cpu" aria-labelledby="cpu-label" min="0" max="100" value="45">45%</meter>

<!-- ✅ Correct: Using aria-label for a simple measurement -->
<meter value="0.6" aria-label="Cloud storage space used"></meter>

<!-- ❌ Incorrect: No context provided for the value -->
<meter value="80" min="0" max="100"></meter>
```

## Why It Matters

- **Measurement Context**: Informs the user exactly what is being measured, making the raw numbers meaningful.
- **Status Awareness**: Helps users monitor changes in critical values, such as system resources, progress, or security levels.
- **Semantic Completeness**: Ensures custom-built meter widgets are as accessible as native HTML5 ones.
- **Data Integrity**: Prevents users from misinterpreting a measurement, which could lead to incorrect decisions or actions.

## Exceptions

- Prefer native HTML semantics over ARIA when both are possible; some apparent ARIA failures disappear when the underlying element is corrected.
- A missing ARIA attribute is not automatically the strongest finding if the control is already semantically broken, unnamed, or keyboard-inaccessible.
- Do not add ARIA only to satisfy the rule if the feature should instead be implemented with a native element or a simpler interaction pattern.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.