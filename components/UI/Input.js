import React, { forwardRef, useState, useId } from 'react';
import styles from './Input.module.css';

/**
 * Input - Componente base de input
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} variant - 'default' | 'filled' | 'flushed'
 * @param {boolean} error - Estado de erro
 * @param {string} errorMessage - Mensagem de erro
 * @param {ReactNode} leftAddon - Elemento à esquerda (ícone, etc)
 * @param {ReactNode} rightAddon - Elemento à direita (ícone, etc)
 * @param {string} label - Label do input
 * @param {boolean} required - Campo obrigatório
 * @param {string} helperText - Texto de ajuda
 * @param {boolean} clearable - Permite limpar o input (mostra botão X quando há valor)
 * @param {function} onClear - Handler chamado ao clicar no botão de limpar
 */
export const Input = forwardRef(({
  size = 'md',
  variant = 'default',
  error = false,
  errorMessage,
  leftAddon,
  rightAddon,
  label,
  required,
  helperText,
  clearable = false,
  onClear,
  className = '',
  id,
  value,
  onChange,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || `input-${generatedId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const [internalValue, setInternalValue] = useState('');
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleChange = (e) => {
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue('');
    }
    onClear?.();
    // Dispara evento de change com valor vazio
    if (onChange) {
      const event = {
        target: { value: '' },
        currentTarget: { value: '' },
      };
      onChange(event);
    }
  };

  const wrapperClasses = [
    styles.wrapper,
    styles[size],
    error && styles.hasError,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inputClasses = [
    styles.input,
    styles[variant],
    leftAddon && styles.hasLeftAddon,
    clearable && styles.hasClearable,
    rightAddon && styles.hasRightAddon,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.inputWrapper}>
        {leftAddon && (
          <span className={styles.leftAddon} aria-hidden="true">
            {leftAddon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          aria-invalid={error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          value={isControlled ? value : undefined}
          onChange={handleChange}
          {...props}
        />
        {clearable && currentValue && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Limpar campo"
            tabIndex={-1}
          >
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
        {rightAddon && (
          <span className={styles.rightAddon} aria-hidden="true">
            {rightAddon}
          </span>
        )}
      </div>
      {error && errorMessage && (
        <span id={errorId} className={styles.errorMessage} role="alert">
          {errorMessage}
        </span>
      )}
      {!error && helperText && (
        <span id={helperId} className={styles.helperText}>
          {helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;