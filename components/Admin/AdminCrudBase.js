import React, { useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useAdminCrud } from '../../hooks/useAdminCrud';
import styles from '../../styles/Admin.module.css';
import toast from 'react-hot-toast';

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
 * @param {boolean} [props.searchable=false] - Se exibe barra de busca local
 * @param {boolean} [props.reorderable=false] - Habilita reordenação (Drag & Drop)
 * @param {Function} [props.onReorder] - Callback disparado ao reordenar
 * @param {boolean} [props.exportable=false] - Habilita botão de exportar para CSV
 * @param {boolean} [props.showItemCount=false] - Exibe a contagem total de itens abaixo do título
 * @param {string} [props.itemNameSingular='item'] - Nome do item no singular
 * @param {string} [props.itemNamePlural='itens'] - Nome do item no plural
 * @param {boolean} [props.readOnly=false] - Desativa formulário e edição (Somente Leitura)
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
  validate,
  searchable = false,
  reorderable = false,
  onReorder,
  exportable = false,
  showItemCount = false,
  itemNameSingular = 'item',
  itemNamePlural = 'itens',
  readOnly = false
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const [localItems, setLocalItems] = useState([]);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Wrapper para exibir notificações de sucesso automaticamente
  const handleSuccessWrapper = useCallback(() => {
    toast.success('Operação realizada com sucesso!');
    setIsFormVisible(false);
    if (onSuccess) onSuccess();
  }, [onSuccess]);

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
    onSuccess: handleSuccessWrapper
  });

  // Efeito para exibir notificações de erro automaticamente
  useEffect(() => {
    if (error?.message) {
      // Mostra um toast genérico apenas se não houver erros de campo específicos,
      // ou um mais amigável se for um erro de validação.
      if (error.errors) {
        // Se for um erro de validação com detalhes de campo, mostra um toast que guia o usuário.
        toast.error('Verifique os campos em vermelho no formulário.');
      } else {
        toast.error(error.message);
      }
    }
  }, [error]);

  // Sincroniza estado local com a API para permitir Drag & Drop instantâneo na UI
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Filtro local dinâmico e ultra-rápido para a tabela
  const displayedItems = searchable && searchTerm
    ? localItems.filter(item => {
        const searchableText = Object.values(item)
          .filter(val => typeof val === 'string' || typeof val === 'number')
          .join(' ')
          .toLowerCase();
        return searchableText.includes(searchTerm.toLowerCase());
      })
    : localItems;

  // Função para exportar os dados visíveis para CSV
  const handleExportCSV = () => {
    if (!displayedItems || displayedItems.length === 0) {
      toast.error('Não há dados para exportar.');
      return;
    }

    // Prepara os cabeçalhos
    const headers = columns.map(col => col.header);

    // Prepara as linhas com tratamento para caracteres especiais
    const csvRows = displayedItems.map(item => {
      return columns.map(col => {
        let val = item[col.key];
        
        // Formata valores booleanos (Status) para ficarem amigáveis no Excel
        if (typeof val === 'boolean') {
          val = val ? 'Publicado' : 'Rascunho';
        }
        
        if (val === null || val === undefined) val = '';
        val = String(val).replace(/"/g, '""'); // Escapa aspas
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val}"`; // Envolve em aspas se necessário
        }
        return val;
      }).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF garante compatibilidade com Excel (BOM)
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_').toLowerCase()}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para alternar booleanos (como Rascunho/Publicado) com 1 clique
  const handleToggleBoolean = async (item, key, currentValue) => {
    const newValue = !currentValue;
    const previousItems = [...localItems];
    
    // Atualização otimista na interface (muda na hora sem esperar o servidor)
    setLocalItems(localItems.map(i => i.id === item.id ? { ...i, [key]: newValue } : i));
    
    const loadingToast = toast.loading('Atualizando status...');
    try {
      const payload = { ...item, [key]: newValue };
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Falha na API');
      toast.success('Status alterado com sucesso!', { id: loadingToast });
    } catch (error) {
      setLocalItems(previousItems); // Reverte visualmente em caso de falha
      toast.error('Erro ao alterar status.', { id: loadingToast });
    }
  };

  // Função de validação
  const validateForm = () => {
    // Validação com Zod
    if (validationSchema) {
      const result = validationSchema.safeParse(formData);
      if (!result.success) {
        // Lança um erro estruturado, idêntico ao da API, para ser capturado pelo handleSubmit.
        const error = new Error('Dados inválidos. Verifique os campos do formulário.');
        error.errors = result.error.flatten().fieldErrors;
        throw error;
      }
    }
    
    // Validação customizada
    if (validate) {
      validate(formData);
    }
  };

  // Renderiza um campo do formulário
  const renderField = (fieldConfig) => {
    // Se tem renderizador customizado para este campo
    if (renderCustomFormField) {
      const customField = renderCustomFormField(fieldConfig, formData, handleInputChange, setFieldValue, error);
      if (customField) return customField;
    }

    const { name, type, component: Component, gridColumn, ...props } = fieldConfig;
    
    if (!Component) {
      console.warn(`Componente não definido para o campo: ${name}`);
      return null;
    }

    const fieldValue = formData[name] ?? '';
    // Extrai a mensagem de erro específica para este campo, se existir.
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
      const activeBgColor = column.activeBgColor || '';
      const activeColor = column.activeColor || '';
      const inactiveBgColor = column.inactiveBgColor || '';
      const inactiveColor = column.inactiveColor || '';
      const activeText = column.activeText || 'Publicado';
      const inactiveText = column.inactiveText || 'Rascunho';
      const activeIcon = column.activeIcon || '✅';
      const inactiveIcon = column.inactiveIcon || '📝';

      const customStyle = {};
      if (value && activeBgColor) customStyle.backgroundColor = activeBgColor;
      if (value && activeColor) customStyle.color = activeColor;
      if (!value && inactiveBgColor) customStyle.backgroundColor = inactiveBgColor;
      if (!value && inactiveColor) customStyle.color = inactiveColor;

      return (
        <button 
          type="button"
          onClick={() => handleToggleBoolean(item, key, value)}
          className={`${styles.statusBadge} ${value ? styles.statusPublished : styles.statusDraft} ${styles.statusToggle}`}
          style={Object.keys(customStyle).length > 0 ? customStyle : undefined}
          title="Clique para alterar o status rapidamente"
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>{value ? activeIcon : inactiveIcon}</span>
          <span>{value ? activeText : inactiveText}</span>
        </button>
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
    return value || <span className={styles.emptyCell}>-</span>;
  };

  return (
    <div className={styles.content} style={{ minHeight: '700px', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .skeleton-box {
          height: 20px;
          background-color: #e2e8f0;
          border-radius: 4px;
          animation: skeleton-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      {/* Header */}
      <div className={styles.sectionHeader}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          {showItemCount && (
            <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>
              Total: {localItems.length} {localItems.length === 1 ? itemNameSingular : itemNamePlural}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          {searchable && (
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', display: 'flex' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
              </span>
              <input 
                type="text"
                placeholder="Buscar item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  padding: '8px 12px 8px 34px', 
                  borderRadius: '6px', 
                  border: '1px solid #e2e8f0', 
                  fontSize: '0.9rem',
                  outline: 'none',
                  minWidth: '220px'
                }}
              />
            </div>
          )}
          <div className={styles.formActions}>
          {exportable && (
            <button 
              onClick={handleExportCSV}
              className={styles.exportButton}
              type="button"
            >
              Exportar CSV
            </button>
          )}
          {isFormVisible && (
            <button 
              onClick={() => {
                resetForm();
                setIsFormVisible(false);
              }}
              className={styles.cancelButton}
              disabled={loading}
              type="button"
            >
              Cancelar
            </button>
          )}
          {!readOnly && !isFormVisible && (
          <button 
            onClick={() => {
              resetForm();
              setIsFormVisible(true);
              // Scroll para o formulário
              setTimeout(() => document.getElementById('crud-form')?.scrollIntoView({ behavior: 'smooth' }), 50);
            }}
            className={styles.addButton}
            disabled={loading}
            type="button"
          >
            {newButtonText}
          </button>
          )}
        </div>
        </div>
      </div>

      {/* Formulário */}
      {!readOnly && isFormVisible && (
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
      )}

      {/* Tabela */}
      <div className={styles.tableContainer} style={{ flex: 1, overflowY: 'auto', maxHeight: '600px' }}>
        <table className={styles.table}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8f9fa', boxShadow: 'inset 0 -2px 0 #e2e8f0' }}>
            <tr>
              {reorderable && !searchTerm && <th style={{ width: '40px', textAlign: 'center', color: '#6c757d' }}>☰</th>}
              {columns.map(col => (
                <th key={col.key} style={col.width ? { width: col.width } : {}}>
                  {col.header}
                </th>
              ))}
              {!readOnly && <th style={{ width: '120px' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading && localItems.length === 0 ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {reorderable && !searchTerm && (
                    <td><div className="skeleton-box" style={{ width: '20px', margin: '0 auto' }}></div></td>
                  )}
                  {columns.map(col => (
                    <td key={`skeleton-col-${col.key}`}>
                      <div className="skeleton-box" style={{ width: col.width ? '100%' : '80%' }}></div>
                    </td>
                  ))}
                  {!readOnly && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div className="skeleton-box" style={{ height: '32px', width: '60px' }}></div>
                        <div className="skeleton-box" style={{ height: '32px', width: '60px' }}></div>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : displayedItems.length > 0 ? (
              displayedItems.map((item, index) => (
                <tr 
                  key={item.id}
                  draggable={reorderable && !searchTerm}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', index.toString());
                  }}
                  onDragOver={(e) => {
                    if (reorderable && !searchTerm) {
                      e.preventDefault();
                      setDragOverIndex(index);
                    }
                  }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverIndex(null);
                    if (!reorderable || searchTerm) return;
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                    if (fromIndex !== index) {
                      const newItems = [...localItems];
                      const [movedItem] = newItems.splice(fromIndex, 1);
                      newItems.splice(index, 0, movedItem);
                      setLocalItems(newItems);
                      if (onReorder) onReorder(newItems, currentPage, itemsPerPage);
                    }
                  }}
                  style={{ 
                    cursor: reorderable && !searchTerm ? 'move' : 'default',
                    backgroundColor: dragOverIndex === index ? '#f8f9fa' : '',
                    borderTop: dragOverIndex === index ? '2px solid #007bff' : '',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  {reorderable && !searchTerm && (
                    <td style={{ width: '40px', color: '#adb5bd', textAlign: 'center', cursor: 'grab' }}>
                      ⣿
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={`${item.id}-${col.key}`}>
                      {renderCell(item, col)}
                    </td>
                  ))}
                  {!readOnly && (
                  <td>
                    <div className={styles.actionButtons}>
                      <button 
                        className={styles.editButton}
                        onClick={() => {
                          handleEdit(item);
                          setIsFormVisible(true);
                          setTimeout(() => document.getElementById('crud-form')?.scrollIntoView({ behavior: 'smooth' }), 50);
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
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={columns.length + (reorderable && !searchTerm ? 1 : 0) + (readOnly ? 0 : 1)} 
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
        <div className={styles.pagination}>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className={styles.paginationButton}
            type="button"
          >
            Anterior
          </button>
          <span className={styles.paginationInfo}>
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className={styles.paginationButton}
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
  validate: PropTypes.func,
  searchable: PropTypes.bool,
  reorderable: PropTypes.bool,
  exportable: PropTypes.bool,
  showItemCount: PropTypes.bool,
  itemNameSingular: PropTypes.string,
  itemNamePlural: PropTypes.string,
  readOnly: PropTypes.bool
};
