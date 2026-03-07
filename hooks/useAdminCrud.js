import { useState, useEffect, useCallback } from 'react';

export function useAdminCrud({
  apiEndpoint,
  initialFormData,
  usePagination = false,
  itemsPerPage = 10,
  onSuccess
}) {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [isEditing, setIsEditing] = useState(null); // Armazena o ID do item em edição
  const [loading, setLoading] = useState(true); // Começa como true na primeira carga
  const [error, setError] = useState('');
  
  // Estado da paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const url = usePagination ? `${apiEndpoint}?page=${page}&limit=${itemsPerPage}` : apiEndpoint;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ao buscar dados: ${response.statusText}`);
      }
      const result = await response.json();
      
      // *** PONTO CRÍTICO DA CORREÇÃO ***
      // Procura pela propriedade `data` (ou `musicas`, `videos`, etc.) na resposta da API.
      // Isso torna o hook compatível com a estrutura da sua API.
      const dataArray = result.data || result.musicas || result.videos || result.posts || [];
      setItems(dataArray);

      if (usePagination && result.pagination) {
        setCurrentPage(result.pagination.page);
        setTotalPages(result.pagination.totalPages);
      }

    } catch (err) {
      setError(err.message);
      console.error("Erro ao buscar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, usePagination, itemsPerPage]);

  useEffect(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' || type === 'toggle' ? checked : value
    }));
  };

  const setFieldValue = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (item) => {
    setIsEditing(item.id);
    setFormData(item);
  };

  const resetForm = () => {
    setIsEditing(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e, validate) => {
    e.preventDefault();
    
    const validationError = validate ? validate() : null;
    if (validationError) {
      setError(validationError);
      // Limpa o erro após alguns segundos
      setTimeout(() => setError(''), 5000);
      return;
    }

    setLoading(true);
    setError('');

    const method = isEditing ? 'PUT' : 'POST';
    const body = JSON.stringify(isEditing ? { ...formData, id: isEditing } : formData);

    try {
      const response = await fetch(apiEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Ocorreu um erro ao salvar.');

      resetForm();
      await fetchData(isEditing ? currentPage : 1); // Volta para a primeira página ao criar novo item
      if (onSuccess) onSuccess(result);

    } catch (err) {
      setError(err.message);
      console.error("Erro ao submeter:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(apiEndpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Erro ao excluir.');
      }
      await fetchData(currentPage); // Recarrega os dados da página atual
    } catch (err) {
      setError(err.message);
      console.error("Erro ao excluir:", err);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page) => {
    if (page > 0 && page <= totalPages) setCurrentPage(page);
  };

  return { items, loading, error, formData, isEditing, currentPage, totalPages, handleInputChange, setFieldValue, handleEdit, handleSubmit, handleDelete, resetForm, goToPage };
}