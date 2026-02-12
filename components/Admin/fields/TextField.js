import React from 'react';
import PropTypes from 'prop-types';
import styles from '../../../styles/Admin.module.css';

/**
 * Campo de texto reutilizável
 * @param {Object} props - Propriedades do componente
 * @param {string} props.name - Nome do campo
 * @param {string} props.label - Label exibida
 * @param {string} props.value - Valor atual
 * @param {Function} props.onChange - Handler de mudança
 * @param {string} [props.type='text'] - Tipo do input
 * @param {string} [props.placeholder] - Placeholder
 * @param {boolean} [props.required=false] - Se é obrigatório
 * @param {string} [props.error] - Mensagem de erro
 * @param {string} [props.hint] - Texto de ajuda
 * @param {string} [props.className] - Classe CSS adicional
 */
export default function TextField({
  name,
  label,
  value,
  onChange,
  type = 'text',
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
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={styles.input}
        {...props}
      />
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

TextField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['text', 'email', 'password', 'number', 'tel', 'search']),
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.string,
  hint: PropTypes.string,
  className: PropTypes.string
};
