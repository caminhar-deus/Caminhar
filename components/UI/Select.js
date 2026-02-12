import React, { forwardRef, useState } from 'react';
import styles from './Select.module.css';

/**
 * Select - Componente base de seleção
 * @param {Array} options - Array de opções {value, label, disabled}
 * @param {string} placeholder - Texto placeholder
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} error - Estado de erro
 * @param {string} errorMessage - Mensagem de erro
 * @param {string} label - Label do select
 * @param {boolean} required - Campo obrigatório
 * @param {boolean} clearable - Permite limpar seleção
 * @param {boolean} searchable - Permite buscar opções
 */
export const Select = forwardRef(({
  options = [],
  placeholder = 'Selecione...',
  size = 'md',
  error = false,
  errorMessage,
  label,
  required,
  helperText,
  disabled,
  className = '',
  id,
  onChange,
  value,
  defaultValue,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;

  const wrapperClasses = [
    styles.wrapper,
    styles[size],
    error && styles.hasError,
    disabled && styles.disabled,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleChange = (e) => {
    onChange?.(e);
  };

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.selectWrapper}>
        <select
          ref={ref}
          id={selectId}
          className={styles.select}
          aria-invalid={error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          onChange={handleChange}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <span className={styles.arrow} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
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

Select.displayName = 'Select';

export default Select;
