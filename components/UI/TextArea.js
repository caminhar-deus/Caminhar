import React, { forwardRef, useEffect, useRef, useId } from 'react';
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
 * @param {boolean} blockOnLimit - Bloquear digitação quando atingir maxLength
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
   blockOnLimit = false,
  className = '',
  onChange,
  value,
  defaultValue,
  id,
  ...props
}, ref) => {
  const generatedId = useId();
  const textareaId = id || `textarea-${generatedId}`;
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

  const internalRef = useRef(null);

  const calculateHeight = (textarea) => {
    if (!autoResize) {
      textarea.style.height = '';
      return;
    }

    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
    const minHeight = minRows ? minRows * lineHeight : null;
    const maxHeight = maxRows ? maxRows * lineHeight : null;

    textarea.style.height = 'auto';
    let calculatedHeight = textarea.scrollHeight;

    if (minHeight && calculatedHeight < minHeight) {
      calculatedHeight = minHeight;
    }

    if (maxHeight && calculatedHeight > maxHeight) {
      calculatedHeight = maxHeight;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }

    textarea.style.height = `${calculatedHeight}px`;
  };

  const handleKeyDown = (e) => {
    if (!blockOnLimit || !maxLength) return;
    
    const currentValue = value || defaultValue || '';
    
    // Permite teclas de navegação, edição e atalhos
    const allowedKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'Tab', 'Escape', 'Enter'
    ];
    
    if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
      return;
    }
    
    // Bloqueia se já atingiu ou ultrapassou o limite
    if (currentValue.length >= maxLength) {
      e.preventDefault();
    }
  };

  const handleChange = (e) => {
    if (autoResize) {
      calculateHeight(e.target);
    }
    onChange?.(e);
  };

  useEffect(() => {
    if (!autoResize) return;

    const textarea = internalRef.current || ref?.current;
    if (!textarea) return;

    calculateHeight(textarea);
  }, [autoResize, minRows, maxRows, value, defaultValue]);

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={textareaId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <textarea
        ref={(node) => {
          internalRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        id={textareaId}
        className={styles.textarea}
        rows={rows}
        aria-invalid={error}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        value={value}
        defaultValue={defaultValue}
        maxLength={!blockOnLimit ? maxLength : undefined}
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
