import React, { forwardRef } from 'react';
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
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

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
          {...props}
        />
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
