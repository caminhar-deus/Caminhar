import PropTypes from 'prop-types';
import styles from '../styles/form.module.css';

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
        className={`${styles.toggleLabel}${disabled ? ` ${styles.toggleLabelDisabled}` : ''}`}
      >
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={styles.toggleCheckbox}
        />
        <span>{label}</span>
        <span
          className={`${styles.toggleBadge} ${checked ? styles.toggleBadgeActive : styles.toggleBadgeInactive}`}
        >
          {checked ? activeLabel : inactiveLabel}
        </span>
      </label>
      {description && (
        <small className={styles.formHint}>
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
