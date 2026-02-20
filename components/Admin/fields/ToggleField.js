import React from 'react';
import PropTypes from 'prop-types';
import styles from '../../../styles/Admin.module.css';

/**
 * Campo toggle (checkbox) reutilizável
 * @param {Object} props - Propriedades do componente
 * @param {string} props.name - Nome do campo
 * @param {string} props.label - Label principal
 * @param {boolean} props.checked - Estado atual
 * @param {Function} props.onChange - Handler de mudança
 * @param {string} [props.description] - Descrição adicional
 * @param {boolean} [props.disabled=false] - Se está desabilitado
 * @param {string} [props.className] - Classe CSS adicional
 * @param {string} [props.activeLabel='Publicado'] - Texto quando ativo
 * @param {string} [props.inactiveLabel='Rascunho'] - Texto quando inativo
 */
export default function ToggleField({
  name,
  label,
  checked,
  onChange,
  description,
  disabled = false,
  className = '',
  activeLabel = 'Publicado',
  inactiveLabel = 'Rascunho'
}) {
  return (
    <div className={`${styles.formGroup} ${className}`}>
      <label 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1
        }}
      >
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          style={{ 
            width: 'auto', 
            margin: 0,
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        />
        <span>{label}</span>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '600',
            backgroundColor: checked ? '#d4edda' : '#fff3cd',
            color: checked ? '#155724' : '#856404',
            border: `1px solid ${checked ? '#c3e6cb' : '#ffeeba'}`
          }}
        >
          {checked ? activeLabel : inactiveLabel}
        </span>
      </label>
      {description && (
        <small className={styles.formHint} style={{ display: 'block', marginTop: '4px' }}>
          {description}
        </small>
      )}
    </div>
  );
}

ToggleField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  description: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  activeLabel: PropTypes.string,
  inactiveLabel: PropTypes.string
};
