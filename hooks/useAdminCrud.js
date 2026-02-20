import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Hook reutilizável para operações CRUD no painel administrativo
 * @param {Object} options - Opções de configuração
 * @param {string} options.apiEndpoint - Endpoint base da API (ex: '/api/admin/musicas')
 * @param {Object} options.initialFormData - Dados iniciais do formulário
 * @param {Function} options.onSuccess - Callback opcional após sucesso
 * @param {boolean} options.usePagination - Se deve usar paginação
 * @param {number} options.itemsPerPage - Itens por página (padrão: 10)
 * @returns {Object} - Estados e funções do CRUD
 */
export function useAdminCrud({
  apiEndpoint,
  initialFormData,
  onSuccess,
  usePagination = false,
  itemsPerPage = 10
}) {
  // Estados de dados
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados de formulário
  const [formData, setFormData] = useState(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /**
   * Carrega os itens da API
   */
  const loadItems = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    
    try {
      const url = usePagination 
        ? `${apiEndpoint}?page=${page}&limit=${itemsPerPage}`
        : apiEndpoint;
        
      const response = await fetch(url, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}: Falha ao carregar dados`);
      }

      const data = await response.json();
      
      if (usePagination && data.pagination) {
        setItems(data.videos || data.items || data.posts || data.musicas || []);
        setTotalPages(data.pagination.totalPages);
        setCurrentPage(data.pagination.page);
        setTotalItems(data.pagination.total);
      } else {
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar itens:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, usePagination, itemsPerPage]);

  // Carrega itens na montagem do componente
  useEffect(() => {
    loadItems(1);
  }, [loadItems]);

  /**
   * Atualiza um campo do formulário
   */
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  /**
   * Atualiza diretamente um campo do formulário (útil para uploads)
   */
  const setFieldValue = useCallback((fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  }, []);

  /**
   * Reseta o formulário para o estado inicial
   */
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setIsEditing(false);
    setEditingId(null);
  }, [initialFormData]);

  /**
   * Inicia modo de edição com dados do item
   */
  const handleEdit = useCallback((item) => {
    // Mapeia os camros do item para o formData
    const newFormData = {};
    Object.keys(initialFormData).forEach(key => {
      newFormData[key] = item[key] ?? initialFormData[key];
    });
    
    setFormData(newFormData);
    setIsEditing(true);
    setEditingId(item.id);
  }, [initialFormData]);

  /**
   * Cria ou atualiza um item
   */
  const handleSubmit = useCallback(async (e, validateFn) => {
    if (e) e.preventDefault();
    
    // Validação opcional
    if (validateFn) {
      const validationError = validateFn(formData);
      if (validationError) {
        toast.error(validationError);
        return false;
      }
    }

    setLoading(true);
    setError('');

    const toastId = toast.loading(isEditing ? 'Atualizando...' : 'Criando...');

    try {
      const body = isEditing 
        ? { ...formData, id: editingId }
        : formData;

      const response = await fetch(apiEndpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}: Falha ao salvar`);
      }

      const data = await response.json();
      
      toast.success(isEditing ? 'Atualizado com sucesso!' : 'Criado com sucesso!', { id: toastId });
      
      resetForm();
      loadItems(isEditing ? currentPage : 1);
      
      if (onSuccess) onSuccess(data);
      
      return true;
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError(err.message);
      toast.error(err.message, { id: toastId });
      return false;
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, formData, isEditing, editingId, currentPage, loadItems, resetForm, onSuccess]);

  /**
   * Exclui um item
   */
  const handleDelete = useCallback(async (id) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) {
      return false;
    }

    setLoading(true);
    setError('');

    const toastId = toast.loading('Excluindo...');

    try {
      const response = await fetch(apiEndpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}: Falha ao excluir`);
      }

      toast.success('Excluído com sucesso!', { id: toastId });
      loadItems(currentPage);
      
      return true;
    } catch (err) {
      console.error('Erro ao excluir:', err);
      setError(err.message);
      toast.error(err.message, { id: toastId });
      return false;
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, currentPage, loadItems]);

  /**
   * Navega para uma página específica
   */
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      loadItems(page);
    }
  }, [loadItems, totalPages]);

  return {
    // Estados
    items,
    loading,
    error,
    formData,
    isEditing,
    editingId,
    currentPage,
    totalPages,
    totalItems,
    
    // Ações
    loadItems,
    handleInputChange,
    setFieldValue,
    handleEdit,
    handleSubmit,
    handleDelete,
    resetForm,
    goToPage,
    setFormData,
    setError
  };
}

export default useAdminCrud;
