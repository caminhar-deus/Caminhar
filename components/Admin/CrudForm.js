import PropTypes from 'prop-types';
import styles from './styles/crud.module.css';

/**
 * Subcomponente de formulário dinâmico para CRUD administrativo.
 * Extraído de AdminCrudBase para reduzir complexidade do componente pai.
 */
export default function CrudForm({
  fields,
  formData,
  handleInputChange,
  setFieldValue,
  error,
  renderCustomFormField,
  loading,
  isEditing,
  updateButtonText,
  saveButtonText,
  handleSubmit,
  validateForm
}) {
  // Renderiza um campo do formulário
  const renderField = (fieldConfig) => {
    // Se tem renderizador customizado para este campo
    if (renderCustomFormField) {
      const customField = renderCustomFormField(fieldConfig, formData, handleInputChange, setFieldValue, error);
      if (customField) return customField;
    }

    const { name, component: Component, gridColumn, ...props } = fieldConfig;

    if (!Component) {
      console.warn(`Componente não definido para o campo: ${name}`);
      return null;
    }

    const fieldValue = formData[name];
    const fieldError = error?.errors?.[name]?.[0];

    return (
      <div key={name} style={{ gridColumn: gridColumn || 'span 1' }}>
        <Component
          name={name}
          value={fieldValue}
          checked={!!fieldValue}
          onChange={handleInputChange}
          error={fieldError}
          {...props}
        />
      </div>
    );
  };

  return (
    <div id="crud-form" className={styles.formSection}>
      <form
        onSubmit={(e) => handleSubmit(e, validateForm)}
        className={styles.form}
      >
        <div className={styles.formRow}>
          {fields.map(renderField)}
        </div>

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={loading}
          >
            {loading ? 'Salvando...' : isEditing ? updateButtonText : saveButtonText}
          </button>
        </div>
      </form>
    </div>
  );
}

const fieldPropType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  component: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  gridColumn: PropTypes.string,
  required: PropTypes.bool,
  placeholder: PropTypes.string,
  hint: PropTypes.string
});

CrudForm.propTypes = {
  fields: PropTypes.arrayOf(fieldPropType).isRequired,
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  setFieldValue: PropTypes.func.isRequired,
  error: PropTypes.object,
  renderCustomFormField: PropTypes.func,
  loading: PropTypes.bool,
  isEditing: PropTypes.bool,
  updateButtonText: PropTypes.string,
  saveButtonText: PropTypes.string,
  handleSubmit: PropTypes.func.isRequired,
  validateForm: PropTypes.func.isRequired
};