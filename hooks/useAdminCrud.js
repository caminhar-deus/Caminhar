import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Função pura para buscar dados da API.
 * Separada do hook para ser testável e reutilizável sem dependências do React.
 */
async function fetchItemsFromAPI(apiEndpoint, usePagination, itemsPerPage, page = 1, signal) {
  const url = usePagination
    ? `${apiEndpoint}?page=${page}&limit=${itemsPerPage}`
    : apiEndpoint;
  const response = await fetch(url, { credentials: 'include', signal });
  if (!response.ok) throw new Error('Falha ao buscar dados da API');
  const data = await response.json();
  return { items: data.data || [], pagination: data.pagination };
}

/**
 * @typedef {Object} AdminCrudConfig
 * @property {string} apiEndpoint - Endereço da API para este CRUD
 * @property {Object} initialFormData - Estado inicial do formulário
 * @property {boolean} [usePagination=false] - Habilita lógica de paginação
 * @property {number} [itemsPerPage=10] - Itens por página
 * @property {boolean} [autoFetch=true] - Habilita fetch automático na montagem
 * @property {function} [onSuccess] - Callback após operação bem sucedida
 * @property {function} [onError] - Callback executado em caso de erro
 */

/**
 * @typedef {Object} AdminCrudReturn
 * @property {Array} items - Lista de itens
 * @property {boolean} loading - Estado de carregamento
 * @property {Object|null} error - Erro da operação
 * @property {Object} formData - Dados do formulário
 * @property {boolean} isEditing - Modo edição ativo
 * @property {number} currentPage - Página atual
 * @property {number} totalPages - Total de páginas
 * @property {function} handleInputChange - Manipula mudança em inputs
 * @property {function} setFieldValue - Define valor de campo específico
 * @property {function} handleEdit - Inicia modo edição
 * @property {function} handleSubmit - Envia formulário
 * @property {function} handleDelete - Exclui item
 * @property {function} resetForm - Reseta formulário
 * @property {function} goToPage - Navega para página específica
 */

/**
 * Hook reutilizável para operações CRUD em painéis administrativos.
 * Centraliza a lógica de fetch, create, update, delete, paginação e estado de formulário.
 * 
 * @param {AdminCrudConfig} config - Configuração do hook
 * @returns {AdminCrudReturn} Objeto contendo estado e manipuladores para o CRUD
 */
export const useAdminCrud = ({
  apiEndpoint,
  initialFormData,
  usePagination = false,
  itemsPerPage = 10,
  autoFetch = true,
  onSuccess,
  onError,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch inicial na montagem
  useEffect(() => {
    if (!autoFetch) return;
    fetchItems(1);
  }, [apiEndpoint, usePagination, itemsPerPage, autoFetch, onError, fetchItems]);

  // Callback para re-fetch (usado em handleSubmit, handleDelete e goToPage)
  const fetchItems = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await fetchItemsFromAPI(apiEndpoint, usePagination, itemsPerPage, page);
      setItems(result.items);
      if (usePagination && result.pagination) {
        setCurrentPage(result.pagination.page);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (err) {
      setError({ message: err.message });
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, usePagination, itemsPerPage]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const setFieldValue = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (item) => {
    setIsEditing(true);
    setFormData(item);
    setError(null);
  };

  const resetForm = useCallback(() => {
    setIsEditing(false);
    setFormData(initialFormData);
    setError(null);
  }, [initialFormData]);

  const handleSubmit = async (e, customValidator) => {
    e.preventDefault();
    setError(null);
    const loadingToastId = toast.loading(isEditing ? 'Atualizando item...' : 'Criando item...');

    try {
      if (customValidator) {
        try {
          customValidator();
        } catch (validationError) {
          setError({ message: validationError.message || 'Erro de validação' });
          toast.error(validationError.message || 'Erro de validação', { id: loadingToastId });
          return;
        }
      }

      const method = isEditing ? 'PUT' : 'POST';
      const body = JSON.stringify(formData);

      const response = await fetch(apiEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        const apiError = new Error(data.error || 'Ocorreu um erro na API.');
        if (data.details) {
          apiError.errors = data.details.reduce((acc, curr) => {
            acc[curr.field] = [curr.message];
            return acc;
          }, {});
        }
        throw apiError;
      }

      // CORREÇÃO: Unifica as notificações de sucesso em uma única chamada e corrige o texto.
      toast.success(isEditing ? 'Item atualizado com sucesso!' : 'Item criado com sucesso!', { id: loadingToastId });

      resetForm();
      fetchItems(isEditing ? currentPage : 1); // Volta para a primeira página ao criar
      if (onSuccess) {
        onSuccess(data.data);
      }

    } catch (err) {
      setError(err);
      toast.error(err.message || 'Falha na operação.', { id: loadingToastId });
      if (onError) onError(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.')) return;

    const loadingToastId = toast.loading('Excluindo item...');
    const abortController = new AbortController();
    try {
      const response = await fetch(apiEndpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
        signal: abortController.signal,
      });
      if (!response.ok) throw new Error('Falha ao excluir');
      
      toast.success('Item excluído com sucesso!', { id: loadingToastId });
      fetchItems(currentPage);
    } catch (err) {
      toast.error(err.message, { id: loadingToastId });
      if (onError) onError(err);
    }
  };

  const goToPage = (page) => {
    if (page > 0 && page <= totalPages) {
      fetchItems(page);
    }
  };

  return {
    items, loading, error, formData, isEditing, currentPage, totalPages,
    handleInputChange, setFieldValue, handleEdit, handleSubmit, handleDelete, resetForm, goToPage
  };
};