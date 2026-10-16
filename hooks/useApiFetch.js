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
 * @property {string|null} error - Mensagem de erro ou null (SEMPRE string — contrato
 *   consumido por 5 componentes públicos, não pode virar objeto)
 * @property {string|null} requestId - `X-Request-Id` da última resposta com erro,
 *   canal paralelo ao `error` para a UI exibir o ID de correlação
 * @property {function} refetch - Função para re-executar o fetch
 * @property {function} setData - Função para definir dados manualmente
 */

/**
 * Métodos que podem ser reenviados com segurança após um 503.
 * GET/HEAD/OPTIONS/TRACE são "safe" (sem efeito colateral) e PUT/DELETE são
 * idempotentes por definição (RFC 9110 §9.2.2): repetir a operação converge
 * para o mesmo estado final. POST e PATCH ficam de fora — justificativa no
 * ponto do retry, dentro do `fetchData`.
 */
const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE', 'PUT', 'DELETE']);

/**
 * Converte o header `Retry-After` em milissegundos.
 * Aceita as duas formas previstas pela RFC 9110 §10.2.5: delay-seconds
 * (inteiro não negativo) e data HTTP. Qualquer outra coisa é tratada como
 * "não parseável" e desativa o retry.
 * @param {string|null|undefined} value - Valor cru do header
 * @returns {number|null} Atraso em ms, ou `null` se ausente/inválido
 */
const parseRetryAfterMs = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
};

/** Espera `ms` milissegundos. Só existe para o retry do 503 ser testável com fake timers. */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  // Estado SEPARADO de `error` de propósito: `error` é string (contrato dos 5
  // componentes públicos) e o `requestId` não pode ser embutido nele sem mudar o
  // tipo. Este valor acompanha o erro atual e é quem leva o ID até a UI.
  const [requestId, setRequestId] = useState(null);
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
      setRequestId(null);
      setError('Sem conexão com a internet');
      setLoading(false);
      if (typeof onError === 'function') {
        onError(new Error('Sem conexão com a internet'));
      }
      return;
    }

    setLoading(true);
    setError(null);
    setRequestId(null);

    try {
      const request = optionsRef.current;
      const method = String(request?.method || 'GET').toUpperCase();

      let response = await fetch(url, request);

      // ── Retry ÚNICO para 503 com `Retry-After` parseável ──
      // O backend só manda 503 + Retry-After quando o banco está indisponível
      // (adminCrudHandler), e o header existe justamente para pedir reenvio
      // depois da espera indicada. É um `if`, nunca um laço: se o segundo
      // envio também voltar 503, o erro segue adiante normalmente.
      //
      // SEGURANÇA EM MÉTODO NÃO IDEMPOTENTE: o 503 nasce no `catch` ao redor
      // da execução do handler, ou seja, DEPOIS que a operação já começou a
      // rodar no banco — não dá para garantir que nada foi aplicado. Reenviar
      // um POST/PATCH às cegas poderia duplicar um registro, então ficam de
      // fora. PUT/DELETE são idempotentes (repetir dá o mesmo estado final) e
      // GET/HEAD não alteram nada, então só esses reenviam.
      if (response?.status === 503 && RETRYABLE_METHODS.has(method)) {
        const retryAfterMs = parseRetryAfterMs(response.headers?.get?.('Retry-After'));
        if (retryAfterMs !== null) {
          await sleep(retryAfterMs);
          response = await fetch(url, request);
        }
      }

      if (!response.ok && response.status !== 304) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // resposta sem corpo JSON
        }
        const errorMsg = errorData?.message || errorData?.error || `Erro HTTP ${response.status}`;
        const apiError = new Error(errorMsg);
        // Preserva o `X-Request-Id` ANTES do throw: sem isto os headers da
        // `response` se perdem aqui. Vira propriedade do Error (não entra na
        // mensagem) e o `catch` abaixo o lifta para o estado `requestId` — o
        // `error` em si continua string.
        const headerRequestId = response.headers?.get?.('x-request-id');
        if (headerRequestId) apiError.requestId = headerRequestId;
        throw apiError;
      }

      let result = await response.json();

      if (typeof transform === 'function') {
        result = transform(result);
      }

      setData(result);
      lastFetchRef.current = Date.now();
    } catch (err) {
      const errorMessage = err.message || 'Erro desconhecido ao buscar dados';
      // `error` continua STRING (contrato dos componentes públicos). O ID de
      // correlação, se o `Error` trouxer, vai para um estado próprio — é o
      // caminho que permite a UI exibir `(ref: <id>)` sem virar objeto.
      setError(errorMessage);
      setRequestId(typeof err.requestId === 'string' && err.requestId ? err.requestId : null);

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

  return { data, loading, error, requestId, refetch: fetchData, setData };
};

