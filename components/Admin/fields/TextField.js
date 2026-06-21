import PropTypes from 'prop-types';
import { Input } from '../../UI';

/**
 * Campo de texto reutilizável (Admin)
 * Adaptador que delega para o componente Input da UI, mantendo a API específica do Admin.
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
    <Input
      id={name}
      name={name}
      type={type}
      label={label}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      error={!!error}
      errorMessage={error}
      helperText={hint}
      className={className}
      {...props}
    />
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
