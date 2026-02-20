import React from 'react';
import PropTypes from 'prop-types';
import styles from '../../../styles/Admin.module.css';

/**
 * Campo de textarea reutilizável
 * @param {Object} props - Propriedades do componente
 * @param {string} props.name - Nome do campo
 * @param {string} props.label - Label exibida
 * @param {string} props.value - Valor atual
 * @param {Function} props.onChange - Handler de mudança
 * @param {number} [props.rows=3] - Número de linhas
 * @param {number} [props.maxLength] - Máximo de caracteres
 * @param {string} [props.placeholder] - Placeholder
 * @param {boolean} [props.required=false] - Se é obrigatório
 * @param {string} [props.error] - Mensagem de erro
 * @param {string} [props.hint] - Texto de ajuda
 * @param {string} [props.className] - Classe CSS adicional
 */
export default function TextAreaField({
  name,
  label,
  value,
  onChange,
  rows = 3,
  maxLength,
  placeholder,
  required = false,
  error,
  hint,
  className = '',
  ...props
}) {
  return (
    <div className={`${styles.formGroup} ${className}`}>
      <label htmlFor={name}>
        {label}
        {required && <span style={{ color: '#dc3545', marginLeft: '4px' }}>*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        className={styles.input}
        style={{ resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
        {...props}
      />
      {maxLength && (
        <small className={styles.formHint} style={{ display: 'block', textAlign: 'right' }}>
          {value.length}/{maxLength} caracteres
        </small>
      )}
      {error && (
        <small style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px', display: 'block' }}>
          {error}
        </small>
      )}
      {hint && !error && (
        <small className={styles.formHint}>{hint}</small>
      )}
    </div>
  );
}

TextAreaField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  rows: PropTypes.number,
  maxLength: PropTypes.number,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.string,
  hint: PropTypes.string,
  className: PropTypes.string
};
