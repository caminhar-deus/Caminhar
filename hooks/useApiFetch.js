import { useState, useEffect, useCallback } from 'react';

/**
 * @typedef {Object} ApiFetchOptions
 * @property {Object} [options={}] - Opções do fetch (method, body, headers, etc.)
 * @property {Array} [deps=[]] - Dependências para re-executar o fetch
 * @property {function} [transform] - Função para transformar os dados da resposta
 * @property {*} [initialData=null] - Valor inicial para data
 * @property {function} [onError] - Callback em caso de erro
 */

/**
 * @typedef {Object} ApiFetchReturn
 * @property {*} data - Dados da resposta
 * @property {boolean} loading - Estado de carregamento
 * @property {string|null} error - Mensagem de erro ou null
 * @property {function} refetch - Função para re-executar o fetch
 * @property {function} setData - Função para definir dados manualmente
 */

/**
 * Hook genérico para fetch de API com estados de loading/error.
 * Centraliza o padrão useState + useEffect + fetch + loading/error,
 * eliminando repetição em múltiplos componentes.
 *
 * @param {string} url - Endpoint da API
 * @param {ApiFetchOptions} [config={}] - Configurações opcionais
 * @returns {ApiFetchReturn}
 *
 * @example
 * const { data: posts, loading } = useApiFetch('/api/posts');
 * const { data: videos, loading, refetch } = useApiFetch('/api/videos', { deps: [page, search] });
 */
export function useApiFetch(url, config = {}) {
  const {
    options = {},
    deps = [],
    transform,
    initialData = null,
    onError,
  } = config;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        credentials: 'include',
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Erro HTTP ${response.status}`);
      }

      let result = await response.json();

      // Aplica transform se fornecido
      if (transform) {
        result = transform(result);
      }

      setData(result);
    } catch (err) {
      setError(err.message);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  }, [url, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, setData };
}

export default useApiFetch;