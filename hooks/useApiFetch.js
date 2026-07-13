import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * @typedef {Object} ApiFetchOptions
 * @property {Object} [options={}] - Opções do fetch (method, body, headers, etc.)
 * @property {Array} [deps=[]] - Dependências para re-executar o fetch
 * @property {function} [transform] - Função para transformar os dados da resposta
 * @property {*} [initialData=null] - Valor inicial para data
 * @property {number} [staleTime] - Tempo em ms para considerar dados "frescos" e pular o fetch
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
 * @note Hook compartilhado entre componentes públicos e administrativos — uso não se limita ao admin.
 *
 * @param {string} url - URL da API
 * @param {ApiFetchOptions} [config={}] - Configurações
 * @returns {ApiFetchReturn}
 */
export const useApiFetch = (url, config = {}) => {
  const {
    options = {},
    deps = [],
    transform,
    initialData = null,
    staleTime,
    onError,
  } = config;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [optionsKey, setOptionsKey] = useState(0);
  const lastFetchRef = useRef(0);
  const optionsRef = useRef(options);

  // Estabiliza a referência de options: só atualiza quando o conteúdo serializado mudar
  const serializedOptions = JSON.stringify(options);
  useEffect(() => {
    if (optionsRef.current !== options) {
      optionsRef.current = options;
      setOptionsKey((prev) => prev + 1);
    }
  }, [serializedOptions]);

  const fetchData = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Sem conexão com a internet');
      setLoading(false);
      if (typeof onError === 'function') {
        onError(new Error('Sem conexão com a internet'));
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, optionsRef.current);

      if (!response.ok && response.status !== 304) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // resposta sem corpo JSON
        }
        const errorMsg = errorData?.message || errorData?.error || `Erro HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      let result = await response.json();

      if (typeof transform === 'function') {
        result = transform(result);
      }

      setData(result);
      lastFetchRef.current = Date.now();
    } catch (err) {
      const errorMessage = err.message || 'Erro desconhecido ao buscar dados';
      setError(errorMessage);

      if (typeof onError === 'function') {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, optionsKey, ...deps]);

  useEffect(() => {
    const handleOnline = () => {
      if (error && error.includes('Sem conexão')) {
        fetchData();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    if (staleTime && lastFetchRef.current > 0) {
      const elapsed = Date.now() - lastFetchRef.current;
      if (elapsed < staleTime) {
        setLoading(false);
        return;
      }
    }
    fetchData();

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
    }, [fetchData, staleTime]);

  return { data, loading, error, refetch: fetchData, setData };
};

