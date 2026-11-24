import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { useApiFetch } from '../../../hooks/useApiFetch.js';
import { subscribeAdminUnauthorized } from '../../../utils/adminSession.js';
import { mockGlobalFetch } from '../../helpers/index.js';

/**
 * Monta uma `response` mínima no formato que o hook consome:
 * `ok`, `status`, `headers.get()` e `json()`.
 * `headers.get` devolve `null` quando ausente, igual ao `Headers` real.
 */
const makeResponse = ({ status = 200, body = {}, headers = {} }) => {
  const map = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => map.get(String(name).toLowerCase()) ?? null },
    json: async () => body,
  };
};

/** Resposta 503 de banco indisponível (mesmo corpo do adminCrudHandler). */
const unavailable = (extraHeaders = {}) =>
  makeResponse({
    status: 503,
    body: {
      error: 'Serviço temporariamente indisponível',
      message: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
    },
    headers: extraHeaders,
  });

/** Drena microtasks dentro de `act` (necessário com fake timers). */
const flushMicrotasks = async () => {
  await act(async () => {
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
  });
};

describe('Hook - useApiFetch (requestId e retry de 503)', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    jest.useRealTimers();
  });

  describe('propagação do X-Request-Id', () => {
    it('anexa o X-Request-Id ao Error sem poluir a mensagem', async () => {
      const onError = jest.fn();
      fetchMock.mockResolvedValueOnce(
        makeResponse({
          status: 500,
          body: { error: 'Erro interno no servidor', message: 'Erro genérico' },
          headers: { 'X-Request-Id': 'req-abc.123_XYZ-9' },
        })
      );

      const { result } = renderHook(() => useApiFetch('/api/admin/dicas', { onError }));

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      const err = onError.mock.calls[0][0];
      expect(err).toBeInstanceOf(Error);
      expect(err.requestId).toBe('req-abc.123_XYZ-9');
      // A mensagem segue limpa: o ID nunca entra nela
      expect(err.message).toBe('Erro genérico');
      // O estado `error` continua sendo string pura (contrato do hook)
      expect(result.current.error).toBe('Erro genérico');
    });

    it('não cria requestId quando a resposta não traz o header', async () => {
      const onError = jest.fn();
      fetchMock.mockResolvedValueOnce(
        makeResponse({ status: 404, body: { error: 'Não encontrado' } })
      );

      const { result } = renderHook(() => useApiFetch('/api/admin/dicas', { onError }));

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(onError.mock.calls[0][0].requestId).toBeUndefined();
      expect(onError.mock.calls[0][0].message).toBe('Não encontrado');
      expect(result.current.requestId).toBeNull();
    });

    it('expõe o X-Request-Id em estado próprio, mantendo `error` como string', async () => {
      fetchMock
        .mockResolvedValueOnce(
          makeResponse({
            status: 500,
            body: { message: 'Erro genérico' },
            headers: { 'X-Request-Id': 'req-xyz-1' },
          })
        )
        .mockResolvedValueOnce(makeResponse({ status: 200, body: { data: [] } }));

      const { result } = renderHook(() => useApiFetch('/api/admin/dicas'));

      await waitFor(() => expect(result.current.requestId).toBe('req-xyz-1'));
      // O contrato dos 5 componentes públicos não muda: `error` é string
      expect(typeof result.current.error).toBe('string');
      expect(result.current.error).toBe('Erro genérico');

      // Nova busca (sem falha) limpa o ID para não sobrar ref de erro anterior
      await act(async () => {
        await result.current.refetch();
      });
      await waitFor(() => expect(result.current.error).toBeNull());
      expect(result.current.requestId).toBeNull();
      expect(result.current.data).toEqual({ data: [] });
    });
  });

  describe('retry único no 503', () => {
    it('503 com Retry-After refaz a requisição UMA vez e depois propaga o erro', async () => {
      const onError = jest.fn();
      fetchMock
        .mockResolvedValueOnce(unavailable({ 'Retry-After': '0' }))
        .mockResolvedValueOnce(unavailable({ 'Retry-After': '0' }));

      renderHook(() => useApiFetch('/api/admin/dicas', { onError }));

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(onError.mock.calls[0][0].message).toBe(
        'Serviço temporariamente indisponível. Tente novamente em instantes.'
      );
    });

    it('503 sem Retry-After não faz retry', async () => {
      const onError = jest.fn();
      fetchMock.mockResolvedValueOnce(unavailable());

      renderHook(() => useApiFetch('/api/admin/dicas', { onError }));

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('503 com Retry-After não parseável não faz retry', async () => {
      const onError = jest.fn();
      fetchMock.mockResolvedValueOnce(unavailable({ 'Retry-After': 'em-breve' }));

      renderHook(() => useApiFetch('/api/admin/dicas', { onError }));

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('500 não faz retry, mesmo com Retry-After presente', async () => {
      const onError = jest.fn();
      fetchMock.mockResolvedValueOnce(
        makeResponse({
          status: 500,
          body: { error: 'Erro interno no servidor' },
          headers: { 'Retry-After': '0' },
        })
      );

      renderHook(() => useApiFetch('/api/admin/dicas', { onError }));

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('não retenta método não idempotente (POST) mesmo com Retry-After', async () => {
      const onError = jest.fn();
      fetchMock.mockResolvedValue(unavailable({ 'Retry-After': '0' }));

      renderHook(() =>
        useApiFetch('/api/admin/dicas', { options: { method: 'POST', body: '{}' }, onError })
      );

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('retenta método idempotente (PUT) porque repetir converge para o mesmo estado', async () => {
      const onError = jest.fn();
      fetchMock
        .mockResolvedValueOnce(unavailable({ 'Retry-After': '0' }))
        .mockResolvedValueOnce(makeResponse({ status: 200, body: { data: [] } }));

      const { result } = renderHook(() =>
        useApiFetch('/api/admin/dicas', { options: { method: 'PUT', body: '{}' }, onError })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(onError).not.toHaveBeenCalled();
      expect(result.current.data).toEqual({ data: [] });
    });

    it('honra o atraso do Retry-After e não entra em laço (fake timers)', async () => {
      jest.useFakeTimers();
      const onError = jest.fn();
      // Mock genérico: TODAS as respostas são 503 → se houvesse laço, o fetch
      // dispararia sem parar.
      fetchMock.mockResolvedValue(unavailable({ 'Retry-After': '5' }));

      renderHook(() => useApiFetch('/api/admin/dicas', { onError }));
      await flushMicrotasks();

      // 1ª resposta 503 recebida, ainda dentro da espera de 5s
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(4000);
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      await flushMicrotasks();

      // Reenviou exatamente UMA vez e o 2º 503 virou erro, sem 3º envio
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(onError).toHaveBeenCalledTimes(1);
      await flushMicrotasks();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('tratamento de HTTP 401 com barramento admin', () => {
    it('notifica o barramento e suprime erro local quando há assinante ativo', async () => {
      const onUnauthorized = jest.fn();
      const unsubscribe = subscribeAdminUnauthorized(onUnauthorized);
      const onError = jest.fn();

      try {
        fetchMock.mockResolvedValueOnce(
          makeResponse({
            status: 401,
            body: { message: 'Não autenticado' },
          })
        );

        const { result } = renderHook(() => useApiFetch('/api/admin/dicas', { onError }));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(onUnauthorized).toHaveBeenCalledWith('expired');
        expect(onError).not.toHaveBeenCalled();
        expect(result.current.error).toBeNull();
      } finally {
        unsubscribe();
      }
    });

    it('mantém o erro padrão quando não há assinante ativo no barramento', async () => {
      const onError = jest.fn();
      fetchMock.mockResolvedValueOnce(
        makeResponse({
          status: 401,
          body: { message: 'Não autenticado' },
        })
      );

      const { result } = renderHook(() => useApiFetch('/api/admin/dicas', { onError }));

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(result.current.error).toBe('Não autenticado');
    });
  });

  describe('cancelamento lógico no unmount e concorrência', () => {
    it('não atualiza estado nem emite aviso React ao resolver após desmontagem (unmount)', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const onError = jest.fn();
      let resolveFetch;
      fetchMock.mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      try {
        const { unmount } = renderHook(() => useApiFetch('/api/admin/dicas', { onError }));
        unmount();

        await act(async () => {
          resolveFetch(makeResponse({ status: 200, body: { data: ['tardio'] } }));
          await Promise.resolve();
        });

        expect(onError).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('ignora resposta atrasada de requisição anterior quando refetch mais novo já resolveu', async () => {
      let resolveFirst;
      let resolveSecond;
      fetchMock
        .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
        .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

      const { result } = renderHook(() => useApiFetch('/api/admin/dicas'));

      let refetchPromise;
      await act(async () => {
        refetchPromise = result.current.refetch();
      });

      await act(async () => {
        resolveSecond(makeResponse({ status: 200, body: { data: ['atual'] } }));
        await refetchPromise;
      });

      await waitFor(() => expect(result.current.data).toEqual({ data: ['atual'] }));

      await act(async () => {
        resolveFirst(makeResponse({ status: 200, body: { data: ['obsoleto'] } }));
        await Promise.resolve();
      });

      expect(result.current.data).toEqual({ data: ['atual'] });
    });

    it('não dispara fetch quando url é vazia e finaliza loading sem erro ou aviso de console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const { result } = renderHook(() => useApiFetch('', { initialData: { data: [] } }));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.current.error).toBeNull();
        expect(result.current.data).toEqual({ data: [] });
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });
});
