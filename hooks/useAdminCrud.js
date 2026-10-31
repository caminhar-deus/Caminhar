import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useApiFetch } from './useApiFetch';

/**
 * @typedef {Object} AdminCrudConfig
 * @property {string} apiEndpoint - Endereço da API para este CRUD
 * @property {Object} initialFormData - Estado inicial do formulário
 * @property {boolean} [usePagination=false] - Habilita lógica de paginação
 * @property {number} [itemsPerPage=10] - Itens por página
 * @property {boolean} [autoFetch=true] - Habilita fetch automático na montagem
 * @property {function} [onSuccess] - Callback após operação bem sucedida
 * @property {function} [onError] - Callback executado em caso de erro
 * @property {function} [onConfirmDelete] - Função assíncrona opcional para confirmação de exclusão.
 *   Recebe o `id` do item a ser excluído. Se fornecida, o hook aguarda a Promise resolver.
 *   Se resolver com `true`, a exclusão prossegue.
 *   Se não fornecida, usa `window.confirm` como fallback.
 */

/**
 * Função de validação customizada para o formulário.
 * Deve lançar um Error com mensagem descritiva se a validação falhar.
 * Se não lançar erro, assume-se que os dados são válidos.
 *
 * @callback CustomValidator
 * @returns {void}
 * @throws {Error} Erro com mensagem específica de validação
 * @example <caption>Validador que lança erro se título estiver vazio</caption>
 * () => {
 *   if (!formData.titulo) throw new Error('Título é obrigatório');
 * }
 */

/**
 * @typedef {Object} AdminCrudReturn
 * @property {Array} items - Lista de itens
 * @property {boolean} loading - Estado de carregamento
 * @property {Object|null} error - Erro da operação
 * @property {string|null} requestId - `X-Request-Id` do último erro de listagem (vindo do `useApiFetch`)
 * @property {Error|null} formError - Erro do último save com detalhes de campo (`err.errors`); limpo a cada novo envio, ao editar e ao resetar
 * @property {Object} formData - Dados do formulário
 * @property {boolean} isEditing - Modo edição ativo
 * @property {number} currentPage - Página atual
 * @property {number} totalPages - Total de páginas
 * @property {number} totalItems - Total de itens do conjunto filtrado (todas as páginas)
 * @property {function} handleInputChange - Manipula mudança em inputs
 * @property {function} setFieldValue - Define valor de campo específico
 * @property {function} handleEdit - Inicia modo edição
 * @property {function} handleSubmit - Envia formulário (e, customValidator) — ver {@link CustomValidator}
 * @property {function} handleDelete - Exclui item
 * @property {function} toggleField - Alterna um campo booleano de um item via requisição PUT com revalidação
 * @property {function} resetForm - Reseta formulário
 * @property {function} goToPage - Navega para página específica
 * @property {function} refetch - Recarrega os dados da lista
 */

/**
 * Hook reutilizável para operações CRUD em painéis administrativos.
 * Centraliza a lógica de fetch, create, update, delete, paginação e estado de formulário.
 * Usa useApiFetch (hook genérico compartilhado com Features públicas) como base para o fetch de listagem, eliminando lógica duplicada
 * de loading/error/resposta.
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
  onConfirmDelete,
  searchTerm = '',
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  // Erro do último save COM detalhes de campo (err.errors) — o CrudForm lê
  // `error.errors[campo][0]` para pintar o campo em vermelho. Erros de
  // listagem continuam no `error` do useApiFetch (string).
  const [formError, setFormError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Monta a URL com paginação e busca para o useApiFetch
  const buildUrl = useCallback((page) => {
    const params = new URLSearchParams();
    if (usePagination) {
      params.set('page', page);
      params.set('limit', itemsPerPage);
    }
    if (searchTerm) {
      params.set('search', searchTerm);
    }
    const queryString = params.toString();
    return queryString ? `${apiEndpoint}?${queryString}` : apiEndpoint;
  }, [apiEndpoint, usePagination, itemsPerPage, searchTerm]);

  // useApiFetch gerencia o fetch e os estados loading/error de forma centralizada
  const {
    data: apiData,
    loading,
    error,
    // `X-Request-Id` do último erro — repassado em objeto separado porque o
    // `error` é string e não pode carregar propriedades.
    requestId,
    refetch,
  } = useApiFetch(autoFetch ? buildUrl(currentPage) : '', {
    options: { credentials: 'include' },
    initialData: { data: [], pagination: null },
    onError: (err) => {
      if (onError) onError(err);
    },
  });

  // Extrai items e paginação dos dados retornados
  const items = apiData?.data || [];
  const pagination = apiData?.pagination;
  // Total do conjunto filtrado (não só a página). Usado pelo contador do
  // AdminCrudBase; quando a API não pagina, cai no tamanho da lista.
  const totalItems = pagination?.total ?? items.length;

  // Atualiza paginação quando os dados mudam
  useEffect(() => {
    if (usePagination && pagination) {
      setCurrentPage(pagination.page || 1);
      setTotalPages(pagination.totalPages || 1);
    }
  }, [usePagination, pagination]);

  // Callback para re-fetch (usado em handleSubmit, handleDelete e goToPage)
  // A página é gerenciada via estado, então o useApiFetch reage automaticamente
  // quando currentPage muda (via buildUrl na URL)
  const fetchItems = useCallback((page) => {
    if (page !== undefined && page !== null) {
      if (page !== currentPage) {
        // Muda a página: o fetch automático via useApiFetch (reativo à URL) já será disparado
        setCurrentPage(page);
      } else {
        // Mesma página: precisa forçar refresh manualmente
        refetch();
      }
    } else {
      refetch();
    }
  }, [refetch, currentPage]);

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
    setFormError(null);
  };

  const resetForm = useCallback(() => {
    setIsEditing(false);
    setFormData(initialFormData);
    setFormError(null);
  }, [initialFormData]);

  const handleSubmit = async (e, customValidator) => {
    e.preventDefault();

    const loadingToastId = toast.loading(isEditing ? 'Atualizando item...' : 'Criando item...');
    // Cada novo envio limpa os campos em vermelho do envio anterior.
    setFormError(null);

    try {
      if (customValidator) {
        try {
          customValidator();
        } catch (validationError) {
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
        // APIs admin devolvem { message } (e algumas legadas { error }); detalhes
        // de campo chegam como { errors: { campo: [msgs] } } (Zod flatten) ou
        // como { details: [{ field, message }] } no padrão antigo.
        // `message` é o texto humano ("Dados inválidos para o produto");
        // `error` costuma ser a frase técnica do HTTP ("Bad Request") — e era
        // ele que aparecia no toast, sem dizer o que corrigir. Rotas que só
        // enviam `error` (ex.: fetch-ml, handler genérico 500) caem no
        // fallback e continuam legíveis.
        const apiError = new Error(data.message || data.error || 'Ocorreu um erro na API.');
        if (data.errors && typeof data.errors === 'object') {
          apiError.errors = data.errors;
        } else if (data.details) {
          apiError.errors = data.details.reduce((acc, curr) => {
            acc[curr.field] = [curr.message];
            return acc;
          }, {});
        }
        throw apiError;
      }

      toast.success(isEditing ? 'Item atualizado com sucesso!' : 'Item criado com sucesso!', { id: loadingToastId });

      resetForm();
      fetchItems(isEditing ? currentPage : 1);
      if (onSuccess) {
        onSuccess(data.data);
      }

    } catch (err) {
      if (err.errors && typeof err.errors === 'object') {
        // Erro de validação com detalhes de campo: guarda para o CrudForm
        // pintar os campos em vermelho e orienta pelo toast.
        setFormError(err);
        toast.error('Verifique os campos em vermelho no formulário.', { id: loadingToastId });
      } else {
        toast.error(err.message || 'Falha na operação.', { id: loadingToastId });
      }
      if (onError) onError(err);
    }
  };

  const handleDelete = async (id) => {
    if (onConfirmDelete) {
      const confirmed = await onConfirmDelete(id);
      if (!confirmed) return;
    } else {
      if (!window.confirm('Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.')) return;
    }

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
      refetch();
    } catch (err) {
      toast.error(err.message, { id: loadingToastId });
      if (onError) onError(err);
    }
  };

  /**
   * Alterna um campo booleano de um item específico via requisição PUT.
   * Após a resposta bem-sucedida do servidor, os dados são revalidados com refetch().
   * Envia apenas { id, [key]: newValue } para evitar validação desnecessária de outros campos.
   * Aceita callbacks opcionais para atualização otimista na UI e reversão em caso de falha.
   *
   * @param {Object} item - Item a ser alterado
   * @param {string} key - Nome do campo booleano a ser alternado
   * @param {boolean} currentValue - Valor atual do campo
   * @param {Object} [options={}] - Opções opcionais
   * @param {Function} [options.onOptimisticUpdate] - Callback chamado antes do PUT com (item, key, newValue)
   * @param {Function} [options.onRevert] - Callback chamado em caso de falha com (item, key, oldValue)
   */
  const toggleField = async (item, key, currentValue, { onOptimisticUpdate, onRevert } = {}) => {
    const newValue = !currentValue;

    if (onOptimisticUpdate) {
      onOptimisticUpdate(item, key, newValue);
    }

    const loadingToast = toast.loading('Atualizando status...');
    try {
      const payload = { id: item.id, [key]: newValue };
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorMsg = 'Falha na API';
        try {
          const errorData = await response.json();
          if (errorData.message) errorMsg = errorData.message;
          if (errorData.error) errorMsg = errorData.error;
        } catch {
          // Se não conseguir parsear o JSON, usa mensagem genérica
        }
        throw new Error(errorMsg);
      }

      // Aguarda a resposta para garantir que o PUT foi bem-sucedido
      const result = await response.json();
      toast.success('Status alterado com sucesso!', { id: loadingToast });
      refetch(); // Sincroniza com o servidor
      return result;
    } catch (error) {
      if (onRevert) {
        onRevert(item, key, currentValue);
      }
      toast.error(error.message || 'Erro ao alterar status.', { id: loadingToast });
      console.error('[toggleField] Erro:', error.message);
      if (onError) onError(error);
    }
  };

  const goToPage = (page) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return {
    items, loading, error, formError, requestId, formData, isEditing, currentPage, totalPages, totalItems,
    handleInputChange, setFieldValue, handleEdit, handleSubmit, handleDelete,
    toggleField, resetForm, goToPage, refetch
  };
};