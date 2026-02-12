import React from 'react';
import PropTypes from 'prop-types';
import { useAdminCrud } from '../../hooks/useAdminCrud';
import styles from '../../styles/Admin.module.css';

/**
 * Componente base genérico para CRUD administrativo
 * Elimina duplicação de código entre AdminMusicas, AdminVideos e AdminPostManager
 * 
 * @param {Object} props - Propriedades do componente
 * @param {string} props.apiEndpoint - Endpoint base da API
 * @param {string} props.title - Título do painel
 * @param {Array} props.fields - Configuração dos campos do formulário
 * @param {Array} props.columns - Configuração das colunas da tabela
 * @param {Object} props.initialFormData - Dados iniciais do formulário
 * @param {Object} [props.validationSchema] - Schema Zod opcional para validação
 * @param {boolean} [props.usePagination=false] - Se usa paginação
 * @param {number} [props.itemsPerPage=10] - Itens por página
 * @param {Function} [props.renderCustomCell] - Função para renderizar células customizadas
 * @param {Function} [props.renderCustomFormField] - Função para renderizar campos customizados
 * @param {string} [props.newButtonText='+ Novo'] - Texto do botão de novo item
 * @param {string} [props.saveButtonText='Salvar'] - Texto do botão de salvar
 * @param {string} [props.updateButtonText='Atualizar'] - Texto do botão de atualizar
 * @param {string} [props.emptyMessage='Nenhum item cadastrado'] - Mensagem de lista vazia
 * @param {Function} [props.onSuccess] - Callback após sucesso
 * @param {Function} [props.validate] - Função de validação customizada
 */
export default function AdminCrudBase({
  apiEndpoint,
  title,
  fields,
  columns,
  initialFormData,
  validationSchema,
  usePagination = false,
  itemsPerPage = 10,
  renderCustomCell,
  renderCustomFormField,
  newButtonText = '+ Novo',
  saveButtonText = 'Salvar',
  updateButtonText = 'Atualizar',
  emptyMessage = 'Nenhum item cadastrado ainda.',
  onSuccess,
  validate
}) {
  // Usa o hook de CRUD
  const {
    items,
    loading,
    error,
    formData,
    isEditing,
    currentPage,
    totalPages,
    handleInputChange,
    setFieldValue,
    handleEdit,
    handleSubmit,
    handleDelete,
    resetForm,
    goToPage
  } = useAdminCrud({
    apiEndpoint,
    initialFormData,
    usePagination,
    itemsPerPage,
    onSuccess
  });

  // Função de validação
  const validateForm = () => {
    // Validação com Zod
    if (validationSchema) {
      try {
        validationSchema.parse(formData);
      } catch (err) {
        if (err.errors && err.errors.length > 0) {
          return err.errors[0].message;
        }
      }
    }
    
    // Validação customizada
    if (validate) {
      const customError = validate(formData);
      if (customError) return customError;
    }
    
    return null;
  };

  // Renderiza um campo do formulário
  const renderField = (fieldConfig) => {
    // Se tem renderizador customizado para este campo
    if (renderCustomFormField) {
      const customField = renderCustomFormField(fieldConfig, formData, handleInputChange, setFieldValue);
      if (customField) return customField;
    }

    const { name, type, component: Component, gridColumn, ...props } = fieldConfig;
    
    if (!Component) {
      console.warn(`Componente não definido para o campo: ${name}`);
      return null;
    }

    const fieldValue = formData[name] ?? '';
    const fieldError = error && error.includes(name) ? error : '';

    return (
      <div key={name} style={{ gridColumn: gridColumn || 'span 1' }}>
        <Component
          name={name}
          value={fieldValue}
          onChange={handleInputChange}
          error={fieldError}
          {...props}
        />
      </div>
    );
  };

  // Renderiza uma célula da tabela
  const renderCell = (item, column) => {
    const { key, render, format, width } = column;
    const value = item[key];

    // Renderização customizada
    if (render) {
      const customCell = render(item, value);
      if (customCell !== undefined) return customCell;
    }

    // Renderização via função externa
    if (renderCustomCell) {
      const customCell = renderCustomCell(column, item, value);
      if (customCell !== undefined) return customCell;
    }

    // Formatação padrão
    if (format) {
      return format(value, item);
    }

    // Valores booleanos (status)
    if (typeof value === 'boolean') {
      return (
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.85rem',
          backgroundColor: value ? '#d4edda' : '#fff3cd',
          color: value ? '#155724' : '#856404',
          border: `1px solid ${value ? '#c3e6cb' : '#ffeeba'}`
        }}>
          {value ? 'Publicado' : 'Rascunho'}
        </span>
      );
    }

    // URLs
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className={styles.link}
        >
          Abrir link
        </a>
      );
    }

    // Valor padrão
    return value || <span style={{ color: '#6c757d', fontStyle: 'italic' }}>-</span>;
  };

  return (
    <div className={styles.content}>
      {/* Header */}
      <div className={styles.sectionHeader}>
        <h2>{title}</h2>
        <div className={styles.formActions}>
          {isEditing && (
            <button 
              onClick={resetForm}
              className={styles.cancelButton}
              disabled={loading}
              type="button"
            >
              Cancelar
            </button>
          )}
          <button 
            onClick={() => {
              resetForm();
              // Scroll para o formulário
              document.getElementById('crud-form')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={styles.addButton}
            disabled={loading}
            type="button"
          >
            {newButtonText}
          </button>
        </div>
      </div>

      {/* Formulário */}
      <div id="crud-form" className={styles.formSection}>
        <form 
          onSubmit={(e) => handleSubmit(e, validateForm)} 
          className={styles.form}
        >
          <div className={styles.formRow} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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

      {/* Tabela */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={col.width ? { width: col.width } : {}}>
                  {col.header}
                </th>
              ))}
              <th style={{ width: '120px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  {columns.map(col => (
                    <td key={`${item.id}-${col.key}`}>
                      {renderCell(item, col)}
                    </td>
                  ))}
                  <td>
                    <div className={styles.actionButtons}>
                      <button 
                        className={styles.editButton}
                        onClick={() => {
                          handleEdit(item);
                          document.getElementById('crud-form')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        disabled={loading}
                        type="button"
                      >
                        Editar
                      </button>
                      <button 
                        className={styles.deleteButton}
                        onClick={() => handleDelete(item.id)}
                        disabled={loading}
                        type="button"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={columns.length + 1} 
                  className={styles.emptyStateRow}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {usePagination && totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '1rem', 
          marginTop: '1.5rem' 
        }}>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className={styles.cancelButton}
            style={{ 
              opacity: currentPage === 1 ? 0.5 : 1, 
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer' 
            }}
            type="button"
          >
            Anterior
          </button>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className={styles.cancelButton}
            style={{ 
              opacity: currentPage === totalPages ? 0.5 : 1, 
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' 
            }}
            type="button"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}

AdminCrudBase.propTypes = {
  apiEndpoint: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  fields: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    component: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    type: PropTypes.string,
    gridColumn: PropTypes.string,
    required: PropTypes.bool,
    placeholder: PropTypes.string,
    hint: PropTypes.string
  })).isRequired,
  columns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    header: PropTypes.string.isRequired,
    render: PropTypes.func,
    format: PropTypes.func,
    width: PropTypes.string
  })).isRequired,
  initialFormData: PropTypes.object.isRequired,
  validationSchema: PropTypes.object,
  usePagination: PropTypes.bool,
  itemsPerPage: PropTypes.number,
  renderCustomCell: PropTypes.func,
  renderCustomFormField: PropTypes.func,
  newButtonText: PropTypes.string,
  saveButtonText: PropTypes.string,
  updateButtonText: PropTypes.string,
  emptyMessage: PropTypes.string,
  onSuccess: PropTypes.func,
  validate: PropTypes.func
};
