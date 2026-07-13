import { useEffect, useCallback, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useAdminCrud } from '@/hooks/useAdminCrud';
import { exportToCSV } from '@/lib/csvExport';
import { Modal } from '@/components/UI/Modal';
import { Button } from '@/components/UI/Button';
import styles from './styles/crud.module.css';
import toast from 'react-hot-toast';
import CrudForm from './CrudForm';
import CrudTable from './CrudTable';

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
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, itemId: null });
  const resolveRef = useRef(null);

  // Wrapper para exibir notificações de sucesso automaticamente
  const handleSuccessWrapper = useCallback(() => {
    // A notificação de sucesso foi removida deste ponto para evitar a exibição de duas mensagens.
    // O sistema já possui uma notificação genérica para operações bem-sucedidas.
    // toast.success('Operação realizada com sucesso!');
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
    toggleField,
    resetForm,
    goToPage
  } = useAdminCrud({
    apiEndpoint,
    initialFormData,
    usePagination,
    itemsPerPage,
    searchTerm,
    onSuccess: handleSuccessWrapper,
    onConfirmDelete: () => new Promise((resolve) => {
      resolveRef.current = resolve;
    }),
  });

  // Intercepta a exclusão para abrir o modal de confirmação.
  // Se o usuário confirmar, chama handleDelete do hook para efetivar a exclusão.
  const handleDeleteWithConfirm = (id) => {
    setConfirmDelete({ isOpen: true, itemId: id });
  };

  // Fecha o modal de confirmação quando a operação termina (loading muda de true para false)
  useEffect(() => {
    if (!loading && confirmDelete.isOpen) {
      setConfirmDelete({ isOpen: false, itemId: null });
      resolveRef.current = null;
    }
  }, [loading]);

  // Handler chamado quando o usuário confirma a exclusão no modal
  const handleConfirmDelete = () => {
    const id = confirmDelete.itemId;
    resolveRef.current?.(true);
    resolveRef.current = null;
    if (id !== null) {
      handleDelete(id);
    }
  };

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

  // Os itens exibidos vêm da API (já filtrados server-side quando searchTerm está presente)
  const displayedItems = localItems;

  // Função para exportar os dados visíveis para CSV
  const handleExportCSV = () => {
    exportToCSV({
      data: displayedItems,
      columns: columns.map(col => ({
        key: col.key,
        header: col.header,
        format: col.format
      })),
      filename: title.replace(/\s+/g, '_').toLowerCase() + '_export',
      onEmpty: () => toast.error('Não há dados para exportar.')
    });
  };

  // Função para alternar booleanos (como Rascunho/Publicado) com 1 clique
  // Delega ao toggleField do hook useAdminCrud, que centraliza a lógica de chamada à API
  // e suporta atualização otimista com reversão automática em caso de falha
  const handleToggleBoolean = (item, key, currentValue) => {
    toggleField(item, key, currentValue, {
      onOptimisticUpdate: (item, key, newValue) => {
        setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, [key]: newValue } : i));
      },
      onRevert: (item, key, oldValue) => {
        setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, [key]: oldValue } : i));
      }
    });
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
    
    // Validação customizada com try/catch para evitar que erros não estruturados quebrem o fluxo
    if (validate) {
      try {
        validate(formData);
      } catch (validationError) {
        const error = new Error(validationError.message || 'Erro de validação customizada.');
        throw error;
      }
    }
  };

  return (
    <div className={styles.content} style={{ minHeight: '700px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className={styles.sectionHeader}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          {showItemCount && (
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
              Total: {localItems.length} {localItems.length === 1 ? itemNameSingular : itemNamePlural}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          {searchable && (
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', display: 'flex' }}>
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
                  border: '1px solid var(--color-border-light)',
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
              // ✅ Fallback de segurança:
              // Ordem intencional: primeiro reseta TODO estado do formulário,
              // depois fecha o componente.
              // 
              // Isso evita leaks de estado em casos de edge case onde:
              // 1. O formulário ficou em estado inconsistente
              // 2. Ocorreu falha durante operação
              // 3. Usuário desiste no meio de edição
              //
              // É um tratamento de erro raro, por isso não aparece na cobertura de testes
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
        <CrudForm
          fields={fields}
          formData={formData}
          handleInputChange={handleInputChange}
          setFieldValue={setFieldValue}
          error={error}
          renderCustomFormField={renderCustomFormField}
          loading={loading}
          isEditing={isEditing}
          updateButtonText={updateButtonText}
          saveButtonText={saveButtonText}
          handleSubmit={handleSubmit}
          validateForm={validateForm}
        />
      )}

      {/* Tabela */}
      <CrudTable
        columns={columns}
        items={displayedItems}
        loading={loading}
        readOnly={readOnly}
        reorderable={reorderable}
        searchTerm={searchTerm}
        renderCustomCell={renderCustomCell}
        handleEdit={handleEdit}
        handleDelete={handleDeleteWithConfirm}
        handleToggleBoolean={handleToggleBoolean}
        localItems={localItems}
        setLocalItems={setLocalItems}
        dragOverIndex={dragOverIndex}
        setDragOverIndex={setDragOverIndex}
        onReorder={onReorder}
        currentPage={currentPage}
        totalPages={totalPages}
        goToPage={goToPage}
        emptyMessage={emptyMessage}
        usePagination={usePagination}
        itemsPerPage={itemsPerPage}
        title={title}
        isFormVisible={isFormVisible}
        setIsFormVisible={setIsFormVisible}
      />

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={confirmDelete.isOpen}
        onClose={() => {
          resolveRef.current?.(false);
          setConfirmDelete({ isOpen: false, itemId: null });
        }}
        title="Confirmar exclusão"
        size="sm"
      >
        <p>Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.</p>
        <Modal.Footer>
          <Button
            variant="ghost"
            onClick={() => {
              resolveRef.current?.(false);
              setConfirmDelete({ isOpen: false, itemId: null });
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={loading}
            onClick={handleConfirmDelete}
          >
            Sim, excluir
          </Button>
        </Modal.Footer>
      </Modal>
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
