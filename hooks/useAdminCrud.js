import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Hook reutilizável para operações CRUD em painéis administrativos.
 * Centraliza a lógica de fetch, create, update, delete, paginação e estado de formulário.
 * 
 * @param {object} config - Configuração do hook.
 * @param {string} config.apiEndpoint - O endpoint da API para as operações.
 * @param {object} config.initialFormData - O estado inicial para o formulário de criação.
 * @param {boolean} [config.usePagination=false] - Habilita a lógica de paginação.
 * @param {number} [config.itemsPerPage=10] - Quantidade de itens por página.
 * @param {function} [config.onSuccess] - Callback executado após uma operação bem-sucedida.
 * @returns Um objeto contendo o estado e os manipuladores para o CRUD.
 */
export const useAdminCrud = ({
  apiEndpoint,
  initialFormData,
  usePagination = false,
  itemsPerPage = 10,
  onSuccess,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchItems = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const url = usePagination ? `${apiEndpoint}?page=${page}&limit=${itemsPerPage}` : apiEndpoint;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Falha ao buscar dados da API');
      
      const data = await response.json();
      setItems(data.data || []);
      
      if (usePagination && data.pagination) {
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      setError({ message: err.message });
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, usePagination, itemsPerPage]);

  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

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
      if (customValidator) customValidator();

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
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.')) return;

    const loadingToastId = toast.loading('Excluindo item...');
    try {
      const response = await fetch(`${apiEndpoint}?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Falha ao excluir');
      
      toast.success('Item excluído com sucesso!', { id: loadingToastId });
      fetchItems(currentPage);
    } catch (err) {
      toast.error(err.message, { id: loadingToastId });
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