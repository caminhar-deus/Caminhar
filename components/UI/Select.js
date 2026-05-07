import React, { forwardRef, useState, useRef, useCallback, useEffect } from 'react';
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
 * @param {boolean} disabled - Desabilita o select
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
  clearable = false,
  searchable = false,
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
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : defaultValue;

  // Atualiza o label quando o valor muda
  useEffect(() => {
    const selected = options.find(opt => opt.value === currentValue);
    setSelectedLabel(selected ? selected.label : '');
  }, [currentValue, options]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtra opções quando searchable está ativo
  const filteredOptions = searchable && searchTerm
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(prev => !prev);
      if (!isOpen && searchable) {
        setSearchTerm('');
        setTimeout(() => inputRef.current?.focus(), 10);
      }
    }
  };

  const handleSelect = (option) => {
    if (option.disabled) return;
    setIsOpen(false);
    setSearchTerm('');
    setSelectedLabel(option.label);
    if (onChange) {
      onChange({ target: { value: option.value } });
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedLabel('');
    setIsOpen(false);
    setSearchTerm('');
    if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  const wrapperClasses = [
    styles.wrapper,
    styles[size],
    error && styles.hasError,
    disabled && styles.disabled,
    isOpen && styles.isOpen,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const renderNative = () => (
    <div className={styles.selectWrapper}>
      <select
        ref={ref}
        id={selectId}
        className={styles.select}
        aria-invalid={error}
        aria-expanded={isOpen}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        onChange={(e) => onChange?.(e)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
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
      <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`} aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </div>
  );

  const renderCustom = () => (
    <div className={styles.selectWrapper} ref={wrapperRef}>
      <div
        className={`${styles.select} ${isOpen ? styles.selectFocused : ''}`}
        onClick={handleToggle}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={error}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
          if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm('');
          }
        }}
      >
        {searchable && isOpen ? (
          <input
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) ref.current = node;
            }}
            className={styles.searchInput}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder={selectedLabel || placeholder}
            autoFocus
          />
        ) : (
          <span className={`${styles.selectText} ${!selectedLabel ? styles.placeholder : ''}`}>
            {selectedLabel || placeholder}
          </span>
        )}
        {clearable && selectedLabel && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Limpar seleção"
            tabIndex={-1}
          >
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
        <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {filteredOptions.length === 0 ? (
            <div className={styles.noOptions}>Nenhuma opção encontrada</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                className={`${styles.option} ${option.value === currentValue ? styles.optionSelected : ''} ${option.disabled ? styles.optionDisabled : ''}`}
                onClick={() => handleSelect(option)}
                role="option"
                aria-selected={option.value === currentValue}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {searchable || clearable ? renderCustom() : renderNative()}
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