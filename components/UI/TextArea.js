import React, { forwardRef } from 'react';
import styles from './TextArea.module.css';

/**
 * TextArea - Componente base de área de texto
 * @param {number} rows - Número de linhas visíveis
 * @param {number} minRows - Mínimo de linhas (para auto-resize)
 * @param {number} maxRows - Máximo de linhas (para auto-resize)
 * @param {boolean} resize - Permitir redimensionamento
 * @param {boolean} autoResize - Redimensionar automaticamente
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} error - Estado de erro
 * @param {string} errorMessage - Mensagem de erro
 * @param {string} label - Label do textarea
 * @param {boolean} required - Campo obrigatório
 * @param {string} helperText - Texto de ajuda
 * @param {number} maxLength - Comprimento máximo
 * @param {boolean} showCount - Mostrar contador de caracteres
 */
export const TextArea = forwardRef(({
  rows = 4,
  minRows,
  maxRows,
  resize = true,
  autoResize = false,
  size = 'md',
  error = false,
  errorMessage,
  label,
  required,
  helperText,
  maxLength,
  showCount = false,
  className = '',
  onChange,
  value,
  defaultValue,
  id,
  ...props
}, ref) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${textareaId}-error`;
  const helperId = `${textareaId}-helper`;

  const wrapperClasses = [
    styles.wrapper,
    styles[size],
    error && styles.hasError,
    !resize && styles.noResize,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const currentLength = (value || defaultValue || '').length;
  const isOverLimit = maxLength && currentLength > maxLength;

  const handleChange = (e) => {
    if (autoResize) {
      const textarea = e.target;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
    onChange?.(e);
  };

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={textareaId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        className={styles.textarea}
        rows={rows}
        aria-invalid={error}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        onChange={handleChange}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        {...props}
      />
      <div className={styles.footer}>
        {(error && errorMessage) ? (
          <span id={errorId} className={styles.errorMessage} role="alert">
            {errorMessage}
          </span>
        ) : helperText ? (
          <span id={helperId} className={styles.helperText}>
            {helperText}
          </span>
        ) : (
          <span />
        )}
        {(showCount || maxLength) && (
          <span className={`${styles.counter} ${isOverLimit ? styles.overLimit : ''}`}>
            {currentLength}{maxLength ? ` / ${maxLength}` : ''}
          </span>
        )}
      </div>
    </div>
  );
});

TextArea.displayName = 'TextArea';

export default TextArea;
