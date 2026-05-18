import React from 'react';
import PropTypes from 'prop-types';
import TextArea from '@/components/UI/TextArea';

/**
 * Campo de textarea reutilizável (Admin)
 * Adaptador que delega para o componente TextArea da UI, mantendo a API específica do Admin.
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
    <TextArea
      id={name}
      name={name}
      label={label}
      value={value ?? ''}
      onChange={onChange}
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      required={required}
      error={!!error}
      errorMessage={error}
      helperText={hint}
      showCount={!!maxLength}
      className={className}
      {...props}
    />
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